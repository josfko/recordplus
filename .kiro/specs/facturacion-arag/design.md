# Facturación ARAG - Technical Design

## 1. Overview

### 1.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Vanilla JS + CSS | Facturación view UI |
| API | Express.js | REST endpoints |
| PDF | pdfkit | Document generation |
| Email | nodemailer | SMTP delivery |
| Database | SQLite (better-sqlite3) | Persistence |
| Signature (Visual) | pdf-lib | Visual annotation (current) |
| Signature (Crypto) | @signpdf/signpdf, node-forge | Cryptographic signing (Phase 4, optional) |

### 1.2 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (SPA)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FacturacionAragView.js                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────┐ │   │
│  │  │ Minuta Card │  │Suplido Card │  │    History Timeline          │ │   │
│  │  │ - Fee calc  │  │ - District  │  │    - Documents               │ │   │
│  │  │ - Generate  │  │ - Amount    │  │    - Emails                  │ │   │
│  │  └─────────────┘  └─────────────┘  └──────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP /api/*
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (Express)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         routes/arag.js                               │   │
│  │  POST /:id/minuta    POST /:id/suplido    GET /:id/history          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MinutaWorkflowService.js                          │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────┐  │   │
│  │  │PDFGenerator   │ │SignatureService│ │    EmailService          │  │   │
│  │  │ - generateMin │ │ - signPDF()   │ │    - sendEmail()         │  │   │
│  │  │ - generateSup │ │               │ │    - testConnection()    │  │   │
│  │  └───────────────┘ └───────────────┘ └───────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         History Services                             │   │
│  │  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │   │
│  │  │  DocumentHistoryService  │  │     EmailHistoryService          │ │   │
│  │  │  - create()              │  │     - create()                   │ │   │
│  │  │  - getByCaseId()         │  │     - getByCaseId()              │ │   │
│  │  └──────────────────────────┘  └──────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SQLite Database                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │   cases     │  │ document_history │  │  email_history  │  │  config   │ │
│  └─────────────┘  └──────────────────┘  └─────────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Components and Interfaces

### 2.1 MinutaWorkflowService

Orchestrates the complete document generation workflow.

```javascript
// src/server/services/minutaWorkflowService.js

export class MinutaWorkflowService {
  constructor(config) {
    this.pdfGenerator = new PDFGeneratorService(config.documents_path);
    this.signatureService = new SignatureService(
      config.certificate_path,
      config.certificate_password
    );
    this.emailService = new EmailService(config);
    this.documentHistory = new DocumentHistoryService();
    this.emailHistory = new EmailHistoryService();
  }

  /**
   * Execute complete minuta workflow
   * @param {Object} caseData - Case information
   * @param {Object} config - System configuration
   * @returns {Promise<WorkflowResult>}
   */
  async executeMinutaWorkflow(caseData, config) {
    const result = {
      steps: [],
      success: false,
      documentId: null,
      emailId: null
    };

    // Step 1: Generate PDF
    const pdfPath = await this.pdfGenerator.generateMinuta(caseData, config);

    // Step 2: Sign PDF (visual only in Phase 1)
    const signedPath = await this.signatureService.signPDF(pdfPath);

    // Step 3: Record document
    const docRecord = this.documentHistory.create({
      caseId: caseData.id,
      documentType: 'MINUTA',
      filePath: signedPath,
      signed: 1
    });

    // Step 4: Send email (if configured)
    if (this.emailService.isConfigured()) {
      await this.emailService.sendEmail({
        to: config.arag_email,
        subject: `${caseData.aragReference} - MINUTA`,
        attachmentPath: signedPath
      });

      // Step 5: Record email
      this.emailHistory.create({
        caseId: caseData.id,
        documentId: docRecord.id,
        recipient: config.arag_email,
        subject: `${caseData.aragReference} - MINUTA`,
        status: 'SENT'
      });
    }

    return result;
  }

  async executeSuplidoWorkflow(caseData, district, amount, config) {
    // Similar workflow for suplido generation
  }
}
```

### 2.2 PDFGeneratorService

Generates PDF documents using pdfkit.

```javascript
// src/server/services/pdfGeneratorService.js

