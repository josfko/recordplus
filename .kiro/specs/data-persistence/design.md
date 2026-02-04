# Design Document: Data Persistence & CRUD Operations

## Overview

This design addresses data persistence reliability by implementing proper SQLite transaction handling, optimistic locking for concurrent access, database pragma optimization, and frontend resilience patterns. The changes ensure all multi-step database operations are atomic and recoverable.

**Technology Stack:**

- **Frontend**: Vanilla JavaScript SPA, localStorage for caching
- **Backend**: Node.js + Express, better-sqlite3 (synchronous)
- **Database**: SQLite with WAL mode, optimized pragmas
- **External Services**: Cloudflare Zero Trust (authentication)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (SPA)                                 │
│  ┌─────────────┐    ┌───────────────────┐    ┌────────────────────────────┐│
│  │   Views     │───►│   api.js          │───►│  RetryableRequest          ││
│  │ (components)│    │  + ConfigCache    │    │  - exponential backoff     ││
│  │             │    │  + version track  │    │  - transient error detect  ││
│  └─────────────┘    └───────────────────┘    └────────────────────────────┘│
│                           │                                                 │
│                     ┌─────▼─────────────┐                                   │
│                     │  localStorage     │                                   │
│                     │  (config cache)   │                                   │
│                     └───────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP via Cloudflare Tunnel
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                              │
│  ┌─────────────┐    ┌─────────────────────────┐    ┌──────────────────────┐│
│  │   Routes    │───►│     Services            │───►│   database.js        ││
│  │ config.js   │    │ configurationService.js │    │ + busy_timeout(5000) ││
│  │ cases.js    │    │ caseService.js          │    │ + synchronous=NORMAL ││
│  └─────────────┘    │ + transaction()         │    │ + cache_size=-64000  ││
│                     │ + version checking      │    │ + checkpointWAL()    ││
│                     └─────────────────────────┘    └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SQLite Database                                │
│  ┌────────────────┐  ┌───────────────────┐  ┌─────────────────────────────┐│
│  │   cases        │  │ configuration     │  │ reference_counters          ││
│  │ + version col  │  │ (key-value)       │  │ (atomic counters)           ││
│  └────────────────┘  └───────────────────┘  └─────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ _schema_version (migration tracking)                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  WAL Mode: ON | Busy Timeout: 5000ms | Foreign Keys: ON | Sync: NORMAL     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Frontend Layer**
   - ConfigCache: localStorage-based caching with 5-minute TTL
   - RetryableRequest: Exponential backoff retry for transient failures
   - Version tracking: Track case versions for optimistic locking
   - ErrorRecovery: Context-aware error handling and recovery

2. **Backend Layer**
   - Transaction wrapping: All multi-step operations atomic
   - Optimistic locking: Version checking on updates
   - Validation: Pre-transaction validation to fail fast

3. **Database Layer**
   - Optimized pragmas: busy_timeout, synchronous, cache_size
   - WAL checkpoint management: On close and on-demand
   - Integrity verification: quick_check for health monitoring

## Components and Interfaces

### Database Module Enhancement

```javascript
// src/server/database.js - Enhanced version

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export const DB_PATH = process.env.DB_PATH || "./data/legal-cases.db";

let dbInstance = null;

/**
 * Get or create the database connection with optimized pragmas
 * @param {Object} options - Connection options
 * @returns {Database} SQLite database instance
 */
export function getDatabase(options = {}) {
  const { readonly = false } = options;

  if (readonly) {
    return new Database(DB_PATH, { readonly: true });
  }

  if (!dbInstance) {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    dbInstance = new Database(DB_PATH);

    // Essential pragmas
    dbInstance.pragma("foreign_keys = ON");
    dbInstance.pragma("journal_mode = WAL");

    // NEW: Concurrency and performance optimizations
    dbInstance.pragma("busy_timeout = 5000");      // Wait 5s for locks
    dbInstance.pragma("synchronous = NORMAL");     // Safe with WAL
    dbInstance.pragma("cache_size = -64000");      // 64MB cache
    dbInstance.pragma("temp_store = MEMORY");      // Temp tables in RAM
  }

  return dbInstance;
}

/**
 * Perform WAL checkpoint
 * @returns {Object} Checkpoint result { busy, log, checkpointed }
 */
export function checkpointWAL() {
  const db = getDatabase();
  return db.pragma("wal_checkpoint(PASSIVE)")[0];
}

/**
 * Verify database integrity
 * @returns {boolean} True if database passes integrity check
 */
export function verifyIntegrity() {
  const db = getDatabase();
  const result = db.pragma("quick_check")[0];
  return result.quick_check === "ok";
}

/**
 * Close the database connection with checkpoint
 */
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.pragma("wal_checkpoint(TRUNCATE)");
    dbInstance.close();
    dbInstance = null;
  }
}
```

