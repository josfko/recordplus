/**
 * Turno de Oficio Routes
 * API endpoints for public defender case management (no automatic document generation)
 */
import { Router } from "express";
import multer from "multer";
import { join, extname, basename } from "path";
import { existsSync, mkdirSync } from "fs";
import {
  getById,
  finalizeTurno,
  CASE_TYPES,
  CASE_STATES,
} from "../services/caseService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { execute } from "../database.js";

const router = Router();

// Documents storage path
const DOCUMENTS_PATH = process.env.DOCUMENTS_PATH || "./data/documents";

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseData = req.caseData;
    const year = new Date().getFullYear();
    const ref = caseData.internalReference || `turno_${caseData.id}`;
    const uploadDir = join(DOCUMENTS_PATH, year.toString(), ref);

    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    const ext = extname(file.originalname);
    const baseName = basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    cb(null, `${baseName}_${uniqueSuffix}${ext}`);
  },
});

// Configure multer upload
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"), false);
    }
  },
});

/**
 * Middleware to load case data and validate it's a Turno de Oficio case
 */
const loadTurnoCase = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "ID de expediente inválido",
      },
    });
  }

  const caseData = getById(id);
  if (!caseData) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
    });
  }

  if (caseData.type !== CASE_TYPES.TURNO_OFICIO) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "El expediente no es de tipo Turno de Oficio",
      },
    });
  }

  req.caseData = caseData;
  next();
};

/**
 * POST /api/turno/:id/finalize
 * Transition a Turno de Oficio case from ABIERTO to FINALIZADO (uses JUDICIAL state)
 */
router.post("/:id/finalize", loadTurnoCase, (req, res, next) => {
  try {
    const updatedCase = finalizeTurno(req.caseData.id);

    res.json({
      success: true,
      message: "Expediente marcado como finalizado",
      data: updatedCase,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/turno/:id/reopen
 * Transition a Turno de Oficio case from FINALIZADO back to ABIERTO
 */
router.post("/:id/reopen", loadTurnoCase, (req, res, next) => {
  try {
    const { caseData } = req;

    if (caseData.state === CASE_STATES.ARCHIVADO) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No se puede reabrir un expediente archivado",
        },
      });
    }

    if (caseData.state === CASE_STATES.ABIERTO) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "El expediente ya está abierto",
        },
      });
    }

    execute(
      `UPDATE cases SET state = ?, updated_at = datetime('now') WHERE id = ?`,
      [CASE_STATES.ABIERTO, caseData.id]
    );

    const updatedCase = getById(caseData.id);

    res.json({
      success: true,
      message: "Expediente reabierto",
      data: updatedCase,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/turno/:id/upload
 * Upload a document to a Turno de Oficio case
 */
router.post(
  "/:id/upload",
  loadTurnoCase,
  (req, res, next) => {
    // Check if case is archived before processing upload
    if (req.caseData.state === CASE_STATES.ARCHIVADO) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No se pueden subir documentos a expedientes archivados",
        },
      });
    }
    next();
  },
  upload.single("document"),
  (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "No se ha proporcionado ningún archivo",
          },
        });
      }

      const documentHistory = new DocumentHistoryService();
      const description = req.body.description || req.file.originalname;

      const docRecord = documentHistory.create({
        caseId: req.caseData.id,
        documentType: "MANUAL_UPLOAD",
        filePath: req.file.path,
        signed: 0,
      });

      res.json({
        success: true,
        message: "Documento subido correctamente",
        data: {
          documentId: docRecord.id,
          filename: req.file.filename,
          originalName: req.file.originalname,
          description: description,
          path: req.file.path,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/turno/:id/documents/:documentId
 * Delete a document from a Turno de Oficio case
 */
router.delete("/:id/documents/:documentId", loadTurnoCase, (req, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(documentId)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de documento inválido",
        },
      });
    }

    // Check if case is archived
    if (req.caseData.state === CASE_STATES.ARCHIVADO) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No se pueden eliminar documentos de expedientes archivados",
        },
      });
    }

    const documentHistory = new DocumentHistoryService();
    const doc = documentHistory.getById(documentId);

    if (!doc) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Documento no encontrado",
        },
      });
    }

    // Verify document belongs to this case
    if (doc.case_id !== req.caseData.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "El documento no pertenece a este expediente",
        },
      });
    }

    // Only allow deletion of manually uploaded documents
    if (doc.document_type !== "MANUAL_UPLOAD") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Solo se pueden eliminar documentos subidos manualmente",
        },
      });
    }

    const deleted = documentHistory.delete(documentId, true);

    if (!deleted) {
      return res.status(500).json({
        error: {
          code: "DELETE_ERROR",
          message: "Error al eliminar el documento",
        },
      });
    }

    res.json({
      success: true,
      message: "Documento eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: {
          code: "FILE_TOO_LARGE",
          message: "El archivo supera el tamaño máximo permitido (10MB)",
        },
      });
    }
    return res.status(400).json({
      error: {
        code: "UPLOAD_ERROR",
        message: error.message,
      },
    });
  }

  if (error.message === "Solo se permiten archivos PDF") {
    return res.status(400).json({
      error: {
        code: "INVALID_FILE_TYPE",
        message: "Solo se permiten archivos PDF",
      },
    });
  }

  next(error);
});

export default router;
