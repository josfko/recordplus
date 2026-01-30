# Requirements Document

## Introduction

Private client case management module (Expedientes de Clientes Particulares) for the Record+ legal case management system. This module handles the complete lifecycle of non-insurance private client cases, from case creation with automatic reference numbering through document generation (Hoja de Encargo), digital signatures, email delivery, and case archival.

Unlike ARAG insurance cases which have fixed fees, private client cases require customizable service agreements (Hojas de Encargo) that specify services and negotiated fees per client engagement.

**Module Dependencies:**

- `core-case-management`: Provides base case CRUD, state management, and reference generation (IY-YY-NNN format)
- `document-generation`: PDF generation service (shared with ARAG module)
- `email-integration`: SMTP email service (shared with ARAG module)
- `signature-service`: Digital signature service (shared with ARAG module)

**Technical Context:**

- Backend: Node.js + Express + better-sqlite3 (SQLite)
- Frontend: Vanilla JS (ES Modules), pure CSS
- Server: Clouding.io VPS (Barcelona, Spain)
- Existing tables: cases, document_history, email_history, configuration, reference_counters
- Existing services: PDFGeneratorService, SignatureService, EmailService

## Glossary

| Term | Definition |
|------|------------|
| **Expediente_Particular** | A private client legal case file, not associated with insurance companies |
| **Referencia_Interna_Particular** | Internal reference format IY-YY-NNN where YY is 2-digit year, NNN is correlative number starting at 001 each year |
| **Hoja_de_Encargo** | Engagement letter/service agreement document specifying services, fees, and terms for a private client |
| **Servicios** | Legal services to be provided, listed in the Hoja de Encargo |
| **Honorarios** | Professional fees agreed with the client for the specified services |
| **Cliente_Particular** | A private individual client (not through insurance) who contracts legal services directly |
| **Firma_Digital** | Digital signature applied to PDF documents for legal validity |
| **Estado_Abierto** | Initial case state when created (Open) |
| **Estado_Archivado** | Final case state when closed (Archived) |
| **Fecha_de_Entrada** | Case entry/creation date |
| **Fecha_de_Cierre** | Case closure date (required for archival) |
| **Plantilla_Editable** | Editable template used as base for generating Hoja de Encargo |

## Requirements

### Requirement 1: Private Client Case Creation

**User Story:** As a lawyer, I want to create private client case files with automatic year-based sequential numbering, so that I can track non-insurance legal matters with organized references.

#### Acceptance Criteria

1. WHEN a user creates a private client case, THE System SHALL auto-generate a reference in format IY-YY-NNN (e.g., IY-26-001)
2. WHEN a user creates a private client case, THE System SHALL use the current year's last two digits for YY
3. WHEN a user creates a private client case, THE System SHALL increment NNN sequentially within each year starting from 001
4. WHEN a user creates a private client case, THE System SHALL require the client name (non-empty string, minimum 2 characters)
5. WHEN a user creates a private client case, THE System SHALL set the entry date to today by default
6. WHEN a user creates a private client case, THE System SHALL allow editing the entry date before saving
7. WHEN a user creates a private client case, THE System SHALL set the initial state to "Abierto"
8. WHEN a new calendar year begins, THE System SHALL reset the sequential number to 001
9. THE System SHALL validate that the reference format matches exactly IY-YY-NNN pattern

### Requirement 2: Reference Uniqueness and Integrity

**User Story:** As a firm administrator, I want private client references to be unique and never reused, so that case identification remains unambiguous across all years.

#### Acceptance Criteria

1. THE System SHALL prevent reuse of any internal reference across all case types
2. THE System SHALL maintain reference counters persistently per year
3. IF a case is deleted, THE System SHALL NOT reuse its reference number
4. THE System SHALL validate reference format before saving any case
5. THE System SHALL prevent duplicate references even during concurrent case creation
6. WHEN retrieving the next reference number, THE System SHALL use atomic database operations

### Requirement 3: Hoja de Encargo Generation

**User Story:** As a lawyer, I want to generate professional engagement letters (Hojas de Encargo) for private clients, so that I can formalize the attorney-client relationship with clear service terms.

#### Acceptance Criteria

1. WHEN a user requests Hoja de Encargo generation, THE System SHALL create a PDF document using the configured template
2. WHEN generating a Hoja de Encargo, THE System SHALL auto-fill: client name, internal reference, and current date
3. WHEN generating a Hoja de Encargo, THE System SHALL allow the user to enter/edit services description (free text, required)
4. WHEN generating a Hoja de Encargo, THE System SHALL allow the user to enter/edit fees amount (required, positive number)
5. WHEN generating a Hoja de Encargo, THE System SHALL format currency values in Spanish locale (€ symbol, comma decimal separator)
6. WHEN generating a Hoja de Encargo, THE System SHALL format dates in Spanish format (DD/MM/YYYY)
7. THE System SHALL generate the PDF in A4 format with professional law firm header
8. WHEN a Hoja de Encargo is generated, THE System SHALL store the PDF in a structured folder hierarchy (by year/case reference)
9. WHEN a Hoja de Encargo is generated, THE System SHALL record it in document_history with: document_type='HOJA_ENCARGO', file_path, generated_at, signed=0

