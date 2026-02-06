# Record+ - Legal Case Management System

CLAUDE.md is living document. It should be carafully updated to reflect important changes.

## Project Overview

Record+ is a legal case file management system (sistema de gestión de expedientes) for a Spanish law firm. It handles three types of legal cases: ARAG insurance cases, private client cases (Particulares), and public defender cases (Turno de Oficio).

**Target Region:** Spain (Málaga province)
**Language:** Spanish UI with English code
**Compliance:** RGPD (data stored in Spain)

## Things to Remember

Before writing any code:
1. State how you will verify this change works (test, bash command, browser check, etc.)
2. Write the test OR verification step first
3. Then implement the code
4. Run verification and iterate until it passes

## Testing Guidelines

### Email Testing
- **NEVER use production email addresses** (like facturacionsiniestros@arag.es) for testing
- Use approved test addresses (e.g., soniadeveloper1@gmail.com) or Mailtrap sandbox
- **Don't trust SMTP success responses** - verify actual delivery:
  - Check recipient's inbox (not just "250 OK" from server)
  - Use `emailTestService.js` for automated verification with Mailtrap

### Email Test Service
Located at: `src/server/services/emailTestService.js`
- `verifyEmailDelivery({subject, to})` - Verify email actually arrived in Mailtrap
- `documentEmailTestResult({testName, smtpResponse, deliveryVerification})` - Document both API and actual outcome
- `clearMailtrapInbox()` - Clean inbox before tests

### Mailtrap Setup (for sandbox testing)
```bash
# Add to .env for test environment
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASSWORD=your_mailtrap_password
MAILTRAP_API_TOKEN=your_api_token
MAILTRAP_INBOX_ID=your_inbox_id
MAILTRAP_ACCOUNT_ID=your_account_id
```

### Test Journey Documentation
Use template at: `docs/templates/TEST_JOURNEY_TEMPLATE.md`
- Always document API response AND verified outcome
- Separate "system says success" from "actually worked"

## Documentation Guidelines
When documenting test results:
1. Record the API/system response
2. Record the **verified end-to-end outcome**
3. Note any discrepancies (false positives)

## Comunication
1. Always specify exactly where do i have to run a command you tell me to run

## Technology Stack

### Frontend
- **Vanilla JavaScript** with ES Modules (NO frameworks)
- **Pure CSS** with CSS custom properties (Never use Tailwind, do not use CSS frameworks)
- **SPA** with hash-based routing
- **Hosted on:** Cloudflare Pages

### Backend
- **Node.js + Express** (ES Modules)
- **better-sqlite3** for SQLite database
- **Hosted on:** Clouding.io VPS (Barcelona, Spain)

### Infrastructure
- **Cloudflare Zero Trust** for authentication
- **Cloudflare Tunnel** for secure backend connection
- **PM2** for process management

## Project Structure

```
record+/
├── src/
│   ├── server/                    # Node.js + Express Backend
│   │   ├── index.js               # Express entry point
│   │   ├── database.js            # SQLite connection
│   │   ├── routes/
│   │   │   ├── cases.js
│   │   │   ├── config.js
│   │   │   ├── dashboard.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   ├── caseService.js
│   │   │   ├── referenceGenerator.js
│   │   │   └── configurationService.js
│   │   ├── middleware/
│   │   │   ├── validation.js
│   │   │   └── errorHandler.js
│   │   └── __tests__/
│   │
│   └── client/                    # Frontend (Cloudflare Pages)
│       ├── index.html
│       ├── css/
│       │   ├── main.css
│       │   ├── variables.css
│       │   └── components/
│       ├── js/
│       │   ├── app.js
│       │   ├── router.js
│       │   ├── api.js
│       │   └── components/
│       │       ├── dashboard.js
│       │       ├── caseList.js
│       │       ├── caseDetail.js
│       │       ├── caseForm.js
│       │       ├── configuration.js
│       │       └── adminPanel.js
│       └── __tests__/
│
├── migrations/
│   └── 001_initial_schema.sql
│
├── data/                          # On VPS only (not in repo)
│   ├── legal-cases.db             # SQLite database
│   └── documents/                 # PDF storage
│
├── package.json
├── ecosystem.config.js            # PM2 configuration
└── CLAUDE.md
```

