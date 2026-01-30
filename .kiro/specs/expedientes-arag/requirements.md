# Requirements Document

## Introduction

ARAG insurance case automation module for a Spanish law firm case management system. This module extends the existing core case management to provide complete ARAG workflow automation including: PDF document generation (minutas), digital signatures, automated email sending to ARAG, and mileage expense tracking (suplidos) for judicial cases. The module handles the full lifecycle from case creation through invoicing and archival.

**Module Dependencies:**

- `core-case-management`: Provides base case CRUD, state management, and reference generation
- `document-generation`: Will be created as part of this spec for PDF generation
- `email-integration`: Will be created as part of this spec for SMTP sending

**Technical Context:**

- Backend: Node.js + Express + better-sqlite3 (SQLite)
- Frontend: Vanilla JS (ES Modules), pure CSS
- Server: Clouding.io VPS (Barcelona, Spain)
- Existing tables: cases, document_history, email_history, configuration, reference_counters

## Glossary

- **Expediente_ARAG**: An insurance case file managed through ARAG insurance company
- **Referencia_ARAG**: External reference format DJ00xxxxxx (10 characters) provided by ARAG
- **Referencia_Interna**: Internal reference format IY + 6-digit correlative number (e.g., IY004921)
- **Minuta_ARAG**: Fixed-fee invoice document (203€ + 21% IVA) sent to ARAG for case handling
- **Suplido**: Mileage expense document for travel to judicial districts
- **Partido_Judicial**: Court district for mileage calculations (Torrox, Vélez-Málaga, Torremolinos, Fuengirola, Marbella, Estepona, Antequera)
- **Firma_Digital**: Digital signature applied to PDF documents before sending
- **PDF_Generator**: Service that creates PDF documents from templates with case data
- **Email_Service**: SMTP service for sending documents to ARAG
- **Document_History**: Record of all generated documents (PDF path, type, date, signed status)
- **Email_History**: Record of all sent emails (recipient, subject, date, status)
- **Estado_Abierto**: Initial case state when created
- **Estado_Judicial**: Case state after transitioning to judicial proceedings
- **Estado_Archivado**: Final case state when closed

## Requirements

### Requirement 1: ARAG Case Identification

**User Story:** As a lawyer, I want ARAG cases to have proper dual reference tracking, so that I can identify cases both internally and for ARAG communications.

#### Acceptance Criteria

1. WHEN a user creates an ARAG case, THE System SHALL require the ARAG reference in format DJ00xxxxxx (DJ00 followed by 6 digits)
2. WHEN a user creates an ARAG case, THE System SHALL auto-generate an internal reference in format IY + 6-digit correlative number
3. WHEN a user creates an ARAG case, THE System SHALL require the client name (non-empty string)
4. WHEN a user creates an ARAG case, THE System SHALL set the entry date to today by default but allow editing
5. THE System SHALL validate that the ARAG reference format matches exactly DJ00 followed by 6 digits
6. THE System SHALL prevent duplicate ARAG references across all cases
7. THE System SHALL display both references prominently in the case detail view

### Requirement 2: Minuta ARAG Generation

**User Story:** As a lawyer, I want to generate fixed-fee invoices (minutas) for ARAG cases, so that I can bill ARAG for my services with proper documentation.

#### Acceptance Criteria

1. WHEN a user requests minuta generation, THE System SHALL create a PDF document using a fixed template
2. WHEN generating a minuta, THE System SHALL auto-fill: client name, ARAG reference, internal reference, and current date
3. WHEN generating a minuta, THE System SHALL calculate: base fee (203.00€), IVA (21% = 42.63€), total (245.63€)
4. THE System SHALL use configurable base fee and VAT rate from the configuration table
5. WHEN a minuta is generated, THE System SHALL store the PDF in a structured folder hierarchy (by year/case reference)
6. WHEN a minuta is generated, THE System SHALL record it in document_history with: document_type='MINUTA', file_path, generated_at, signed=0

### Requirement 3: Digital Signature

**User Story:** As a lawyer, I want generated documents to be digitally signed, so that they have legal validity for ARAG submissions.

#### Acceptance Criteria

1. WHEN a minuta PDF is generated, THE System SHALL apply a digital signature automatically
2. WHEN a suplido PDF is generated, THE System SHALL apply a digital signature automatically
3. WHEN a document is signed, THE System SHALL update document_history.signed to 1
4. THE System SHALL store the signature certificate path in configuration
5. IF the signature process fails, THEN THE System SHALL log the error and allow retry

### Requirement 4: Automated Email Sending

**User Story:** As a lawyer, I want minutas to be automatically emailed to ARAG, so that I don't have to manually send each invoice.

#### Acceptance Criteria

