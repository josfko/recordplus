// Configuration Service
// Task 4.4 - Requirements: 12.1-12.9

import { query, queryOne, execute } from "../database.js";

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

/**
 * Initialize default configuration values if not present
 */
export function initializeDefaults() {
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
}

/**
 * Get all configuration values
 * @returns {Object} Configuration key-value pairs
 */
export function getAll() {
  // Ensure defaults are initialized
  initializeDefaults();

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
 * Update configuration values
 * @param {Object} updates - Key-value pairs to update
 * @returns {Object} Updated configuration
 * @throws {ConfigValidationError} If validation fails
 */
export function update(updates) {
  // Validate all updates before applying any
  for (const [key, value] of Object.entries(updates)) {
    // Check if key is valid
    if (DEFAULT_CONFIG[key] === undefined) {
      throw new ConfigValidationError(
        `Clave de configuración desconocida: ${key}`,
        key,
      );
    }

    // Validate numeric values
    if (NUMERIC_KEYS.includes(key)) {
      if (!isPositiveNumber(value)) {
        throw new ConfigValidationError(
          `El valor de ${key} debe ser un número positivo`,
          key,
        );
      }
    }

    // Validate email values
    if (EMAIL_KEYS.includes(key)) {
      if (!isValidEmail(value)) {
        throw new ConfigValidationError(
          `El formato de email para ${key} es inválido`,
          key,
        );
      }
    }
  }

  // Apply all updates
  for (const [key, value] of Object.entries(updates)) {
    const stringValue = String(value);
    const existing = queryOne("SELECT key FROM configuration WHERE key = ?", [
      key,
    ]);

    if (existing) {
      execute(
        "UPDATE configuration SET value = ?, updated_at = datetime('now') WHERE key = ?",
        [stringValue, key],
      );
    } else {
      execute("INSERT INTO configuration (key, value) VALUES (?, ?)", [
        key,
        stringValue,
      ]);
    }
  }

  return getAll();
}

export default {
  getAll,
  get,
  update,
  initializeDefaults,
  isValidEmail,
  isPositiveNumber,
  DEFAULT_CONFIG,
  ConfigValidationError,
};