### Requirement 4: Digital Signature for Hoja de Encargo

**User Story:** As a lawyer, I want to digitally sign engagement letters, so that they have legal validity for client agreements.

#### Acceptance Criteria

1. WHEN a user requests to sign a Hoja de Encargo, THE System SHALL apply the configured digital signature
2. WHEN a document is signed, THE System SHALL update document_history.signed to 1
3. WHEN a document is signed, THE System SHALL add a visible signature indicator to the PDF
4. IF the signature certificate is not configured, THEN THE System SHALL display an error message
5. IF the signature process fails, THEN THE System SHALL log the error and allow retry
6. THE System SHALL preserve the original unsigned PDF and create a new signed version

### Requirement 5: Email Delivery of Hoja de Encargo

**User Story:** As a lawyer, I want to send engagement letters via email to clients, so that they can review and accept the terms remotely.

#### Acceptance Criteria

1. WHEN a user requests to send a Hoja de Encargo by email, THE System SHALL require the client's email address
2. WHEN sending the email, THE System SHALL attach the signed PDF (or unsigned if not signed)
3. THE System SHALL format the email subject as: "Hoja de Encargo - [Reference] - [Client Name]"
4. WHEN an email is sent, THE System SHALL record it in email_history with: recipient, subject, sent_at, status='SENT', document_id
5. IF email sending fails, THEN THE System SHALL record status='ERROR' with error_message and allow retry
6. THE System SHALL validate email format before attempting to send
7. IF SMTP is not configured, THEN THE System SHALL display a warning and disable email sending

### Requirement 6: Integrated Workflow

**User Story:** As a lawyer, I want a streamlined workflow to generate, sign, and send Hojas de Encargo in one flow, so that the process is efficient.

#### Acceptance Criteria

1. THE System SHALL provide a "Generar Hoja de Encargo" button in the case detail view for PARTICULAR cases
2. WHEN the user clicks the button, THE System SHALL display a form to enter services and fees
3. WHEN the user submits the form, THE System SHALL generate the PDF
4. AFTER generation, THE System SHALL offer options to: Download, Sign, Send by Email
5. THE System SHALL display progress feedback during each step
6. WHEN any step fails, THE System SHALL show a clear error message and allow retry
7. THE System SHALL update the case detail timeline with the generated document

### Requirement 7: Case Closure (Archival)

**User Story:** As a lawyer, I want to close and archive private client cases with proper documentation, so that completed cases are properly recorded.

#### Acceptance Criteria

1. WHEN a user archives a private client case, THE System SHALL require a closure date
2. WHEN archived, THE System SHALL change the state to "Archivado"
3. THE System SHALL prevent further document generation on archived cases
4. THE System SHALL preserve all document_history and email_history for archived cases
5. THE System SHALL allow viewing but not editing archived cases (except observations field)
6. THE System SHALL display archived cases with visual distinction (grayed out or different styling)

### Requirement 8: Document and Email History Display

**User Story:** As a lawyer, I want to see all documents and emails for a private client case in a timeline, so that I can track what has been generated and sent.

#### Acceptance Criteria

1. THE System SHALL display a timeline of all case events in the case detail view
2. THE System SHALL show document generation events with: type, date, signed status, download link
3. THE System SHALL show email events with: recipient, subject, date, status (sent/error)
4. THE System SHALL allow downloading stored PDF documents from the history
5. THE System SHALL show the most recent events first in the timeline
6. THE System SHALL visually distinguish between successful and failed operations (green/red indicators)

### Requirement 9: Particulares List View

**User Story:** As a lawyer, I want to see a dedicated list of all private client cases, so that I can quickly access and manage non-insurance matters.

#### Acceptance Criteria

1. THE System SHALL provide a "Particulares" section in the sidebar navigation
2. THE System SHALL display a paginated list of PARTICULAR cases with columns: Reference, Client Name, State, Entry Date, Actions
3. THE System SHALL allow filtering by state (Abierto, Archivado, Todos)
4. THE System SHALL allow searching by reference or client name
5. THE System SHALL display case state with color-coded badges (Abierto=green, Archivado=gray)
6. THE System SHALL show pagination controls with "Anterior" and "Siguiente" buttons
7. THE System SHALL display total count of filtered results

### Requirement 10: Template Configuration

**User Story:** As a firm administrator, I want to configure the Hoja de Encargo template, so that generated documents match our firm's branding and legal requirements.

#### Acceptance Criteria

1. THE System SHALL store the Hoja de Encargo template text in configuration
2. THE System SHALL allow editing the template header/footer text
3. THE System SHALL support placeholder variables: {{client_name}}, {{reference}}, {{date}}, {{services}}, {{fees}}
4. THE System SHALL include default template text on first installation
5. THE System SHALL validate that template contains required placeholders before saving
