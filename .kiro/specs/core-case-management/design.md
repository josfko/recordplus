# Design Document: Core Case Management

## Overview

This document describes the technical design for the core case management module of the legal case file (expediente) system. The module provides the foundational data layer, business logic, and UI components for managing three types of legal cases: ARAG insurance cases, private client cases (Particulares), and public defender cases (Turno de Oficio).

**Technology Stack:**

- **Frontend**: Vanilla JavaScript with ES Modules, pure CSS (hosted on Cloudflare Pages)
- **Backend**: Node.js + Express (hosted on Clouding.io VPS in Barcelona, Spain)
- **Database**: SQLite (local file on VPS)
- **Security**: Cloudflare Zero Trust + Tunnel (authentication layer)
- **Region**: Barcelona, Spain (RGPD compliance)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Zero Trust                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Authentication Layer (Google/Email OTP)                        │    │
│  │  - User verification before any request reaches the app         │    │
│  │  - Access policies: only authorized law firm emails             │    │
│  │  - Audit logs for all access attempts                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────┐               ┌───────────────────────────┐
│    Cloudflare Pages       │               │    Cloudflare Tunnel      │
│    (Frontend CDN)         │               │    (Secure connection)    │
│                           │               │                           │
│  - Static HTML/CSS/JS     │   fetch()     │  - No open ports          │
│  - ES Modules             │──────────────►│  - Encrypted traffic      │
│  - SPA Router             │               │  - Zero Trust integrated  │
└───────────────────────────┘               └─────────────┬─────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Clouding.io VPS (Barcelona, Spain)                       │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  cloudflared    │  │  Node.js +      │  │  SQLite DB      │         │
│  │  (tunnel daemon)│◄─│  Express API    │◄─│  (local file)   │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │  PM2            │  Process manager (keeps app running)               │
│  └─────────────────┘                                                    │
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │  /data/         │  PDF documents storage                             │
│  │  documents/     │                                                    │
│  └─────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Cloudflare Zero Trust**

   - User authentication (Google Workspace or email OTP)
   - Access control policies (whitelist law firm emails)
   - Session management (24h sessions)
   - Audit logging (who accessed when)

2. **Cloudflare Pages (Frontend)**

   - Static file hosting (HTML, CSS, JS)
   - Global CDN for fast loading
   - SPA routing
   - API communication via fetch() through Tunnel

3. **Cloudflare Tunnel**

   - Secure connection between Cloudflare and VPS
   - No need to open ports on VPS (more secure)
   - Automatic TLS encryption
   - Integrated with Zero Trust authentication

4. **Clouding.io VPS (Backend)**
   - Node.js + Express REST API
   - Business logic and validation
   - SQLite database operations
   - PDF document storage
   - PM2 process management

## Components and Interfaces

### Express API Routes

```javascript
// src/server/index.js
import express from "express";
import cors from "cors";
import { caseRouter } from "./routes/cases.js";
import { configRouter } from "./routes/config.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/cases", caseRouter);
app.use("/api/config", configRouter);
app.use("/api/dashboard", dashboardRouter);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(3000, () => console.log("API running on port 3000"));
```

### API Endpoints

```
GET    /api/cases              - List cases with filters & pagination
GET    /api/cases/:id          - Get case by ID
POST   /api/cases              - Create new case
PUT    /api/cases/:id          - Update case
POST   /api/cases/:id/archive  - Archive case (requires closureDate)
POST   /api/cases/:id/judicial - Transition ARAG case to judicial
GET    /api/dashboard          - Get dashboard metrics
GET    /api/config             - Get all configuration
PUT    /api/config             - Update configuration
POST   /api/export             - Export all data as JSON
POST   /api/import             - Import data from JSON
GET    /api/health             - Health check endpoint
```

### Case Service