### Configuration Service - Transactional Update

```javascript
// src/server/services/configurationService.js - Key changes

import { getDatabase, query, queryOne, transaction } from "../database.js";

let defaultsInitialized = false;

/**
 * Initialize defaults once (call from server startup)
 */
export function ensureDefaults() {
  if (defaultsInitialized) return;

  transaction(() => {
    const db = getDatabase();
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      db.prepare(`
        INSERT OR IGNORE INTO configuration (key, value) VALUES (?, ?)
      `).run(key, value);
    }
  });

  defaultsInitialized = true;
}

/**
 * Get all configuration values (no longer calls initializeDefaults)
 * @returns {Object} Configuration key-value pairs
 */
export function getAll() {
  const rows = query("SELECT key, value FROM configuration");
  const config = {};

  for (const row of rows) {
    if (NUMERIC_KEYS.includes(row.key)) {
      config[row.key] = parseFloat(row.value);
    } else {
      config[row.key] = row.value;
    }
  }

  return config;
}

/**
 * Update configuration values atomically
 * @param {Object} updates - Key-value pairs to update
 * @returns {Object} Updated configuration
 * @throws {ConfigValidationError} If validation fails
 */
export function update(updates) {
  // Validate ALL updates before transaction
  for (const [key, value] of Object.entries(updates)) {
    if (DEFAULT_CONFIG[key] === undefined) {
      throw new ConfigValidationError(`Clave de configuración desconocida: ${key}`, key);
    }
    if (NUMERIC_KEYS.includes(key) && !isPositiveNumber(value)) {
      throw new ConfigValidationError(`El valor de ${key} debe ser un número positivo`, key);
    }
    if (EMAIL_KEYS.includes(key) && !isValidEmail(value)) {
      throw new ConfigValidationError(`El formato de email para ${key} es inválido`, key);
    }
  }

  // Apply ALL updates in single transaction
  return transaction(() => {
    const db = getDatabase();
    for (const [key, value] of Object.entries(updates)) {
      db.prepare(`
        INSERT INTO configuration (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = datetime('now')
      `).run(key, String(value));
    }
    return getAll();
  });
}
```

### Case Service - Atomic Creation with Optimistic Locking

```javascript
// src/server/services/caseService.js - Key changes

import { getDatabase, transaction } from "../database.js";

/**
 * Generate ARAG reference within a transaction
 * @param {Database} db - Database instance (within transaction)
 * @returns {string} Generated reference
 */
function generateAragReferenceInTransaction(db) {
  const result = db.prepare(`
    UPDATE reference_counters
    SET last_value = last_value + 1, updated_at = datetime('now')
    WHERE type = 'ARAG'
    RETURNING last_value
  `).get();

  if (!result) {
    db.prepare(`INSERT INTO reference_counters (type, last_value) VALUES ('ARAG', 1)`).run();
    return "IY000001";
  }

  return `IY${String(result.last_value).padStart(6, "0")}`;
}

/**
 * Generate PARTICULAR reference within a transaction
 * @param {Database} db - Database instance (within transaction)
 * @param {number} year - Year for reference
 * @returns {string} Generated reference
 */
function generateParticularReferenceInTransaction(db, year) {
  const yearSuffix = String(year).slice(-2);
  const counterType = `PARTICULAR_${year}`;

  const result = db.prepare(`
    UPDATE reference_counters
    SET last_value = last_value + 1, updated_at = datetime('now')
    WHERE type = ?
    RETURNING last_value
  `).get(counterType);

  if (!result) {
    db.prepare(`INSERT INTO reference_counters (type, last_value) VALUES (?, 1)`).run(counterType);
    return `IY-${yearSuffix}-001`;
  }

  return `IY-${yearSuffix}-${String(result.last_value).padStart(3, "0")}`;
}

/**
 * Create a new case atomically
 * @param {Object} data - Case data
 * @returns {Object} Created case
 */
export function create(data) {
  validateCaseData(data);

  return transaction(() => {
    const db = getDatabase();

    // Check duplicate ARAG reference WITHIN transaction
    if (data.type === CASE_TYPES.ARAG) {
      const existing = db.prepare("SELECT 1 FROM cases WHERE arag_reference = ?").get(data.aragReference);
      if (existing) {
        throw new ConflictError("Ya existe un expediente con esta referencia ARAG", "aragReference");
      }
    }

    // Generate reference WITHIN same transaction
    let internalReference = null;
    if (data.type === CASE_TYPES.ARAG || data.type === CASE_TYPES.TURNO_OFICIO) {
      internalReference = generateAragReferenceInTransaction(db);
    } else if (data.type === CASE_TYPES.PARTICULAR) {
      const year = data.entryDate ? new Date(data.entryDate).getFullYear() : new Date().getFullYear();
      internalReference = generateParticularReferenceInTransaction(db, year);
    }

    const entryDate = data.entryDate || new Date().toISOString().split("T")[0];

    const result = db.prepare(`
      INSERT INTO cases (type, client_name, internal_reference, arag_reference,
                         designation, state, entry_date, observations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.type,
      data.clientName.trim(),
      internalReference,
      data.type === CASE_TYPES.ARAG ? data.aragReference : null,
      data.type === CASE_TYPES.TURNO_OFICIO ? data.designation.trim() : null,
      CASE_STATES.ABIERTO,
      entryDate,
      data.observations || ""
    );

    return getByIdInternal(db, result.lastInsertRowid);
  });
}

