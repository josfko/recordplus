// Case Service
// Task 2.4 - Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.6, 4.1-4.8

import {
  getDatabase,
  query,
  queryOne,
  execute,
  transaction,
} from "../database.js";
import {
  validateAragExternalReference,
  generateAragReference,
  generateAragReferenceInTransaction,
  generateParticularReference,
  generateParticularReferenceInTransaction,
  aragReferenceExists,
} from "./referenceGenerator.js";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  DatabaseError,
} from "../errors.js";
import { CaseErrors, ConflictErrors, DatabaseErrors } from "../errorMessages.js";

// Valid case types
export const CASE_TYPES = {
  ARAG: "ARAG",
  PARTICULAR: "PARTICULAR",
  TURNO_OFICIO: "TURNO_OFICIO",
};

// Valid case states
export const CASE_STATES = {
  ABIERTO: "ABIERTO",
  JUDICIAL: "JUDICIAL",
  ARCHIVADO: "ARCHIVADO",
};

// Valid languages
export const CASE_LANGUAGES = {
  ES: "es",
  EN: "en",
};

// Valid judicial districts
export const JUDICIAL_DISTRICTS = [
  "Torrox",
  "Vélez-Málaga",
  "Torremolinos",
  "Fuengirola",
  "Marbella",
  "Estepona",
  "Antequera",
];

// Re-export error classes from errors.js for backward compatibility
export { ValidationError, ConflictError, NotFoundError };

/**
 * Validate case data for creation
 * @param {Object} data - Case data to validate
 * @throws {ValidationError} If validation fails
 */
function validateCaseData(data) {
  // Validate type
  if (!data.type || !Object.values(CASE_TYPES).includes(data.type)) {
    throw new ValidationError(
      "Tipo de expediente inválido. Debe ser ARAG, PARTICULAR o TURNO_OFICIO",
      "type"
    );
  }

  // Validate client name (required, non-empty)
  if (
    !data.clientName ||
    typeof data.clientName !== "string" ||
    !data.clientName.trim()
  ) {
    throw new ValidationError(
      "El nombre del cliente es obligatorio",
      "clientName"
    );
  }

  // Type-specific validations
  if (data.type === CASE_TYPES.ARAG) {
    // ARAG requires external reference
    if (!data.aragReference) {
      throw new ValidationError(
        "La referencia ARAG es obligatoria para expedientes ARAG",
        "aragReference"
      );
    }
    if (!validateAragExternalReference(data.aragReference)) {
      throw new ValidationError(
        "Formato de referencia ARAG inválido. Debe ser DJ00 seguido de 6 dígitos",
        "aragReference"
      );
    }
  }

  if (data.type === CASE_TYPES.TURNO_OFICIO) {
    // Turno de Oficio requires designation
    if (
      !data.designation ||
      typeof data.designation !== "string" ||
      !data.designation.trim()
    ) {
      throw new ValidationError(
        "El número de designación es obligatorio para expedientes de Turno de Oficio",
        "designation"
      );
    }
  }

  // Validate language if provided
  if (data.language && !Object.values(CASE_LANGUAGES).includes(data.language)) {
    throw new ValidationError(
      "Idioma inválido. Debe ser 'es' o 'en'",
      "language"
    );
  }

  // Validate entry date if provided
  if (data.entryDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.entryDate)) {
      throw new ValidationError(
        "Formato de fecha inválido. Use YYYY-MM-DD",
        "entryDate"
      );
    }
  }
}

/**
 * Create a new case atomically
 * All operations (duplicate check, reference generation, insert) happen in a single transaction
 * If any operation fails, all changes are rolled back including reference counter increments
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * @param {Object} data - Case data
 * @returns {Object} Created case
 * @throws {ConflictError} If ARAG reference already exists
 * @throws {ValidationError} If validation fails
 * @throws {DatabaseError} If database operation fails
 */
