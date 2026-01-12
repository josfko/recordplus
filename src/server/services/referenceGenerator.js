// Reference Generator Service
// Task 2.2 - Requirements: 1.2, 1.7, 2.1, 2.3, 7.1, 7.3, 7.4

import { getDatabase, transaction } from "../database.js";

/**
 * Validates ARAG external reference format (DJ00xxxxxx)
 * @param {string} ref - Reference to validate
 * @returns {boolean} True if valid format
 */
export function validateAragExternalReference(ref) {
  if (typeof ref !== "string") return false;
  return /^DJ00\d{6}$/.test(ref);
}

/**
 * Get the next counter value atomically
 * @param {string} type - Counter type (e.g., 'ARAG', 'PARTICULAR_2026')
 * @returns {number} Next counter value
 */
export function getNextCounter(type) {
  const db = getDatabase();

  // Use transaction for atomic increment
  const result = transaction(() => {
    // Try to get existing counter
    const existing = db
      .prepare("SELECT last_value FROM reference_counters WHERE type = ?")
      .get(type);

    let nextValue;
    if (existing) {
      nextValue = existing.last_value + 1;
      db.prepare(
        "UPDATE reference_counters SET last_value = ?, updated_at = datetime('now') WHERE type = ?"
      ).run(nextValue, type);
    } else {
      nextValue = 1;
      db.prepare(
        "INSERT INTO reference_counters (type, last_value, updated_at) VALUES (?, ?, datetime('now'))"
      ).run(type, nextValue);
    }

    return nextValue;
  });

  return result;
}

/**
 * Generate internal reference for ARAG cases (IY + 6 digits)
 * @returns {string} Reference like IY004921
 */
export function generateAragReference() {
  const counter = getNextCounter("ARAG");
  return `IY${counter.toString().padStart(6, "0")}`;
}

/**
 * Generate internal reference for Particular cases (IY-YY-NNN)
 * @param {number} year - Full year (e.g., 2026)
 * @returns {string} Reference like IY-26-001
 */
export function generateParticularReference(year) {
  const currentYear = year || new Date().getFullYear();
  const yy = currentYear.toString().slice(-2);
  const counterType = `PARTICULAR_${currentYear}`;
  const counter = getNextCounter(counterType);
  return `IY-${yy}-${counter.toString().padStart(3, "0")}`;
}

/**
 * Check if an ARAG external reference already exists
 * @param {string} ref - ARAG reference to check
 * @returns {boolean} True if reference exists
 */
export function aragReferenceExists(ref) {
  const db = getDatabase();
  const result = db
    .prepare("SELECT 1 FROM cases WHERE arag_reference = ?")
    .get(ref);
  return !!result;
}

/**
 * Check if an internal reference already exists
 * @param {string} ref - Internal reference to check
 * @returns {boolean} True if reference exists
 */
export function internalReferenceExists(ref) {
  const db = getDatabase();
  const result = db
    .prepare("SELECT 1 FROM cases WHERE internal_reference = ?")
    .get(ref);
  return !!result;
}

/**
 * Get current counter value without incrementing
 * @param {string} type - Counter type
 * @returns {number} Current counter value or 0 if not exists
 */
export function getCurrentCounter(type) {
  const db = getDatabase();
  const result = db
    .prepare("SELECT last_value FROM reference_counters WHERE type = ?")
    .get(type);
  return result?.last_value || 0;
}

/**
 * Reset counter for a specific type (for testing purposes only)
 * @param {string} type - Counter type to reset
 */
export function resetCounter(type) {
  const db = getDatabase();
  db.prepare("DELETE FROM reference_counters WHERE type = ?").run(type);
}

export default {
  validateAragExternalReference,
  generateAragReference,
  generateParticularReference,
  getNextCounter,
  getCurrentCounter,
  aragReferenceExists,
  internalReferenceExists,
  resetCounter,
};