## Domain Terminology (Spanish Legal)

| Term | Translation | Description |
|------|-------------|-------------|
| Expediente | Case file | A legal case record |
| Minuta | Invoice | ARAG fee invoice (203€ + IVA) |
| Suplido | Expense | Mileage reimbursement document |
| Hoja de Encargo | Engagement letter | Private client service agreement |
| Turno de Oficio | Public defender | Court-assigned defense cases |
| Partido Judicial | Court district | For mileage calculations |
| ARAG | Insurance company | Legal expense insurance provider |
| Abierto | Open | Active case state |
| Judicial | In court | Case in judicial proceedings |
| Archivado | Archived | Closed case state |
| Designación | Designation | Public defender assignment number |

## Case Reference Formats

| Case Type | Internal Reference | External Reference |
|-----------|-------------------|-------------------|
| ARAG | `IY` + 6 digits (e.g., `IY004921`) | `DJ00` + 6 digits (e.g., `DJ00948211`) |
| Particular | `IY-YY-NNN` (e.g., `IY-26-001`) | N/A |
| Turno de Oficio | N/A | Designation number |

## API Routes

```
GET    /api/cases              - List cases (filters: type, state, search, page)
GET    /api/cases/:id          - Get case by ID
POST   /api/cases              - Create new case
PUT    /api/cases/:id          - Update case
POST   /api/cases/:id/archive  - Archive case (requires closureDate)
POST   /api/cases/:id/judicial - Transition ARAG case to judicial

GET    /api/dashboard          - Get dashboard metrics

GET    /api/config             - Get all configuration
PUT    /api/config             - Update configuration

# ARAG Facturación
POST   /api/cases/:id/minuta   - Generate, sign, and send minuta
POST   /api/cases/:id/suplido  - Generate suplido (requires district in body)
GET    /api/cases/:id/history  - Get document and email history
GET    /api/documents/:id/download - Download a document
POST   /api/email/test         - Test SMTP connection
GET    /api/mileage-rates      - Get mileage rates for all districts
POST   /api/arag/cases/:caseId/emails/:emailId/retry - Retry failed email

POST   /api/export             - Export all data as JSON
POST   /api/import             - Import data from JSON

GET    /api/admin/tables       - List tables with counts (admin only)
GET    /api/admin/table/:name  - Get table contents (admin only)
POST   /api/admin/query        - Execute SELECT query (admin only)

GET    /api/health             - Health check
```

## Database Schema

```sql
-- Cases table
CREATE TABLE cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('ARAG', 'PARTICULAR', 'TURNO_OFICIO')),
  client_name TEXT NOT NULL,
  internal_reference TEXT UNIQUE,
  arag_reference TEXT UNIQUE,
  designation TEXT,
  state TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (state IN ('ABIERTO', 'JUDICIAL', 'ARCHIVADO')),
  entry_date TEXT NOT NULL,
  judicial_date TEXT,
  judicial_district TEXT,
  closure_date TEXT,
  observations TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document history, email history, configuration, reference_counters tables
-- See .kiro/specs/core-case-management/design.md for full schema
```

## UI Design System (Dark Theme)

### Colors
```css
--bg-primary: #030305;
--bg-card: rgba(20, 20, 23, 0.6);
--text-primary: #ffffff;
--text-secondary: #a1a1aa;
--border-default: rgba(255, 255, 255, 0.1);
```

### Case Type Badges
- **ARAG:** Yellow (`#eab308` text, `rgba(234, 179, 8, 0.1)` bg)
- **Particular:** Indigo (`#818cf8` text, `rgba(99, 102, 241, 0.1)` bg)
- **Turno Oficio:** Gray (`#d4d4d8` text, `rgba(63, 63, 70, 0.3)` bg)

### Typography
- Sans: Inter
- Mono: Liberation Mono (for references like `IY004921`)

### Design Effects
- Glassmorphism: `backdrop-filter: blur(10px)` on cards
- Sidebar: Uses `clamp(200px, calc(100vw - 800px), 256px)` for automatic responsive sizing

### Responsive Constraints
This is a desktop-first application with strict layout constraints:

