# Design Document: Expedientes Particulares

## Overview

This document describes the technical design for the Private Client Cases (Expedientes Particulares) module. The module extends the existing core case management system to provide document generation (Hoja de Encargo), digital signatures, and email delivery for private client engagements.

This module reuses existing services from the ARAG module (PDFGeneratorService, SignatureService, EmailService) with extensions for Hoja de Encargo specific functionality.

**Technology Stack:**

- **Backend**: Node.js + Express + better-sqlite3 (SQLite)
- **Frontend**: Vanilla JavaScript with ES Modules, pure CSS
- **PDF Generation**: PDFKit (existing)
- **Digital Signature**: pdf-lib (existing)
- **Email**: Nodemailer with SMTP (existing)
- **Server**: Clouding.io VPS (Barcelona, Spain)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Vanilla JS)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Particulares   │  │   CaseDetail    │  │  HojaEncargo    │             │
│  │    ListView     │  │     View        │  │     Modal       │             │
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
│  │  POST /api/cases/:id/hoja-encargo  - Generate Hoja de Encargo         │  │
│  │  POST /api/cases/:id/hoja-encargo/sign - Sign document                │  │
│  │  POST /api/cases/:id/hoja-encargo/send - Send via email               │  │
│  │  GET  /api/documents/:id/download  - Download PDF (existing)          │  │
│  │  GET  /api/cases/:id/history       - Get case history (existing)      │  │
│  └─────────────────────────────┬─────────────────────────────────────────┘  │
│                                │                                            │
│  ┌─────────────────────────────┼─────────────────────────────────────────┐  │
│  │                         Services                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ PDFGenerator │  │ SignService  │  │ EmailService │                 │  │
│  │  │   Service    │  │  (existing)  │  │  (existing)  │                 │  │
│  │  │  + Hoja      │  │              │  │              │                 │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │  │
│  │         │                 │                 │                          │  │
│  │  ┌──────┴─────────────────┴─────────────────┴──────┐                  │  │
│  │  │          HojaEncargoWorkflowService             │                  │  │
│  │  │  (Orchestrates: input → generate → sign → email)│                  │  │
│  │  └─────────────────────┬───────────────────────────┘                  │  │
│  └────────────────────────┼──────────────────────────────────────────────┘  │
│                           │                                                  │
│  ┌────────────────────────┼──────────────────────────────────────────────┐  │
│  │                    Data Layer                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ CaseService  │  │ DocumentHist │  │ EmailHistory │                 │  │
│  │  │  (existing)  │  │   Service    │  │   Service    │                 │  │
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
                    │        └── IY-26-001/   │
                    │            └── hoja_encargo.pdf│
                    └─────────────────────────┘
```

## Components and Interfaces

### PDF Generator Service Extension

```javascript
// src/server/services/pdfGeneratorService.js (extend existing)
/**
 * Generate Hoja de Encargo (Engagement Letter) PDF
 * @param {Object} caseData - Case information
 * @param {Object} hojaData - Hoja de Encargo specific data
 * @param {string} hojaData.services - Services description
 * @param {number} hojaData.fees - Professional fees amount
 * @param {Object} config - Configuration with template
 * @returns {Promise<string>} Path to generated PDF
 */
