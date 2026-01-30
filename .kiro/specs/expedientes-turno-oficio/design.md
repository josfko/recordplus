# Design Document: Expedientes Turno de Oficio

## Overview

This document describes the technical design for the Public Defender Cases (Expedientes Turno de Oficio) module. This module is simpler than ARAG and Particulares modules because it does NOT generate automatic documents (minutas, hojas de encargo). Instead, it focuses on case tracking, manual document uploads, and state management.

The module extends the existing core case management system and reuses existing document storage infrastructure for manual uploads.

**Technology Stack:**

- **Backend**: Node.js + Express + better-sqlite3 (SQLite)
- **Frontend**: Vanilla JavaScript with ES Modules, pure CSS
- **File Storage**: File system at /data/documents/
- **Server**: Clouding.io VPS (Barcelona, Spain)

**Key Difference from ARAG/Particulares:**
- NO MinutaWorkflowService
- NO HojaEncargoWorkflowService
- NO automatic PDF generation
- Simple file upload service instead

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Vanilla JS)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   TurnoList     │  │  TurnoOficio    │  │   Document      │             │
│  │     View        │  │     View        │  │  UploadModal    │             │
│  │   (EXISTS)      │  │   (EXISTS)      │  │     (NEW)       │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                         ┌──────┴──────┐                                     │
│                         │  API Client │                                     │
│                         │  (EXTEND)   │                                     │
│                         └──────┬──────┘                                     │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │ HTTP/JSON
┌────────────────────────────────┼────────────────────────────────────────────┐
│                           Express API                                        │
│                                │                                            │
│  ┌─────────────────────────────┼─────────────────────────────────────────┐  │
│  │                        API Routes                                      │  │
│  │  GET  /api/cases?type=TURNO_OFICIO  - List cases (EXISTS)             │  │
│  │  GET  /api/cases/:id                - Get case (EXISTS)               │  │
│  │  POST /api/cases                    - Create case (EXISTS)            │  │
│  │  PUT  /api/cases/:id                - Update case (EXISTS)            │  │
│  │  POST /api/cases/:id/archive        - Archive case (EXISTS)           │  │
│  │  POST /api/cases/:id/finalize       - Finalize case (NEW)             │  │
│  │  POST /api/cases/:id/upload         - Upload document (NEW)           │  │
│  │  GET  /api/cases/:id/history        - Get history (EXISTS)            │  │
│  │  GET  /api/documents/:id/download   - Download doc (EXISTS)           │  │
│  └─────────────────────────────┬─────────────────────────────────────────┘  │
│                                │                                            │
│  ┌─────────────────────────────┼─────────────────────────────────────────┐  │
│  │                         Services                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ CaseService  │  │ DocumentHist │  │ FileUpload   │                 │  │
│  │  │  (EXISTS)    │  │   Service    │  │   Service    │                 │  │
│  │  │              │  │  (EXISTS)    │  │    (NEW)     │                 │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │  │
│  └─────────┼─────────────────┼─────────────────┼────────────────────────┘   │
│            │                 │                 │                            │
│            └─────────────────┼─────────────────┘                            │
│                              │                                              │
│                    ┌─────────┴─────────┐                                    │
│                    │      SQLite       │                                    │
│                    │     Database      │                                    │
│                    └───────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │     File System         │
                    │  /data/documents/       │
                    │    └── 2026/            │
                    │        └── IY005123/    │
                    │            └── uploaded_doc.pdf│
                    └─────────────────────────┘