export class PDFGeneratorService {
  constructor(documentsPath) {
    this.documentsPath = documentsPath;
  }

  /**
   * Generate ARAG minuta PDF
   * @param {Object} caseData - Case information
   * @param {Object} config - Configuration with fees
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateMinuta(caseData, config) {
    const baseFee = parseFloat(config.arag_base_fee) || 203.00;
    const vatRate = parseFloat(config.vat_rate) || 21;
    const vatAmount = baseFee * (vatRate / 100);
    const total = baseFee + vatAmount;

    // Create output directory: data/documents/YYYY/IYxxxxxx/
    const year = new Date().getFullYear();
    const ref = caseData.internalReference;
    const outputDir = join(this.documentsPath, year.toString(), ref);
    mkdirSync(outputDir, { recursive: true });

    const filename = `minuta_${Date.now()}.pdf`;
    const outputPath = join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(18).font('Helvetica-Bold')
         .text('MINUTA DE HONORARIOS', { align: 'center' });

      // Case details
      doc.fontSize(12).font('Helvetica');
      doc.text(`Cliente: ${caseData.clientName}`);
      doc.text(`Referencia ARAG: ${caseData.aragReference}`);
      doc.text(`Referencia Interna: ${caseData.internalReference}`);
      doc.text(`Fecha: ${this.formatDate(new Date())}`);

      // Fee breakdown
      doc.text('Honorarios profesionales', 50);
      doc.text(this.formatCurrency(baseFee), 450, { align: 'right' });

      doc.text(`IVA (${vatRate}%)`, 50);
      doc.text(this.formatCurrency(vatAmount), 450, { align: 'right' });

      doc.font('Helvetica-Bold');
      doc.text('TOTAL', 50);
      doc.text(this.formatCurrency(total), 450, { align: 'right' });

      doc.end();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  async generateSuplido(caseData, district, amount) {
    // Similar structure for suplido PDF
  }

  formatDate(date) {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR'
    }).format(amount);
  }
}
```

### 2.3 SignatureService (Strategy Pattern)

Uses strategy pattern to support both visual and cryptographic signatures.

```javascript
// src/server/services/signatureService.js

/**
 * Strategy interface for PDF signing
 */
class SignatureStrategy {
  async sign(pdfBuffer) { throw new Error('Not implemented'); }
  getInfo() { return { type: 'unknown' }; }
}

/**
 * Visual signature - adds text box (current implementation)
 */
class VisualSignatureStrategy extends SignatureStrategy {
  async sign(pdfBuffer) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

    // Add visual signature box
    lastPage.drawRectangle({
      x: 50, y: 35, width: 250, height: 35,
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 0.5
    });

    lastPage.drawText('Documento firmado digitalmente', {
      x: 55, y: 55, size: 8, color: rgb(0.3, 0.3, 0.3)
    });

    const signatureDate = new Date().toLocaleString('es-ES');
    lastPage.drawText(`Fecha de firma: ${signatureDate}`, {
      x: 55, y: 43, size: 8, color: rgb(0.3, 0.3, 0.3)
    });

    return await pdfDoc.save();
  }

  getInfo() {
    return { type: 'visual', details: 'Firma visual (no criptográfica)' };
  }
}

/**
 * Cryptographic signature - uses P12 certificate (Phase 4)
 * Requires: @signpdf/signpdf, @signpdf/signer-p12, node-forge
 */
class CryptoSignatureStrategy extends SignatureStrategy {
  constructor(certPath, certPassword) {
    super();
    this.certPath = certPath;
    this.certPassword = certPassword;
  }