async generateHojaEncargo(caseData, hojaData, config) {
  const { services, fees } = hojaData;

  const year = new Date().getFullYear();
  const ref = caseData.internal_reference;
  const outputDir = join(this.documentsPath, year.toString(), ref);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = `hoja_encargo_${Date.now()}.pdf`;
  const outputPath = join(outputDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = createWriteStream(outputPath);

    doc.pipe(stream);

    // Header
    doc.fontSize(18).font('Helvetica-Bold')
       .text('HOJA DE ENCARGO PROFESIONAL', { align: 'center' });
    doc.moveDown(2);

    // Client details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Cliente: ${caseData.client_name}`);
    doc.text(`Referencia: ${caseData.internal_reference}`);
    doc.text(`Fecha: ${this.formatDate(new Date())}`);
    doc.moveDown(2);

    // Services section
    doc.font('Helvetica-Bold').text('SERVICIOS CONTRATADOS:');
    doc.moveDown(0.5);
    doc.font('Helvetica').text(services);
    doc.moveDown(2);

    // Fees section
    doc.font('Helvetica-Bold').text('HONORARIOS PROFESIONALES:');
    doc.moveDown(0.5);
    doc.font('Helvetica').text(this.formatCurrency(fees));
    doc.moveDown(2);

    // Terms and signature area
    doc.font('Helvetica-Bold').text('CONDICIONES:');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text('El cliente acepta los términos y condiciones del presente encargo profesional.');
    doc.moveDown(3);

    // Signature lines
    doc.text('_______________________          _______________________');
    doc.text('      Firma del Cliente                    Firma del Abogado');

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}
```

### Hoja Encargo Workflow Service

```javascript
// src/server/services/hojaEncargoWorkflowService.js
import { PDFGeneratorService } from './pdfGeneratorService.js';
import { SignatureService } from './signatureService.js';
import { EmailService } from './emailService.js';
import { DocumentHistoryService } from './documentHistoryService.js';
import { EmailHistoryService } from './emailHistoryService.js';

export class HojaEncargoWorkflowService {
  constructor(config) {
    this.pdfGenerator = new PDFGeneratorService(config.documents_path || './data/documents');
    this.signatureService = new SignatureService(
      config.certificate_path,
      config.certificate_password
    );
    this.emailService = new EmailService(config);
    this.documentHistory = new DocumentHistoryService();
    this.emailHistory = new EmailHistoryService();
  }

  /**
   * Generate Hoja de Encargo PDF
   * @param {Object} caseData - Case information
   * @param {Object} hojaData - Services and fees data
   * @param {Object} config - System configuration
   * @returns {Promise<Object>} Generation result with document ID
   */
  async generateHojaEncargo(caseData, hojaData, config) {
    // Validate inputs
    if (!hojaData.services || hojaData.services.trim().length === 0) {
      throw new Error('La descripción de servicios es obligatoria');
    }
    if (!hojaData.fees || hojaData.fees <= 0) {
      throw new Error('Los honorarios deben ser un número positivo');
    }

    const pdfPath = await this.pdfGenerator.generateHojaEncargo(caseData, hojaData, config);

    const docRecord = this.documentHistory.create({
      caseId: caseData.id,
      documentType: 'HOJA_ENCARGO',
      filePath: pdfPath,
      signed: 0
    });

    return {
      success: true,
      documentId: docRecord.id,
      path: pdfPath
    };
  }

  /**
   * Sign an existing Hoja de Encargo
   * @param {number} documentId - Document history ID
   * @returns {Promise<Object>} Sign result
   */
  async signDocument(documentId) {
    const doc = this.documentHistory.getById(documentId);
    if (!doc) {
      throw new Error('Documento no encontrado');
    }

    if (doc.signed) {
      throw new Error('El documento ya está firmado');
    }

    const signedPath = await this.signatureService.signPDF(doc.file_path);
    this.documentHistory.updateSigned(documentId, true);
    this.documentHistory.updateFilePath(documentId, signedPath);

    return {
      success: true,
      signedPath
    };
  }

  /**
   * Send Hoja de Encargo via email
   * @param {Object} caseData - Case information
   * @param {number} documentId - Document history ID
   * @param {string} recipientEmail - Client email address
   * @returns {Promise<Object>} Email result
   */
  async sendByEmail(caseData, documentId, recipientEmail) {
    const doc = this.documentHistory.getById(documentId);
    if (!doc) {
      throw new Error('Documento no encontrado');
    }

    const subject = `Hoja de Encargo - ${caseData.internal_reference} - ${caseData.client_name}`;
    const body = `Estimado/a ${caseData.client_name},\n\nAdjunto encontrará la Hoja de Encargo correspondiente a los servicios profesionales acordados.\n\nAtentamente,\nEl Despacho`;

    try {
      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        body,
        attachmentPath: doc.file_path
      });

      const emailRecord = this.emailHistory.create({
        caseId: caseData.id,
        documentId: doc.id,
        recipient: recipientEmail,
        subject,
        status: 'SENT'
      });

      return {
        success: true,
        emailId: emailRecord.id
      };
    } catch (error) {
      this.emailHistory.create({
        caseId: caseData.id,
        documentId: doc.id,
        recipient: recipientEmail,
        subject,
        status: 'ERROR',
        errorMessage: error.message
      });
      throw error;
    }
  }
}
```

### API Routes

```javascript
// src/server/routes/particulares.js
import { Router } from 'express';
import { HojaEncargoWorkflowService } from '../services/hojaEncargoWorkflowService.js';
import * as caseService from '../services/caseService.js';
import { getConfig } from '../services/configurationService.js';

