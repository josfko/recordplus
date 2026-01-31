# Facturación ARAG - Requirements Specification

## 1. Introduction

### 1.1 Overview

The Facturación ARAG module handles automated invoice generation and mileage expense claims for ARAG insurance legal cases. This module enables the law firm to:

1. Generate standardized "minuta" invoices with fixed fees (203€ + 21% IVA)
2. Generate "suplido" mileage expense claims for judicial cases
3. Optionally sign documents digitally
4. Send documents via email to ARAG
5. Track complete document and email history

### 1.2 Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     Core Case Management                        │
│              (cases, states, references)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Facturación ARAG                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│   │   Minuta    │  │   Suplido   │  │   Document/Email    │    │
│   │  Generator  │  │  Generator  │  │      History        │    │
│   └─────────────┘  └─────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│  PDF Generator  │ │ Signature Svc   │ │     Email Service       │
│   (pdfkit)      │ │  (visual only)  │ │       (nodemailer)      │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

### 1.3 Technical Context

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla JavaScript (ES Modules) |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| PDF Generation | pdfkit |
| Email | nodemailer |
| Hosting | Cloudflare Pages (FE) + VPS (BE) |

### 1.4 Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Case CRUD | ✅ Complete | All ARAG case operations working |
| Reference generation | ✅ Complete | IYxxxxxx auto-generated |
| State transitions | ✅ Complete | Abierto → Judicial → Archivado |
| PDF generation | ⚠️ Basic | Functional but needs template improvements |
| Digital signature | ❌ Visual Only | Adds text box, NOT cryptographic signature |
| Email sending | ⚠️ Conditional | Works if SMTP configured |
| Document history | ✅ Complete | All documents tracked |
| Email history | ✅ Complete | All emails tracked with status |

---

## 2. Glossary

| Term | Definition |
|------|------------|
| **Minuta** | Fixed-fee invoice sent to ARAG for legal services (203€ + IVA) |
| **Suplido** | Mileage expense reimbursement document for court appearances |
| **ARAG** | Insurance company that covers legal expenses |
| **Referencia ARAG** | External reference format: `DJ00xxxxxx` (6 digits) |
| **Referencia Interna** | Internal reference format: `IYxxxxxx` (auto-generated) |
| **Partido Judicial** | Court district for mileage calculation |
| **IVA** | Value Added Tax (21% in Spain) |
| **Estado Procesal** | Case state: Abierto, Judicial, or Archivado |
| **Firma Digital** | Digital signature (currently visual placeholder only) |

---

## 3. Requirements

### 3.1 Minuta Generation

**User Story:** As a law firm administrator, I want to generate ARAG invoices automatically so that I can bill the insurance company efficiently with standardized documents.

**Acceptance Criteria:**

1. WHEN a user clicks "Generar y Enviar" for an ARAG case, THE System SHALL generate a PDF invoice with fixed fee (203€ base + 21% IVA = 245.63€ total)

2. THE System SHALL auto-populate the minuta PDF with:
   - Client name
   - ARAG reference (DJ00xxxxxx)
   - Internal reference (IYxxxxxx)
   - Generation date (current date)

3. WHEN the PDF is generated, THE System SHALL add a visual signature indicator with timestamp

4. IF SMTP is configured, THE System SHALL send the minuta via email to `facturacionsiniestros@arag.es` with subject format: `DJ00xxxxxx - MINUTA`

5. THE System SHALL record the document in history with:
   - Document type: "MINUTA"
   - File path
   - Generation timestamp
   - Signed status

6. THE System SHALL record the email attempt in history with:
   - Recipient
   - Subject
   - Status (SENT or ERROR)
   - Error message if failed

7. THE System SHALL NOT allow minuta generation for archived cases

8. THE System SHALL display generation progress feedback to the user

---

### 3.2 Suplido Generation

**User Story:** As a law firm administrator, I want to generate mileage expense claims for judicial ARAG cases so that I can recover travel costs from ARAG.

**Acceptance Criteria:**

1. THE System SHALL only allow suplido generation for ARAG cases in JUDICIAL state

2. WHEN generating a suplido, THE System SHALL require selection of a judicial district from:
   - Torrox
   - Vélez-Málaga
   - Torremolinos
   - Fuengirola
   - Marbella
   - Estepona
   - Antequera

3. THE System SHALL calculate the suplido amount based on configured mileage rates for the selected district

4. THE System SHALL generate a PDF with:
   - Client name
   - ARAG reference
   - Internal reference
   - Selected judicial district
   - Calculated mileage amount
   - Generation date

5. THE System SHALL allow multiple suplidos per case (one for each court appearance)

6. WHEN the PDF is generated, THE System SHALL add a visual signature indicator

7. THE System SHALL record each suplido in document history

