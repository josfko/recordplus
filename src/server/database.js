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

    // Database hardening pragmas for reliability
    // Wait up to 5 seconds for locks before returning SQLITE_BUSY
    dbInstance.pragma("busy_timeout = 5000");

    // NORMAL is safe with WAL mode and faster than FULL
    dbInstance.pragma("synchronous = NORMAL");

    // 64MB cache for better read performance (negative = KB)
    dbInstance.pragma("cache_size = -64000");

    // Store temp tables in memory for speed
    dbInstance.pragma("temp_store = MEMORY");
  }

  return dbInstance;
}

/**
 * Close the database connection
 * Performs a WAL checkpoint before closing to ensure all data is written
 */
export function closeDatabase() {
  if (dbInstance) {
    // Checkpoint WAL to main database before closing
    try {
      dbInstance.pragma("wal_checkpoint(TRUNCATE)");
    } catch (error) {
      console.error("WAL checkpoint error during close:", error.message);
    }
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Perform a WAL checkpoint to flush data from WAL file to main database
 * Uses PASSIVE mode to avoid blocking readers
 * @returns {Object} Checkpoint result with busy, log, checkpointed counts
 */
export function checkpointWAL() {
  const db = getDatabase();
  const result = db.pragma("wal_checkpoint(PASSIVE)");
  return result[0] || { busy: 0, log: 0, checkpointed: 0 };
}

/**
 * Verify database integrity using PRAGMA quick_check
 * @returns {boolean} True if database passes integrity check
 */
export function verifyIntegrity() {
  try {
    const db = getDatabase();
    const result = db.pragma("quick_check");
    return result[0]?.quick_check === "ok";
  } catch (error) {
    console.error("Database integrity check failed:", error.message);
    return false;
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
  checkpointWAL,
  verifyIntegrity,
  query,
  queryOne,
  execute,
  transaction,
  verifyConnection,
  DB_PATH,
};