  async sign(pdfBuffer) {
    // Phase 4 implementation:
    // import signpdf from '@signpdf/signpdf';
    // import { P12Signer } from '@signpdf/signer-p12';
    // import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
    //
    // const pdfDoc = await PDFDocument.load(pdfBuffer);
    // pdflibAddPlaceholder({ pdfDoc, reason: 'Factura ARAG', ... });
    // const signer = new P12Signer(certBuffer, { passphrase: this.certPassword });
    // return signpdf.sign(await pdfDoc.save(), signer);

    throw new Error('Firma criptográfica no configurada. Configure certificado .p12');
  }

  getInfo() {
    return { type: 'cryptographic', details: 'Firma criptográfica P12' };
  }
}

/**
 * Main service - auto-selects strategy based on config
 */
export class SignatureService {
  constructor(certificatePath, certificatePassword) {
    // Auto-select strategy based on certificate availability
    if (certificatePath && certificatePath.trim() !== '') {
      this.strategy = new CryptoSignatureStrategy(certificatePath, certificatePassword);
    } else {
      this.strategy = new VisualSignatureStrategy();
    }
  }

  async signPDF(pdfPath) {
    const pdfBytes = readFileSync(pdfPath);
    const signedBytes = await this.strategy.sign(pdfBytes);

    const signedPath = pdfPath.replace('.pdf', '_signed.pdf');
    writeFileSync(signedPath, signedBytes);
    return signedPath;
  }

  getSignatureInfo() {
    return this.strategy.getInfo();
  }
}
```

### 2.4 EmailService

Handles SMTP email delivery.

```javascript
// src/server/services/emailService.js

export class EmailService {
  constructor(config) {
    this.config = config;
    this.transporter = null;

    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure === 'true',
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password
        }
      });
    }
  }

  isConfigured() {
    return !!(
      this.config.smtp_host &&
      this.config.smtp_user &&
      this.config.smtp_password
    );
  }

  async sendEmail({ to, subject, body, attachmentPath }) {
    if (!this.transporter) {
      throw new Error('SMTP not configured');
    }

    await this.transporter.sendMail({
      from: this.config.smtp_from,
      to,
      subject,
      text: body,
      attachments: attachmentPath ? [{
        filename: basename(attachmentPath),
        path: attachmentPath
      }] : []
    });
  }

  static formatMinutaSubject(aragReference) {
    return `${aragReference} - MINUTA`;
  }

  static formatSuplidoSubject(aragReference, district) {
    return `${aragReference} - SUPLIDO ${district}`;
  }
}
```

---

## 3. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cases/:id/minuta` | Generate and send minuta |
| POST | `/api/cases/:id/suplido` | Generate suplido |
| GET | `/api/cases/:id/history` | Get document/email history |
| GET | `/api/documents/:id/download` | Download document |
| POST | `/api/email/test` | Test SMTP connection |
| GET | `/api/arag/mileage-rates` | Get mileage rates |

### 3.1 POST /api/cases/:id/minuta

**Request:**
```
POST /api/cases/123/minuta
Content-Type: application/json
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "steps": [
      { "step": "generate", "status": "completed", "path": "/data/documents/2026/IY004921/minuta_1706745600000.pdf" },
      { "step": "sign", "status": "completed", "path": "/data/documents/2026/IY004921/minuta_1706745600000_signed.pdf" },
      { "step": "email", "status": "completed" }
    ],
    "documentId": 45,
    "emailId": 23
  }
}
```

**Response (SMTP not configured):**
```json
{
  "success": true,
  "data": {
    "steps": [
      { "step": "generate", "status": "completed" },
      { "step": "sign", "status": "completed" },
      { "step": "email", "status": "skipped", "message": "SMTP no configurado" }
    ],
    "documentId": 45,
    "emailId": null
  }
}
```

### 3.2 POST /api/cases/:id/suplido