```javascript
// src/server/services/caseService.js
export class CaseService {
  constructor(db) {
    this.db = db;
  }

  async create(caseData) {
    // Validate, generate reference, insert
  }

  async getById(id) {
    return this.db.get("SELECT * FROM cases WHERE id = ?", [id]);
  }

  async list(filters, pagination) {
    // Build query with filters, return paginated results
  }

  async update(id, data) {
    // Update case, set updated_at
  }

  async archive(id, closureDate) {
    // Validate closureDate, update state to ARCHIVADO
  }

  async transitionToJudicial(id, date, district) {
    // Update state to JUDICIAL, set judicial_date and district
  }

  async getDashboardMetrics(month, year) {
    // Count entries, archived, pending by type
  }
}
```

### Reference Generator

```javascript
// src/server/services/referenceGenerator.js
export class ReferenceGenerator {
  constructor(db) {
    this.db = db;
  }

  async generateAragReference() {
    // Get counter, increment, return IY + 6 digits (e.g., IY004921)
    const counter = await this.getNextCounter("ARAG");
    return `IY${counter.toString().padStart(6, "0")}`;
  }

  async generateParticularReference(year) {
    // Get counter for year, increment, return IY-YY-NNN
    const yy = year.toString().slice(-2);
    const counter = await this.getNextCounter(`PARTICULAR_${year}`);
    return `IY-${yy}-${counter.toString().padStart(3, "0")}`;
  }

  validateAragExternalReference(ref) {
    return /^DJ00\d{6}$/.test(ref);
  }

  async getNextCounter(type) {
    // Atomic increment in SQLite
  }
}
```

### Frontend Components (ES Modules)

```javascript
// src/client/js/components/dashboard.js
export class DashboardView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    const metrics = await api.getDashboard();
    this.container.innerHTML = this.template(metrics);
    this.bindEvents();
  }

  template(metrics) {
    return `
      <div class="dashboard-header">
        <h1>Panel de Control</h1>
        <button class="btn-primary" onclick="router.navigate('/cases/new')">
          Nuevo Expediente
        </button>
      </div>
      <div class="metrics-grid">
        ${this.renderMetricCard("Entradas del Mes", metrics.entriesThisMonth)}
        ${this.renderMetricCard(
          "Archivados del Mes",
          metrics.archivedThisMonth
        )}
        ${this.renderMetricCard("Pendientes", metrics.pending)}
      </div>
    `;
  }
}
```

### API Client

```javascript
// src/client/js/api.js
class ApiClient {
  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.json();
  }

  // Cases
  listCases = (filters, page) =>
    this.request(`/cases?${new URLSearchParams({ ...filters, page })}`);
  getCase = (id) => this.request(`/cases/${id}`);
  createCase = (data) =>
    this.request("/cases", { method: "POST", body: JSON.stringify(data) });
  updateCase = (id, data) =>
    this.request(`/cases/${id}`, { method: "PUT", body: JSON.stringify(data) });
  archiveCase = (id, date) =>
    this.request(`/cases/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ closureDate: date }),
    });

  // Dashboard & Config
  getDashboard = () => this.request("/dashboard");
  getConfig = () => this.request("/config");
  updateConfig = (data) =>
    this.request("/config", { method: "PUT", body: JSON.stringify(data) });
}