```

## Components and Interfaces

### Turno de Oficio Routes (NEW)

```javascript
// src/server/routes/turnoOficio.js
import { Router } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getById, update as updateCase } from '../services/caseService.js';
import { DocumentHistoryService } from '../services/documentHistoryService.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseData = req.caseData;
    const year = new Date().getFullYear();
    const uploadDir = join(
      process.env.DOCUMENTS_PATH || './data/documents',
      year.toString(),
      caseData.internal_reference
    );

    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    const ext = extname(file.originalname);
    cb(null, `${file.fieldname}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Middleware to load case data
const loadCase = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'ID de expediente inválido' }
    });
  }

  const caseData = getById(id);
  if (!caseData) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Expediente no encontrado' }
    });
  }

  if (caseData.type !== 'TURNO_OFICIO') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Expediente no es de tipo Turno de Oficio' }
    });
  }

  req.caseData = caseData;
  next();
};

/**
 * POST /api/turno/:id/finalize
 * Transition case from ABIERTO to FINALIZADO
 */
router.post('/:id/finalize', loadCase, (req, res, next) => {
  try {
    const { caseData } = req;

    if (caseData.state === 'ARCHIVADO') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No se puede modificar un expediente archivado' }
      });
    }

    if (caseData.state === 'FINALIZADO') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'El expediente ya está finalizado' }
      });
    }

    updateCase(caseData.id, { state: 'FINALIZADO' });

    res.json({
      success: true,
      message: 'Expediente marcado como finalizado'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/turno/:id/upload
 * Upload a document to a Turno de Oficio case
 */
router.post('/:id/upload', loadCase, upload.single('document'), (req, res, next) => {
  try {
    const { caseData } = req;

    if (caseData.state === 'ARCHIVADO') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No se pueden subir documentos a expedientes archivados' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No se ha proporcionado ningún archivo' }
      });
    }

    const documentHistory = new DocumentHistoryService();
    const description = req.body.description || req.file.originalname;

    const docRecord = documentHistory.create({
      caseId: caseData.id,
      documentType: 'MANUAL_UPLOAD',
      filePath: req.file.path,
      description: description,
      signed: 0
    });

    res.json({
      success: true,
      data: {
        documentId: docRecord.id,
        filename: req.file.filename,
        path: req.file.path
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Extended Case Service Validation

```javascript
// Add to src/server/services/caseService.js

/**
 * Validate Turno de Oficio specific fields
 * @param {Object} caseData - Case data to validate
 * @throws {Error} If validation fails
 */
function validateTurnoOficio(caseData) {
  if (!caseData.clientName || caseData.clientName.trim().length < 2) {
    throw new ValidationError('El nombre del cliente debe tener al menos 2 caracteres', 'clientName');
  }

  if (!caseData.entryDate) {
    throw new ValidationError('La fecha de entrada es obligatoria', 'entryDate');
  }

  if (!caseData.designation || caseData.designation.trim().length === 0) {
    throw new ValidationError('La designación de turno es obligatoria', 'designation');
  }
}

/**
 * Validate state transition for Turno de Oficio
 * @param {string} currentState - Current case state
 * @param {string} newState - Proposed new state
 * @param {Object} data - Additional data (e.g., closureDate)
 * @returns {boolean} Whether transition is valid
 */
function validateTurnoStateTransition(currentState, newState, data = {}) {
  const validTransitions = {
    'ABIERTO': ['FINALIZADO', 'ARCHIVADO'],
    'FINALIZADO': ['ARCHIVADO'],
    'ARCHIVADO': []
  };

  if (!validTransitions[currentState]?.includes(newState)) {
    return false;
  }

  if (newState === 'ARCHIVADO' && !data.closureDate) {
    return false;
  }

  return true;
}
```

### Frontend: Document Upload Modal (NEW)

```javascript
// src/client/js/components/documentUploadModal.js

export class DocumentUploadModal {
  constructor(caseData, onComplete) {
    this.caseData = caseData;
    this.onComplete = onComplete;
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
          <h2>Subir Documento</h2>
          <button class="btn-close" data-action="close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="upload-form" enctype="multipart/form-data">
            <div class="form-group">
              <label>Expediente:</label>
              <input type="text" value="${this.caseData.internal_reference} - ${this.caseData.client_name}" disabled>
            </div>

            <div class="form-group">
              <label for="description">Descripción del documento:</label>
              <input type="text" id="description" name="description"
                     placeholder="Ej: Escrito de defensa, Notificación juzgado..." required>
            </div>

            <div class="form-group">
              <label for="document">Archivo PDF:</label>
              <div class="file-drop-zone" id="drop-zone">
                <input type="file" id="document" name="document" accept=".pdf" required hidden>
                <div class="drop-zone-content">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p>Arrastra un archivo PDF aquí o <span class="link">selecciona</span></p>
                  <p class="file-name" id="file-name"></p>
                </div>
              </div>
            </div>

            <div id="upload-progress" class="upload-progress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
              </div>
              <span class="progress-text" id="progress-text">Subiendo...</span>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="close">Cancelar</button>
          <button class="btn btn-primary btn-amber" data-action="upload" id="btn-upload">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Subir Documento
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const dropZone = this.modal.querySelector('#drop-zone');
    const fileInput = this.modal.querySelector('#document');
    const fileName = this.modal.querySelector('#file-name');

    // Click to select file
    dropZone.addEventListener('click', () => fileInput.click());

    // File selected
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) {
        fileName.textContent = fileInput.files[0].name;
        dropZone.classList.add('has-file');
      }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        fileName.textContent = e.dataTransfer.files[0].name;
        dropZone.classList.add('has-file');
      }
    });

    // Action buttons
    this.modal.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'close') {
        this.close();
      } else if (action === 'upload') {
        await this.upload();
      }
    });
  }

  async upload() {
    const form = this.modal.querySelector('#upload-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fileInput = this.modal.querySelector('#document');
    const description = this.modal.querySelector('#description').value;

    if (!fileInput.files[0]) {
      showToast('Seleccione un archivo PDF', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('description', description);

    this.showProgress();

    try {
      const result = await api.uploadDocument(this.caseData.id, formData);
      this.hideProgress();
      showToast('Documento subido correctamente', 'success');
      this.close();
      this.onComplete();
    } catch (error) {
      this.hideProgress();
      showToast('Error al subir documento: ' + error.message, 'error');
    }
  }

  showProgress() {
    this.modal.querySelector('#upload-progress').style.display = 'block';
    this.modal.querySelector('#btn-upload').disabled = true;
  }

  hideProgress() {
    this.modal.querySelector('#upload-progress').style.display = 'none';
    this.modal.querySelector('#btn-upload').disabled = false;
  }

  close() {
    this.modal.remove();
  }
}
```

### API Client Extensions

```javascript
// Add to src/client/js/api.js

/**
 * Upload document to a Turno de Oficio case
 * @param {number} caseId - Case ID
 * @param {FormData} formData - Form data with file
 * @returns {Promise<Object>} Upload result
 */
async uploadDocument(caseId, formData) {
  const response = await fetch(`${API_BASE}/turno/${caseId}/upload`, {
    method: 'POST',
    body: formData
    // Note: Don't set Content-Type header, let browser set it with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Error al subir documento');
  }

  return response.json();
}

/**
 * Finalize a Turno de Oficio case
 * @param {number} caseId - Case ID
 * @returns {Promise<Object>} Result
 */
async finalizeTurnoCase(caseId) {
  const response = await fetch(`${API_BASE}/turno/${caseId}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Error al finalizar expediente');
  }

  return response.json();
}
```

## API Endpoints

### Existing Endpoints (No Changes)

```
GET  /api/cases?type=TURNO_OFICIO    - List Turno de Oficio cases
GET  /api/cases/:id                   - Get case by ID
POST /api/cases                       - Create new case (with type=TURNO_OFICIO)
PUT  /api/cases/:id                   - Update case
POST /api/cases/:id/archive           - Archive case (requires closureDate)
GET  /api/cases/:id/history           - Get document/email history
GET  /api/documents/:id/download      - Download document
```

### New Endpoints

```
POST /api/turno/:id/finalize          - Mark case as finalized
     Body: {} (no body required)
     Response: { success: true, message: 'Expediente marcado como finalizado' }

POST /api/turno/:id/upload            - Upload document to case
     Body: multipart/form-data with 'document' file and 'description' string
     Response: { success: true, data: { documentId, filename, path } }
```

## Data Models

### Case (Turno de Oficio specific fields)

```javascript
{
  id: Number,                    // Primary key
  type: 'TURNO_OFICIO',          // Fixed value
  client_name: String,           // Justiciable name (required)
  internal_reference: String,    // IY + 6 digits (auto-generated)
  arag_reference: null,          // Not used for Turno de Oficio
  designation: String,           // Court designation number (required)
  state: String,                 // 'ABIERTO' | 'FINALIZADO' | 'ARCHIVADO'
  entry_date: String,            // ISO date (required)
  judicial_date: null,           // Not used (no judicial transition)
  judicial_district: null,       // Not used
  closure_date: String | null,   // Required for archival
  observations: String,          // Free text notes
  created_at: String,            // ISO timestamp
  updated_at: String             // ISO timestamp
}
```

### Document History (for manual uploads)

```javascript
{
  id: Number,                    // Primary key
  case_id: Number,               // Foreign key to cases
  document_type: String,         // 'MANUAL_UPLOAD' for Turno de Oficio
  file_path: String,             // Full path to file on disk
  description: String,           // User-provided description
  generated_at: String,          // ISO timestamp (upload time)
  signed: Number,                // Always 0 for manual uploads
  created_at: String             // ISO timestamp
}
```

## Database Schema

No schema changes required. The existing tables support all functionality:

```sql
-- cases table already supports type='TURNO_OFICIO'
-- cases.designation field already exists
-- document_history already supports all required fields
-- state CHECK constraint includes 'ABIERTO', 'JUDICIAL', 'ARCHIVADO'
-- Note: For Turno de Oficio, we use 'ABIERTO' for open, repurpose logic for 'FINALIZADO'
```

**Important Note on State Values:**

The existing database schema has a CHECK constraint that only allows `ABIERTO`, `JUDICIAL`, `ARCHIVADO` states. For Turno de Oficio:
- `ABIERTO` = Open case
- `JUDICIAL` = Will be repurposed to mean "Finalizado" for Turno de Oficio cases (no judicial proceedings)
- `ARCHIVADO` = Archived case

Alternative: Keep using existing states with UI labels:
- State value `ABIERTO` displays as "Abierto"
- State value `JUDICIAL` displays as "Finalizado" (for Turno de Oficio only)
- State value `ARCHIVADO` displays as "Archivado"

## Correctness Properties

### Property 1: Designation Required

_For any_ Turno de Oficio case creation, the operation should fail if designation is empty or whitespace-only.

**Validates: Requirements 1.3, 1.8**

### Property 2: Internal Reference Uniqueness

_For any_ two cases in the system (regardless of type), their internal references must be different.

**Validates: Requirements 3.3, 3.4**

### Property 3: State Transition Validity

_For any_ Turno de Oficio case, valid state transitions are: ABIERTO→FINALIZADO, ABIERTO→ARCHIVADO, FINALIZADO→ARCHIVADO. No other transitions are allowed.

**Validates: Requirements 4.2, 4.3, 4.4, 4.6**

### Property 4: Closure Date Required for Archive

_For any_ case archival operation, the closure_date must be provided and must be a valid date not before entry_date.

**Validates: Requirements 4.5, 8.1, 12.4, 12.5**

### Property 5: No Automatic Documents for Turno de Oficio

_For any_ Turno de Oficio case, attempts to call minuta or hoja de encargo generation endpoints should fail with appropriate error.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Upload Blocked for Archived Cases

_For any_ archived Turno de Oficio case, document upload operations should fail with appropriate error.

**Validates: Requirements 6.7, 8.3**

### Property 7: Document History Recording

_For any_ successful document upload, a corresponding record should be created in document_history with case_id, document_type='MANUAL_UPLOAD', valid file_path, and description.

**Validates: Requirements 6.4**

### Property 8: Observations Persistence

_For any_ observation update on a case (including archived cases), the observations should be persisted and retrievable.

**Validates: Requirements 7.4, 8.5**

### Property 9: Client Name Minimum Length

_For any_ case creation or update, client_name must have at least 2 non-whitespace characters.

**Validates: Requirements 1.1, 12.1**

### Property 10: Reference Format Validation

_For any_ generated internal reference for Turno de Oficio, it should match the pattern IY followed by exactly 6 digits.

**Validates: Requirements 3.1, 3.5**

## Error Handling

### API Error Response Format

```javascript
{
  "error": {
    "code": "VALIDATION_ERROR" | "NOT_FOUND" | "UPLOAD_ERROR",
    "message": "Human-readable error message in Spanish",
    "field": "fieldName" | null
  }
}
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200  | Success | Request completed successfully |
| 400  | Bad Request | Validation error, invalid state transition, wrong case type |
| 404  | Not Found | Case or document doesn't exist |
| 413  | Payload Too Large | Uploaded file exceeds 10MB limit |
| 500  | Server Error | File system or database error |

### Error Messages (Spanish)

```javascript
const ERROR_MESSAGES = {
  CASE_NOT_FOUND: 'Expediente no encontrado',
  NOT_TURNO_CASE: 'Expediente no es de tipo Turno de Oficio',
  CASE_ARCHIVED: 'No se puede modificar un expediente archivado',
  UPLOAD_ARCHIVED: 'No se pueden subir documentos a expedientes archivados',
  ALREADY_FINALIZED: 'El expediente ya está finalizado',
  INVALID_TRANSITION: 'Transición de estado no válida',
  DESIGNATION_REQUIRED: 'La designación de turno es obligatoria',
  CLIENT_NAME_REQUIRED: 'El nombre del cliente debe tener al menos 2 caracteres',
  ENTRY_DATE_REQUIRED: 'La fecha de entrada es obligatoria',
  CLOSURE_DATE_REQUIRED: 'La fecha de cierre es obligatoria para archivar',
  CLOSURE_BEFORE_ENTRY: 'La fecha de cierre no puede ser anterior a la fecha de entrada',
  NO_FILE_PROVIDED: 'No se ha proporcionado ningún archivo',
  ONLY_PDF_ALLOWED: 'Solo se permiten archivos PDF',
  FILE_TOO_LARGE: 'El archivo supera el tamaño máximo permitido (10MB)',
  DOCUMENT_NOT_FOUND: 'Documento no encontrado'
};
```

## Testing Strategy

### Unit Tests

- Designation validation (non-empty)
- Client name validation (min 2 characters)
- State transition validation
- Closure date validation (required, not before entry)
- Internal reference format validation

### Property-Based Tests

Using fast-check library, minimum 100 iterations per property.

```javascript
// Example: Property 1 - Designation Required
describe('Turno de Oficio Validation', () => {
  it('should reject empty or whitespace-only designation', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.constant('   '), fc.constant('\n\t')),
        (designation) => {
          expect(() => validateTurnoOficio({
            clientName: 'Test Client',
            entryDate: '2026-01-30',
            designation
          })).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Example: Property 3 - State Transition Validity
describe('State Transitions', () => {
  it('should only allow valid state transitions', () => {
    const validTransitions = [
      ['ABIERTO', 'FINALIZADO'],
      ['ABIERTO', 'ARCHIVADO'],
      ['FINALIZADO', 'ARCHIVADO']
    ];

    const invalidTransitions = [
      ['FINALIZADO', 'ABIERTO'],
      ['ARCHIVADO', 'ABIERTO'],
      ['ARCHIVADO', 'FINALIZADO']
    ];

    validTransitions.forEach(([from, to]) => {
      expect(validateTurnoStateTransition(from, to, { closureDate: '2026-01-30' })).toBe(true);
    });

    invalidTransitions.forEach(([from, to]) => {
      expect(validateTurnoStateTransition(from, to)).toBe(false);
    });
  });
});

// Example: Property 6 - Upload Blocked for Archived Cases
describe('Document Upload', () => {
  it('should reject uploads for archived cases', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1 }),
          state: fc.constant('ARCHIVADO'),
          type: fc.constant('TURNO_OFICIO')
        }),
        (caseData) => {
          const result = canUploadDocument(caseData);
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('archivado');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

- Complete case lifecycle: Create → Finalize → Archive
- Document upload workflow
- Case validation on creation
- State transition enforcement
- History recording

### End-to-End Tests

- Create Turno de Oficio case with all required fields
- Upload document and verify in history
- Finalize case and verify state change
- Archive case with closure date
- Verify archived case restrictions

## File Structure

```
src/
├── server/
│   ├── routes/
│   │   ├── turnoOficio.js           # NEW: Turno de Oficio specific routes
│   │   ├── cases.js                 # Existing (no changes)
│   │   ├── arag.js                  # Existing (no changes)
│   │   └── particulares.js          # Existing (no changes)
│   ├── services/
│   │   ├── caseService.js           # MODIFY: Add Turno validation
│   │   ├── documentHistoryService.js # Existing (may need description field)
│   │   └── fileUploadService.js     # NEW: Handle file uploads
│   └── __tests__/
│       ├── turnoOficioRoutes.test.js    # NEW
│       └── turnoOficioValidation.test.js # NEW
├── client/
│   ├── js/
│   │   ├── api.js                   # MODIFY: Add upload/finalize methods
│   │   └── components/
│   │       ├── turnoList.js         # EXISTS: Update with real API
│   │       ├── turnoOficio.js       # EXISTS: Update with real functionality
│   │       └── documentUploadModal.js # NEW: Upload modal
│   └── css/
│       └── main.css                 # MODIFY: Add upload modal styles
└── data/
    └── documents/
        └── {year}/
            └── {reference}/
                └── uploaded_*.pdf
```

## CSS Styles

```css
/* Add to src/client/css/main.css */

/* File Drop Zone */
.file-drop-zone {
  border: 2px dashed var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-drop-zone:hover {
  border-color: var(--color-amber);
  background: rgba(245, 158, 11, 0.05);
}

.file-drop-zone.drag-over {
  border-color: var(--color-amber);
  background: rgba(245, 158, 11, 0.1);
}

.file-drop-zone.has-file {
  border-color: var(--state-success);
  background: rgba(52, 211, 153, 0.05);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
}

.drop-zone-content svg {
  color: var(--text-muted);
}

.drop-zone-content .link {
  color: var(--color-amber);
  text-decoration: underline;
}

.file-name {
  font-weight: 500;
  color: var(--text-primary);
}

/* Upload Progress */
.upload-progress {
  margin-top: var(--spacing-md);
}

.progress-bar {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-amber);
  width: 0%;
  transition: width 0.3s;
  animation: progress-indeterminate 1.5s infinite linear;
}

@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

/* Turno de Oficio specific */
.turno-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.status-abierto {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status-finalizado {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-archivado {
  background: rgba(161, 161, 170, 0.1);
  color: #a1a1aa;
}

/* Designation Box */
.designation-box {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.designation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.designation-label {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.designation-required {
  font-size: 10px;
  color: var(--color-amber);
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.designation-file {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-primary);
  font-size: 14px;
}

.designation-filename {
  font-family: var(--font-mono);
}
```

## Notes

- Turno de Oficio is the simplest case type - no automated document generation
- Existing UI components (turnoList.js, turnoOficio.js) need updating to connect to real API
- The `JUDICIAL` state in the database can be repurposed as `FINALIZADO` for display purposes
- File uploads are limited to PDF only, max 10MB
- Observations are editable even for archived cases (requirement 7.4)
- Internal references share the IY sequence with ARAG cases for global uniqueness