/**
 * Helper to get case by ID within a transaction
 * @param {Database} db - Database instance
 * @param {number} id - Case ID
 * @returns {Object} Case object
 */
function getByIdInternal(db, id) {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id);
  if (!row) return null;
  return mapRowToCase(row);
}

/**
 * Update a case with optimistic locking
 * @param {number} id - Case ID
 * @param {Object} data - Data to update
 * @param {number|null} expectedVersion - Expected version for optimistic locking
 * @returns {Object} Updated case
 */
export function update(id, data, expectedVersion = null) {
  return transaction(() => {
    const db = getDatabase();
    const existing = db.prepare("SELECT * FROM cases WHERE id = ?").get(id);

    if (!existing) {
      throw new NotFoundError("Expediente no encontrado");
    }

    // Optimistic locking check
    if (expectedVersion !== null && existing.version !== expectedVersion) {
      throw new ConflictError(
        "El expediente ha sido modificado por otro usuario. Recargue y vuelva a intentar.",
        "version"
      );
    }

    // Archived cases can only update observations
    if (existing.state === CASE_STATES.ARCHIVADO) {
      if (Object.keys(data).some((key) => key !== "observations")) {
        throw new ValidationError("Los expedientes archivados solo permiten editar observaciones");
      }
    }

    const allowedFields = ["clientName", "observations", "entryDate"];
    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = field === "clientName" ? "client_name" : field === "entryDate" ? "entry_date" : field;
        updates.push(`${dbField} = ?`);
        params.push(field === "clientName" ? data[field].trim() : data[field]);
      }
    }

    if (updates.length === 0) {
      return mapRowToCase(existing);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id, existing.version);

    const result = db.prepare(`
      UPDATE cases SET ${updates.join(", ")}
      WHERE id = ? AND version = ?
    `).run(...params);

    if (result.changes === 0) {
      throw new ConflictError("Conflicto de actualización detectado", "version");
    }

    return getByIdInternal(db, id);
  });
}
```

### Frontend - Retry Logic and Configuration Cache

```javascript
// src/client/js/api.js - New classes to add

/**
 * Retry logic with exponential backoff
 */
class RetryableRequest {
  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryable(error) {
    if (error.code === "NETWORK_ERROR") return true;
    if (error.status >= 500 && error.status !== 501) return true;
    if (error.status === 429) return true;
    return false;
  }