export const api = new ApiClient();
```

## Data Models

### Case Entity

```javascript
{
  id: Number,                    // Primary key (auto-increment)
  type: String,                  // 'ARAG' | 'PARTICULAR' | 'TURNO_OFICIO'
  clientName: String,            // Required, non-empty
  internalReference: String,     // IY004921 or IY-26-001 or null (Turno)
  aragReference: String | null,  // DJ00xxxxxx (ARAG only)
  designation: String | null,    // Designation number (Turno only)
  state: String,                 // 'ABIERTO' | 'JUDICIAL' | 'ARCHIVADO'
  entryDate: String,             // ISO date (YYYY-MM-DD)
  judicialDate: String | null,   // ISO date when transitioned to judicial
  judicialDistrict: String | null, // Partido judicial (ARAG judicial only)
  closureDate: String | null,    // ISO date when archived
  observations: String,          // Free text notes
  createdAt: String,             // ISO timestamp
  updatedAt: String              // ISO timestamp
}
```

### Document History Entity

```javascript
{
  id: Number,
  caseId: Number,                // Foreign key to cases
  documentType: String,          // 'MINUTA' | 'SUPLIDO' | 'HOJA_ENCARGO'
  filePath: String,              // Path to PDF on disk
  generatedAt: String,           // ISO timestamp
  signed: Boolean,               // Whether digitally signed
  createdAt: String
}
```

### Email History Entity

```javascript
{
  id: Number,
  caseId: Number,                // Foreign key to cases
  documentId: Number | null,     // Foreign key to documents
  recipient: String,             // Email address
  subject: String,
  sentAt: String,                // ISO timestamp
  status: String,                // 'SENT' | 'ERROR'
  errorMessage: String | null,
  createdAt: String
}
```

### Configuration Entity

```javascript
// Configuration keys and defaults:
{
  'arag_base_fee': 203.00,
  'vat_rate': 21,
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

## Database Schema (SQLite)

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

-- Configuration table
CREATE TABLE configuration (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reference counters table
CREATE TABLE reference_counters (
  type TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_cases_type ON cases(type);
CREATE INDEX idx_cases_state ON cases(state);
CREATE INDEX idx_cases_entry_date ON cases(entry_date);
CREATE INDEX idx_document_history_case_id ON document_history(case_id);
CREATE INDEX idx_email_history_case_id ON email_history(case_id);
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system._

### Property 1: ARAG Reference Format Validation

_For any_ string input as ARAG reference, the system should accept it if and only if it matches the pattern `DJ00` followed by exactly 6 digits (0-9).
**Validates: Requirements 1.1, 1.7**

### Property 2: Internal Reference Format and Uniqueness

_For any_ sequence of cases created, all generated internal references should:

- Match their expected format (IY + 6 digits for ARAG, IY-YY-NNN for Particular)
- Be unique across all cases in the database
- Never be reused even after case deletion
  **Validates: Requirements 1.2, 2.1, 7.1, 7.4, 7.5**

### Property 3: Sequential Numbering for Particular Cases

_For any_ sequence of N Particular cases created within the same year, the sequential numbers should be consecutive starting from 001.
**Validates: Requirements 2.3**

### Property 4: Required Fields Validation

_For any_ case creation attempt:

- Client name must be non-empty (not null, not empty string, not whitespace-only)
- ARAG cases must have a valid ARAG reference
- Turno de Oficio cases must have a designation number
  **Validates: Requirements 1.3, 2.4, 3.1, 3.2**

### Property 5: ARAG Reference Uniqueness

_For any_ two ARAG cases in the system, their ARAG external references must be different.
**Validates: Requirements 1.8, 7.2**

### Property 6: Archive Requires Closure Date

_For any_ case archive operation, the operation should succeed if and only if a valid closure date is provided.
**Validates: Requirements 4.4, 4.5, 4.6**

### Property 7: State Transitions Validity

_For any_ case, the state should always be one of: ABIERTO, JUDICIAL, or ARCHIVADO. Valid transitions: ABIERTO → JUDICIAL → ARCHIVADO or ABIERTO → ARCHIVADO.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: Case Data Round-Trip Persistence

_For any_ valid case object, saving it to the database and then retrieving it should produce an equivalent object.
**Validates: Requirements 8.1, 8.3**

### Property 9: Dashboard Metrics Accuracy

_For any_ set of cases in the database, the dashboard metrics should equal the count of cases matching those criteria.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 10: Configuration Value Validation

_For any_ configuration update: fee and VAT values must be positive numbers, email values must match valid email format.
**Validates: Requirements 12.8, 12.9**

### Property 11: Export/Import Round-Trip

_For any_ database state, exporting to JSON and then importing should restore an equivalent state.
**Validates: Requirements 8.4, 8.5**

## Error Handling

### API Error Response Format

```javascript
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

### Frontend Error Display

- Inline validation errors below form fields
- Toast notifications for API errors
- Modal dialogs for critical errors

## Testing Strategy

### Unit Tests

- Reference format validation
- Date handling
- State transition logic
- Configuration validation

### Property-Based Tests

Using fast-check library, minimum 100 iterations per property.

```javascript
// Example: Property 1 test
// Feature: core-case-management, Property 1: ARAG Reference Format Validation
// Validates: Requirements 1.1, 1.7
test("ARAG reference validation", () => {
  fc.assert(
    fc.property(fc.string(), (input) => {
      const isValid = /^DJ00\d{6}$/.test(input);
      expect(validateAragReference(input)).toBe(isValid);
    })
  );
});
```

### Integration Tests

- Full case creation flow
- Dashboard metrics calculation
- Export/import cycle

## File Structure

```
legal-case-management/
├── src/
│   ├── server/                    # Node.js + Express Backend
│   │   ├── index.js               # Express entry point
│   │   ├── database.js            # SQLite connection
│   │   ├── routes/
│   │   │   ├── cases.js
│   │   │   ├── config.js
│   │   │   └── dashboard.js
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
│       │       └── configuration.js
│       └── __tests__/
│
├── migrations/
│   └── 001_initial_schema.sql
│
├── data/                          # On VPS only
│   ├── legal-cases.db             # SQLite database
│   └── documents/                 # PDF storage
│
├── package.json
├── ecosystem.config.js            # PM2 configuration
└── README.md
```

## CSS Design Tokens (Dark Theme)

```css
/* src/client/css/variables.css */
:root {
  /* Background (Dark Theme) */
  --bg-primary: #030305;
  --bg-card: rgba(20, 20, 23, 0.6);
  --bg-sidebar: rgba(20, 20, 23, 0.8);
  --bg-table-header: rgba(255, 255, 255, 0.02);
  --bg-hover: rgba(255, 255, 255, 0.05);

  /* Backdrop */
  --backdrop-blur: 10px;

  /* Text (Dark Theme) */
  --text-primary: #ffffff;
  --text-primary-alt: rgba(255, 255, 255, 0.9);
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;

  /* Borders (Dark Theme) */
  --border-default: rgba(255, 255, 255, 0.1);
  --border-light: rgba(255, 255, 255, 0.08);
  --border-table-row: rgba(255, 255, 255, 0.05);

  /* Badge ARAG (Yellow - Dark Theme) */
  --badge-arag-bg: rgba(234, 179, 8, 0.1);
  --badge-arag-border: rgba(234, 179, 8, 0.2);
  --badge-arag-text: #eab308;
  --badge-arag-dot: #eab308;

  /* Badge Particular (Indigo - Dark Theme) */
  --badge-particular-bg: rgba(99, 102, 241, 0.1);
  --badge-particular-border: rgba(99, 102, 241, 0.2);
  --badge-particular-text: #818cf8;
  --badge-particular-dot: #818cf8;

  /* Badge Turno Oficio (Gray - Dark Theme) */
  --badge-turno-bg: rgba(63, 63, 70, 0.3);
  --badge-turno-border: rgba(63, 63, 70, 0.4);
  --badge-turno-text: #d4d4d8;
  --badge-turno-dot: #a1a1aa;

  /* State (Dark Theme) */
  --state-judicial: #fda4af;
  --state-success: #34d399;
  --state-error: #f87171;

  /* Button (Dark Theme - inverted) */
  --btn-primary-bg: #ffffff;
  --btn-primary-text: #000000;
  --btn-secondary-bg: rgba(255, 255, 255, 0.1);
  --btn-secondary-text: #ffffff;

  /* Typography */
  --font-sans: "Inter", sans-serif;
  --font-mono: "Liberation Mono", monospace;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows (Dark Theme - subtle glow) */
  --shadow-sm: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  --shadow-md: 0px 4px 6px -1px rgba(0, 0, 0, 0.4), 0px 2px 4px -1px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0px 0px 20px rgba(255, 255, 255, 0.05);

  /* Layout */
  --sidebar-width: 256px;
}

/* Card/Panel glass effect */
.card,
.panel {
  background: var(--bg-card);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}
```

## Deployment Guide: Clouding.io + Cloudflare

### Prerequisites

- Cuenta en Clouding.io (https://clouding.io)
- Cuenta en Cloudflare (https://cloudflare.com)
- Dominio propio (ej: expedientes.tu-despacho.com)

### Step 1: Create VPS on Clouding.io

1. **Registrarse en Clouding.io** (5€ crédito gratis)
2. **Crear servidor**:

   - Sistema: Ubuntu 22.04 LTS
   - RAM: 2 GB
   - vCores: 1
   - SSD: 20 GB
   - Ubicación: Barcelona
   - Coste estimado: ~€5-8/mes

3. **Acceder por SSH**:

```bash
ssh root@<IP_DEL_SERVIDOR>
```

### Step 2: Configure VPS

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create app user (security)
adduser --disabled-password appuser
mkdir -p /home/appuser/app
mkdir -p /home/appuser/data
chown -R appuser:appuser /home/appuser

# Switch to app user
su - appuser
```

### Step 3: Deploy Application

```bash
# As appuser
cd /home/appuser/app

# Clone or upload your code
git clone <your-repo> .

# Install dependencies
npm install --production

# Initialize database
node migrations/run.js

# Start with PM2
pm2 start src/server/index.js --name legal-api
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### Step 4: Install Cloudflare Tunnel

```bash
# As root
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create legal-app

# Configure tunnel (creates ~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.expedientes.tu-despacho.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns legal-app api.expedientes.tu-despacho.com

# Install as service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

### Step 5: Configure Cloudflare Zero Trust

1. **En Cloudflare Dashboard** → Zero Trust → Access → Applications
2. **Add Application** → Self-hosted
3. **Configure**:
   - Application name: "Legal Case Management"
   - Session duration: 24 hours
   - Application domain: `api.expedientes.tu-despacho.com`
4. **Add Policy**:
   - Policy name: "Law Firm Staff"
   - Action: Allow
   - Include: Emails ending in `@tu-despacho.com` OR specific emails

### Step 6: Deploy Frontend to Cloudflare Pages

1. **En Cloudflare Dashboard** → Pages → Create project
2. **Connect GitHub repo** or upload directly
3. **Build settings**:
   - Build command: (none, static files)
   - Output directory: `src/client`
4. **Custom domain**: `expedientes.tu-despacho.com`
5. **Add Zero Trust** to frontend domain too

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "legal-api",
      script: "src/server/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DB_PATH: "/home/appuser/data/legal-cases.db",
        DOCUMENTS_PATH: "/home/appuser/data/documents",
      },
    },
  ],
};
```

### Backup Strategy

```bash
# Cron job for daily backups (as appuser)
crontab -e

