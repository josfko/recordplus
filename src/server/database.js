// Database connection wrapper using better-sqlite3
// Task 2.1 - Requirements: 8.1, 8.3

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export const DB_PATH = process.env.DB_PATH || "./data/legal-cases.db";

let dbInstance = null;

/**
 * Get or create the database connection
 * @param {Object} options - Connection options
 * @param {boolean} options.readonly - Open in readonly mode
 * @returns {Database} SQLite database instance
 */
export function getDatabase(options = {}) {
  const { readonly = false } = options;

  // If requesting readonly and we have a writable instance, return a new readonly one
  if (readonly) {
    return new Database(DB_PATH, { readonly: true });
  }

  // Return existing instance or create new one
  if (!dbInstance) {
    // Ensure data directory exists
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    dbInstance = new Database(DB_PATH);

    // Enable foreign keys
    dbInstance.pragma("foreign_keys = ON");

    // Enable WAL mode for better concurrency
    dbInstance.pragma("journal_mode = WAL");
  }

  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Execute a query and return all results
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Query options
 * @param {boolean} options.readonly - Use readonly connection
 * @returns {Array} Query results
 */
export function query(sql, params = [], options = {}) {
  const db = getDatabase(options);
  const stmt = db.prepare(sql);
  const results = stmt.all(...params);

  // Close readonly connections after use
  if (options.readonly) {
    db.close();
  }

  return results;
}

/**
 * Execute a query and return the first result
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Query options
 * @returns {Object|undefined} First result or undefined
 */
export function queryOne(sql, params = [], options = {}) {
  const db = getDatabase(options);
  const stmt = db.prepare(sql);
  const result = stmt.get(...params);

  if (options.readonly) {
    db.close();
  }

  return result;
}

/**
 * Execute a write operation (INSERT, UPDATE, DELETE)
 * @param {string} sql - SQL statement
 * @param {Array} params - Statement parameters
 * @returns {Object} Result with changes and lastInsertRowid
 */
export function execute(sql, params = []) {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Run multiple statements in a transaction
 * @param {Function} fn - Function containing database operations
 * @returns {*} Result of the transaction function
 */
export function transaction(fn) {
  const db = getDatabase();
  return db.transaction(fn)();
}

/**
 * Verify database connectivity
 * @returns {boolean} True if database is accessible
 */
export function verifyConnection() {
  try {
    const db = getDatabase();
    const result = db.prepare("SELECT 1 as test").get();
    return result?.test === 1;
  } catch (error) {
    console.error("Database connection error:", error.message);
    return false;
  }
}

export default {
  getDatabase,
  closeDatabase,
  query,
  queryOne,
  execute,
  transaction,
  verifyConnection,
  DB_PATH,
};