- **Minimum viewport:** 1000px (horizontal scroll below this width)
- **Sidebar:** Uses CSS `clamp()` to automatically shrink from 256px to 200px
- **Main content:** Minimum 750px width
- **No text wrapping:** Inline elements (tabs, buttons, badges) use `white-space: nowrap`
- **No element stacking:** Headers and control bars use `flex-wrap: nowrap`

Key CSS variables (defined in `variables.css`):
```css
--sidebar-width: clamp(200px, calc(100vw - 800px), 256px);
--min-viewport-width: 1000px;
--min-main-width: 750px;
```

See `.kiro/specs/responsive-constraints/` for full specification.

## Business Rules

### Case Creation
1. ARAG: Requires `DJ00xxxxxx` external reference, auto-generates `IYxxxxxx` internal
2. Particular: Auto-generates `IY-YY-NNN` (year resets counter to 001)
3. Turno de Oficio: Requires designation number, NO invoices generated

### State Transitions
- `ABIERTO` → `JUDICIAL` → `ARCHIVADO`
- `ABIERTO` → `ARCHIVADO`
- Archiving requires closure date
- Archived cases are read-only (except observations)

### Reference Integrity
- References are NEVER reused, even after deletion
- ARAG external references must be unique
- All internal references must be unique across all case types

## Configuration Defaults

```javascript
{
  'arag_base_fee': 203.00,      // € base fee
  'vat_rate': 21,               // % IVA
  'arag_email': 'facturacionsiniestros@arag.es',
  'mileage_torrox': 0.00,
  'mileage_velez_malaga': 0.00,
  'mileage_torremolinos': 0.00,
  'mileage_fuengirola': 0.00,
  'mileage_marbella': 0.00,
  'mileage_estepona': 0.00,
  'mileage_antequera': 0.00
}
```

## Facturación ARAG Module

The Facturación ARAG module handles automated invoice generation and email delivery for ARAG insurance cases.

### Workflow

1. **Minuta Generation** (`POST /api/cases/:id/minuta`)
   - Generates PDF invoice with fixed fee (203€ + 21% IVA = 245.63€)
   - Signs document (visual signature by default, crypto when certificate configured)
   - Records document in history
   - Sends email to ARAG if SMTP configured
   - Records email status (SENT/ERROR)

2. **Suplido Generation** (`POST /api/cases/:id/suplido`)
   - Requires case to be in JUDICIAL state
   - Requires judicial district selection
   - Calculates mileage amount from configuration
   - Same workflow as minuta (generate → sign → record → email)

### Judicial Districts

Valid districts for suplidos (configured in Configuration page):
- Torrox, Vélez-Málaga, Torremolinos, Fuengirola, Marbella, Estepona, Antequera

### SMTP Configuration

Required settings in Configuration page for email delivery:
- **smtp_host**: SMTP server hostname
- **smtp_port**: Port (587 for STARTTLS, 465 for SSL)
- **smtp_secure**: 'true' for SSL, 'false' for STARTTLS
- **smtp_user**: Username/email
- **smtp_password**: Password or app password
- **smtp_from**: Sender email address

#### Example SMTP Configurations

**Gmail (requires App Password):**
```
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
User: your-email@gmail.com
Password: xxxx-xxxx-xxxx-xxxx (16-char app password)
```

**Office 365:**
```
Host: smtp.office365.com
Port: 587
Security: STARTTLS
User: your-email@domain.com
Password: your-password
```

**Basenet (camaraygamero.org - PRODUCTION):**
```
Host: smtp.basenet.nl
Port: 587
Security: STARTTLS
User: abogados@camaraygamero.org
Password: [from Basenet: Ajustes → Cuentas de Correo]
From: abogados@camaraygamero.org
```
Note: Basenet manages both incoming (MX) and outgoing (SMTP) email for this domain.
SPF record includes: `include:_spf.basenet.nl`

**Mailtrap (TESTING ONLY):**
```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Security: none
User: [from Mailtrap inbox settings]
Password: [from Mailtrap inbox settings]
```
See `src/server/services/emailTestService.js` for verification helpers.

### Error Handling

SMTP errors are mapped to user-friendly Spanish messages:
- ECONNREFUSED → "Conexión rechazada"
- EAUTH → "Error de autenticación"
- ETIMEDOUT → "Tiempo de espera agotado"
- ESOCKET → "Error de conexión"
- EENVELOPE → "Destinatario inválido"