1. WHEN a signed minuta is ready, THE System SHALL send it via email to the configured ARAG email address
2. THE System SHALL use the fixed recipient email: facturacionsiniestros@arag.es (configurable)
3. THE System SHALL format the email subject as: DJ00xxxxxx - MINUTA (using the case's ARAG reference)
4. WHEN an email is sent, THE System SHALL record it in email_history with: recipient, subject, sent_at, status='SENT', document_id
5. IF email sending fails, THEN THE System SHALL record status='ERROR' with error_message and allow retry
6. THE System SHALL attach the signed PDF to the email

### Requirement 5: Minuta Workflow Automation

**User Story:** As a lawyer, I want a single button to generate, sign, and send the minuta, so that the entire process is streamlined.

#### Acceptance Criteria

1. WHEN a user clicks "Generar y Enviar" on an ARAG case, THE System SHALL execute the complete workflow: generate PDF → sign → send email
2. THE System SHALL display progress feedback during each step of the workflow
3. WHEN the workflow completes successfully, THE System SHALL show a success notification with the email status
4. IF any step fails, THEN THE System SHALL stop the workflow, show the error, and allow retry from the failed step
5. THE System SHALL store a copy of the signed PDF in the case's document history
6. THE System SHALL update the case detail view to show the minuta in the history timeline

### Requirement 6: ARAG Case State Management

**User Story:** As a lawyer, I want to track ARAG case states including judicial transition, so that I can manage case progress and enable suplidos when appropriate.

#### Acceptance Criteria

1. THE System SHALL support three states for ARAG cases: Abierto, Judicial, Archivado
2. WHEN a user clicks "Pasar a Judicial", THE System SHALL transition the case to Judicial state
3. WHEN transitioning to Judicial, THE System SHALL record the judicial_date
4. WHEN transitioning to Judicial, THE System SHALL require selection of a partido judicial (district)
5. THE System SHALL keep judicial cases in active status (not archived)
6. THE System SHALL enable suplido generation only for cases in Judicial state
7. THE System SHALL display the current state with appropriate color coding (Abierto=green, Judicial=yellow, Archivado=gray)

### Requirement 7: Suplidos por Kilometraje

**User Story:** As a lawyer, I want to generate mileage expense documents (suplidos) for judicial ARAG cases, so that I can bill ARAG for travel expenses to court.

#### Acceptance Criteria

1. WHEN a user requests suplido generation for a judicial case, THE System SHALL create a PDF document
2. THE System SHALL require selection of partido judicial from the closed list: Torrox, Vélez-Málaga, Torremolinos, Fuengirola, Marbella, Estepona, Antequera
3. THE System SHALL calculate the mileage amount automatically based on the configured rate for the selected district
4. THE System SHALL allow generating multiple suplidos per case (one per court visit)
5. WHEN a suplido is generated, THE System SHALL apply digital signature
6. WHEN a suplido is generated, THE System SHALL record it in document_history with document_type='SUPLIDO'
7. THE System SHALL allow sending suplidos via email (configurable recipient, default ARAG)

### Requirement 8: Mileage Rate Configuration

**User Story:** As a firm administrator, I want to configure mileage rates per judicial district, so that suplido amounts are calculated correctly.

#### Acceptance Criteria

1. THE System SHALL store mileage rates for each partido judicial in the configuration table
2. THE System SHALL provide a configuration screen to edit mileage rates
3. THE System SHALL validate that mileage rates are positive numbers
4. THE System SHALL display the calculated amount in real-time when selecting a district
5. THE System SHALL use the following configuration keys: mileage_torrox, mileage_velez_malaga, mileage_torremolinos, mileage_fuengirola, mileage_marbella, mileage_estepona, mileage_antequera

### Requirement 9: Case Closure

**User Story:** As a lawyer, I want to close and archive ARAG cases with proper documentation, so that completed cases are properly recorded.

#### Acceptance Criteria

1. WHEN a user archives an ARAG case, THE System SHALL require a closure date
2. WHEN archived, THE System SHALL change the state to Archivado
3. THE System SHALL prevent further document generation on archived cases
4. THE System SHALL preserve all document_history and email_history for archived cases
5. THE System SHALL allow viewing but not editing archived cases (except observations)

### Requirement 10: Document and Email History Display

**User Story:** As a lawyer, I want to see all documents and emails for a case in a timeline, so that I can track what has been generated and sent.

#### Acceptance Criteria

1. THE System SHALL display a timeline of all case events in the case detail view
2. THE System SHALL show document generation events with: type, date, signed status, download link
3. THE System SHALL show email events with: recipient, subject, date, status (sent/error)
4. THE System SHALL allow downloading stored PDF documents from the history
5. THE System SHALL show the most recent events first in the timeline
6. THE System SHALL visually distinguish between successful and failed operations

### Requirement 11: PDF Template System

**User Story:** As a firm administrator, I want PDF documents to use professional templates, so that all generated documents have consistent branding.

#### Acceptance Criteria

1. THE System SHALL use a fixed template for minuta ARAG documents
2. THE System SHALL use a fixed template for suplido documents
3. THE System SHALL include law firm header/logo in generated PDFs
4. THE System SHALL format currency values in Spanish locale (€ symbol, comma decimal separator)
5. THE System SHALL format dates in Spanish format (DD/MM/YYYY)
6. THE System SHALL generate PDFs in A4 format

### Requirement 12: SMTP Configuration

**User Story:** As a firm administrator, I want to configure SMTP settings, so that the system can send emails through our mail server.

#### Acceptance Criteria

1. THE System SHALL store SMTP configuration: host, port, user, password, from_email
2. THE System SHALL support TLS/SSL encrypted connections
3. THE System SHALL validate SMTP configuration before saving
4. THE System SHALL provide a test email function to verify configuration
5. IF SMTP is not configured, THEN THE System SHALL disable email sending and show a warning
