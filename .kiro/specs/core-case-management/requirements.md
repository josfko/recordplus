# Requirements Document

## Introduction

Core case management module for a legal case file (expediente) system. This module handles the fundamental CRUD operations for three case types: ARAG insurance cases, private client cases, and public defender (Turno de Oficio) cases. It manages case creation, reference numbering, state transitions, basic data storage, configuration settings, and provides the foundation for document/email tracking. This is the foundational module upon which other modules (document generation, invoicing, email, statistics) will depend.

**Module Dependencies:**

- `document-generation`: Will use case data to generate PDFs (minutas, hojas de encargo)
- `email-integration`: Will use case data and document history for email sending
- `invoicing-arag`: Will use case data for suplidos calculations
- `statistics-reporting`: Will query case data for monthly reports

## Design Reference

Based on Figma designs (Light theme version):

- **Theme**: Light with glassmorphism effects (backdrop-blur, semi-transparent backgrounds)
- **Background**: `#f8fafc` (main), `rgba(255,255,255,0.7)` (cards with blur)
- **Sidebar**: 256px width, `rgba(255,255,255,0.5)` with backdrop-blur
- **Typography**: Inter font family
- **Text colors**: `#18181b` (primary), `#71717a` (secondary), `#a1a1aa` (muted)
- **Borders**: `#e4e4e7`
- **Case type badges**:
  - ARAG: Background `#fef9c3`, border `#fef08a`, text `#a16207`, dot `#eab308` (yellow)
  - Particular: Background `#e0e7ff`, border `#c7d2fe`, text `#4338ca`, dot `#6366f1` (indigo)
  - Turno Oficio: Background `#f4f4f5`, border `#e4e4e7`, text `#3f3f46`, dot `#a1a1aa` (gray)
- **State colors**: Judicial state `#f43f5e` (rose/red)
- **Primary button**: `#18181b` (black) with white text
- **Monospace font**: Liberation Mono (for references like IY004921, DJ00948211)

## Glossary

- **Expediente**: A legal case file containing client information, references, status, and metadata
- **ARAG**: Insurance company case type requiring external reference (DJ00xxxxxx) and internal reference (IYxxxxxx)
- **Particular**: Private client case type with year-based sequential numbering (IY-YY-NNN)
- **Turno_de_Oficio**: Public defender case assigned by bar association, with designation number
- **Reference_ARAG**: External reference format DJ00xxxxxx provided by ARAG insurance
- **Reference_Internal_ARAG**: Internal reference format IY + correlative number (e.g., IY004921)
- **Reference_Internal_Particular**: Internal reference format IY-YEAR-NUMBER (e.g., IY-26-001)
- **Case_State**: Status of a case - Abierto (Open), Judicial, Archivado (Archived)
- **D1_Database**: Cloudflare D1 SQLite database at the edge for data persistence
- **Document_History**: Record of all documents generated for a case (PDF path, type, date, signed status)
- **Email_History**: Record of all emails sent for a case (recipient, subject, date, status)
- **Configuration**: System-wide settings (ARAG fee, VAT rate, ARAG email, mileage table, templates)
- **Partido_Judicial**: Court district for mileage calculations (Torrox, Vélez-Málaga, Torremolinos, Fuengirola, Marbella, Estepona, Antequera)
- **Dashboard**: Main panel showing monthly entries, archived cases, and pending cases

## Requirements

### Requirement 1: ARAG Case Creation

**User Story:** As a lawyer, I want to create ARAG insurance case files with proper reference tracking, so that I can manage insurance-related legal matters with correct identifiers.

#### Acceptance Criteria

1. WHEN a user creates an ARAG case, THE System SHALL require the ARAG reference in format DJ00xxxxxx (10 characters, starting with DJ00)
2. WHEN a user creates an ARAG case, THE System SHALL auto-generate an internal reference in format IY + 6-digit correlative number (e.g., IY004921)
3. WHEN a user creates an ARAG case, THE System SHALL require the client name (non-empty string)
4. WHEN a user creates an ARAG case, THE System SHALL set the entry date to today by default
5. WHEN a user creates an ARAG case, THE System SHALL allow editing the entry date before saving
6. WHEN a user creates an ARAG case, THE System SHALL set the initial state to "Abierto"
7. THE System SHALL validate that the ARAG reference format matches DJ00 followed by 6 digits
8. THE System SHALL prevent duplicate ARAG references across all cases

### Requirement 2: Private Client Case Creation