8. THE System SHALL NOT allow suplido generation for archived cases

9. IF SMTP is configured, THE System SHALL send the suplido via email to configured ARAG email with subject format: `DJ00xxxxxx - SUPLIDO - [District]`

10. THE System SHALL record the email attempt in history with status (SENT or ERROR)

---

### 3.3 Document History

**User Story:** As a law firm administrator, I want to view the complete history of generated documents so that I can track all billing activity.

**Acceptance Criteria:**

1. THE System SHALL display a timeline of all documents generated for a case

2. FOR each document, THE System SHALL show:
   - Document type (Minuta/Suplido)
   - Generation timestamp
   - Signed status
   - Download link

3. THE System SHALL allow downloading any generated document

4. THE System SHALL display email history alongside document history showing:
   - Recipient
   - Subject
   - Status (Sent/Error)
   - Error details if applicable

5. THE System SHALL display events in reverse chronological order (most recent first)

---

### 3.4 PDF Template Quality

**User Story:** As a law firm administrator, I want professional-looking PDF invoices so that they represent the firm appropriately to ARAG.

**Acceptance Criteria:**

1. THE System SHALL generate minuta PDFs with:
   - Clear header with firm identification
   - Structured fee breakdown table
   - Professional typography
   - Proper spacing and margins

2. THE System SHALL generate suplido PDFs with:
   - Clear header identifying document type
   - District and amount prominently displayed
   - Case reference information

3. THE System SHALL use consistent formatting across all document types

4. THE System SHALL format currency as Spanish locale (€ symbol, comma decimal: `245,63 €`)

5. THE System SHALL format dates as Spanish locale (DD/MM/YYYY)

---

### 3.5 Digital Signature (Phase 2 - Future)

**User Story:** As a law firm administrator, I want documents to be digitally signed so that they have legal validity.

**Acceptance Criteria:**

1. IF a digital certificate is configured, THE System SHALL sign PDFs cryptographically

2. THE System SHALL support PKCS#12 (.p12/.pfx) certificate format

3. THE System SHALL validate certificate before signing

4. THE System SHALL add visible signature annotation to signed documents

5. IF no certificate is configured, THE System SHALL add a visual "Documento firmado digitalmente" placeholder (current behavior)

**Note:** This requirement is marked as Phase 2 / Future. Current implementation only adds visual text, not cryptographic signature.

---

### 3.6 Email Workflow

**User Story:** As a law firm administrator, I want invoices sent automatically to ARAG so that I don't have to manually email documents.

**Acceptance Criteria:**

1. THE System SHALL send minuta emails to configured ARAG email (default: `facturacionsiniestros@arag.es`)

2. THE System SHALL use exact subject format: `DJ00xxxxxx - MINUTA` (where DJ00xxxxxx is the ARAG reference)

3. THE System SHALL attach the signed PDF to the email

4. IF email sending fails, THE System SHALL:
   - Record the error in email history
   - Display error message to user
   - Allow retry

5. IF SMTP is not configured, THE System SHALL:
   - Skip email sending
   - Display warning to user
   - Still generate and store the document

6. THE System SHALL support configurable SMTP settings:
   - Host
   - Port
   - Security (STARTTLS/SSL)
   - Username/Password
   - From address

---

### 3.7 Configuration

**User Story:** As a system administrator, I want to configure billing rates and email settings so that the system adapts to changing requirements.

**Acceptance Criteria:**

1. THE System SHALL allow configuration of:
   - Base fee (default: 203.00€)
   - VAT rate (default: 21%)
   - ARAG email address
   - Mileage rate per judicial district

2. THE System SHALL persist configuration to database

3. THE System SHALL validate configuration values:
   - Base fee: positive number
   - VAT rate: 0-100
   - Email: valid email format
   - Mileage rates: non-negative numbers

4. THE System SHALL apply configuration changes immediately to new documents

---

## 4. Non-Functional Requirements

### 4.1 Performance

- PDF generation SHALL complete within 5 seconds
- Email sending SHALL timeout after 30 seconds
- History queries SHALL return within 1 second

### 4.2 Reliability

- THE System SHALL handle SMTP failures gracefully
- THE System SHALL not lose document records on email failure
- THE System SHALL recover from interrupted generation workflows

### 4.3 Security

- SMTP credentials SHALL be stored securely (not in plain text logs)
- Generated documents SHALL be stored in protected directory
- API endpoints SHALL validate user authentication (via Cloudflare Zero Trust)

---

## 5. Out of Scope

The following items are explicitly NOT part of this specification:

1. **Real cryptographic digital signatures** - Deferred to Phase 2
2. **Bulk document generation** - One document at a time
3. **Document templates customization** - Fixed templates
4. **Integration with ARAG systems** - Email-based workflow only
5. **Invoice numbering** - Not required by ARAG
