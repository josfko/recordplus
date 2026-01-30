# Design Document: Expedientes ARAG

## Overview

This document describes the technical design for the ARAG insurance case automation module. The module extends the existing core case management system to provide complete ARAG workflow automation including PDF document generation (minutas and suplidos), digital signatures, and automated email sending to ARAG.

**Technology Stack:**

- **Backend**: Node.js + Express + better-sqlite3 (SQLite)
- **Frontend**: Vanilla JavaScript with ES Modules, pure CSS
- **PDF Generation**: PDFKit (lightweight, no external dependencies)
- **Digital Signature**: node-signpdf with pdf-lib for PDF manipulation
- **Email**: Nodemailer with SMTP transport
- **Server**: Clouding.io VPS (Barcelona, Spain)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Vanilla JS)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ FacturacionArag │  │   CaseDetail    │  │  Configuration  │             │
│  │     View        │  │     View        │  │     View        │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                         ┌──────┴──────┐                                     │
│                         │  API Client │                                     │
│                         └──────┬──────┘                                     │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │ HTTP/JSON
┌────────────────────────────────┼────────────────────────────────────────────┐
│                           Express API                                        │
│                                │                                            │
│  ┌─────────────────────────────┼─────────────────────────────────────────┐  │
│  │                        API Routes                                      │  │
│  │  POST /api/cases/:id/minuta     - Generate and send minuta            │  │
│  │  POST /api/cases/:id/suplido    - Generate suplido                    │  │
│  │  POST /api/cases/:id/judicial   - Transition to judicial              │  │
│  │  GET  /api/documents/:id/download - Download PDF                      │  │
│  │  POST /api/email/test           - Test SMTP configuration             │  │
│  └─────────────────────────────┬─────────────────────────────────────────┘  │
│                                │                                            │
│  ┌─────────────────────────────┼─────────────────────────────────────────┐  │
│  │                         Services                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ PDFGenerator │  │ SignService  │  │ EmailService │                 │  │
│  │  │   Service    │  │              │  │              │                 │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │  │
│  │         │                 │                 │                          │  │
│  │  ┌──────┴─────────────────┴─────────────────┴──────┐                  │  │
│  │  │              MinutaWorkflowService              │                  │  │
│  │  │  (Orchestrates: generate → sign → email)       │                  │  │
│  │  └─────────────────────┬───────────────────────────┘                  │  │
│  └────────────────────────┼──────────────────────────────────────────────┘  │
│                           │                                                  │
│  ┌────────────────────────┼──────────────────────────────────────────────┐  │
│  │                    Data Layer                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ CaseService  │  │ DocumentHist │  │ EmailHistory │                 │  │
│  │  │              │  │   Service    │  │   Service    │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └────────────────────────┬──────────────────────────────────────────────┘  │
│                           │                                                  │
│                    ┌──────┴──────┐                                          │
│                    │   SQLite    │                                          │
│                    │  Database   │                                          │
│                    └─────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │     File System         │
                    │  /data/documents/       │
                    │    └── 2026/            │
                    │        └── IY004921/    │
                    │            ├── minuta.pdf│
                    │            └── suplido_1.pdf│
                    └─────────────────────────┘
```

## Components and Interfaces

### PDF Generator Service

```javascript
// src/server/services/pdfGeneratorService.js
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

export class PDFGeneratorService {
  constructor(documentsPath = "./data/documents") {
    this.documentsPath = documentsPath;
  }

