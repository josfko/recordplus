/**
 * Minuta Workflow Service
 * Orchestrates the complete minuta generation workflow:
 * generate PDF → sign → record document → send email → record email
 */
import { PDFGeneratorService } from "./pdfGeneratorService.js";
import { SignatureService } from "./signatureService.js";
import { EmailService } from "./emailService.js";
import { DocumentHistoryService } from "./documentHistoryService.js";
import { EmailHistoryService } from "./emailHistoryService.js";

export class MinutaWorkflowService {
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
   * Execute complete minuta workflow
   * @param {Object} caseData - Case information
   * @param {Object} config - System configuration
   * @returns {Promise<Object>} Workflow result with steps and status
   */
  async executeMinutaWorkflow(caseData, config) {
    const result = {
      steps: [],
      success: false,
      documentId: null,
      emailId: null,
    };

    try {
      // Step 1: Generate PDF
      result.steps.push({ step: "generate", status: "in_progress" });
      const pdfPath = await this.pdfGenerator.generateMinuta(caseData, config);
      result.steps[0].status = "completed";
      result.steps[0].path = pdfPath;

      // Step 2: Sign PDF
      result.steps.push({ step: "sign", status: "in_progress" });
      const signedPath = await this.signatureService.signPDF(pdfPath);
      result.steps[1].status = "completed";
      result.steps[1].path = signedPath;

      // Step 3: Record document in history
      const docRecord = this.documentHistory.create({
        caseId: caseData.id,
        documentType: "MINUTA",
        filePath: signedPath,
        signed: 1,
      });
      result.documentId = docRecord.id;

      // Step 4: Send email (if SMTP configured)
      result.steps.push({ step: "email", status: "in_progress" });
      const emailTo = config.arag_email || "facturacionsiniestros@arag.es";
      const emailSubject = EmailService.formatMinutaSubject(
        caseData.aragReference,
      );

      if (this.emailService.isConfigured()) {
        await this.emailService.sendEmail({
          to: emailTo,
          subject: emailSubject,
          body: `Adjunto minuta para el expediente ${caseData.aragReference}.`,
          attachmentPath: signedPath,
        });
        result.steps[2].status = "completed";

        // Step 5: Record successful email
        const emailRecord = this.emailHistory.create({
          caseId: caseData.id,
          documentId: docRecord.id,
          recipient: emailTo,
          subject: emailSubject,
          status: "SENT",
        });
        result.emailId = emailRecord.id;
      } else {
        // SMTP not configured - skip email but mark as skipped
        result.steps[2].status = "skipped";
        result.steps[2].message = "SMTP no configurado";
      }

      result.success = true;
      return result;
    } catch (error) {
      // Mark current step as failed
      const currentStep = result.steps.find((s) => s.status === "in_progress");
      if (currentStep) {
        currentStep.status = "failed";
        currentStep.error = error.message;
      }

      // Record failed email if we got past document generation
      if (result.documentId && !result.emailId) {
        const emailTo = config.arag_email || "facturacionsiniestros@arag.es";
        this.emailHistory.create({
          caseId: caseData.id,
          documentId: result.documentId,
          recipient: emailTo,
          subject: EmailService.formatMinutaSubject(caseData.aragReference),
          status: "ERROR",
          errorMessage: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Execute suplido generation workflow
   * @param {Object} caseData - Case information
   * @param {string} district - Judicial district
   * @param {number} amount - Mileage amount
   * @param {Object} config - System configuration
   * @returns {Promise<Object>} Workflow result
   */
  async executeSuplidoWorkflow(caseData, district, amount, config) {
    const result = {
      steps: [],
      success: false,
      documentId: null,
    };

    try {
      // Step 1: Generate PDF
      result.steps.push({ step: "generate", status: "in_progress" });
      const pdfPath = await this.pdfGenerator.generateSuplido(
        caseData,
        district,
        amount,
      );
      result.steps[0].status = "completed";
      result.steps[0].path = pdfPath;

      // Step 2: Sign PDF
      result.steps.push({ step: "sign", status: "in_progress" });
      const signedPath = await this.signatureService.signPDF(pdfPath);
      result.steps[1].status = "completed";
      result.steps[1].path = signedPath;

      // Step 3: Record document in history
      const docRecord = this.documentHistory.create({
        caseId: caseData.id,
        documentType: "SUPLIDO",
        filePath: signedPath,
        signed: 1,
      });
      result.documentId = docRecord.id;
      result.amount = amount;
      result.district = district;

      result.success = true;
      return result;
    } catch (error) {
      const currentStep = result.steps.find((s) => s.status === "in_progress");
      if (currentStep) {
        currentStep.status = "failed";
        currentStep.error = error.message;
      }
      throw error;
    }
  }

  /**
   * Retry failed email for a document
   * @param {number} caseId - Case ID
   * @param {number} documentId - Document ID
   * @param {Object} caseData - Case information
   * @param {Object} config - System configuration
   * @returns {Promise<Object>} Retry result
   */
  async retryEmail(caseId, documentId, caseData, config) {
    const doc = this.documentHistory.getById(documentId);
    if (!doc) {
      throw new Error("Documento no encontrado");
    }

    const emailTo = config.arag_email || "facturacionsiniestros@arag.es";
    const emailSubject =
      doc.document_type === "MINUTA"
        ? EmailService.formatMinutaSubject(caseData.aragReference)
        : EmailService.formatSuplidoSubject(
            caseData.aragReference,
            caseData.judicialDistrict,
          );

    try {
      await this.emailService.sendEmail({
        to: emailTo,
        subject: emailSubject,
        attachmentPath: doc.file_path,
      });

      const emailRecord = this.emailHistory.create({
        caseId,
        documentId,
        recipient: emailTo,
        subject: emailSubject,
        status: "SENT",
      });

      return { success: true, emailId: emailRecord.id };
    } catch (error) {
      this.emailHistory.create({
        caseId,
        documentId,
        recipient: emailTo,
        subject: emailSubject,
        status: "ERROR",
        errorMessage: error.message,
      });
      throw error;
    }
  }
}