  /**
   * Execute request with retry logic
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise<any>} Request result
   */
  async execute(requestFn) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt === this.maxRetries - 1) {
          throw error;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

const CONFIG_CACHE_KEY = "recordplus_config";
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Configuration cache using localStorage
 */
class ConfigCache {
  /**
   * Get cached configuration
   * @returns {Object|null} Cached config or null if expired/missing
   */
  static get() {
    try {
      const cached = localStorage.getItem(CONFIG_CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CONFIG_CACHE_TTL) {
        localStorage.removeItem(CONFIG_CACHE_KEY);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Set cached configuration
   * @param {Object} data - Configuration data to cache
   */
  static set(data) {
    try {
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // Storage full or disabled - ignore
    }
  }

  /**
   * Invalidate cached configuration
   */
  static invalidate() {
    localStorage.removeItem(CONFIG_CACHE_KEY);
  }
}

/**
 * Error recovery handler
 */
class ErrorRecovery {
  /**
   * Handle error with context-specific recovery
   * @param {Error} error - Error to handle
   * @param {Object} context - Context with recovery functions
   * @returns {Object} Recovery action { retry, delay }
   */
  static async handleError(error, context = {}) {
    const { showToast } = await import("../app.js");

    switch (error.code) {
      case "NETWORK_ERROR":
        showToast("Error de conexión. Reintentando...", "error");
        return { retry: true, delay: 3000 };

      case "SESSION_EXPIRED":
        showToast("Sesión expirada. Recargando...", "warning");
        setTimeout(() => window.location.reload(), 1500);
        return { retry: false };

      case "CONFLICT_ERROR":
        if (error.field === "version") {
          showToast("Datos modificados por otro usuario. Recargando...", "warning");
          if (context.reloadFn) {
            setTimeout(() => context.reloadFn(), 1000);
          }
        } else {
          showToast(error.message, "error");
        }
        return { retry: false };

      case "VALIDATION_ERROR":
        showToast(error.message, "error");
        if (context.highlightField && error.field) {
          context.highlightField(error.field);
        }
        return { retry: false };

      default:
        showToast(error.message || "Error inesperado", "error");
        return { retry: false };
    }
  }
}
```

## API Endpoints

No new endpoints. Modified behavior:

```
PUT /api/config           - Now atomic (all-or-nothing updates)
POST /api/cases           - Now atomic (reference + insert in transaction)
PUT /api/cases/:id        - Accepts optional version parameter for optimistic locking
```

## Data Models

### Case (Updated)

```javascript
{
  id: Number,                    // Primary key
  type: String,                  // 'ARAG' | 'PARTICULAR' | 'TURNO_OFICIO'
  clientName: String,            // Required
  internalReference: String,     // Auto-generated
  aragReference: String | null,  // ARAG only
  designation: String | null,    // TURNO_OFICIO only
  state: String,                 // 'ABIERTO' | 'JUDICIAL' | 'ARCHIVADO'
  entryDate: String,             // ISO date
  judicialDate: String | null,   // ISO date
  judicialDistrict: String | null,
  closureDate: String | null,    // ISO date
  observations: String,          // Default ''
  version: Number,               // NEW: For optimistic locking, default 1
  createdAt: String,             // ISO timestamp
  updatedAt: String              // ISO timestamp
}
```

### Configuration (Unchanged)

```javascript
{
  key: String,                   // Primary key
  value: String,                 // Stored as string, converted on read
  updated_at: String             // ISO timestamp
}
```

## Database Schema

### Migration 003: Optimistic Locking

```sql
-- Migration: 003_optimistic_locking.sql
-- Description: Add version column for optimistic locking
-- Created: 2026-02-04

-- Add version column to cases table
ALTER TABLE cases ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Schema versioning table
CREATE TABLE IF NOT EXISTS _schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

INSERT OR IGNORE INTO _schema_version (version, description)
VALUES (3, 'Add optimistic locking version column');
```

## Correctness Properties

### Property 1: Configuration Update Atomicity

_For any_ configuration update containing multiple key-value pairs, the system should either persist ALL changes or NONE. Partial updates must never occur.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Configuration Validation Barrier

_For any_ configuration update where at least one value fails validation, the system should reject the entire batch and preserve all previous values unchanged.

**Validates: Requirements 1.2, 1.4**

### Property 3: Case Creation Atomicity

_For any_ case creation operation, the internal reference number should be consumed if and only if the case record is successfully inserted.

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 4: Reference Counter Consistency

_For any_ sequence of N successful case creations of the same type, the reference counters should increment by exactly N, with no gaps or duplicates.

**Validates: Requirements 2.3, 2.4**

### Property 5: Optimistic Lock Enforcement

_For any_ case update with an expectedVersion that differs from the current database version, the system should reject the update with a ConflictError.

**Validates: Requirements 3.3, 3.4**

### Property 6: Version Monotonic Increment

_For any_ successful case update, the version number should increase by exactly 1.

**Validates: Requirements 3.4**

### Property 7: Retry Transient Errors

_For any_ request that fails with a transient error (NETWORK_ERROR, 5xx except 501, 429), the system should retry up to 3 times with exponential backoff.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Non-Retry Deterministic Errors

_For any_ request that fails with a client error (4xx except 429) or 501, the system should NOT retry and immediately surface the error.

**Validates: Requirements 5.4**

### Property 9: Cache TTL Enforcement

_For any_ cached configuration older than 5 minutes, the system should fetch fresh data from the server.

**Validates: Requirements 6.1, 6.4**

### Property 10: Cache Invalidation on Write

_For any_ successful configuration update, the local cache should be invalidated immediately.

**Validates: Requirements 6.3**

### Property 11: Database Busy Tolerance

_For any_ database operation that encounters a lock, the system should wait up to 5 seconds before failing with SQLITE_BUSY.

**Validates: Requirements 4.1**

## Error Handling

### Design Principles

1. **Three-Part Messages**: Every error includes (1) what failed, (2) why, (3) what to do
2. **Spanish for Users**: All user-facing messages in Spanish
3. **Technical Details Server-Side**: Log full stack traces, show simplified messages to users
4. **Consistent Codes**: Same error codes used across all layers for traceability

### HTTP Status Codes

| Code | Error Type | When to Use |
|------|------------|-------------|
| 200  | Success | Operation completed |
| 400  | ValidationError | Invalid input, missing required fields, format errors |
| 404  | NotFoundError | Resource doesn't exist |
| 409  | ConflictError | Duplicate reference, version mismatch, state conflict |
| 500  | ServerError | Database error, unexpected failure |

### Error Response Format

```javascript
{
  "error": {
    "code": "CONFIG_VALIDATION_NUMERIC",      // Machine-readable code
    "message": "El valor de 'Tarifa Base ARAG' debe ser un número positivo. Valor recibido: 'abc'. Por favor, introduzca un número como 203.00",
    "field": "arag_base_fee",                 // Which field failed (optional)
    "details": {                              // Additional context (optional)
      "received": "abc",
      "expected": "número positivo",
      "example": "203.00"
    }
  }
}
```

### Complete Error Message Catalog

#### Configuration Errors (CONFIG_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `CONFIG_VALIDATION_NUMERIC` | "El valor de '{field}' debe ser un número positivo. Valor recibido: '{value}'. Por favor, introduzca un número como {example}." | Numeric field has invalid value |
| `CONFIG_VALIDATION_EMAIL` | "El formato del email '{value}' no es válido. Por favor, use un formato como nombre@dominio.com" | Email field is invalid |
| `CONFIG_UNKNOWN_KEY` | "La clave de configuración '{key}' no existe. Claves válidas: {validKeys}" | Unknown config key in update |
| `CONFIG_SAVE_FAILED` | "No se pudo guardar la configuración. Los cambios no se han aplicado. Por favor, inténtelo de nuevo." | Transaction failed |
| `CONFIG_LOAD_FAILED` | "No se pudo cargar la configuración del servidor. Usando valores en caché si están disponibles." | Failed to fetch config |

#### Case Errors (CASE_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `CASE_NOT_FOUND` | "No se encontró el expediente con ID {id}. Es posible que haya sido eliminado o el enlace sea incorrecto." | Case doesn't exist |
| `CASE_DUPLICATE_ARAG_REF` | "Ya existe un expediente con la referencia ARAG '{ref}'. Cada referencia debe ser única. Verifique el número en el documento de ARAG." | Duplicate ARAG reference |
| `CASE_INVALID_TYPE` | "Tipo de expediente '{type}' no válido. Los tipos permitidos son: ARAG, PARTICULAR, TURNO_OFICIO." | Invalid case type |
| `CASE_MISSING_CLIENT` | "El nombre del cliente es obligatorio. Por favor, introduzca el nombre completo del cliente." | Missing client name |
| `CASE_MISSING_ARAG_REF` | "La referencia ARAG es obligatoria para expedientes ARAG. Formato esperado: DJ00 seguido de 6 dígitos (ej: DJ00123456)." | Missing ARAG reference |
| `CASE_INVALID_ARAG_REF` | "El formato de la referencia ARAG '{ref}' es incorrecto. Debe ser DJ00 seguido de 6 dígitos (ej: DJ00123456)." | Invalid ARAG reference format |
| `CASE_MISSING_DESIGNATION` | "El número de designación es obligatorio para expedientes de Turno de Oficio." | Missing designation |
| `CASE_ARCHIVED_READONLY` | "Este expediente está archivado y no puede modificarse. Solo se pueden editar las observaciones." | Trying to modify archived case |
| `CASE_INVALID_DATE` | "El formato de fecha '{date}' no es válido. Use el formato AAAA-MM-DD (ej: 2024-01-15)." | Invalid date format |

#### Concurrency Errors (CONFLICT_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `CONFLICT_VERSION_MISMATCH` | "Este expediente ha sido modificado por otro usuario mientras lo editaba. Sus cambios no se han guardado. Pulse 'Recargar' para ver la versión actual y vuelva a realizar sus cambios." | Optimistic lock failure |
| `CONFLICT_CONCURRENT_UPDATE` | "Se detectó un conflicto al guardar. Otro proceso modificó el registro. Por favor, recargue e intente de nuevo." | Generic concurrent modification |

#### State Transition Errors (STATE_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `STATE_ALREADY_ARCHIVED` | "Este expediente ya está archivado. No se requiere ninguna acción adicional." | Archive already archived |
| `STATE_CANNOT_ARCHIVE` | "No se puede archivar: falta la fecha de cierre. Por favor, seleccione una fecha de cierre antes de archivar." | Archive without closure date |
| `STATE_INVALID_TRANSITION` | "No se puede cambiar de estado '{from}' a '{to}'. Transiciones válidas: {validTransitions}." | Invalid state transition |
| `STATE_ONLY_ARAG_JUDICIAL` | "Solo los expedientes ARAG pueden pasar a estado judicial. Este expediente es de tipo {type}." | Non-ARAG to judicial |

#### Database Errors (DB_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `DB_CONNECTION_FAILED` | "No se pudo conectar con la base de datos. Por favor, inténtelo de nuevo en unos momentos. Si el problema persiste, contacte al administrador." | Connection failure |
| `DB_BUSY` | "La base de datos está ocupada procesando otra solicitud. Por favor, espere unos segundos e inténtelo de nuevo." | SQLITE_BUSY |
| `DB_INTEGRITY_ERROR` | "Se detectó un problema de integridad en la base de datos. Por favor, contacte al administrador inmediatamente." | Integrity check failed |
| `DB_TRANSACTION_FAILED` | "La operación no se pudo completar. Ningún cambio ha sido guardado. Por favor, inténtelo de nuevo." | Transaction rollback |

#### Network Errors (NETWORK_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `NETWORK_ERROR` | "Error de conexión con el servidor. Compruebe su conexión a Internet. Reintentando automáticamente..." | Fetch failed |
| `NETWORK_TIMEOUT` | "La solicitud tardó demasiado tiempo. El servidor puede estar ocupado. Reintentando..." | Request timeout |
| `SESSION_EXPIRED` | "Su sesión ha expirado. La página se recargará para iniciar sesión de nuevo." | Zero Trust session expired |

#### Server Errors (SERVER_*)

| Code | User Message (Spanish) | When |
|------|------------------------|------|
| `SERVER_ERROR` | "Error interno del servidor. El equipo técnico ha sido notificado. Por favor, inténtelo de nuevo más tarde." | Unexpected 500 error |
| `SERVER_UNAVAILABLE` | "El servidor no está disponible temporalmente. Por favor, inténtelo de nuevo en unos minutos." | 503 Service Unavailable |

### Error Classes Implementation

```javascript
// src/server/errors.js

/**
 * Base error class with structured message
 */
export class AppError extends Error {
  constructor(code, message, field = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.field = field;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.field && { field: this.field }),
        ...(this.details && { details: this.details }),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(code, message, field = null, details = null) {
    super(code, message, field, details);
    this.status = 400;
  }
}

export class NotFoundError extends AppError {
  constructor(code, message) {
    super(code, message);
    this.status = 404;
  }
}

export class ConflictError extends AppError {
  constructor(code, message, field = null, details = null) {
    super(code, message, field, details);
    this.status = 409;
  }
}

export class DatabaseError extends AppError {
  constructor(code, message, originalError = null) {
    super(code, message);
    this.status = 500;
    this.originalError = originalError; // For logging, not sent to client
  }
}
```

### Error Message Factory

```javascript
// src/server/errorMessages.js

export const ErrorMessages = {
  // Configuration
  configNumeric: (field, value, example) => ({
    code: "CONFIG_VALIDATION_NUMERIC",
    message: `El valor de '${field}' debe ser un número positivo. Valor recibido: '${value}'. Por favor, introduzca un número como ${example}.`,
    field,
    details: { received: value, expected: "número positivo", example },
  }),

  configEmail: (field, value) => ({
    code: "CONFIG_VALIDATION_EMAIL",
    message: `El formato del email '${value}' no es válido. Por favor, use un formato como nombre@dominio.com`,
    field,
    details: { received: value, expected: "email válido" },
  }),

  configUnknownKey: (key, validKeys) => ({
    code: "CONFIG_UNKNOWN_KEY",
    message: `La clave de configuración '${key}' no existe. Claves válidas: ${validKeys.join(", ")}`,
    field: key,
  }),

  // Cases
  caseNotFound: (id) => ({
    code: "CASE_NOT_FOUND",
    message: `No se encontró el expediente con ID ${id}. Es posible que haya sido eliminado o el enlace sea incorrecto.`,
  }),

  caseDuplicateAragRef: (ref) => ({
    code: "CASE_DUPLICATE_ARAG_REF",
    message: `Ya existe un expediente con la referencia ARAG '${ref}'. Cada referencia debe ser única. Verifique el número en el documento de ARAG.`,
    field: "aragReference",
    details: { duplicateValue: ref },
  }),

  caseInvalidAragRef: (ref) => ({
    code: "CASE_INVALID_ARAG_REF",
    message: `El formato de la referencia ARAG '${ref}' es incorrecto. Debe ser DJ00 seguido de 6 dígitos (ej: DJ00123456).`,
    field: "aragReference",
    details: { received: ref, expected: "DJ00XXXXXX", example: "DJ00123456" },
  }),

  // Concurrency
  versionMismatch: (currentVersion, expectedVersion) => ({
    code: "CONFLICT_VERSION_MISMATCH",
    message: "Este expediente ha sido modificado por otro usuario mientras lo editaba. Sus cambios no se han guardado. Pulse 'Recargar' para ver la versión actual y vuelva a realizar sus cambios.",
    field: "version",
    details: { currentVersion, expectedVersion },
  }),

  // State
  archivedReadonly: () => ({
    code: "CASE_ARCHIVED_READONLY",
    message: "Este expediente está archivado y no puede modificarse. Solo se pueden editar las observaciones.",
  }),

  // Database
  databaseBusy: () => ({
    code: "DB_BUSY",
    message: "La base de datos está ocupada procesando otra solicitud. Por favor, espere unos segundos e inténtelo de nuevo.",
  }),
};
```

### Frontend Error Display

```javascript
// Error toast styles based on severity
const ERROR_STYLES = {
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    icon: "✕",
    iconColor: "#ef4444",
  },
  warning: {
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    icon: "⚠",
    iconColor: "#eab308",
  },
  info: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    icon: "ℹ",
    iconColor: "#3b82f6",
  },
};

/**
 * Display error with appropriate styling
 */
function showError(error, severity = "error") {
  const style = ERROR_STYLES[severity];
  const message = error.message || "Error desconocido";

  // Show toast with styling
  showToast(message, severity);

  // If field specified, highlight it
  if (error.field) {
    highlightField(error.field);
  }

  // Log details for debugging
  console.error(`[${error.code}]`, error.message, error.details || "");
}
```

### Frontend Error Recovery Matrix

| Error Code | Severity | User Message | Auto Recovery | Action |
|------------|----------|--------------|---------------|--------|
| `NETWORK_ERROR` | warning | "Error de conexión. Reintentando..." | Yes (3 retries) | Exponential backoff |
| `SESSION_EXPIRED` | warning | "Sesión expirada. Recargando..." | Yes | Page reload in 1.5s |
| `CONFLICT_VERSION_MISMATCH` | warning | Full message from server | No | Show reload button |
| `CONFIG_VALIDATION_*` | error | Full message from server | No | Highlight field |
| `CASE_*` validation | error | Full message from server | No | Highlight field |
| `DB_BUSY` | warning | "Base de datos ocupada..." | Yes (1 retry) | Wait 2s, retry |
| `SERVER_ERROR` | error | "Error del servidor..." | No | Show retry button |

## Testing Strategy

### Unit Tests

- Configuration validation logic (existing tests)
- Retry logic delay calculations
- Cache TTL expiration logic

### Property-Based Tests

Using fast-check, 100 iterations minimum:

```javascript
// Property 1: Configuration Update Atomicity
// Feature: data-persistence, Property 1: Configuration Update Atomicity
// Validates: Requirements 1.1, 1.2, 1.3
describe("Property 1: Configuration Update Atomicity", () => {
  it("should rollback all changes when one fails", () => {
    fc.assert(
      fc.property(
        fc.record({
          arag_base_fee: fc.double({ min: 0, max: 1000, noNaN: true }),
          arag_email: fc.constant("invalid-email"), // Will fail validation
        }),
        (updates) => {
          const before = getAll();
          try {
            update(updates);
            return false; // Should have thrown
          } catch (e) {
            const after = getAll();
            return after.arag_base_fee === before.arag_base_fee;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 5: Optimistic Lock Enforcement
// Feature: data-persistence, Property 5: Optimistic Lock Enforcement
// Validates: Requirements 3.3, 3.4
describe("Property 5: Optimistic Lock Enforcement", () => {
  it("should reject stale version updates", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string().filter(s => /^DJ00\d{6}$/.test(s)),
        (clientName, aragRef) => {
          const created = create({
            type: "ARAG",
            clientName,
            aragReference: aragRef
          });
          const v1 = created.version;

          // First update succeeds
          update(created.id, { observations: "first" }, v1);

          // Second update with stale version should fail
          try {
            update(created.id, { observations: "second" }, v1);
            return false; // Should have thrown
          } catch (e) {
            return e instanceof ConflictError && e.field === "version";
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 3: Case Creation Atomicity
// Feature: data-persistence, Property 3: Case Creation Atomicity
// Validates: Requirements 2.1, 2.2, 2.4
describe("Property 3: Case Creation Atomicity", () => {
  it("should not consume reference on failed creation", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (clientName) => {
          // Get current counter
          const beforeCounter = getCurrentCounter("ARAG");
          const aragRef = `DJ00${String(beforeCounter + 100000).slice(-6)}`;

          // Create first case
          const case1 = create({
            type: "ARAG",
            clientName,
            aragReference: aragRef,
          });

          const afterFirst = getCurrentCounter("ARAG");

          // Try to create duplicate (should fail)
          try {
            create({
              type: "ARAG",
              clientName: "Duplicate",
              aragReference: aragRef, // Same reference
            });
            return false; // Should have thrown
          } catch (e) {
            // Counter should not have incremented
            const afterFailed = getCurrentCounter("ARAG");
            return afterFailed === afterFirst && e instanceof ConflictError;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

- Full configuration save/load cycle
- Case creation with duplicate ARAG reference
- Concurrent case updates (simulate version conflict)

### End-to-End Tests

- Configuration page: change values, refresh, verify persistence
- Case edit: open in two tabs, edit both, verify conflict handling

## File Structure

```
record+/
├── src/
│   ├── server/
│   │   ├── database.js              # Enhanced with pragmas, checkpoint
│   │   ├── index.js                 # Call ensureDefaults() on startup
│   │   ├── services/
│   │   │   ├── configurationService.js  # Transactional update
│   │   │   └── caseService.js           # Atomic create, optimistic update
│   │   └── __tests__/
│   │       ├── configurationService.test.js  # Add Property 1, 2
│   │       └── caseService.test.js           # Add Property 3, 4, 5, 6
│   └── client/
│       └── js/
│           ├── api.js               # RetryableRequest, ConfigCache
│           └── components/
│               └── configuration.js # Use cached config
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_smtp_configuration.sql
│   └── 003_optimistic_locking.sql   # NEW
└── .kiro/specs/data-persistence/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```