**User Story:** As a lawyer, I want to create private client case files with year-based sequential numbering, so that I can track non-insurance legal matters with organized references.

#### Acceptance Criteria

1. WHEN a user creates a private client case, THE System SHALL auto-generate a reference in format IY-YY-NNN (e.g., IY-26-001)
2. WHEN a user creates a private client case, THE System SHALL use the current year's last two digits for YY
3. WHEN a user creates a private client case, THE System SHALL increment NNN sequentially within each year starting from 001
4. WHEN a user creates a private client case, THE System SHALL require the client name (non-empty string)
5. WHEN a user creates a private client case, THE System SHALL set the entry date to today by default
6. WHEN a user creates a private client case, THE System SHALL allow editing the entry date before saving
7. WHEN a user creates a private client case, THE System SHALL set the initial state to "Abierto"
8. WHEN a new year begins, THE System SHALL reset the sequential number to 001

### Requirement 3: Public Defender Case Creation

**User Story:** As a lawyer, I want to create public defender (Turno de Oficio) case files with designation tracking, so that I can manage court-assigned cases.

#### Acceptance Criteria

1. WHEN a user creates a Turno de Oficio case, THE System SHALL require the client name (non-empty string)
2. WHEN a user creates a Turno de Oficio case, THE System SHALL require the designation number (designación de turno)
3. WHEN a user creates a Turno de Oficio case, THE System SHALL set the entry date to today by default
4. WHEN a user creates a Turno de Oficio case, THE System SHALL allow editing the entry date before saving
5. WHEN a user creates a Turno de Oficio case, THE System SHALL set the initial state to "Abierto"
6. THE System SHALL NOT generate invoices or engagement letters for Turno de Oficio cases

### Requirement 4: Case State Management

**User Story:** As a lawyer, I want to track and update case states, so that I can monitor case progress and archive completed matters.

#### Acceptance Criteria

1. THE System SHALL support three states for all case types: Abierto, Judicial, Archivado
2. WHEN a user transitions an ARAG case to Judicial state, THE System SHALL record the transition date
3. WHEN a user transitions an ARAG case to Judicial state, THE System SHALL keep the case in active status (not archived)
4. WHEN a user archives a case, THE System SHALL require a closure date
5. WHEN a user archives a case, THE System SHALL change the state to Archivado
6. THE System SHALL prevent archiving a case without providing a closure date
7. THE System SHALL allow viewing but not editing archived cases (except observations field)
8. THE System SHALL display the current state with appropriate color coding in the UI

### Requirement 5: Case Listing and Search

**User Story:** As a lawyer, I want to view and search all cases with filters, so that I can quickly find specific cases.

#### Acceptance Criteria

1. THE System SHALL display a paginated list of all cases with columns: Reference, Client/External Ref, Type, State, Entry Date, Actions
2. THE System SHALL allow filtering cases by type (Todos, ARAG, Particulares, Turno Oficio)
3. THE System SHALL allow filtering cases by state (Abierto, Judicial, Archivado)
4. THE System SHALL allow searching cases by reference or client name
5. THE System SHALL display case type with color-coded badges
6. THE System SHALL show pagination controls with "Anterior" and "Siguiente" buttons
7. THE System SHALL display total count of filtered results (e.g., "Mostrando 4 de 128 expedientes")

### Requirement 6: Case Detail View

**User Story:** As a lawyer, I want to view and edit case details, so that I can manage case information and add observations.

#### Acceptance Criteria

1. WHEN a user opens a case, THE System SHALL display all case data in a detail view
2. THE System SHALL display breadcrumb navigation showing: Dashboard > Expedientes > [Case Reference]
3. THE System SHALL display case type badge with appropriate color
4. THE System SHALL display entry date and current state
5. THE System SHALL provide an observations text field for notes
6. THE System SHALL auto-save observations when modified
7. THE System SHALL display action buttons appropriate to case type and state

### Requirement 7: Reference Uniqueness and Integrity

**User Story:** As a firm administrator, I want references to be unique and never reused, so that case identification remains unambiguous.

#### Acceptance Criteria

1. THE System SHALL prevent reuse of any internal reference across all case types
2. THE System SHALL prevent duplicate ARAG external references
3. THE System SHALL maintain reference counters persistently across application restarts
4. IF a case is deleted, THE System SHALL NOT reuse its reference number
5. THE System SHALL validate reference format before saving any case

### Requirement 8: Data Persistence

**User Story:** As a law firm, I want case data stored reliably, so that information is never lost.

#### Acceptance Criteria

