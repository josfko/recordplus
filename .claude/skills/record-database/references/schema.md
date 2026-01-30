# Database Schema Reference

## Tables Overview

| Table | Purpose |
|-------|---------|
| `cases` | Legal case records |
| `document_history` | Generated PDF documents |
| `email_history` | Sent email log |
| `configuration` | App settings key-value store |
| `reference_counters` | Auto-increment counters |

## cases

Main table for legal case records.

```sql
CREATE TABLE cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('ARAG', 'PARTICULAR', 'TURNO_OFICIO')),
    client_name TEXT NOT NULL,
    internal_reference TEXT UNIQUE,      -- IY004921 or IY-26-001
    arag_reference TEXT UNIQUE,          -- DJ00xxxxxx (ARAG only)
    designation TEXT,                     -- Turno de Oficio only
    state TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (state IN ('ABIERTO', 'JUDICIAL', 'ARCHIVADO')),
    entry_date TEXT NOT NULL,            -- YYYY-MM-DD
    judicial_date TEXT,                  -- YYYY-MM-DD (ARAG judicial only)
    judicial_district TEXT,              -- District name (ARAG judicial only)
    closure_date TEXT,                   -- YYYY-MM-DD (archived only)
    observations TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_cases_type ON cases(type);
CREATE INDEX idx_cases_state ON cases(state);
CREATE INDEX idx_cases_entry_date ON cases(entry_date);
```

### Column Notes
- `internal_reference`: Auto-generated, NULL for Turno de Oficio
- `arag_reference`: Required for ARAG, NULL otherwise
- `designation`: Required for Turno de Oficio, NULL otherwise
- `judicial_date`/`judicial_district`: Set when transitioning to JUDICIAL

## document_history

Tracks generated PDF documents per case.

```sql
CREATE TABLE document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,         -- 'MINUTA', 'SUPLIDO', 'HOJA_ENCARGO'
    file_path TEXT NOT NULL,             -- Relative path to PDF
    generated_at TEXT NOT NULL,          -- ISO datetime
    signed INTEGER NOT NULL DEFAULT 0,   -- 0=unsigned, 1=signed
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_document_history_case_id ON document_history(case_id);
```

## email_history

Tracks sent emails for audit trail.

```sql
CREATE TABLE email_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES document_history(id),
    recipient TEXT NOT NULL,             -- Email address
    subject TEXT NOT NULL,
    sent_at TEXT NOT NULL,               -- ISO datetime
    status TEXT NOT NULL CHECK (status IN ('SENT', 'ERROR')),
    error_message TEXT,                  -- Error details if status='ERROR'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_email_history_case_id ON email_history(case_id);
```

## configuration

Key-value store for application settings.

```sql
CREATE TABLE configuration (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Configuration Keys

| Key | Type | Description |
|-----|------|-------------|
| `arag_base_fee` | decimal | Base ARAG fee (203.00) |
| `vat_rate` | integer | VAT percentage (21) |
| `arag_email` | string | ARAG billing email |
| `documents_path` | string | PDF storage path |
| `certificate_path` | string | Digital signature cert |
| `certificate_password` | string | Cert password |
| `smtp_host` | string | SMTP server |
| `smtp_port` | integer | SMTP port (587) |
| `smtp_secure` | boolean | Use TLS |
| `smtp_user` | string | SMTP username |
| `smtp_password` | string | SMTP password |
| `smtp_from` | string | From email address |
| `mileage_torrox` | decimal | Mileage rate |
| `mileage_velez_malaga` | decimal | Mileage rate |
| `mileage_torremolinos` | decimal | Mileage rate |
| `mileage_fuengirola` | decimal | Mileage rate |
| `mileage_marbella` | decimal | Mileage rate |
| `mileage_estepona` | decimal | Mileage rate |
| `mileage_antequera` | decimal | Mileage rate |

## reference_counters

Tracks auto-increment counters for reference generation.

```sql
CREATE TABLE reference_counters (
    type TEXT PRIMARY KEY,               -- 'ARAG', 'PARTICULAR_2026', etc.
    last_value INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Counter Types
- `ARAG`: Global counter for IY reference (e.g., 4921 → IY004921)
- `PARTICULAR_YYYY`: Year-specific counter (e.g., 1 → IY-26-001)
