// Configuration Service
// Task 4.4 - Requirements: 12.1-12.9

import { query, queryOne, execute, transaction, getDatabase } from "../database.js";
import { ValidationError, DatabaseError } from "../errors.js";
import { ConfigErrors, DatabaseErrors } from "../errorMessages.js";

// Default configuration values
export const DEFAULT_CONFIG = {
  arag_base_fee: "203.00",
  vat_rate: "21",
  arag_email: "facturacionsiniestros@arag.es",
  mileage_torrox: "0.00",
  mileage_velez_malaga: "0.00",
  mileage_torremolinos: "0.00",
  mileage_fuengirola: "0.00",
  mileage_marbella: "0.00",
  mileage_estepona: "0.00",
  mileage_antequera: "0.00",
  // SMTP configuration
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: "false",
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  // Document storage
  documents_path: "./data/documents",
  // Certificate configuration
  certificate_path: "",
  certificate_password: "",
};

// Configuration keys that must be positive numbers
const NUMERIC_KEYS = [
  "arag_base_fee",
  "vat_rate",
  "mileage_torrox",
  "mileage_velez_malaga",
  "mileage_torremolinos",
  "mileage_fuengirola",
  "mileage_marbella",
  "mileage_estepona",
  "mileage_antequera",
];

// Configuration keys that must be valid emails
const EMAIL_KEYS = ["arag_email"];

// Reasonable ranges for numeric configuration values
const NUMERIC_RANGES = {
  arag_base_fee: { min: 0, max: 10000 },
  vat_rate: { min: 0, max: 100 },
  mileage_torrox: { min: 0, max: 1000 },
  mileage_velez_malaga: { min: 0, max: 1000 },
  mileage_torremolinos: { min: 0, max: 1000 },
  mileage_fuengirola: { min: 0, max: 1000 },
  mileage_marbella: { min: 0, max: 1000 },
  mileage_estepona: { min: 0, max: 1000 },
  mileage_antequera: { min: 0, max: 1000 },
};

// Sensitive keys that should never be sent to the frontend
const SENSITIVE_KEYS = ["smtp_password", "certificate_password"];
const SENSITIVE_PLACEHOLDER = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

// ConfigValidationError removed - use ValidationError from errors.js instead
// Alias for backward compatibility (used by tests and default export)
export const ConfigValidationError = ValidationError;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  // Reject consecutive dots (corruption signal)
  if (/\.\./.test(trimmed)) return false;
  // Require valid local part, domain, and TLD (2+ alpha chars)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Validate positive number
 * @param {string|number} value - Value to validate
 * @returns {boolean} True if valid positive number
 */
export function isPositiveNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Validate a numeric config value is within expected range for its key.
 * Rejects NaN, non-finite, and out-of-range values (e.g. scientific notation extremes).
 * @param {string} key - Configuration key
 * @param {string|number} value - Value to validate
 * @returns {boolean} True if valid
 */
export function isValidNumericConfig(key, value) {
  if (value === null || value === undefined || value === "") return false;
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return false;
  // Reject scientific notation (corruption signal like 1.02e-35)
  if (/[eE]/.test(String(value))) return false;
  const range = NUMERIC_RANGES[key];
  if (!range) return num >= 0;
  return num >= range.min && num <= range.max;
}

// Flag to track if defaults have been initialized this session
let defaultsInitialized = false;

/**
 * Initialize default configuration values if not present
 * @deprecated Use ensureDefaults() instead - called once at server startup
 */
export function initializeDefaults() {
  if (defaultsInitialized) return;

  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    const existing = queryOne("SELECT value FROM configuration WHERE key = ?", [
      key,
    ]);
    if (!existing) {
      execute("INSERT INTO configuration (key, value) VALUES (?, ?)", [
        key,
        value,
      ]);
    }
  }
  defaultsInitialized = true;
}

/**
 * Ensure default configuration values exist (called once at server startup)
 * Uses a transaction to atomically insert all missing defaults
 * Requirements: 1.5, 1.6
 */
export function ensureDefaults() {
  if (defaultsInitialized) return;

  try {
    transaction(() => {
      const db = getDatabase();
      const upsertStmt = db.prepare(`
        INSERT INTO configuration (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO NOTHING
      `);

      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        upsertStmt.run(key, value);
      }
    });
    defaultsInitialized = true;
  } catch (error) {
    console.error("[Config] Failed to initialize defaults:", error.message);
    throw new DatabaseError(
      DatabaseErrors.transactionFailed("inicializar configuración").message,
      { originalError: error.message }
    );
  }
}

/**
 * Get all configuration values with self-healing for corrupted data.
 * Validates each value on read and auto-repairs corrupted entries.
 * @returns {Object} Configuration key-value pairs
 */