1. THE System SHALL store all case data in Cloudflare D1 database
2. THE System SHALL create database tables on first deployment via migrations
3. THE System SHALL verify database connectivity on application startup
4. THE System SHALL support data export for backup purposes (JSON format)
5. THE System SHALL support data import for restoration (JSON format)
6. THE System SHALL store the database in Cloudflare's European data center for GDPR compliance

### Requirement 9: Dashboard

**User Story:** As a lawyer, I want to see a summary of case activity on the main screen, so that I can quickly understand the current workload.

#### Acceptance Criteria

1. THE System SHALL display the number of cases entered in the current month
2. THE System SHALL display the number of cases archived in the current month
3. THE System SHALL display the number of pending (open) cases
4. THE System SHALL display these metrics broken down by case type (ARAG, Particular, Turno de Oficio)
5. THE System SHALL update dashboard metrics in real-time when cases are created or archived
6. THE System SHALL provide quick navigation to filtered case lists from dashboard cards

### Requirement 10: Document History Tracking

**User Story:** As a lawyer, I want to see all documents generated for a case, so that I can track what has been produced and sent.

#### Acceptance Criteria

1. THE System SHALL maintain a document history record for each case
2. WHEN a document is generated, THE System SHALL record: document type, file path, generation date, signed status
3. THE System SHALL display document history in the case detail view
4. THE System SHALL allow opening/viewing stored PDF documents from the history
5. THE System SHALL store PDF documents in a structured folder hierarchy (by year/case reference)
6. THE System SHALL NOT delete document history when a case is archived

### Requirement 11: Email History Tracking

**User Story:** As a lawyer, I want to see all emails sent for a case, so that I can verify communications and track delivery status.

#### Acceptance Criteria

1. THE System SHALL maintain an email history record for each case
2. WHEN an email is sent, THE System SHALL record: recipient, subject, send date, status (sent/error), attached document reference
3. THE System SHALL display email history in the case detail view
4. THE System SHALL show delivery status with visual indicators (green=sent, red=error)
5. THE System SHALL NOT delete email history when a case is archived

### Requirement 12: System Configuration

**User Story:** As a firm administrator, I want to configure system parameters, so that the application adapts to our specific needs.

#### Acceptance Criteria

1. THE System SHALL provide a configuration screen accessible from the sidebar
2. THE System SHALL allow configuring the ARAG base fee (default: 203.00 €)
3. THE System SHALL allow configuring the VAT rate (default: 21%)
4. THE System SHALL allow configuring the ARAG invoice email (default: facturacionsiniestros@arag.es)
5. THE System SHALL allow configuring mileage rates per court district (Partido Judicial)
6. THE System SHALL store the following mileage table with configurable amounts:
   - Torrox
   - Vélez-Málaga
   - Torremolinos
   - Fuengirola
   - Marbella
   - Estepona
   - Antequera
7. THE System SHALL persist configuration changes immediately
8. THE System SHALL validate that fee and VAT values are positive numbers
9. THE System SHALL validate that email format is valid before saving

### Requirement 13: Case Type-Specific Actions

**User Story:** As a lawyer, I want to see only relevant action buttons for each case type, so that the interface is clean and intuitive.

#### Acceptance Criteria

1. WHEN viewing an ARAG case, THE System SHALL display buttons for: Generar Minuta, Pasar a Judicial (if not already judicial), Generar Suplido (if judicial), Archivar
2. WHEN viewing a Particular case, THE System SHALL display buttons for: Generar Hoja de Encargo, Archivar
3. WHEN viewing a Turno de Oficio case, THE System SHALL display buttons for: Archivar only
4. WHEN a case is archived, THE System SHALL hide action buttons except for viewing documents/history
5. THE System SHALL disable the "Pasar a Judicial" button after it has been used once

### Requirement 14: Database Administration Panel

**User Story:** As an administrator, I want to view database tables and execute queries, so that I can inspect and analyze data directly.

#### Acceptance Criteria

1. THE System SHALL provide an admin panel accessible only to administrator users
2. THE System SHALL display a list of all database tables in the admin panel
3. WHEN an administrator selects a table, THE System SHALL display its contents with pagination
4. THE System SHALL provide a query editor for executing custom SQL queries
5. THE System SHALL only allow SELECT queries in the query editor (no INSERT, UPDATE, DELETE)
6. THE System SHALL display query results in a formatted table
7. THE System SHALL show query execution time and row count
8. THE System SHALL protect the admin panel with Zero Trust authentication restricted to admin emails
