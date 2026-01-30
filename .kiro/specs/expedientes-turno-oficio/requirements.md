# Requirements Document: Expedientes Turno de Oficio

## Introduction

Public Defender Cases (Expedientes de Turno de Oficio) module for the Record+ legal case management system. This module handles the lifecycle of court-appointed defense cases, which are distinctly simpler than ARAG or Particulares cases: they require NO automatic document generation (no minutas, no hojas de encargo) and have a streamlined workflow focused on case tracking, designation management, and archival.

Unlike ARAG and Particulares cases, Turno de Oficio cases:
- Do NOT generate invoices or engagement letters automatically
- Require a designation number (designación de turno) from the court
- Follow a simpler state flow: Abierto → Finalizado → Archivado
- Focus on manual document upload rather than automated generation

**Module Dependencies:**

- `core-case-management`: Provides base case CRUD, state management, and reference generation
- `document-generation`: Reused for manual document storage and history (no automatic generation)
- `email-integration`: Optional - for manual email sending (not automated)

**Technical Context:**

- Backend: Node.js + Express + better-sqlite3 (SQLite)
- Frontend: Vanilla JavaScript (ES Modules), pure CSS
- Server: Clouding.io VPS (Barcelona, Spain)
- Existing tables: cases, document_history, email_history, configuration, reference_counters
- Existing frontend: TurnoListView (turnoList.js), TurnoOficioView (turnoOficio.js) - UI exists with mock data

## Glossary

| Term | Definition |
|------|------------|
| **Expediente_Turno_Oficio** | A public defender case file, court-appointed legal representation |
| **Designación** | Official court designation number for the case assignment |
| **Justiciable** | The defendant/client in a public defender case |
| **Referencia_Interna** | Internal reference format IY + 6-digit correlative number (e.g., IY005123) - shared with ARAG |
| **Estado_Abierto** | Initial case state when created (Open) |
| **Estado_Finalizado** | Case concluded but not yet archived |
| **Estado_Archivado** | Final case state when closed (Archived) |
| **Fecha_de_Entrada** | Case entry/assignment date |
| **Fecha_de_Cierre** | Case closure date (required for archival) |
| **Observaciones** | Free-text notes about the case (court, proceeding number, etc.) |
| **Partido_Judicial** | Court district where the case is handled |
| **Número_de_Autos** | Court proceeding number |

## Requirements

### Requirement 1: Turno de Oficio Case Creation

**User Story:** As a public defender, I want to create Turno de Oficio cases with the court designation, so that I can track court-appointed cases from assignment through completion.

#### Acceptance Criteria

1. WHEN a user creates a Turno de Oficio case, THE System SHALL require the client name (non-empty string, minimum 2 characters)
2. WHEN a user creates a Turno de Oficio case, THE System SHALL require the entry date
3. WHEN a user creates a Turno de Oficio case, THE System SHALL require the designation number (designación de turno)
4. WHEN a user creates a Turno de Oficio case, THE System SHALL set type to "TURNO_OFICIO"
5. WHEN a user creates a Turno de Oficio case, THE System SHALL auto-generate an internal reference in format IY + 6-digit correlative number
6. WHEN a user creates a Turno de Oficio case, THE System SHALL set the initial state to "ABIERTO"
7. WHEN a user creates a Turno de Oficio case, THE System SHALL set the entry date to today by default but allow editing
8. THE System SHALL validate that designation is a non-empty string
9. THE System SHALL allow optional observations field for additional case notes

### Requirement 2: Designation Management

**User Story:** As a public defender, I want to track and manage case designations, so that I can reference the official court assignment for each case.

#### Acceptance Criteria

1. THE System SHALL store the designation number in the cases.designation field
2. THE System SHALL display the designation prominently in the case detail view
3. THE System SHALL allow editing the designation while the case is in ABIERTO or FINALIZADO state
4. THE System SHALL prevent editing the designation for archived cases
5. THE System SHALL allow searching cases by designation number
6. THE System SHALL NOT require designation to be unique (multiple cases may have similar designations from different courts)

### Requirement 3: Internal Reference Generation

**User Story:** As a lawyer, I want Turno de Oficio cases to have unique internal references, so that I can identify and organize cases consistently with other case types.

#### Acceptance Criteria

1. WHEN a Turno de Oficio case is created, THE System SHALL generate an internal reference in format IY + 6-digit correlative number (e.g., IY005123)
2. THE System SHALL use the same reference counter as ARAG cases (shared IY sequence)
3. THE System SHALL ensure internal references are unique across ALL case types (ARAG, PARTICULAR, TURNO_OFICIO)
4. THE System SHALL never reuse internal references, even after case deletion
5. THE System SHALL display the internal reference in monospace font for readability

### Requirement 4: State Flow Management

**User Story:** As a public defender, I want to track case progress through clear states, so that I can manage my caseload effectively.

#### Acceptance Criteria

1. THE System SHALL support three states for Turno de Oficio cases: Abierto, Finalizado, Archivado
2. WHEN a case is in Abierto state, THE System SHALL allow transition to Finalizado
3. WHEN a case is in Finalizado state, THE System SHALL allow transition to Archivado (requires closure date)
4. WHEN a case is in Abierto state, THE System SHALL allow direct transition to Archivado (requires closure date)
5. WHEN archiving a case, THE System SHALL require a closure date
6. THE System SHALL prevent state transitions FROM Archivado to any other state
7. THE System SHALL display current state with appropriate styling (Abierto=amber, Finalizado=blue, Archivado=gray)

### Requirement 5: No Automatic Document Generation