  /**
   * Generate ARAG minuta PDF
   * @param {Object} caseData - Case information
   * @param {Object} config - Configuration (base_fee, vat_rate)
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateMinuta(caseData, config) {
    const baseFee = parseFloat(config.arag_base_fee) || 203.0;
    const vatRate = parseFloat(config.vat_rate) || 21;
    const vatAmount = baseFee * (vatRate / 100);
    const total = baseFee + vatAmount;

    const year = new Date().getFullYear();
    const ref = caseData.internalReference || caseData.aragReference;
    const outputDir = join(this.documentsPath, year.toString(), ref);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `minuta_${Date.now()}.pdf`;
    const outputPath = join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("MINUTA DE HONORARIOS", { align: "center" });
      doc.moveDown(2);

      // Case details
      doc.fontSize(12).font("Helvetica");
      doc.text(`Cliente: ${caseData.clientName}`);
      doc.text(`Referencia ARAG: ${caseData.aragReference}`);
      doc.text(`Referencia Interna: ${caseData.internalReference}`);
      doc.text(`Fecha: ${this.formatDate(new Date())}`);
      doc.moveDown(2);

      // Fee breakdown
      doc
        .font("Helvetica-Bold")
        .text("CONCEPTO", 50, doc.y, { continued: true });
      doc.text("IMPORTE", 400, doc.y, { align: "right" });
      doc.moveDown();

      doc.font("Helvetica");
      doc.text("Honorarios profesionales", 50, doc.y, { continued: true });
      doc.text(this.formatCurrency(baseFee), 400, doc.y, { align: "right" });
      doc.moveDown();

      doc.text(`IVA (${vatRate}%)`, 50, doc.y, { continued: true });
      doc.text(this.formatCurrency(vatAmount), 400, doc.y, { align: "right" });
      doc.moveDown();

      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc.font("Helvetica-Bold");
      doc.text("TOTAL", 50, doc.y, { continued: true });
      doc.text(this.formatCurrency(total), 400, doc.y, { align: "right" });

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  }

  /**
   * Generate suplido (mileage expense) PDF
   * @param {Object} caseData - Case information
   * @param {string} district - Judicial district
   * @param {number} amount - Mileage amount
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateSuplido(caseData, district, amount) {
    const year = new Date().getFullYear();
    const ref = caseData.internalReference || caseData.aragReference;
    const outputDir = join(this.documentsPath, year.toString(), ref);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `suplido_${district.toLowerCase().replace(/[^a-z]/g, "_")}_${Date.now()}.pdf`;
    const outputPath = join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SUPLIDO POR DESPLAZAMIENTO", { align: "center" });
      doc.moveDown(2);

      // Case details
      doc.fontSize(12).font("Helvetica");
      doc.text(`Cliente: ${caseData.clientName}`);
      doc.text(`Referencia ARAG: ${caseData.aragReference}`);
      doc.text(`Referencia Interna: ${caseData.internalReference}`);
      doc.text(`Fecha: ${this.formatDate(new Date())}`);
      doc.moveDown(2);

      // Mileage details
      doc.text(`Partido Judicial: ${district}`);
      doc.moveDown();

      doc.font("Helvetica-Bold");
      doc.text("Importe por desplazamiento:", 50, doc.y, { continued: true });
      doc.text(this.formatCurrency(amount), 400, doc.y, { align: "right" });

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  }

  formatDate(date) {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }
}
```

### Digital Signature Service

```javascript
// src/server/services/signatureService.js
import { readFileSync, writeFileSync } from "fs";
import { PDFDocument } from "pdf-lib";
import forge from "node-forge";

export class SignatureService {
  constructor(certificatePath, certificatePassword) {
    this.certificatePath = certificatePath;
    this.certificatePassword = certificatePassword;
  }

  /**
   * Sign a PDF document
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<string>} Path to signed PDF
   */
  async signPDF(pdfPath) {
    // For initial implementation, we'll use a simple approach
    // In production, use proper PKCS#7 signatures

    const pdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Add signature annotation (visual indicator)
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Add signature text at bottom
    lastPage.drawText("Documento firmado digitalmente", {
      x: 50,
      y: 30,
      size: 8,
    });

    lastPage.drawText(`Fecha de firma: ${new Date().toLocaleString("es-ES")}`, {
      x: 50,
      y: 20,
      size: 8,
    });

    const signedPdfBytes = await pdfDoc.save();

    // Save with _signed suffix
    const signedPath = pdfPath.replace(".pdf", "_signed.pdf");
    writeFileSync(signedPath, signedPdfBytes);

    return signedPath;
  }