# Add this line (backup at 3 AM daily)
0 3 * * * sqlite3 /home/appuser/data/legal-cases.db ".backup '/home/appuser/backups/legal-cases-$(date +\%Y\%m\%d).db'"

# Keep only last 30 days
0 4 * * * find /home/appuser/backups -name "*.db" -mtime +30 -delete
```

### Security Checklist

- [x] No ports exposed (all traffic via Cloudflare Tunnel)
- [x] Zero Trust authentication required
- [x] App runs as non-root user
- [x] SQLite database in protected directory
- [x] Daily automated backups
- [x] HTTPS enforced by Cloudflare
- [x] Data stored in Spain (RGPD compliance)

## Admin Panel Component

### Admin Panel UI

```javascript
// src/client/js/components/adminPanel.js
export class AdminPanel {
  constructor(container) {
    this.container = container;
    this.currentTable = null;
    this.queryResult = null;
  }

  async render() {
    const tables = await api.request("/api/admin/tables");

    this.container.innerHTML = `
      <div class="admin-panel">
        <div class="admin-header">
          <h1>Panel de Administración</h1>
          <span class="admin-badge">Solo lectura</span>
        </div>
        
        <div class="admin-layout">
          <!-- Sidebar: Table list -->
          <aside class="admin-sidebar">
            <h3>Tablas</h3>
            <ul class="table-list">
              ${tables
                .map(
                  (t) => `
                <li class="table-item" data-table="${t.name}">
                  <span class="table-icon">📋</span>
                  <span class="table-name">${t.name}</span>
                  <span class="table-count">${t.count}</span>
                </li>
              `
                )
                .join("")}
            </ul>
          </aside>
          
          <!-- Main: Data viewer -->
          <main class="admin-main">
            <!-- Query Editor -->
            <div class="query-section">
              <h3>Ejecutar Query</h3>
              <textarea id="query-editor" placeholder="SELECT * FROM cases LIMIT 10"></textarea>
              <div class="query-actions">
                <button id="run-query" class="btn-primary">Ejecutar (SELECT only)</button>
                <span id="query-status"></span>
              </div>
            </div>
            
            <!-- Results -->
            <div class="results-section">
              <div class="results-header">
                <h3 id="results-title">Resultados</h3>
                <span id="results-info"></span>
              </div>
              <div id="results-table" class="data-grid"></div>
              <div id="pagination" class="pagination"></div>
            </div>
          </main>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Table selection
    this.container.querySelectorAll(".table-item").forEach((item) => {
      item.addEventListener("click", () => this.loadTable(item.dataset.table));
    });

    // Query execution
    this.container.querySelector("#run-query").addEventListener("click", () => {
      const sql = this.container.querySelector("#query-editor").value;
      this.executeQuery(sql);
    });

    // Ctrl+Enter to run query
    this.container
      .querySelector("#query-editor")
      .addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          this.executeQuery(e.target.value);
        }
      });
  }

  async loadTable(tableName, page = 1) {
    this.currentTable = tableName;
    const limit = 50;
    const offset = (page - 1) * limit;

    const data = await api.request(
      `/api/admin/table/${tableName}?limit=${limit}&offset=${offset}`
    );

    this.container.querySelector(
      "#results-title"
    ).textContent = `Tabla: ${tableName}`;
    this.container.querySelector(
      "#results-info"
    ).textContent = `Mostrando ${data.rows.length} de ${data.total} registros`;

    this.renderDataGrid(data.rows);
    this.renderPagination(data.total, page, limit);
  }

  async executeQuery(sql) {
    const statusEl = this.container.querySelector("#query-status");
    statusEl.textContent = "Ejecutando...";

    const startTime = performance.now();

    try {
      const result = await api.request("/api/admin/query", {
        method: "POST",
        body: JSON.stringify({ sql }),
      });

      const duration = (performance.now() - startTime).toFixed(0);
      statusEl.textContent = `✓ ${result.rows.length} filas en ${duration}ms`;
      statusEl.className = "query-success";

      this.container.querySelector("#results-title").textContent =
        "Resultado de Query";
      this.container.querySelector(
        "#results-info"
      ).textContent = `${result.rows.length} filas`;

      this.renderDataGrid(result.rows);
      this.container.querySelector("#pagination").innerHTML = "";
    } catch (error) {
      statusEl.textContent = `✗ Error: ${error.message}`;
      statusEl.className = "query-error";
    }
  }

  renderDataGrid(rows) {
    if (!rows.length) {
      this.container.querySelector("#results-table").innerHTML =
        '<p class="no-data">No hay datos</p>';
      return;
    }

    const columns = Object.keys(rows[0]);

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map((col) => `<th>${col}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              ${columns
                .map((col) => `<td>${this.formatCell(row[col])}</td>`)
                .join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    this.container.querySelector("#results-table").innerHTML = html;
  }

  formatCell(value) {
    if (value === null) return '<span class="null">NULL</span>';
    if (typeof value === "string" && value.length > 50) {
      return `<span title="${value}">${value.substring(0, 50)}...</span>`;
    }
    return value;
  }

  renderPagination(total, currentPage, limit) {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
      this.container.querySelector("#pagination").innerHTML = "";
      return;
    }

    const html = `
      <button ${currentPage === 1 ? "disabled" : ""} data-page="${
      currentPage - 1
    }">Anterior</button>
      <span>Página ${currentPage} de ${totalPages}</span>
      <button ${currentPage === totalPages ? "disabled" : ""} data-page="${
      currentPage + 1
    }">Siguiente</button>
    `;

    const pagination = this.container.querySelector("#pagination");
    pagination.innerHTML = html;
    pagination.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.loadTable(this.currentTable, parseInt(btn.dataset.page))
      );
    });
  }
}
```

### Admin Panel CSS

```css
/* src/client/css/components/admin.css */
.admin-panel {
  padding: var(--spacing-xl);
  background: var(--bg-primary);
  min-height: 100vh;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.admin-header h1 {
  color: var(--text-primary);
}

.admin-badge {
  background: var(--badge-turno-bg);
  color: var(--badge-turno-text);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.admin-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--spacing-lg);
}