**User Story:** As a public defender, I understand that Turno de Oficio cases do not generate automatic invoices, so the system should not offer minuta or hoja de encargo generation.

#### Acceptance Criteria

1. THE System SHALL NOT provide automatic minuta generation for Turno de Oficio cases
2. THE System SHALL NOT provide automatic hoja de encargo generation for Turno de Oficio cases
3. THE System SHALL NOT display "Generar Minuta" or "Generar Hoja de Encargo" buttons for Turno de Oficio cases
4. THE System SHALL allow manual document upload for Turno de Oficio cases
5. THE System SHALL record uploaded documents in document_history with document_type='MANUAL_UPLOAD'
6. THE System SHALL display informational message: "Los expedientes de Turno de Oficio no generan minutas automáticas"

### Requirement 6: Manual Document Upload

**User Story:** As a public defender, I want to upload and store documents for Turno de Oficio cases, so that I can keep all case-related files organized.

#### Acceptance Criteria

1. THE System SHALL provide a document upload interface in the case detail view
2. THE System SHALL accept PDF files for upload
3. THE System SHALL store uploaded files in a structured folder hierarchy (by year/case reference)
4. WHEN a document is uploaded, THE System SHALL record it in document_history with: case_id, document_type='MANUAL_UPLOAD', file_path, generated_at
5. THE System SHALL allow downloading previously uploaded documents
6. THE System SHALL display upload history in the case timeline
7. THE System SHALL prevent uploads for archived cases
8. THE System SHALL allow adding a description/name for each uploaded document

### Requirement 7: Case Observations

**User Story:** As a public defender, I want to record detailed notes about each case, so that I can track court details, proceeding numbers, and case progress.

#### Acceptance Criteria

1. THE System SHALL provide a large text area for case observations
2. THE System SHALL auto-save observations as the user types (debounced)
3. THE System SHALL display a visual indicator when auto-save is active
4. THE System SHALL allow editing observations even for archived cases
5. THE System SHALL preserve all observation history
6. THE System SHALL suggest placeholder text: "Escriba aquí los detalles relevantes del procedimiento, juzgado asignado, número de autos, etc..."

### Requirement 8: Case Closure (Archival)

**User Story:** As a public defender, I want to close and archive Turno de Oficio cases when completed, so that finished cases are properly recorded and separated from active work.

#### Acceptance Criteria

1. WHEN a user archives a Turno de Oficio case, THE System SHALL require a closure date
2. WHEN archived, THE System SHALL change the state to "ARCHIVADO"
3. THE System SHALL prevent document uploads on archived cases
4. THE System SHALL preserve all document_history and observations for archived cases
5. THE System SHALL allow viewing but not editing archived cases (except observations)
6. THE System SHALL display archived cases with visual distinction (grayed styling)
7. THE System SHALL allow filtering the list view to show/hide archived cases

### Requirement 9: Turno de Oficio List View

**User Story:** As a public defender, I want a dedicated list of all Turno de Oficio cases organized by state, so that I can quickly see my active caseload.

#### Acceptance Criteria

1. THE System SHALL provide a "Turno de Oficio" section in the sidebar navigation
2. THE System SHALL display cases grouped by state (Abiertos, Finalizados, Archivados)
3. THE System SHALL show for each case: internal reference, client name, designation, entry date, state badge
4. THE System SHALL allow filtering by state (Abierto, Finalizado, Archivado, Todos)
5. THE System SHALL allow searching by client name, internal reference, or designation
6. THE System SHALL display case count per state section
7. THE System SHALL show "Gestionar" link to navigate to case detail
8. THE System SHALL display empty state message when no cases exist
9. THE System SHALL allow creating new Turno de Oficio cases from the list view

### Requirement 10: Case Detail View

**User Story:** As a public defender, I want a comprehensive case detail view, so that I can see all information and manage the case effectively.

#### Acceptance Criteria

1. THE System SHALL display breadcrumb navigation: Expedientes > Turno de Oficio > [Reference]
2. THE System SHALL display case header with: client name, state badge, internal reference
3. THE System SHALL display "Datos del Justiciable" section with: reference, name, entry date, designation
4. THE System SHALL display "Estado del Expediente" section with archive controls
5. THE System SHALL display "Observaciones y Notas" section with auto-save
6. THE System SHALL display document history timeline
7. THE System SHALL provide "Subir Documento" button
8. THE System SHALL provide tabs for "Histórico Documentos" and "Histórico Envíos"
9. THE System SHALL display workflow timeline showing case progression
10. THE System SHALL provide print case summary functionality

### Requirement 11: Document and Email History Display

**User Story:** As a public defender, I want to see all documents and communications for a case in a timeline, so that I can track case activity.

#### Acceptance Criteria

1. THE System SHALL display a timeline of all case events in the case detail view
2. THE System SHALL show document upload events with: filename, date, download link
3. THE System SHALL show email events with: recipient, subject, date, status (if any manual emails sent)
4. THE System SHALL allow downloading stored documents from the history
5. THE System SHALL show the most recent events first in the timeline
6. THE System SHALL display document icons based on file type

### Requirement 12: Case Validation

**User Story:** As a system, I want to enforce data integrity for Turno de Oficio cases, so that all required information is captured correctly.

#### Acceptance Criteria

1. THE System SHALL require client_name (minimum 2 characters)
2. THE System SHALL require entry_date in valid date format
3. THE System SHALL require designation (non-empty string)
4. THE System SHALL require closure_date when archiving
5. THE System SHALL validate closure_date is not before entry_date
6. THE System SHALL return Spanish error messages for all validation failures
7. THE System SHALL prevent saving invalid data