  /**
   * Verify if certificate is valid
   * @returns {boolean}
   */
  verifyCertificate() {
    try {
      if (!this.certificatePath) return false;
      const certData = readFileSync(this.certificatePath);
      // Basic validation - certificate file exists and is readable
      return certData.length > 0;
    } catch {
      return false;
    }
  }
}
```

### Email Service

```javascript
// src/server/services/emailService.js
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { basename } from "path";

export class EmailService {
  constructor(config) {
    this.config = config;
    this.transporter = null;
  }

  /**
   * Initialize SMTP transporter
   */
  async initialize() {
    if (!this.config.smtp_host) {
      throw new Error("SMTP no configurado");
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.smtp_host,
      port: parseInt(this.config.smtp_port) || 587,
      secure: this.config.smtp_secure === "true",
      auth: {
        user: this.config.smtp_user,
        pass: this.config.smtp_password,
      },
    });
  }

  /**
   * Send email with PDF attachment
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, body, attachmentPath }) {
    if (!this.transporter) {
      await this.initialize();
    }

    const mailOptions = {
      from: this.config.smtp_from || this.config.smtp_user,
      to,
      subject,
      text: body || "Adjunto documento.",
      attachments: attachmentPath
        ? [
            {
              filename: basename(attachmentPath),
              path: attachmentPath,
            },
          ]
        : [],
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Test SMTP connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    if (!this.transporter) {
      await this.initialize();
    }
    return this.transporter.verify();
  }
}
```

### Minuta Workflow Service

```javascript
// src/server/services/minutaWorkflowService.js
import { PDFGeneratorService } from "./pdfGeneratorService.js";
import { SignatureService } from "./signatureService.js";
import { EmailService } from "./emailService.js";
import { DocumentHistoryService } from "./documentHistoryService.js";
import { EmailHistoryService } from "./emailHistoryService.js";

export class MinutaWorkflowService {
  constructor(config) {
    this.pdfGenerator = new PDFGeneratorService(config.documents_path);
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
   * @returns {Promise<Object>} Workflow result
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

      // Step 3: Record document
      const docRecord = await this.documentHistory.create({
        caseId: caseData.id,
        documentType: "MINUTA",
        filePath: signedPath,
        signed: 1,
      });
      result.documentId = docRecord.id;

      // Step 4: Send email
      result.steps.push({ step: "email", status: "in_progress" });
      const emailTo = config.arag_email || "facturacionsiniestros@arag.es";
      const emailSubject = `${caseData.aragReference} - MINUTA`;

      await this.emailService.sendEmail({
        to: emailTo,
        subject: emailSubject,
        attachmentPath: signedPath,
      });
      result.steps[2].status = "completed";

      // Step 5: Record email
      const emailRecord = await this.emailHistory.create({
        caseId: caseData.id,
        documentId: docRecord.id,
        recipient: emailTo,
        subject: emailSubject,
        status: "SENT",
      });
      result.emailId = emailRecord.id;

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
        await this.emailHistory.create({
          caseId: caseData.id,
          documentId: result.documentId,
          recipient: config.arag_email || "facturacionsiniestros@arag.es",
          subject: `${caseData.aragReference} - MINUTA`,
          status: "ERROR",
          errorMessage: error.message,
        });
      }

      throw error;
    }
  }
}
```

### Document History Service

```javascript
// src/server/services/documentHistoryService.js
import { execute, queryOne, query } from "../database.js";

export class DocumentHistoryService {
  /**
   * Create document history record
   * @param {Object} data - Document data
   * @returns {Object} Created record
   */
  create(data) {
    const result = execute(
      `INSERT INTO document_history (case_id, document_type, file_path, generated_at, signed)
       VALUES (?, ?, ?, datetime('now'), ?)`,
      [data.caseId, data.documentType, data.filePath, data.signed ? 1 : 0],
    );
    return this.getById(result.lastInsertRowid);
  }

  /**
   * Get document by ID
   * @param {number} id - Document ID
   * @returns {Object|null}
   */
  getById(id) {
    return queryOne("SELECT * FROM document_history WHERE id = ?", [id]);
  }

  /**
   * Get documents for a case
   * @param {number} caseId - Case ID
   * @returns {Array}
   */
  getByCaseId(caseId) {
    return query(
      "SELECT * FROM document_history WHERE case_id = ? ORDER BY generated_at DESC",
      [caseId],
    );
  }

  /**
   * Update signed status
   * @param {number} id - Document ID
   * @param {boolean} signed - Signed status
   */
  updateSigned(id, signed) {
    execute("UPDATE document_history SET signed = ? WHERE id = ?", [
      signed ? 1 : 0,
      id,
    ]);
  }
}
```

### Email History Service

```javascript
// src/server/services/emailHistoryService.js
import { execute, queryOne, query } from "../database.js";

