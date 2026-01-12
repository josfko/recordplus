// Admin Service
// Task 5.1 - Requirements: 14.1-14.8

import { getDatabase, query } from "../database.js";

/**
 * List of allowed tables for admin access
 */
const ALLOWED_TABLES = [
  "cases",
  "document_history",
  "email_history",
  "configuration",
  "reference_counters",
];

/**
 * Dangerous SQL keywords that are blocked in queries
 */
const DANGEROUS_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "REPLACE",
  "GRANT",
  "REVOKE",
  "ATTACH",
  "DETACH",
  "PRAGMA",
  "VACUUM",
  "REINDEX",
];

/**
 * Custom error for admin operations
 */
export class AdminError extends Error {
  constructor(message, code = "ADMIN_ERROR") {
    super(message);
    this.name = "AdminError";
    this.code = code;
  }
}

/**
 * Get list of all tables with their row counts
 * @returns {Array<{name: string, count: number}>} List of tables with counts
 */
export function listTables() {
  const db = getDatabase({ readonly: true });

  try {
    const tables = ALLOWED_TABLES.map((tableName) => {
      const countResult = db
        .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
        .get();
      return {
        name: tableName,
        count: countResult?.count || 0,
      };
    });

    return tables;
  } finally {
    db.close();
  }
}

/**
 * Get contents of a specific table with pagination
 * @param {string} tableName - Name of the table
 * @param {Object} options - Pagination options
 * @param {number} options.limit - Number of rows to return (default: 50)
 * @param {number} options.offset - Number of rows to skip (default: 0)
 * @returns {{rows: Array, total: number, tableName: string}} Table contents with pagination info
 */
export function getTableContents(tableName, options = {}) {
  const { limit = 50, offset = 0 } = options;

  // Validate table name to prevent SQL injection
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new AdminError(`Tabla no permitida: ${tableName}`, "INVALID_TABLE");
  }

  // Validate pagination parameters
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 1000);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const db = getDatabase({ readonly: true });

  try {
    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM ${tableName}`)
      .get();
    const total = countResult?.total || 0;

    // Get rows with pagination
    const rows = db
      .prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`)
      .all(safeLimit, safeOffset);

    return {
      tableName,
      rows,
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  } finally {
    db.close();
  }
}

/**
 * Validate that a SQL query is safe to execute (SELECT only)
 * @param {string} sql - SQL query to validate
 * @returns {boolean} True if query is safe
 * @throws {AdminError} If query contains dangerous keywords
 */
export function validateQuery(sql) {
  if (!sql || typeof sql !== "string") {
    throw new AdminError("Query SQL es requerido", "INVALID_QUERY");
  }

  const trimmedSql = sql.trim();

  if (trimmedSql.length === 0) {
    throw new AdminError("Query SQL no puede estar vacío", "INVALID_QUERY");
  }

  // Normalize SQL for checking (uppercase, remove extra whitespace)
  const normalizedSql = trimmedSql.toUpperCase().replace(/\s+/g, " ");

  // Check if query starts with SELECT
  if (!normalizedSql.startsWith("SELECT")) {
    throw new AdminError(
      "Solo se permiten queries SELECT",
      "QUERY_NOT_ALLOWED"
    );
  }

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    // Use word boundary check to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalizedSql)) {
      throw new AdminError(
        `Keyword no permitido en query: ${keyword}`,
        "DANGEROUS_KEYWORD"
      );
    }
  }

  // Check for multiple statements (semicolon followed by non-whitespace)
  if (/;\s*\S/.test(trimmedSql)) {
    throw new AdminError(
      "No se permiten múltiples statements",
      "MULTIPLE_STATEMENTS"
    );
  }

  return true;
}

/**
 * Execute a SELECT query and return results
 * @param {string} sql - SQL SELECT query
 * @returns {{rows: Array, rowCount: number, executionTime: number}} Query results with metadata
 */
export function executeQuery(sql) {
  // Validate query first
  validateQuery(sql);

  const db = getDatabase({ readonly: true });
  const startTime = Date.now();

  try {
    // Remove trailing semicolon if present
    const cleanSql = sql.trim().replace(/;$/, "");

    const stmt = db.prepare(cleanSql);
    const rows = stmt.all();
    const executionTime = Date.now() - startTime;

    return {
      rows,
      rowCount: rows.length,
      executionTime,
    };
  } catch (error) {
    throw new AdminError(
      `Error ejecutando query: ${error.message}`,
      "QUERY_EXECUTION_ERROR"
    );
  } finally {
    db.close();
  }
}

export default {
  listTables,
  getTableContents,
  validateQuery,
  executeQuery,
  AdminError,
  ALLOWED_TABLES,
  DANGEROUS_KEYWORDS,
};
