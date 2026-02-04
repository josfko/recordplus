/**
 * ARAG Routes
 * API endpoints for ARAG case automation (minutas, suplidos, history)
 */
import { Router } from "express";
import { MinutaWorkflowService } from "../services/minutaWorkflowService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { EmailHistoryService } from "../services/emailHistoryService.js";
import { EmailService } from "../services/emailService.js";
import { getById } from "../services/caseService.js";
import { getAll as getConfig } from "../services/configurationService.js";
import { existsSync } from "fs";
import { basename } from "path";

const router = Router();

// Valid judicial districts
const VALID_DISTRICTS = [
  "Torrox",
  "Vélez-Málaga",
  "Torremolinos",
  "Fuengirola",
  "Marbella",
  "Estepona",
  "Antequera",
];

/**
 * POST /api/cases/:id/minuta
 * Generate, sign, and send minuta for ARAG case
 */
router.post("/:id/minuta", async (req, res, next) => {
  try {
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

    if (caseData.type !== "ARAG") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Solo expedientes ARAG pueden generar minutas",
        },
      });
    }

    if (caseData.state === "ARCHIVADO") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No se pueden generar documentos en expedientes archivados",
        },
      });
    }

    const config = getConfig();
    const workflow = new MinutaWorkflowService(config);
    const result = await workflow.executeMinutaWorkflow(caseData, config);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases/:id/suplido
 * Generate suplido for judicial ARAG case
 */
router.post("/:id/suplido", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { district } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de expediente inválido",
        },
      });
    }

    if (!district) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Partido judicial requerido",
          field: "district",
        },
      });
    }

    if (!VALID_DISTRICTS.includes(district)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Partido judicial inválido. Debe ser uno de: ${VALID_DISTRICTS.join(", ")}`,
          field: "district",
        },
      });
    }

    const caseData = getById(id);
    if (!caseData) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
      });
    }

    if (caseData.type !== "ARAG") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Solo expedientes ARAG pueden generar suplidos",
        },
      });
    }

    if (caseData.state !== "JUDICIAL") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Solo expedientes judiciales pueden generar suplidos",
        },
      });
    }

    if (caseData.state === "ARCHIVADO") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No se pueden generar documentos en expedientes archivados",
        },
      });
    }

    const config = getConfig();

    // Get mileage rate for district
    const districtKey = `mileage_${district.toLowerCase().replace(/[^a-z]/g, "_")}`;
    const amount = parseFloat(config[districtKey]) || 0;

    const workflow = new MinutaWorkflowService(config);
    const result = await workflow.executeSuplidoWorkflow(
      caseData,
      district,
      amount,
      config,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases/:id/history
 * Get document and email history for a case
 */
router.get("/:id/history", (req, res, next) => {
  try {
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

    const documentHistory = new DocumentHistoryService();
    const emailHistory = new EmailHistoryService();

    const documents = documentHistory.getByCaseId(id);
    const emails = emailHistory.getByCaseId(id);

    res.json({
      success: true,
      data: { documents, emails },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id/download
 * Download a document
 */
router.get("/:id/download", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de documento inválido",
        },
      });
    }

    const documentHistory = new DocumentHistoryService();
    const doc = documentHistory.getById(id);

    if (!doc) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Documento no encontrado" },
      });
    }

    if (!existsSync(doc.file_path)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Archivo no encontrado en el servidor",
        },
      });
    }

    res.download(doc.file_path, basename(doc.file_path));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/email/test
 * Test SMTP configuration
 * Accepts optional credentials in body to test before saving
 */
router.post("/test", async (req, res, next) => {
  try {
    const savedConfig = getConfig();

    // Allow testing with credentials from request body (for testing before save)
    const config = {
      smtp_host: req.body.smtp_host || savedConfig.smtp_host,
      smtp_port: req.body.smtp_port || savedConfig.smtp_port,
      smtp_secure: req.body.smtp_secure || savedConfig.smtp_secure,
      smtp_user: req.body.smtp_user || savedConfig.smtp_user,
      smtp_password: req.body.smtp_password || savedConfig.smtp_password,
      smtp_from: req.body.smtp_from || savedConfig.smtp_from,
    };

    // Log config (without password) for debugging
    console.log("[SMTP Test] Config:", {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      user: config.smtp_user,
      hasPassword: !!config.smtp_password,
      passwordLength: config.smtp_password?.length || 0,
    });

    const emailService = new EmailService(config);

    if (!emailService.isConfigured()) {
      return res.status(400).json({
        error: {
          code: "SMTP_NOT_CONFIGURED",
          message:
            "SMTP no configurado. Configure el servidor de correo en Configuración.",
        },
      });
    }

    await emailService.testConnection();

    res.json({
      success: true,
      message: "Conexión SMTP verificada correctamente",
    });
  } catch (error) {
    // Log full error for debugging
    console.error("[SMTP Test] Error:", error);

    // Provide more helpful error messages
    let message = error.message;
    if (error.code === "ECONNREFUSED") {
      message = `Conexión rechazada. Verifica el servidor (${req.body.smtp_host}) y puerto (${req.body.smtp_port})`;
    } else if (error.code === "ETIMEDOUT" || error.code === "ESOCKET") {
      message = `Tiempo de espera agotado. El servidor no responde en el puerto ${req.body.smtp_port}`;
    } else if (error.code === "EAUTH" || message.includes("credentials")) {
      message = "Credenciales inválidas. Verifica usuario y contraseña";
    } else if (message.includes("Connection closed")) {
      message = `Conexión cerrada por el servidor. Prueba cambiar la seguridad (STARTTLS/SSL) o el puerto`;
    }

    res.status(500).json({
      error: {
        code: "SMTP_ERROR",
        message: `Error de conexión SMTP: ${message}`,
        details: error.code || error.responseCode,
      },
    });
  }
});

/**
 * POST /api/arag/cases/:caseId/emails/:emailId/retry
 * Retry a failed email
 * Re-sends the email associated with a failed email history entry
 */
router.post("/cases/:caseId/emails/:emailId/retry", async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const emailId = parseInt(req.params.emailId, 10);

    if (isNaN(caseId) || isNaN(emailId)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de expediente o email inválido",
        },
      });
    }

    const caseData = getById(caseId);
    if (!caseData) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Expediente no encontrado" },
      });
    }

    const config = getConfig();
    const workflow = new MinutaWorkflowService(config);

    const result = await workflow.retryEmail(emailId, caseId);

    res.json({
      success: true,
      message: "Email reenviado correctamente",
      data: result,
    });
  } catch (error) {
    // Handle SmtpError specifically for user-friendly messages
    if (error.name === "SmtpError") {
      return res.status(500).json({
        error: {
          code: error.code,
          message: error.getFullMessage(),
          details: error.details,
          action: error.action,
        },
      });
    }

    // Handle validation errors from workflow
    if (error.message.includes("no encontrad")) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      });
    }

    next(error);
  }
});

/**
 * GET /api/mileage-rates
 * Get mileage rates for all districts
 */
router.get("/", (req, res, next) => {
  try {
    const config = getConfig();

    const rates = {};
    for (const district of VALID_DISTRICTS) {
      const key = `mileage_${district.toLowerCase().replace(/[^a-z]/g, "_")}`;
      rates[district] = parseFloat(config[key]) || 0;
    }

    res.json({ success: true, data: rates });
  } catch (error) {
    next(error);
  }
});

export default router;
