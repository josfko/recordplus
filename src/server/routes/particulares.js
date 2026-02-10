/**
 * Particulares (Private Client) Routes
 * Handles Hoja de Encargo generation, signing, and email delivery
 */
import { Router } from "express";
import { HojaEncargoWorkflowService } from "../services/hojaEncargoWorkflowService.js";
import * as caseService from "../services/caseService.js";
import { getAll as getConfig } from "../services/configurationService.js";

const router = Router();

/**
 * POST /api/cases/:id/hoja-encargo
 * Generate Hoja de Encargo PDF for a PARTICULAR case
 */
router.post("/:id/hoja-encargo", async (req, res, next) => {
  try {
    const { services, fees } = req.body;
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
      });
    }

    if (caseData.type !== "PARTICULAR") {
      return res.status(400).json({
        error: {
          code: "INVALID_CASE_TYPE",
          message: "Solo expedientes Particulares pueden generar Hojas de Encargo",
        },
      });
    }

    if (caseData.state === "ARCHIVADO") {
      return res.status(400).json({
        error: {
          code: "CASE_ARCHIVED",
          message: "No se pueden generar documentos en expedientes archivados",
        },
      });
    }

    const config = getConfig();
    const workflow = new HojaEncargoWorkflowService(config);
    const result = await workflow.generateHojaEncargo(caseData, {
      services,
      fees: parseFloat(fees),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases/:id/hoja-encargo/sign
 * Sign an existing Hoja de Encargo document
 */
router.post("/:id/hoja-encargo/sign", async (req, res, next) => {
  try {
    const { documentId } = req.body;
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
      });
    }

    if (!documentId) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID del documento es requerido",
          field: "documentId",
        },
      });
    }

    const config = getConfig();
    const workflow = new HojaEncargoWorkflowService(config);
    const result = await workflow.signDocument(documentId);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases/:id/hoja-encargo/send
 * Send Hoja de Encargo via email to client
 */
router.post("/:id/hoja-encargo/send", async (req, res, next) => {
  try {
    const { documentId, email } = req.body;
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
      });
    }

    if (!documentId) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID del documento es requerido",
          field: "documentId",
        },
      });
    }

    const config = getConfig();
    const workflow = new HojaEncargoWorkflowService(config);
    const result = await workflow.sendByEmail(caseData, documentId, email);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases/:id/hoja-encargo/documents
 * Get all Hoja de Encargo documents for a case
 */
router.get("/:id/hoja-encargo/documents", async (req, res, next) => {
  try {
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
      });
    }

    const config = getConfig();
    const workflow = new HojaEncargoWorkflowService(config);
    const documents = workflow.getDocumentsForCase(caseData.id);

    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
});

export default router;