.admin-sidebar {
  background: var(--bg-card);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.admin-sidebar h3 {
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
}

.table-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.table-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
}

.table-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.table-item.active {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.table-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
}

.query-section {
  background: var(--bg-card);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.query-section h3 {
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

#query-editor {
  width: 100%;
  height: 100px;
  font-family: var(--font-mono);
  font-size: 13px;
  padding: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  resize: vertical;
}

#query-editor::placeholder {
  color: var(--text-muted);
}

.query-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

.query-success {
  color: var(--state-success);
}
.query-error {
  color: var(--state-error);
}

.results-section {
  background: var(--bg-card);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.results-header h3 {
  color: var(--text-primary);
}

#results-info {
  color: var(--text-muted);
  font-size: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th,
.data-table td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-table-row);
}

.data-table th {
  background: var(--bg-table-header);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--text-secondary);
}

.data-table td {
  font-family: var(--font-mono);
  color: var(--text-primary-alt);
}

.data-table tr:hover {
  background: var(--bg-hover);
}

.null {
  color: var(--text-muted);
  font-style: italic;
}

.no-data {
  color: var(--text-muted);
  text-align: center;
  padding: var(--spacing-xl);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  color: var(--text-secondary);
}

.pagination button {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--border-default);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.pagination button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Admin API Routes

