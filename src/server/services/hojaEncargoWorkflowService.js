/**
 * Hoja de Encargo Workflow Service
 * Orchestrates document generation for Particular (private client) cases:
 * - Generate Hoja de Encargo PDF
 * - Sign document (separate step)
 * - Send by email to client (separate step)
 */
import { PDFGeneratorService } from "./pdfGeneratorService.js";
import { SignatureService } from "./signatureService.js";
import { EmailService } from "./emailService.js";
import { DocumentHistoryService } from "./documentHistoryService.js";
import { EmailHistoryService } from "./emailHistoryService.js";
import { ValidationError } from "../errors.js";

export class HojaEncargoWorkflowService {
  constructor(config) {
    this.config = config;
    this.pdfGenerator = new PDFGeneratorService(
      config.documents_path || "./data/documents",
    );
    this.signatureService = new SignatureService(
      config.certificate_path,
      config.certificate_password,
    );
    this.emailService = new EmailService(config);
    this.documentHistory = new DocumentHistoryService();
    this.emailHistory = new EmailHistoryService();
  }

  /**
   * Validate Hoja de Encargo input data
   * @param {string} services - Services description
   * @param {number} fees - Professional fees
   * @throws {ValidationError} If validation fails
   */
  validateInput(services, fees) {
    if (!services || typeof services !== "string" || services.trim().length === 0) {
      throw new ValidationError("La descripción de servicios es obligatoria", "services");
    }

    if (fees === undefined || fees === null || isNaN(fees) || fees <= 0) {
      throw new ValidationError("Los honorarios deben ser un número positivo", "fees");
    }
  }

  /**
   * Generate Hoja de Encargo PDF (Step 1)
   * @param {Object} caseData - Case information
   * @param {Object} hojaData - Hoja de Encargo specific data
   * @param {string} hojaData.services - Services description
   * @param {number} hojaData.fees - Professional fees amount
   * @returns {Promise<Object>} Generation result with document ID
   */
  async generateHojaEncargo(caseData, hojaData) {
    // Validate inputs
    this.validateInput(hojaData.services, hojaData.fees);

    // Generate PDF
    const pdfPath = await this.pdfGenerator.generateHojaEncargo(caseData, hojaData);

    // Record in document history (unsigned initially)
    const docRecord = this.documentHistory.create({
      caseId: caseData.id,
      documentType: "HOJA_ENCARGO",
      filePath: pdfPath,
      signed: 0,
    });

    // Extract filename from path
    const filename = pdfPath.split("/").pop();

    return {
      success: true,
      documentId: docRecord.id,
      filePath: pdfPath,
      filename,
      signed: false,
    };
  }

  /**
   * Sign an existing Hoja de Encargo document (Step 2)
   * @param {number} documentId - Document history ID
   * @returns {Promise<Object>} Sign result
   */
  async signDocument(documentId) {
    const doc = this.documentHistory.getById(documentId);

    if (!doc) {
      throw new Error("Documento no encontrado");
    }

    if (doc.signed) {
      throw new Error("El documento ya está firmado");
    }

    // Check if certificate is configured
    if (!this.config.certificate_path) {
      throw new Error(
        "Certificado digital no configurado. Configure la ruta del certificado en Configuración.",
      );
    }

    // Sign the PDF
    const signedPath = await this.signatureService.signPDF(doc.file_path);

    // Update document history
    this.documentHistory.updateSigned(documentId, true);
    this.documentHistory.updateFilePath(documentId, signedPath);

    return {
      success: true,
      signedPath,
    };
  }

  /**
   * Send Hoja de Encargo via email to client (Step 3)
   * @param {Object} caseData - Case information
   * @param {number} documentId - Document history ID
   * @param {string} recipientEmail - Client email address
   * @returns {Promise<Object>} Email result
   */
  async sendByEmail(caseData, documentId, recipientEmail) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      throw new ValidationError("Formato de email inválido", "email");
    }

    // Check if SMTP is configured
    if (!this.emailService.isConfigured()) {
      throw new Error(
        "SMTP no configurado. Configure el servidor de correo en Configuración.",
      );
    }

    const doc = this.documentHistory.getById(documentId);
    if (!doc) {
      throw new Error("Documento no encontrado");
    }

    const clientName = caseData.client_name || caseData.clientName;
    const reference = caseData.internal_reference || caseData.internalReference;

    const subject = `Hoja de Encargo - ${reference} - ${clientName}`;
    const body = `Estimado/a ${clientName},

Adjunto encontrará la Hoja de Encargo correspondiente a los servicios profesionales acordados.

Referencia: ${reference}

Por favor, revise el documento y no dude en contactarnos si tiene alguna pregunta.

Atentamente,
El Despacho`;

    try {
      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        body,
        attachmentPath: doc.file_path,
      });

      // Record successful email
      const emailRecord = this.emailHistory.create({
        caseId: caseData.id,
        documentId: doc.id,
        recipient: recipientEmail,
        subject,
        status: "SENT",
      });

      return {
        success: true,
        emailId: emailRecord.id,
      };
    } catch (error) {
      // Record failed email attempt
      this.emailHistory.create({
        caseId: caseData.id,
        documentId: doc.id,
        recipient: recipientEmail,
        subject,
        status: "ERROR",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Get documents for a Particular case
   * @param {number} caseId - Case ID
   * @returns {Array} Document history records
   */
  getDocumentsForCase(caseId) {
    return this.documentHistory.getByCaseIdAndType(caseId, "HOJA_ENCARGO");
  }
}