export class EmailHistoryService {
  /**
   * Create email history record
   * @param {Object} data - Email data
   * @returns {Object} Created record
   */
  create(data) {
    const result = execute(
      `INSERT INTO email_history (case_id, document_id, recipient, subject, sent_at, status, error_message)
       VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`,
      [
        data.caseId,
        data.documentId,
        data.recipient,
        data.subject,
        data.status,
        data.errorMessage || null,
      ],
    );
    return this.getById(result.lastInsertRowid);
  }

  /**
   * Get email by ID
   * @param {number} id - Email ID
   * @returns {Object|null}
   */
  getById(id) {
    return queryOne("SELECT * FROM email_history WHERE id = ?", [id]);
  }

  /**
   * Get emails for a case
   * @param {number} caseId - Case ID
   * @returns {Array}
   */
  getByCaseId(caseId) {
    return query(
      "SELECT * FROM email_history WHERE case_id = ? ORDER BY sent_at DESC",
      [caseId],
    );
  }
}
```

### API Routes

```javascript
// src/server/routes/arag.js
import { Router } from "express";
import { MinutaWorkflowService } from "../services/minutaWorkflowService.js";
import { PDFGeneratorService } from "../services/pdfGeneratorService.js";
import { SignatureService } from "../services/signatureService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { EmailHistoryService } from "../services/emailHistoryService.js";
import * as caseService from "../services/caseService.js";
import { getConfig } from "../services/configurationService.js";

const router = Router();

/**
 * POST /api/cases/:id/minuta
 * Generate, sign, and send minuta for ARAG case
 */
