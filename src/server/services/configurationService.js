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

/**
 * Validation error class
 */
export class ConfigValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ConfigValidationError";
    this.field = field;
    this.code = "VALIDATION_ERROR";
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  // Basic email regex - allows most valid emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
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
 * Get all configuration values
 * @returns {Object} Configuration key-value pairs
 */
export function getAll() {
  // Note: Defaults are initialized once at server startup via ensureDefaults()
  // This function no longer calls initializeDefaults() on every request

  const rows = query("SELECT key, value FROM configuration");
  const config = {};

  for (const row of rows) {
    // Convert numeric values to numbers for the response
    if (NUMERIC_KEYS.includes(row.key)) {
      config[row.key] = parseFloat(row.value);
    } else {
      config[row.key] = row.value;
    }
  }

  return config;
}

/**
 * Get a single configuration value
 * @param {string} key - Configuration key
 * @returns {string|number|null} Configuration value or null
 */
export function get(key) {
  const row = queryOne("SELECT value FROM configuration WHERE key = ?", [key]);
  if (!row) {
    // Return default if exists
    if (DEFAULT_CONFIG[key] !== undefined) {
      return NUMERIC_KEYS.includes(key)
        ? parseFloat(DEFAULT_CONFIG[key])
        : DEFAULT_CONFIG[key];
    }
    return null;
  }

  return NUMERIC_KEYS.includes(key) ? parseFloat(row.value) : row.value;
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
  // Phase 1: Validate ALL updates BEFORE starting transaction
  // This ensures we fail fast on invalid data without touching the database
  for (const [key, value] of Object.entries(updates)) {
    // Check if key is valid (reject unknown keys)
    if (DEFAULT_CONFIG[key] === undefined) {
      const errorInfo = ConfigErrors.unknownKey(key, Object.keys(DEFAULT_CONFIG));
      throw new ValidationError(errorInfo.message, errorInfo.field, errorInfo.details);
    }

    // Validate numeric values
    if (NUMERIC_KEYS.includes(key)) {
      if (!isPositiveNumber(value)) {
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
  DEFAULT_CONFIG,
  ConfigValidationError,
};