const router = Router();

/**
 * POST /api/cases/:id/hoja-encargo
 * Generate Hoja de Encargo for a PARTICULAR case
 */
router.post('/:id/hoja-encargo', async (req, res, next) => {
  try {
    const { services, fees } = req.body;
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({ error: { message: 'Expediente no encontrado' } });
    }
    if (caseData.type !== 'PARTICULAR') {
      return res.status(400).json({
        error: { message: 'Solo expedientes Particulares pueden generar Hojas de Encargo' }
      });
    }
    if (caseData.state === 'ARCHIVADO') {
      return res.status(400).json({
        error: { message: 'No se pueden generar documentos en expedientes archivados' }
      });
    }

    const config = getConfig();
    const workflow = new HojaEncargoWorkflowService(config);
    const result = await workflow.generateHojaEncargo(caseData, { services, fees }, config);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases/:id/hoja-encargo/sign
 * Sign an existing Hoja de Encargo
 */
router.post('/:id/hoja-encargo/sign', async (req, res, next) => {
  try {
    const { documentId } = req.body;
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({ error: { message: 'Expediente no encontrado' } });
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
 * Send Hoja de Encargo via email
 */
router.post('/:id/hoja-encargo/send', async (req, res, next) => {
  try {
    const { documentId, email } = req.body;
    const caseData = caseService.getById(req.params.id);

    if (!caseData) {
      return res.status(404).json({ error: { message: 'Expediente no encontrado' } });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        error: { message: 'Formato de email inválido', field: 'email' }
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

export { router as particularesRouter };
```

### Frontend Component: Particulares List

```javascript
// src/client/js/components/particularesList.js
export class ParticularesListView {
  constructor(container) {
    this.container = container;
    this.currentPage = 1;
    this.currentFilter = 'all';
    this.searchQuery = '';
  }

  async render() {
    this.container.innerHTML = this.template();
    await this.loadCases();
    this.bindEvents();
  }

  template() {
    return `
      <div class="particulares-list">
        <div class="list-header">
          <h1>Expedientes Particulares</h1>
          <button class="btn-primary" onclick="router.navigate('/cases/new?type=PARTICULAR')">
            Nuevo Expediente
          </button>
        </div>

        <div class="filters">
          <div class="filter-group">
            <label>Estado:</label>
            <select id="state-filter">
              <option value="all">Todos</option>
              <option value="ABIERTO">Abierto</option>
              <option value="ARCHIVADO">Archivado</option>
            </select>
          </div>
          <div class="search-group">
            <input type="text" id="search-input" placeholder="Buscar por referencia o cliente...">
            <button id="search-btn" class="btn-secondary">Buscar</button>
          </div>
        </div>

        <div id="cases-table" class="data-table-container">
          <!-- Table populated by loadCases -->
        </div>

        <div id="pagination" class="pagination">
          <!-- Pagination controls -->
        </div>
      </div>
    `;
  }

  async loadCases() {
    const params = new URLSearchParams({
      type: 'PARTICULAR',
      page: this.currentPage,
      ...(this.currentFilter !== 'all' && { state: this.currentFilter }),
      ...(this.searchQuery && { search: this.searchQuery })
    });

    const response = await api.listCases(params);
    this.renderTable(response.data);
    this.renderPagination(response.pagination);
  }

  renderTable(cases) {
    const tableContainer = this.container.querySelector('#cases-table');

    if (!cases.length) {
      tableContainer.innerHTML = '<p class="no-data">No hay expedientes particulares</p>';
      return;
    }

    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Fecha Entrada</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${cases.map(c => `
            <tr>
              <td class="ref-mono">${c.internal_reference}</td>
              <td>${c.client_name}</td>
              <td><span class="state-badge state-${c.state.toLowerCase()}">${c.state}</span></td>
              <td>${this.formatDate(c.entry_date)}</td>
              <td>
                <button class="btn-icon" onclick="router.navigate('/cases/${c.id}')">
                  Ver
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-ES');
  }

  bindEvents() {
    this.container.querySelector('#state-filter').addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.currentPage = 1;
      this.loadCases();
    });

    this.container.querySelector('#search-btn').addEventListener('click', () => {
      this.searchQuery = this.container.querySelector('#search-input').value;
      this.currentPage = 1;
      this.loadCases();
    });

    this.container.querySelector('#search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.loadCases();
      }
    });
  }
}
```

### Frontend Component: Hoja Encargo Modal

```javascript
// src/client/js/components/hojaEncargoModal.js
export class HojaEncargoModal {
  constructor(caseData, onComplete) {
    this.caseData = caseData;
    this.onComplete = onComplete;
    this.documentId = null;
  }

  show() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = this.template();
    document.body.appendChild(modal);

    this.modal = modal;
    this.bindEvents();
  }

  template() {
    return `
      <div class="modal">
        <div class="modal-header">
          <h2>Generar Hoja de Encargo</h2>
          <button class="btn-close" data-action="close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="hoja-form">
            <div class="form-group">
              <label>Cliente:</label>
              <input type="text" value="${this.caseData.client_name}" disabled>
            </div>
            <div class="form-group">
              <label>Referencia:</label>
              <input type="text" value="${this.caseData.internal_reference}" disabled>
            </div>
            <div class="form-group">
              <label for="services">Servicios Contratados: *</label>
              <textarea id="services" name="services" rows="4" required
                placeholder="Describa los servicios legales a prestar..."></textarea>
            </div>
            <div class="form-group">
              <label for="fees">Honorarios (€): *</label>
              <input type="number" id="fees" name="fees" min="0.01" step="0.01" required
                placeholder="0.00">
            </div>
          </form>

          <div id="workflow-status" class="workflow-status" style="display: none;">
            <div class="step" data-step="generate">
              <span class="step-icon">📄</span>
              <span class="step-label">Generar PDF</span>
              <span class="step-status"></span>
            </div>
            <div class="step" data-step="sign">
              <span class="step-icon">✍️</span>
              <span class="step-label">Firmar</span>
              <span class="step-status"></span>
            </div>
            <div class="step" data-step="send">
              <span class="step-icon">📧</span>
              <span class="step-label">Enviar</span>
              <span class="step-status"></span>
            </div>
          </div>

          <div id="email-section" style="display: none;">
            <div class="form-group">
              <label for="client-email">Email del cliente:</label>
              <input type="email" id="client-email" placeholder="cliente@email.com">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" data-action="close">Cancelar</button>
          <button class="btn-primary" data-action="generate">Generar PDF</button>
          <button class="btn-primary" data-action="sign" style="display: none;">Firmar</button>
          <button class="btn-primary" data-action="send" style="display: none;">Enviar por Email</button>
          <button class="btn-secondary" data-action="download" style="display: none;">Descargar</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      switch (action) {
        case 'close':
          this.close();
          break;
        case 'generate':
          await this.generate();
          break;
        case 'sign':
          await this.sign();
          break;
        case 'send':
          await this.send();
          break;
        case 'download':
          this.download();
          break;
      }
    });
  }

  async generate() {
    const form = this.modal.querySelector('#hoja-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const services = this.modal.querySelector('#services').value;
    const fees = parseFloat(this.modal.querySelector('#fees').value);

    this.showWorkflowStatus();
    this.updateStep('generate', 'loading');

    try {
      const result = await api.generateHojaEncargo(this.caseData.id, { services, fees });
      this.documentId = result.data.documentId;
      this.updateStep('generate', 'success');
      this.showPostGenerateButtons();
    } catch (error) {
      this.updateStep('generate', 'error', error.message);
      showToast(error.message, 'error');
    }
  }

  async sign() {
    this.updateStep('sign', 'loading');
    try {
      await api.signHojaEncargo(this.caseData.id, this.documentId);
      this.updateStep('sign', 'success');
    } catch (error) {
      this.updateStep('sign', 'error', error.message);
      showToast(error.message, 'error');
    }
  }

  async send() {
    const email = this.modal.querySelector('#client-email').value;
    if (!email) {
      showToast('Ingrese el email del cliente', 'error');
      return;
    }

    this.updateStep('send', 'loading');
    try {
      await api.sendHojaEncargo(this.caseData.id, this.documentId, email);
      this.updateStep('send', 'success');
      showToast('Email enviado correctamente', 'success');
      this.close();
      this.onComplete();
    } catch (error) {
      this.updateStep('send', 'error', error.message);
      showToast(error.message, 'error');
    }
  }

  download() {
    window.open(`/api/documents/${this.documentId}/download`, '_blank');
  }

  showWorkflowStatus() {
    this.modal.querySelector('#workflow-status').style.display = 'flex';
    this.modal.querySelector('#hoja-form').style.display = 'none';
  }

  showPostGenerateButtons() {
    this.modal.querySelector('[data-action="generate"]').style.display = 'none';
    this.modal.querySelector('[data-action="sign"]').style.display = 'inline-block';
    this.modal.querySelector('[data-action="send"]').style.display = 'inline-block';
    this.modal.querySelector('[data-action="download"]').style.display = 'inline-block';
    this.modal.querySelector('#email-section').style.display = 'block';
  }

  updateStep(step, status, message = '') {
    const stepEl = this.modal.querySelector(`[data-step="${step}"]`);
    stepEl.className = `step step-${status}`;
    stepEl.querySelector('.step-status').textContent = message;
  }

  close() {
    this.modal.remove();
  }
}
```

## API Endpoints

```
POST /api/cases/:id/hoja-encargo       - Generate Hoja de Encargo PDF
     Body: { services: string, fees: number }
     Response: { success: true, data: { documentId, path } }

POST /api/cases/:id/hoja-encargo/sign  - Sign existing document
     Body: { documentId: number }
     Response: { success: true, data: { signedPath } }

POST /api/cases/:id/hoja-encargo/send  - Send document via email
     Body: { documentId: number, email: string }
     Response: { success: true, data: { emailId } }

GET  /api/documents/:id/download       - Download PDF (existing)
GET  /api/cases/:id/history            - Get case history (existing)
GET  /api/cases?type=PARTICULAR        - List PARTICULAR cases (existing)
```

## Data Models

### Document History (Extended)

```javascript
{
  id: Number,                    // Primary key
  case_id: Number,               // Foreign key to cases
  document_type: String,         // 'HOJA_ENCARGO' | 'MINUTA' | 'SUPLIDO'
  file_path: String,             // Full path to PDF on disk
  generated_at: String,          // ISO timestamp
  signed: Number,                // 0 or 1 (boolean)
  created_at: String             // ISO timestamp
}
```

### Email History (Existing)

```javascript
{
  id: Number,
  case_id: Number,
  document_id: Number | null,
  recipient: String,
  subject: String,
  sent_at: String,
  status: String,                // 'SENT' | 'ERROR'
  error_message: String | null,
  created_at: String
}
```

### Configuration Keys (Extended)

```javascript
// Existing keys (no changes needed)
'documents_path': './data/documents',
'certificate_path': './data/certificates/firma.p12',
'certificate_password': '',
'smtp_host': '',
'smtp_port': '587',
'smtp_secure': 'false',
'smtp_user': '',
'smtp_password': '',
'smtp_from': '',

// New key for template (optional)
'hoja_encargo_template': '...'  // Optional custom template text
```

## Database Schema

No schema changes required. The existing tables support all functionality:

```sql
-- cases table already supports type='PARTICULAR'
-- document_history already supports document_type='HOJA_ENCARGO'
-- email_history already supports all required fields
-- reference_counters already supports PARTICULAR_YYYY keys
```

## Correctness Properties

### Property 1: Particular Reference Format Validation

_For any_ string input as Particular reference, the system should accept it if and only if it matches the pattern `IY-YY-NNN` where YY is 2 digits and NNN is 3 digits.

**Validates: Requirements 1.1, 1.9**

### Property 2: Sequential Numbering Within Year

_For any_ sequence of N Particular cases created within the same year, the sequential numbers (NNN portion) should be consecutive starting from 001.

**Validates: Requirements 1.3, 1.8**

### Property 3: Reference Uniqueness

_For any_ two cases in the system (regardless of type), their internal references must be different, and no reference should ever be reused after deletion.

**Validates: Requirements 2.1, 2.3**

### Property 4: Services and Fees Validation

_For any_ Hoja de Encargo generation request, the operation should fail if services is empty/whitespace or if fees is not a positive number.

**Validates: Requirements 3.3, 3.4**

### Property 5: Document History Recording

_For any_ Hoja de Encargo generation, a corresponding record should be created in document_history with: case_id matching the case, document_type='HOJA_ENCARGO', file_path pointing to an existing file, and signed=0 initially.

**Validates: Requirements 3.9**

### Property 6: Signature State Transition

_For any_ document signing operation, the signed field should transition from 0 to 1 exactly once, and subsequent sign attempts should fail.

**Validates: Requirements 4.2**

### Property 7: Email Format Validation

_For any_ email send request, the operation should fail if the email address does not match standard email format.

**Validates: Requirements 5.6**

### Property 8: Email History Recording

_For any_ email sent (success or failure), a corresponding record should be created in email_history with correct status ('SENT' or 'ERROR').

**Validates: Requirements 5.4, 5.5**

### Property 9: Archived Case Document Restriction

_For any_ archived PARTICULAR case, document generation (Hoja de Encargo) should fail with an appropriate error.

**Validates: Requirements 7.3**

### Property 10: History Preservation on Archive

_For any_ archived case, all document_history and email_history records should remain accessible and unchanged.

**Validates: Requirements 7.4**

### Property 11: Year Counter Reset

_For any_ case created in a new calendar year, if the previous year had cases, the new year's counter should start from 001.

**Validates: Requirements 1.8**

## Error Handling

### API Error Response Format

```javascript
{
  "error": {
    "code": "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "SMTP_ERROR",
    "message": "Human-readable error message in Spanish",
    "field": "fieldName" | null
  }
}
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200  | Success | Request completed successfully |
| 400  | Bad Request | Validation error, invalid input, wrong case type |
| 404  | Not Found | Case or document doesn't exist |
| 500  | Server Error | PDF generation, signing, or SMTP failure |

### Error Messages (Spanish)

```javascript
const ERROR_MESSAGES = {
  CASE_NOT_FOUND: 'Expediente no encontrado',
  NOT_PARTICULAR_CASE: 'Solo expedientes Particulares pueden generar Hojas de Encargo',
  CASE_ARCHIVED: 'No se pueden generar documentos en expedientes archivados',
  DOCUMENT_NOT_FOUND: 'Documento no encontrado',
  ALREADY_SIGNED: 'El documento ya está firmado',
  INVALID_EMAIL: 'Formato de email inválido',
  SERVICES_REQUIRED: 'La descripción de servicios es obligatoria',
  FEES_REQUIRED: 'Los honorarios deben ser un número positivo',
  SMTP_NOT_CONFIGURED: 'SMTP no configurado. Configure el servidor de correo en Configuración.',
  PDF_GENERATION_FAILED: 'Error al generar el documento PDF',
  SIGNATURE_FAILED: 'Error al firmar el documento',
  EMAIL_SEND_FAILED: 'Error al enviar el correo electrónico'
};
```

## Testing Strategy

### Unit Tests

- Reference format validation (IY-YY-NNN pattern)
- Services/fees validation
- Email format validation
- Sequential number generation

### Property-Based Tests

Using fast-check library, minimum 100 iterations per property.

```javascript
// Example: Property 1 - Reference Format Validation
describe('Particular Reference Validation', () => {
  it('should accept valid IY-YY-NNN format', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 999 }),
        (year, num) => {
          const ref = `IY-${year.toString().padStart(2, '0')}-${num.toString().padStart(3, '0')}`;
          expect(validateParticularReference(ref)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid formats', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/^IY-\d{2}-\d{3}$/.test(s)),
        (invalidRef) => {
          expect(validateParticularReference(invalidRef)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Example: Property 4 - Services and Fees Validation
describe('Hoja Encargo Input Validation', () => {
  it('should reject empty or whitespace-only services', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.constant('   '), fc.constant('\n\t')),
        fc.float({ min: 0.01, max: 10000 }),
        (services, fees) => {
          expect(() => validateHojaEncargoInput(services, fees)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject non-positive fees', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.float({ max: 0 }),
        (services, fees) => {
          expect(() => validateHojaEncargoInput(services, fees)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

- Complete Hoja de Encargo workflow (generate → sign → email)
- Case state restrictions (archived cases cannot generate documents)
- Document history recording
- Email history recording

### End-to-End Tests

- Create PARTICULAR case → Generate Hoja de Encargo → Download PDF
- Create PARTICULAR case → Generate → Sign → Send by email
- Archive case → Verify document generation blocked

## File Structure

```
src/
├── server/
│   ├── routes/
│   │   ├── particulares.js            # NEW: Particulares-specific routes
│   │   └── arag.js                    # Existing
│   ├── services/
│   │   ├── hojaEncargoWorkflowService.js  # NEW: Workflow orchestration
│   │   ├── pdfGeneratorService.js     # MODIFY: Add generateHojaEncargo method
│   │   ├── signatureService.js        # Existing (no changes)
│   │   ├── emailService.js            # Existing (no changes)
│   │   ├── documentHistoryService.js  # MODIFY: Add updateFilePath method
│   │   └── emailHistoryService.js     # Existing (no changes)
│   └── __tests__/
│       ├── hojaEncargoWorkflow.test.js    # NEW
│       └── particularesValidation.test.js # NEW
├── client/
│   ├── js/
│   │   └── components/
│   │       ├── particularesList.js    # MODIFY: Update for real functionality
│   │       ├── hojaEncargoModal.js    # NEW: Modal for Hoja de Encargo
│   │       └── particulares.js        # MODIFY: Integrate workflow
│   └── css/
│       └── components/
│           └── particulares.css       # NEW: Particulares-specific styles
└── data/
    └── documents/
        └── {year}/
            └── {reference}/
                └── hoja_encargo_*.pdf
```

## CSS Styles

```css
/* src/client/css/components/particulares.css */

/* State badges */
.state-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.state-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.state-abierto {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.state-abierto::before {
  background: #34d399;
}

.state-archivado {
  background: rgba(161, 161, 170, 0.1);
  color: #a1a1aa;
}

.state-archivado::before {
  background: #a1a1aa;
}

/* Workflow status */
.workflow-status {
  display: flex;
  justify-content: space-around;
  padding: var(--spacing-lg) 0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.step-icon {
  font-size: 24px;
}

.step-loading .step-icon {
  animation: pulse 1s infinite;
}

.step-success .step-label {
  color: var(--state-success);
}

.step-error .step-label {
  color: var(--state-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-default);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-default);
}
```