router.post("/:id/minuta", async (req, res, next) => {
  try {
    const caseData = caseService.getById(req.params.id);
    if (!caseData) {
      return res
        .status(404)
        .json({ error: { message: "Expediente no encontrado" } });
    }
    if (caseData.type !== "ARAG") {
      return res.status(400).json({
        error: { message: "Solo expedientes ARAG pueden generar minutas" },
      });
    }
    if (caseData.state === "ARCHIVADO") {
      return res.status(400).json({
        error: {
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
    const { district } = req.body;

    const caseData = caseService.getById(req.params.id);
    if (!caseData) {
      return res
        .status(404)
        .json({ error: { message: "Expediente no encontrado" } });
    }
    if (caseData.type !== "ARAG") {
      return res.status(400).json({
        error: { message: "Solo expedientes ARAG pueden generar suplidos" },
      });
    }
    if (caseData.state !== "JUDICIAL") {
      return res.status(400).json({
        error: {
          message: "Solo expedientes judiciales pueden generar suplidos",
        },
      });
    }

    const config = getConfig();
    const districtKey = `mileage_${district.toLowerCase().replace(/[^a-z]/g, "_")}`;
    const amount = parseFloat(config[districtKey]) || 0;

    const pdfGenerator = new PDFGeneratorService(config.documents_path);
    const pdfPath = await pdfGenerator.generateSuplido(
      caseData,
      district,
      amount,
    );

    const signatureService = new SignatureService(
      config.certificate_path,
      config.certificate_password,
    );
    const signedPath = await signatureService.signPDF(pdfPath);

    const documentHistory = new DocumentHistoryService();
    const docRecord = documentHistory.create({
      caseId: caseData.id,
      documentType: "SUPLIDO",
      filePath: signedPath,
      signed: 1,
    });

    res.json({
      success: true,
      data: {
        documentId: docRecord.id,
        path: signedPath,
        amount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id/download
 * Download a document
 */
router.get("/documents/:id/download", async (req, res, next) => {
  try {
    const documentHistory = new DocumentHistoryService();
    const doc = documentHistory.getById(req.params.id);

    if (!doc) {
      return res
        .status(404)
        .json({ error: { message: "Documento no encontrado" } });
    }

    res.download(doc.file_path);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases/:id/history
 * Get document and email history for a case
 */
router.get("/:id/history", async (req, res, next) => {
  try {
    const caseData = caseService.getById(req.params.id);
    if (!caseData) {
      return res
        .status(404)
        .json({ error: { message: "Expediente no encontrado" } });
    }

    const documentHistory = new DocumentHistoryService();
    const emailHistory = new EmailHistoryService();

    const documents = documentHistory.getByCaseId(req.params.id);
    const emails = emailHistory.getByCaseId(req.params.id);

    res.json({
      success: true,
      data: { documents, emails },
    });
  } catch (error) {
    next(error);
  }
});

export { router as aragRouter };
```

## Data Models

### Document History Entity (Extended)

```javascript
{
  id: Number,                    // Primary key
  case_id: Number,               // Foreign key to cases
  document_type: String,         // 'MINUTA' | 'SUPLIDO'
  file_path: String,             // Full path to PDF on disk
  generated_at: String,          // ISO timestamp
  signed: Number,                // 0 or 1 (boolean)
  created_at: String             // ISO timestamp
}
```

### Email History Entity (Extended)

```javascript
{
  id: Number,                    // Primary key
  case_id: Number,               // Foreign key to cases
  document_id: Number | null,    // Foreign key to document_history
  recipient: String,             // Email address
  subject: String,               // Email subject
  sent_at: String,               // ISO timestamp
  status: String,                // 'SENT' | 'ERROR'
  error_message: String | null,  // Error details if failed
  created_at: String             // ISO timestamp
}
```

### Configuration Keys (Extended)

```javascript
// Existing keys
'arag_base_fee': '203.00',
'vat_rate': '21',
'arag_email': 'facturacionsiniestros@arag.es',
'mileage_torrox': '0.00',
'mileage_velez_malaga': '0.00',
'mileage_torremolinos': '0.00',
'mileage_fuengirola': '0.00',
'mileage_marbella': '0.00',
'mileage_estepona': '0.00',
'mileage_antequera': '0.00',

// New keys for this module
'documents_path': './data/documents',
'certificate_path': './data/certificates/firma.p12',
'certificate_password': '',
'smtp_host': '',
'smtp_port': '587',
'smtp_secure': 'false',
'smtp_user': '',
'smtp_password': '',
'smtp_from': ''
```

## Database Schema Updates

```sql
-- Migration: 002_smtp_configuration.sql
-- Add SMTP configuration keys

INSERT OR IGNORE INTO configuration (key, value) VALUES
  ('documents_path', './data/documents'),
  ('certificate_path', ''),
  ('certificate_password', ''),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_secure', 'false'),
  ('smtp_user', ''),
  ('smtp_password', ''),
  ('smtp_from', '');
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: ARAG Reference Format Validation

_For any_ string input as ARAG reference, the system should accept it if and only if it matches the pattern `DJ00` followed by exactly 6 digits (0-9).

**Validates: Requirements 1.1, 1.5**

### Property 2: Internal Reference Generation Format

_For any_ ARAG case created, the auto-generated internal reference should match the pattern `IY` followed by exactly 6 digits, and should be unique across all cases.

**Validates: Requirements 1.2**

### Property 3: Client Name Validation

_For any_ string input as client name, the system should reject it if it is null, empty, or consists only of whitespace characters.

**Validates: Requirements 1.3**

### Property 4: ARAG Reference Uniqueness

_For any_ two ARAG cases in the system, their ARAG external references (DJ00xxxxxx) must be different.

**Validates: Requirements 1.6**

### Property 5: Minuta Amount Calculation

_For any_ base fee B and VAT rate R, the minuta total should equal B + (B × R / 100), with the VAT amount being exactly (B × R / 100).

**Validates: Requirements 2.3, 2.4**

### Property 6: Document History Recording

_For any_ document generation (minuta or suplido), a corresponding record should be created in document_history with: case_id matching the case, document_type matching the document type, file_path pointing to an existing file, and generated_at timestamp.

**Validates: Requirements 2.6, 5.5, 7.6**

### Property 7: Digital Signature Application

_For any_ generated PDF document (minuta or suplido), after signing: the signed file should exist, the document_history.signed flag should be 1, and the signed file should differ from the original.

**Validates: Requirements 3.1, 3.2, 3.3, 7.5**

### Property 8: Email Subject Format

_For any_ ARAG case with reference DJ00xxxxxx, the email subject for minuta should be exactly `{aragReference} - MINUTA`.

**Validates: Requirements 4.3**

### Property 9: Email History Recording

_For any_ email sent, a corresponding record should be created in email_history with: case_id, recipient, subject, sent_at timestamp, and status ('SENT' or 'ERROR').

**Validates: Requirements 4.4, 4.5**

### Property 10: Workflow Step Ordering

_For any_ minuta workflow execution, the steps should execute in order: generate PDF → sign PDF → record document → send email → record email. If any step fails, subsequent steps should not execute.

**Validates: Requirements 5.1**

### Property 11: Case State Validity

_For any_ ARAG case, the state should always be one of: 'ABIERTO', 'JUDICIAL', or 'ARCHIVADO'.

**Validates: Requirements 6.1**

### Property 12: Judicial Transition Requirements

_For any_ ARAG case transitioning to Judicial state: the transition should only succeed if a valid partido judicial is provided, the judicial_date should be recorded, and the case should remain in active (non-archived) status.

**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 13: Suplido State Restriction

_For any_ suplido generation request, it should succeed only if the case is in 'JUDICIAL' state.

**Validates: Requirements 6.6**

### Property 14: Partido Judicial Validation

_For any_ suplido generation or judicial transition, the partido judicial must be one of: Torrox, Vélez-Málaga, Torremolinos, Fuengirola, Marbella, Estepona, Antequera.

**Validates: Requirements 7.2**

### Property 15: Mileage Amount Calculation

_For any_ suplido generation with a selected distrito, the calculated amount should equal the configured mileage rate for that distrito.

**Validates: Requirements 7.3**

### Property 16: Multiple Suplidos Per Case

_For any_ judicial ARAG case, multiple suplidos can be generated, and each should have its own document_history record.

**Validates: Requirements 7.4**

### Property 17: Mileage Rate Validation

_For any_ mileage rate configuration update, the system should reject non-positive numbers.

**Validates: Requirements 8.3**

### Property 18: Archive Requirements

_For any_ case archive operation, it should succeed only if a valid closure date is provided, and the state should change to 'ARCHIVADO'.

**Validates: Requirements 9.1, 9.2**

### Property 19: Archived Case Document Restriction

_For any_ archived case, document generation (minuta or suplido) should fail.

**Validates: Requirements 9.3**

### Property 20: History Preservation on Archive

_For any_ archived case, all document_history and email_history records should remain accessible.

**Validates: Requirements 9.4**

### Property 21: History Ordering

_For any_ case history query, documents and emails should be returned in descending order by date (most recent first).

**Validates: Requirements 10.5**

### Property 22: PDF Format Compliance

_For any_ generated PDF, it should be in A4 format, currency values should use Spanish locale (€ symbol, comma decimal), and dates should be in DD/MM/YYYY format.

**Validates: Requirements 11.4, 11.5, 11.6**

### Property 23: SMTP Configuration Validation

_For any_ SMTP configuration update, the system should validate that host, port, and user are provided before saving.

**Validates: Requirements 12.3**

## Error Handling

### API Error Response Format

```javascript
{
  "error": {
    "code": "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "WORKFLOW_ERROR" | "SMTP_ERROR",
    "message": "Human-readable error message in Spanish",
    "field": "fieldName" | null,
    "step": "generate" | "sign" | "email" | null  // For workflow errors
  }
}
```

### HTTP Status Codes

- 200: Success
- 400: Validation error (invalid input, wrong state)
- 404: Resource not found (case, document)
- 409: Conflict (duplicate reference)
- 500: Server error (PDF generation, signing, SMTP)

### Workflow Error Recovery

```javascript
// Workflow result with error information
{
  "success": false,
  "steps": [
    { "step": "generate", "status": "completed", "path": "/data/documents/..." },
    { "step": "sign", "status": "completed", "path": "/data/documents/..._signed.pdf" },
    { "step": "email", "status": "failed", "error": "SMTP connection refused" }
  ],
  "documentId": 123,  // Document was created before email failed
  "emailId": null     // Email record shows ERROR status
}
```

### Error Messages (Spanish)

```javascript
const ERROR_MESSAGES = {
  CASE_NOT_FOUND: "Expediente no encontrado",
  NOT_ARAG_CASE: "Solo expedientes ARAG pueden generar minutas",
  CASE_ARCHIVED: "No se pueden generar documentos en expedientes archivados",
  NOT_JUDICIAL: "Solo expedientes judiciales pueden generar suplidos",
  INVALID_DISTRICT: "Partido judicial inválido",
  INVALID_ARAG_REF:
    "Formato de referencia ARAG inválido. Debe ser DJ00 seguido de 6 dígitos",
  DUPLICATE_ARAG_REF: "Ya existe un expediente con esta referencia ARAG",
  CLOSURE_DATE_REQUIRED: "La fecha de cierre es obligatoria para archivar",
  SMTP_NOT_CONFIGURED:
    "SMTP no configurado. Configure el servidor de correo en Configuración.",
  PDF_GENERATION_FAILED: "Error al generar el documento PDF",
  SIGNATURE_FAILED: "Error al firmar el documento",
  EMAIL_SEND_FAILED: "Error al enviar el correo electrónico",
};
```

## Testing Strategy

### Unit Tests

- ARAG reference format validation (DJ00xxxxxx pattern)
- Internal reference generation (IY + 6 digits)
- Minuta amount calculations (base + VAT)
- Mileage amount lookup by district
- Date formatting (Spanish locale)
- Currency formatting (Spanish locale)
- State transition validation
- Configuration value validation

### Property-Based Tests

Using fast-check library, minimum 100 iterations per property.

```javascript
// Example: Property 1 - ARAG Reference Format Validation
// Feature: expedientes-arag, Property 1: ARAG Reference Format Validation
// Validates: Requirements 1.1, 1.5
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateAragExternalReference } from "../services/referenceGenerator.js";

describe("ARAG Reference Validation", () => {
  it("should accept valid DJ00 + 6 digits format", () => {
    fc.assert(
      fc.property(
        fc.stringOf(
          fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
          { minLength: 6, maxLength: 6 },
        ),
        (digits) => {
          const validRef = `DJ00${digits}`;
          expect(validateAragExternalReference(validRef)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject invalid formats", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^DJ00\d{6}$/.test(s)),
        (invalidRef) => {
          expect(validateAragExternalReference(invalidRef)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Example: Property 5 - Minuta Amount Calculation
// Feature: expedientes-arag, Property 5: Minuta Amount Calculation
// Validates: Requirements 2.3, 2.4
describe("Minuta Amount Calculation", () => {
  it("should calculate total as base + (base * vatRate / 100)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        (baseFee, vatRate) => {
          const expectedVat = baseFee * (vatRate / 100);
          const expectedTotal = baseFee + expectedVat;

          const result = calculateMinutaAmounts(baseFee, vatRate);

          expect(result.vatAmount).toBeCloseTo(expectedVat, 2);
          expect(result.total).toBeCloseTo(expectedTotal, 2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Example: Property 14 - Partido Judicial Validation
// Feature: expedientes-arag, Property 14: Partido Judicial Validation
// Validates: Requirements 7.2
describe("Partido Judicial Validation", () => {
  const VALID_DISTRICTS = [
    "Torrox",
    "Vélez-Málaga",
    "Torremolinos",
    "Fuengirola",
    "Marbella",
    "Estepona",
    "Antequera",
  ];

  it("should accept only valid districts", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_DISTRICTS), (district) => {
        expect(isValidJudicialDistrict(district)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("should reject invalid districts", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !VALID_DISTRICTS.includes(s)),
        (invalidDistrict) => {
          expect(isValidJudicialDistrict(invalidDistrict)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### Integration Tests

- Complete minuta workflow (generate → sign → email)
- Suplido generation for judicial cases
- Case state transitions (Abierto → Judicial → Archivado)
- Document history recording and retrieval
- Email history recording and retrieval
- Configuration updates and effects

### End-to-End Tests

- Create ARAG case → Generate minuta → Verify email sent
- Create ARAG case → Transition to judicial → Generate suplido
- Archive case → Verify document generation blocked

## File Structure (New/Modified Files)

```
src/
├── server/
│   ├── routes/
│   │   └── arag.js                    # NEW: ARAG-specific routes
│   ├── services/
│   │   ├── pdfGeneratorService.js     # NEW: PDF generation
│   │   ├── signatureService.js        # NEW: Digital signatures
│   │   ├── emailService.js            # NEW: SMTP email sending
│   │   ├── minutaWorkflowService.js   # NEW: Workflow orchestration
│   │   ├── documentHistoryService.js  # NEW: Document history CRUD
│   │   └── emailHistoryService.js     # NEW: Email history CRUD
│   └── __tests__/
│       ├── pdfGenerator.test.js       # NEW
│       ├── signatureService.test.js   # NEW
│       ├── emailService.test.js       # NEW
│       ├── minutaWorkflow.test.js     # NEW
│       └── aragValidation.test.js     # NEW
├── client/
│   ├── js/
│   │   └── components/
│   │       └── facturacionArag.js     # MODIFY: Add real functionality
│   └── css/
│       └── facturacion.css            # NEW: Facturación-specific styles
├── data/
│   ├── documents/                     # NEW: PDF storage directory
│   │   └── {year}/
│   │       └── {reference}/
│   │           ├── minuta_*.pdf
│   │           └── suplido_*.pdf
│   └── certificates/                  # NEW: Signature certificates
│       └── firma.p12
└── migrations/
    └── 002_smtp_configuration.sql     # NEW: SMTP config keys
```

## Dependencies (package.json additions)

```json
{
  "dependencies": {
    "pdfkit": "^0.14.0",
    "pdf-lib": "^1.17.1",
    "nodemailer": "^6.9.0"
  }
}
```