### Email Retry

Failed emails can be retried via:
- Retry button in the timeline UI
- API: `POST /api/arag/cases/:caseId/emails/:emailId/retry`

### Services

| Service | File | Description |
|---------|------|-------------|
| MinutaWorkflowService | `minutaWorkflowService.js` | Orchestrates complete workflow |
| PDFGeneratorService | `pdfGeneratorService.js` | Creates PDF documents |
| SignatureService | `signatureService.js` | Signs PDFs (visual or crypto) |
| EmailService | `emailService.js` | SMTP email delivery |
| DocumentHistoryService | `documentHistoryService.js` | Tracks generated documents |
| EmailHistoryService | `emailHistoryService.js` | Tracks email attempts |

### Digital Signature

**Implementation:** Strategy pattern with two modes:
- **VisualSignatureStrategy**: Text box with timestamp (default, no certificate)
- **CryptoSignatureStrategy**: PKCS#7/CMS cryptographic signature (when certificate configured)

**Cryptographic signing uses OpenSSL CLI** (not node-forge for PKCS#7 generation):
- node-forge has a [known bug (PR #731)](https://github.com/digitalbazaar/forge/pull/731) where `SET OF` elements are not DER-sorted, causing Adobe to reject signatures
- `AcaP12Signer.sign()` extracts key/certs from P12 with node-forge, then calls `openssl cms -sign` for correct DER encoding
- `AcaP12Signer.makeDetached()` strips embedded content from CMS using `asn1js` (PDF requires detached signatures)
- Requires OpenSSL installed on the system (pre-installed on Ubuntu 22.04 and macOS)
- Requires: `@signpdf/signpdf`, `@signpdf/placeholder-pdf-lib`, `asn1js` packages
- See `docs/FIX_ADOBE_PDF_SIGNATURE.md` for full technical details

**To enable:** Configure `certificate_path` and `certificate_password` in Configuration page. System auto-switches to crypto when certificate is available.

## Testing Requirements

Use **fast-check** for property-based testing. Required properties:

1. ARAG reference format validation (`/^DJ00\d{6}$/`)
2. Internal reference uniqueness
3. Sequential numbering for Particular cases
4. Required fields validation
5. Archive requires closure date
6. State transition validity
7. Dashboard metrics accuracy
8. Configuration value validation
9. Export/import round-trip

## Development Guidelines

### Code Style
- ES Modules (`import`/`export`) everywhere
- Vanilla JS only - NO React, Vue, Svelte, etc.
- Pure CSS with custom properties - NO Tailwind, SCSS, etc.
- Use `better-sqlite3` for database (NOT the async `sqlite3` package)

### Error Handling
```javascript
// API error response format
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El nombre del cliente es obligatorio",
    "field": "clientName"
  }
}
```

### HTTP Status Codes
- 200: Success
- 400: Validation error
- 404: Resource not found
- 409: Conflict (duplicate reference)
- 500: Server error

## Module Dependencies

```
core-case-management (CURRENT)
    ↓
document-generation (PDF templates, digital signatures)
    ↓
email-integration (SMTP, attachments)
    ↓
invoicing-arag (fixed fee + mileage expenses)
    ↓
statistics-reporting (monthly reports, Excel/PDF export)
```

## Deployment

### VPS (Clouding.io Barcelona)
- **OS:** Ubuntu 22.04 LTS (NO Debian - better Node.js/Cloudflare tooling support)
- **Node.js:** 20.x (via NodeSource)
- **Process Manager:** PM2
- **Database:** SQLite at `/home/appuser/data/legal-cases.db`
- **Documents:** PDF storage at `/home/appuser/data/documents/`

### Security
- No open ports (all traffic via Cloudflare Tunnel)
- Zero Trust authentication required
- App runs as non-root user (`appuser`)
- Daily SQLite backups (30-day retention)

## Important Notes

- All dates in ISO format (`YYYY-MM-DD`)
- UI language is Spanish
- Code comments and variable names in English
- Never delete cases - only archive them
- Admin panel is SELECT-only (no write queries)
- Frontend communicates with backend via `/api/*` routes through Cloudflare Tunnel