export function getAll() {
  const rows = query("SELECT key, value FROM configuration");
  const config = {};
  const corrupted = [];

  for (const row of rows) {
    if (NUMERIC_KEYS.includes(row.key)) {
      if (isValidNumericConfig(row.key, row.value)) {
        config[row.key] = parseFloat(row.value);
      } else {
        console.warn(
          `[Config] Corrupted value for '${row.key}': '${row.value}'. Resetting to default '${DEFAULT_CONFIG[row.key]}'.`
        );
        config[row.key] = parseFloat(DEFAULT_CONFIG[row.key]);
        corrupted.push({ key: row.key, defaultValue: DEFAULT_CONFIG[row.key] });
      }
    } else if (EMAIL_KEYS.includes(row.key)) {
      if (isValidEmail(row.value)) {
        config[row.key] = row.value;
      } else {
        console.warn(
          `[Config] Corrupted email for '${row.key}': '${row.value}'. Resetting to default '${DEFAULT_CONFIG[row.key]}'.`
        );
        config[row.key] = DEFAULT_CONFIG[row.key];
        corrupted.push({ key: row.key, defaultValue: DEFAULT_CONFIG[row.key] });
      }
    } else {
      config[row.key] = row.value;
    }
  }

  // Auto-repair corrupted values in the database
  if (corrupted.length > 0) {
    try {
      transaction(() => {
        const db = getDatabase();
        const fixStmt = db.prepare(
          "UPDATE configuration SET value = ?, updated_at = datetime('now') WHERE key = ?"
        );
        for (const item of corrupted) {
          fixStmt.run(item.defaultValue, item.key);
        }
      });
      console.warn(
        `[Config] Auto-repaired ${corrupted.length} corrupted value(s): ${corrupted.map((c) => c.key).join(", ")}`
      );
    } catch (error) {
      console.error("[Config] Failed to auto-repair:", error.message);
    }
  }

  // Mask sensitive values — never send passwords to the frontend
  for (const key of SENSITIVE_KEYS) {
    if (config[key] && config[key].length > 0) {
      config[key] = SENSITIVE_PLACEHOLDER;
    }
  }

  return config;
}

/**
 * Get a single configuration value with validation.
 * Returns default if value is corrupted.
 * @param {string} key - Configuration key
 * @returns {string|number|null} Configuration value or null
 */
export function get(key) {
  const row = queryOne("SELECT value FROM configuration WHERE key = ?", [key]);
  if (!row) {
    if (DEFAULT_CONFIG[key] !== undefined) {
      return NUMERIC_KEYS.includes(key)
        ? parseFloat(DEFAULT_CONFIG[key])
        : DEFAULT_CONFIG[key];
    }
    return null;
  }

  if (NUMERIC_KEYS.includes(key)) {
    if (isValidNumericConfig(key, row.value)) {
      return parseFloat(row.value);
    }
    console.warn(`[Config] Corrupted value for '${key}': '${row.value}'. Returning default.`);
    return parseFloat(DEFAULT_CONFIG[key]);
  }

  if (EMAIL_KEYS.includes(key)) {
    if (isValidEmail(row.value)) {
      return row.value;
    }
    console.warn(`[Config] Corrupted email for '${key}': '${row.value}'. Returning default.`);
    return DEFAULT_CONFIG[key];
  }

  return row.value;
}

/**
 * Update configuration values atomically
 * All updates are wrapped in a single transaction - if any fails, all are rolled back
 * Requirements: 1.1, 1.2, 1.3, 1.4
 *
 * @param {Object} updates - Key-value pairs to update
 * @returns {Object} Updated configuration
 * @throws {ValidationError} If validation fails
 * @throws {DatabaseError} If database operation fails
 */
export function update(updates) {
  // Strip password placeholder values — user didn't change them
  for (const key of SENSITIVE_KEYS) {
    if (updates[key] === SENSITIVE_PLACEHOLDER) {
      delete updates[key];
    }
  }

  // Phase 1: Validate ALL updates BEFORE starting transaction
  for (const [key, value] of Object.entries(updates)) {
    // Check if key is valid (reject unknown keys)
    if (DEFAULT_CONFIG[key] === undefined) {
      const errorInfo = ConfigErrors.unknownKey(key, Object.keys(DEFAULT_CONFIG));
      throw new ValidationError(errorInfo.message, errorInfo.field, errorInfo.details);
    }

    // Validate numeric values with range checks
    if (NUMERIC_KEYS.includes(key)) {
      if (!isValidNumericConfig(key, value)) {
        const range = NUMERIC_RANGES[key];
        if (range) {
          const errorInfo = ConfigErrors.numericOutOfRange(key, value, range.min, range.max);
          throw new ValidationError(errorInfo.message, errorInfo.field, errorInfo.details);
        }
        const errorInfo = ConfigErrors.numericInvalid(key, value, "203.00");
        throw new ValidationError(errorInfo.message, errorInfo.field, errorInfo.details);
      }
    }

    // Validate email values
    if (EMAIL_KEYS.includes(key)) {
      if (!isValidEmail(value)) {
        const errorInfo = ConfigErrors.emailInvalid(key, value);
        throw new ValidationError(errorInfo.message, errorInfo.field, errorInfo.details);
      }
    }
  }

  // Phase 2: Apply all updates in a single atomic transaction
  // If ANY update fails, ALL changes are rolled back automatically
  try {
    transaction(() => {
      const db = getDatabase();

      // Prepare UPSERT statement (INSERT...ON CONFLICT DO UPDATE)
      // This handles both new keys and existing keys in one statement
      const upsertStmt = db.prepare(`
        INSERT INTO configuration (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = datetime('now')
      `);

      // Apply each update within the transaction
      for (const [key, value] of Object.entries(updates)) {
        const stringValue = String(value);
        upsertStmt.run(key, stringValue);
      }
    });
  } catch (error) {
    // If it's already one of our errors, rethrow it
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error;
    }

    // Wrap database errors with informative message
    console.error("[Config] Transaction failed:", error.message);
    const errorInfo = DatabaseErrors.transactionFailed("guardar configuración");
    throw new DatabaseError(errorInfo.message, { originalError: error.message });
  }

  return getAll();
}

export default {
  getAll,
  get,
  update,
  initializeDefaults,
  ensureDefaults,
  isValidEmail,
  isPositiveNumber,
  isValidNumericConfig,
  DEFAULT_CONFIG,
  ConfigValidationError,
};