export function create(data) {
  // Phase 1: Validate OUTSIDE the transaction (fail fast)
  validateCaseData(data);

  const entryDate = data.entryDate || new Date().toISOString().split("T")[0];

  try {
    // Phase 2: Atomic transaction for all database operations
    const result = transaction(() => {
      const db = getDatabase();

      // Check for duplicate ARAG reference INSIDE the transaction
      // This ensures no race condition between check and insert
      if (data.type === CASE_TYPES.ARAG) {
        const duplicateCheck = db
          .prepare("SELECT 1 FROM cases WHERE arag_reference = ?")
          .get(data.aragReference);

        if (duplicateCheck) {
          const errorInfo = CaseErrors.aragReferenceDuplicate(data.aragReference);
          throw new ConflictError(errorInfo.message, errorInfo.field, errorInfo.details);
        }
      }

      // Generate internal reference INSIDE the transaction
      // If insert fails, counter increment will be rolled back
      let internalReference = null;
      if (data.type === CASE_TYPES.ARAG || data.type === CASE_TYPES.TURNO_OFICIO) {
        internalReference = generateAragReferenceInTransaction(db);
      } else if (data.type === CASE_TYPES.PARTICULAR) {
        const year = data.entryDate
          ? new Date(data.entryDate).getFullYear()
          : new Date().getFullYear();
        internalReference = generateParticularReferenceInTransaction(db, year);
      }

      // Insert the case
      const insertResult = db
        .prepare(
          `INSERT INTO cases (
            type, client_name, internal_reference, arag_reference,
            designation, state, entry_date, observations, language
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.type,
          data.clientName.trim(),
          internalReference,
          data.type === CASE_TYPES.ARAG ? data.aragReference : null,
          data.type === CASE_TYPES.TURNO_OFICIO ? data.designation.trim() : null,
          CASE_STATES.ABIERTO,
          entryDate,
          data.observations || "",
          data.language || CASE_LANGUAGES.ES
        );

      // Return the created case from within the transaction
      return getByIdInternal(db, insertResult.lastInsertRowid);
    });

    return result;
  } catch (error) {
    // Re-throw our custom errors as-is
    if (
      error instanceof ConflictError ||
      error instanceof ValidationError ||
      error instanceof AppConflictError ||
      error instanceof AppValidationError
    ) {
      throw error;
    }

    // Wrap other errors with informative message
    console.error("[CaseService] Create failed:", error.message);
    const errorInfo = DatabaseErrors.transactionFailed("crear expediente");
    throw new DatabaseError(errorInfo.message, { originalError: error.message });
  }
}

/**
 * Get case by ID using a specific database connection (for use within transactions)
 * Requirements: 2.1
 *
 * @param {Database} db - Database instance
 * @param {number} id - Case ID
 * @returns {Object|null} Case object or null
 */
function getByIdInternal(db, id) {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id);
  if (!row) return null;
  return mapRowToCase(row);
}

/**
 * Get case by ID
 * @param {number} id - Case ID
 * @returns {Object|null} Case object or null
 */
export function getById(id) {
  const row = queryOne("SELECT * FROM cases WHERE id = ?", [id]);
  if (!row) return null;
  return mapRowToCase(row);
}

// Allowlist of sortable columns (keys = API param, values = SQL column)
const SORTABLE_COLUMNS = {
  internal_reference: 'internal_reference',
  client_name: 'client_name',
  type: 'type',
  state: 'state',
  entry_date: 'entry_date',
};

/**
 * List cases with filters, pagination, and sorting
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @param {Object} sort - Sort options { sortBy, sortOrder }
 * @returns {Object} { cases, total, page, pageSize }
 */
export function list(filters = {}, pagination = {}, sort = {}) {
  const { type, state, search, language } = filters;
  const { page = 1, pageSize = 20 } = pagination;
  const { sortBy = null, sortOrder = 'DESC' } = sort;

  let whereClauses = [];
  let params = [];

  if (type) {
    whereClauses.push("type = ?");
    params.push(type);
  }

  if (state) {
    whereClauses.push("state = ?");
    params.push(state);
  }

  if (language) {
    whereClauses.push("language = ?");
    params.push(language);
  }

  if (search) {
    whereClauses.push(
      "(client_name LIKE ? OR internal_reference LIKE ? OR arag_reference LIKE ?)"
    );
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Build ORDER BY clause (allowlist prevents SQL injection)
  let orderByClause;
  if (sortBy && SORTABLE_COLUMNS[sortBy]) {
    const column = SORTABLE_COLUMNS[sortBy];
    const direction = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    orderByClause = `ORDER BY ${column} ${direction}, id ${direction}`;
  } else {
    orderByClause = 'ORDER BY entry_date DESC, id DESC';
  }

  // Get total count
  const countResult = queryOne(
    `SELECT COUNT(*) as total FROM cases ${whereClause}`,
    params
  );
  const total = countResult?.total || 0;

  // Get paginated results with document counts
  const offset = (page - 1) * pageSize;
  const rows = query(
    `SELECT c.*,
      (SELECT COUNT(*) FROM document_history dh WHERE dh.case_id = c.id AND dh.document_type = 'MINUTA') as minuta_count,
      (SELECT COUNT(*) FROM document_history dh WHERE dh.case_id = c.id AND dh.document_type = 'SUPLIDO') as suplido_count,
      (SELECT COUNT(*) FROM document_history dh WHERE dh.case_id = c.id AND dh.document_type = 'HOJA_ENCARGO') as hoja_count
     FROM cases c ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    cases: rows.map(mapRowToCase),
    total,
    page,
    pageSize,
  };
}

export { SORTABLE_COLUMNS };

/**
 * Update a case with optimistic locking support
 * If expectedVersion is provided, the update will only succeed if the current
 * database version matches. This prevents lost updates when multiple users
 * edit the same case simultaneously.
 * Requirements: 3.2, 3.3, 3.4, 3.5
 *
 * @param {number} id - Case ID
 * @param {Object} data - Data to update
 * @param {number|null} expectedVersion - Optional version for optimistic locking
 * @returns {Object} Updated case
 * @throws {NotFoundError} If case doesn't exist
 * @throws {ConflictError} If version mismatch (concurrent modification detected)
 * @throws {ValidationError} If validation fails
 */
export function update(id, data, expectedVersion = null) {
  const existing = getById(id);
  if (!existing) {
    const errorInfo = CaseErrors.notFound(id);
    throw new NotFoundError(errorInfo.message);
  }

  // Archived cases can only update observations
  if (existing.state === CASE_STATES.ARCHIVADO) {
    if (Object.keys(data).some((key) => key !== "observations" && key !== "version")) {
      const errorInfo = CaseErrors.archivedCaseReadOnly(
        Object.keys(data).find((k) => k !== "observations" && k !== "version")
      );
      throw new ValidationError(errorInfo.message, errorInfo.field);
    }
  }

  // Optimistic locking: check version if provided
  if (expectedVersion !== null && existing.version !== expectedVersion) {
    const errorInfo = ConflictErrors.versionMismatch(expectedVersion, existing.version);
    throw new ConflictError(errorInfo.message, errorInfo.field, errorInfo.details);
  }

  const allowedFields = ["clientName", "observations", "entryDate", "language"];
  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      const dbField =
        field === "clientName"
          ? "client_name"
          : field === "entryDate"
          ? "entry_date"
          : field;
      updates.push(`${dbField} = ?`);
      params.push(field === "clientName" ? data[field].trim() : data[field]);
    }
  }

  if (updates.length === 0) {
    return existing;
  }

  // Always increment version and update timestamp
  updates.push("version = version + 1");
  updates.push("updated_at = datetime('now')");

  // Build WHERE clause with version check for extra safety
  let whereClause = "id = ?";
  params.push(id);

  if (expectedVersion !== null) {
    whereClause += " AND version = ?";
    params.push(expectedVersion);
  }

  const result = execute(
    `UPDATE cases SET ${updates.join(", ")} WHERE ${whereClause}`,
    params
  );

  // If no rows were affected and we had a version check, it's a conflict
  if (result.changes === 0 && expectedVersion !== null) {
    // Re-fetch to get current version for the error message
    const current = getById(id);
    const errorInfo = ConflictErrors.versionMismatch(
      expectedVersion,
      current?.version || "unknown"
    );
    throw new ConflictError(errorInfo.message, errorInfo.field, errorInfo.details);
  }

  return getById(id);
}

/**
 * Archive a case
 * @param {number} id - Case ID
 * @param {string} closureDate - Closure date (YYYY-MM-DD)
 * @returns {Object} Archived case
 */
export function archive(id, closureDate) {
  const existing = getById(id);
  if (!existing) {
    throw new NotFoundError("Expediente no encontrado");
  }

  if (existing.state === CASE_STATES.ARCHIVADO) {
    throw new ValidationError("El expediente ya está archivado");
  }

  // Validate closure date is required
  if (!closureDate) {
    throw new ValidationError(
      "La fecha de cierre es obligatoria para archivar",
      "closureDate"
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(closureDate)) {
    throw new ValidationError(
      "Formato de fecha inválido. Use YYYY-MM-DD",
      "closureDate"
    );
  }

  execute(
    `UPDATE cases SET state = ?, closure_date = ?, updated_at = datetime('now') WHERE id = ?`,
    [CASE_STATES.ARCHIVADO, closureDate, id]
  );

  return getById(id);
}

/**
 * Finalize a Turno de Oficio case (transition from ABIERTO to FINALIZADO)
 * Note: Uses JUDICIAL state in database to represent FINALIZADO for Turno cases
 * @param {number} id - Case ID
 * @returns {Object} Updated case
 */
export function finalizeTurno(id) {
  const existing = getById(id);
  if (!existing) {
    throw new NotFoundError("Expediente no encontrado");
  }

  // Only Turno de Oficio cases can be finalized this way
  if (existing.type !== CASE_TYPES.TURNO_OFICIO) {
    throw new ValidationError(
      "Solo los expedientes de Turno de Oficio pueden finalizarse de esta manera"
    );
  }

  // Can only finalize from ABIERTO state
  if (existing.state === CASE_STATES.JUDICIAL) {
    throw new ValidationError("El expediente ya está finalizado");
  }

  if (existing.state === CASE_STATES.ARCHIVADO) {
    throw new ValidationError("No se puede modificar un expediente archivado");
  }

  execute(
    `UPDATE cases SET state = ?, updated_at = datetime('now') WHERE id = ?`,
    [CASE_STATES.JUDICIAL, id]
  );

  return getById(id);
}

/**
 * Transition an ARAG case to judicial state
 * @param {number} id - Case ID
 * @param {string} judicialDate - Transition date (YYYY-MM-DD)
 * @param {string} district - Judicial district
 * @returns {Object} Updated case
 */
export function transitionToJudicial(id, judicialDate, district) {
  const existing = getById(id);
  if (!existing) {
    throw new NotFoundError("Expediente no encontrado");
  }

  // Only ARAG cases can transition to judicial
  if (existing.type !== CASE_TYPES.ARAG) {
    throw new ValidationError(
      "Solo los expedientes ARAG pueden pasar a estado judicial"
    );
  }

  // Can only transition from ABIERTO state
  if (existing.state !== CASE_STATES.ABIERTO) {
    throw new ValidationError(
      "Solo se puede pasar a judicial desde estado Abierto"
    );
  }

  // Validate judicial date
  if (!judicialDate) {
    throw new ValidationError(
      "La fecha de paso a judicial es obligatoria",
      "judicialDate"
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(judicialDate)) {
    throw new ValidationError(
      "Formato de fecha inválido. Use YYYY-MM-DD",
      "judicialDate"
    );
  }

  // Validate district
  if (!district || !JUDICIAL_DISTRICTS.includes(district)) {
    throw new ValidationError(
      `Partido judicial inválido. Debe ser uno de: ${JUDICIAL_DISTRICTS.join(
        ", "
      )}`,
      "district"
    );
  }

  execute(
    `UPDATE cases SET state = ?, judicial_date = ?, judicial_district = ?, updated_at = datetime('now') WHERE id = ?`,
    [CASE_STATES.JUDICIAL, judicialDate, district, id]
  );

  return getById(id);
}

/**
 * Delete a case (for testing purposes)
 * @param {number} id - Case ID
 * @returns {boolean} True if deleted
 */
export function deleteCase(id) {
  const result = execute("DELETE FROM cases WHERE id = ?", [id]);
  return result.changes > 0;
}

/**
 * Map database row to case object
 * Includes version field for optimistic locking (added in migration 003)
 * Requirements: 3.1, 3.4
 *
 * @param {Object} row - Database row
 * @returns {Object} Case object
 */
function mapRowToCase(row) {
  const mapped = {
    id: row.id,
    type: row.type,
    clientName: row.client_name,
    internalReference: row.internal_reference,
    aragReference: row.arag_reference,
    designation: row.designation,
    state: row.state,
    entryDate: row.entry_date,
    judicialDate: row.judicial_date,
    judicialDistrict: row.judicial_district,
    closureDate: row.closure_date,
    observations: row.observations,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Version for optimistic locking (defaults to 1 if column doesn't exist yet)
    version: row.version ?? 1,
    // Language (defaults to 'es' if column doesn't exist yet)
    language: row.language ?? "es",
  };

  // Document counts (only present in list queries, not getById)
  if (row.minuta_count !== undefined) {
    mapped.minutaCount = row.minuta_count;
    mapped.suplidoCount = row.suplido_count;
    mapped.hojaCount = row.hoja_count;
  }

  return mapped;
}

export default {
  create,
  getById,
  list,
  update,
  archive,
  finalizeTurno,
  transitionToJudicial,
  deleteCase,
  CASE_TYPES,
  CASE_STATES,
  CASE_LANGUAGES,
  JUDICIAL_DISTRICTS,
  ValidationError,
  ConflictError,
  NotFoundError,
};