**Request:**
```json
{
  "district": "Vélez-Málaga"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "steps": [
      { "step": "generate", "status": "completed" },
      { "step": "sign", "status": "completed" }
    ],
    "documentId": 46,
    "amount": 25.50,
    "district": "Vélez-Málaga"
  }
}
```

---

## 4. Data Models

### 4.1 Case (relevant fields)

```typescript
interface Case {
  id: number;
  type: 'ARAG' | 'PARTICULAR' | 'TURNO_OFICIO';
  client_name: string;
  internal_reference: string;      // IYxxxxxx
  arag_reference: string | null;   // DJ00xxxxxx (ARAG only)
  state: 'ABIERTO' | 'JUDICIAL' | 'ARCHIVADO';
  entry_date: string;              // ISO date
  judicial_date: string | null;    // When transitioned to JUDICIAL
  judicial_district: string | null;
  closure_date: string | null;
  observations: string;
}
```

### 4.2 DocumentHistory

```typescript
interface DocumentHistory {
  id: number;
  case_id: number;
  document_type: 'MINUTA' | 'SUPLIDO' | 'HOJA_ENCARGO' | 'MANUAL_UPLOAD';
  file_path: string;
  generated_at: string;  // ISO datetime
  signed: 0 | 1;
  created_at: string;
}
```

### 4.3 EmailHistory

```typescript
interface EmailHistory {
  id: number;
  case_id: number;
  document_id: number | null;
  recipient: string;
  subject: string;
  sent_at: string;       // ISO datetime
  status: 'SENT' | 'ERROR';
  error_message: string | null;
  created_at: string;
}
```

### 4.4 Configuration

```typescript
interface Configuration {
  arag_base_fee: string;     // "203.00"
  vat_rate: string;          // "21"
  arag_email: string;        // "facturacionsiniestros@arag.es"
  mileage_torrox: string;
  mileage_velez_malaga: string;
  mileage_torremolinos: string;
  mileage_fuengirola: string;
  mileage_marbella: string;
  mileage_estepona: string;
  mileage_antequera: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
}
```

---

## 5. Database Schema

```sql
-- Document history table
CREATE TABLE document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    signed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Email history table
CREATE TABLE email_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES document_history(id),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'ERROR')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_document_history_case_id ON document_history(case_id);
CREATE INDEX idx_email_history_case_id ON email_history(case_id);
CREATE INDEX idx_document_history_type ON document_history(document_type);
```

---

## 6. Correctness Properties

### Property 1: Fee Calculation Accuracy

_For any_ minuta generated with base fee B and VAT rate V, the total SHALL equal B + (B × V / 100).

**Validates: Requirements 3.1.1**

```javascript
// Property-based test
fc.property(
  fc.float({ min: 0.01, max: 10000 }),  // base fee
  fc.integer({ min: 0, max: 100 }),      // vat rate
  (baseFee, vatRate) => {
    const expected = baseFee + (baseFee * vatRate / 100);
    const actual = calculateTotal(baseFee, vatRate);
    return Math.abs(actual - expected) < 0.01;
  }
);
```

### Property 2: Document Path Uniqueness

_For any_ two documents generated for the same case, their file paths SHALL be unique.

**Validates: Requirements 3.1.5**

### Property 3: State Validation

_For any_ suplido generation attempt, IF the case state is not JUDICIAL, THE System SHALL reject with error.

**Validates: Requirements 3.2.1**

### Property 4: Email Subject Format

_For any_ minuta email, the subject SHALL match the pattern `^DJ00\d{6} - MINUTA$`.

**Validates: Requirements 3.6.2**

### Property 5: History Completeness

_For any_ document generation workflow, IF the workflow completes successfully, THEN a document_history record SHALL exist.

**Validates: Requirements 3.1.5**

### Property 6: District Validation

_For any_ suplido generation, the district SHALL be one of the 7 valid judicial districts.

**Validates: Requirements 3.2.2**

### Property 7: Archived Case Protection

_For any_ case with state ARCHIVADO, document generation requests SHALL be rejected.