```javascript
// src/server/routes/admin.js
import express from "express";
import Database from "better-sqlite3";

const router = express.Router();
const VALID_TABLES = [
  "cases",
  "document_history",
  "email_history",
  "configuration",
  "reference_counters",
];

// List all tables with row counts
router.get("/tables", (req, res) => {
  const db = new Database(process.env.DB_PATH, { readonly: true });

  const tables = VALID_TABLES.map((name) => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
    return { name, count: count.count };
  });

  db.close();
  res.json(tables);
});

// Get table contents with pagination
router.get("/table/:name", (req, res) => {
  const { name } = req.params;

  if (!VALID_TABLES.includes(name)) {
    return res.status(400).json({ error: "Tabla no válida" });
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const offset = parseInt(req.query.offset) || 0;

  const db = new Database(process.env.DB_PATH, { readonly: true });
  const rows = db
    .prepare(`SELECT * FROM ${name} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as total FROM ${name}`).get();
  db.close();

  res.json({ rows, total: total.total, limit, offset });
});

// Execute custom SELECT query
router.post("/query", (req, res) => {
  const { sql } = req.body;

  if (!sql || typeof sql !== "string") {
    return res.status(400).json({ error: "Query SQL requerida" });
  }

  // Security: Only allow SELECT
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith("SELECT")) {
    return res.status(400).json({ error: "Solo se permiten queries SELECT" });
  }

  // Block dangerous keywords
  const forbidden = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "EXEC",
    "EXECUTE",
  ];
  if (forbidden.some((keyword) => normalized.includes(keyword))) {
    return res
      .status(400)
      .json({ error: "Query contiene operaciones no permitidas" });
  }

  const db = new Database(process.env.DB_PATH, { readonly: true });

  try {
    const rows = db.prepare(sql).all();
    db.close();
    res.json({ rows });
  } catch (error) {
    db.close();
    res.status(400).json({ error: error.message });
  }
});

export { router as adminRouter };
```

### Add Admin Route to Express App

```javascript
// src/server/index.js (updated)
import { adminRouter } from "./routes/admin.js";

// ... existing routes ...

// Admin routes (protected by Zero Trust admin policy)
app.use("/api/admin", adminRouter);
```

### Add Admin Link to Sidebar

```javascript
// In sidebar component, add admin link (only visible to admins)
<a href="/admin" class="nav-link">
  <span class="nav-icon">⚙️</span>
  <span>Admin DB</span>
</a>
```