**Validates: Requirements 3.1.7, 3.2.8**

### Property 8: Suplido Email Subject Format

_For any_ suplido document with valid ARAG reference and district, the email subject SHALL match the pattern `^DJ00\d{6} - SUPLIDO - .+$`.

**Validates: Requirements 3.2.9, 3.2.10**

---

## 7. Error Handling

### 7.1 Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message in Spanish",
    "field": "optional_field_name"
  }
}
```

### 7.2 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NOT_FOUND` | 404 | Case or document not found |
| `INVALID_STATE` | 400 | Operation not allowed in current state |
| `SMTP_NOT_CONFIGURED` | 400 | SMTP settings missing |
| `SMTP_ERROR` | 500 | Email sending failed |
| `PDF_ERROR` | 500 | PDF generation failed |
| `SIGNATURE_ERROR` | 500 | Signature process failed |

### 7.3 Workflow Error Recovery

When a workflow step fails:

1. Mark current step as "failed" with error message
2. If document was already created, keep the record
3. If email failed, record error in email_history
4. Return partial result with failed step info
5. Allow user to retry failed steps

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Service | Test Coverage |
|---------|---------------|
| PDFGeneratorService | Fee calculations, date formatting, file creation |
| SignatureService | PDF modification, visual indicator placement |
| EmailService | SMTP configuration validation, subject formatting |
| MinutaWorkflowService | Step orchestration, error handling |

### 8.2 Property-Based Tests

Using fast-check for:
- Fee calculation accuracy (Property 1)
- Email subject format (Property 4)
- District validation (Property 6)

### 8.3 Integration Tests

| Scenario | Coverage |
|----------|----------|
| Full minuta workflow | Generate → Sign → Record → Email |
| Suplido workflow | Validate state → Generate → Sign → Record |
| History retrieval | Documents and emails combined |
| Error recovery | Partial workflow completion |

### 8.4 E2E Tests

| Flow | Steps |
|------|-------|
| Generate minuta | Navigate → Click generate → Verify toast → Check history |
| Generate suplido | Select district → Generate → Verify amount in history |
| View history | Navigate → Verify document list → Download document |

---

## 9. File Structure

```
src/
├── server/
│   ├── routes/
│   │   └── arag.js                    # ARAG-specific endpoints
│   ├── services/
│   │   ├── minutaWorkflowService.js   # Workflow orchestrator
│   │   ├── pdfGeneratorService.js     # PDF generation
│   │   ├── signatureService.js        # Visual signature
│   │   ├── emailService.js            # SMTP delivery
│   │   ├── documentHistoryService.js  # Document tracking
│   │   └── emailHistoryService.js     # Email tracking
│   └── __tests__/
│       ├── minutaWorkflow.test.js
│       ├── pdfGenerator.test.js
│       └── signatureService.test.js
│
├── client/
│   ├── js/
│   │   └── components/
│   │       └── facturacionArag.js     # Facturación view
│   └── css/
│       └── main.css                   # Includes facturación styles
│
└── data/
    └── documents/
        └── {YEAR}/
            └── {REFERENCE}/
                ├── minuta_{timestamp}.pdf
                └── minuta_{timestamp}_signed.pdf
```

---

## 10. Phase 2 Considerations (Future)

### 10.1 Real Digital Signatures

For Phase 2, implement cryptographic PDF signing:

1. Use library like `node-signpdf` or `pdf-lib` with certificate
2. Support PKCS#12 (.p12/.pfx) certificate format
3. Add certificate upload in Configuration
4. Validate certificate expiration
5. Add visible signature annotation with certificate info

### 10.2 PDF Template Improvements

Consider:
- Law firm logo/header
- Professional invoice layout
- Configurable footer text
- QR code for verification

### 10.3 Email Enhancements

Consider:
- HTML email templates
- Delivery receipts
- Retry queue for failed emails
- Bulk email sending
