// Error message factory with Spanish messages
// Task 2.2 - Requirements: 9.2, 9.4, 9.5, 9.7
//
// Each message follows the pattern:
// 1. What failed
// 2. Why it failed
// 3. What to do next

import {
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} from "./errors.js";

/**
 * Error messages for configuration-related errors
 */
export const ConfigErrors = {
  /**
   * Invalid numeric value for configuration
   * @param {string} field - Field name (e.g., 'arag_base_fee')
   * @param {*} value - The invalid value received
   * @param {string} example - Example of valid value
   */
  numericInvalid: (field, value, example) => ({
    code: "CONFIG_VALIDATION_NUMERIC",
    message: `El valor de '${field}' debe ser un número positivo. Valor recibido: '${value}'. Por favor, introduzca un número como ${example}.`,
    field,
    details: { received: value, expected: "número positivo", example },
  }),

  /**
   * Invalid email format
   * @param {string} field - Field name
   * @param {string} value - The invalid email
   */
  emailInvalid: (field, value) => ({
    code: "CONFIG_VALIDATION_EMAIL",
    message: `El email '${value}' no tiene un formato válido. Por favor, use el formato nombre@dominio.com.`,
    field,
    details: { received: value, expected: "nombre@dominio.com" },
  }),

  /**
   * Numeric value out of expected range
   * @param {string} field - Field name
   * @param {*} value - The out-of-range value
   * @param {number} min - Minimum allowed
   * @param {number} max - Maximum allowed
   */
  numericOutOfRange: (field, value, min, max) => ({
    code: "CONFIG_VALIDATION_RANGE",
    message: `El valor de '${field}' (${value}) está fuera del rango válido (${min}–${max}). Por favor, introduzca un valor correcto.`,
    field,
    details: { received: value, min, max },
  }),

  /**
   * Unknown configuration key
   * @param {string} key - The unknown key
   * @param {string[]} validKeys - List of valid keys
   */
  unknownKey: (key, validKeys) => ({
    code: "CONFIG_UNKNOWN_KEY",
    message: `La clave de configuración '${key}' no es reconocida. Las claves válidas son: ${validKeys.slice(0, 5).join(", ")}...`,
    field: key,
    details: { unknownKey: key, validKeys },
  }),

  /**
   * Configuration save failed
   */
  saveFailed: () => ({
    code: "CONFIG_SAVE_FAILED",
    message:
      "No se pudo guardar la configuración. Por favor, verifique los datos e inténtelo de nuevo. Si el problema persiste, contacte con soporte.",
  }),

  /**
   * Configuration load failed
   */
  loadFailed: () => ({
    code: "CONFIG_LOAD_FAILED",
    message:
      "No se pudo cargar la configuración. Por favor, recargue la página. Si el problema persiste, contacte con soporte.",
  }),
};

/**
 * Error messages for case-related errors
 */
export const CaseErrors = {
  /**
   * Case not found
   * @param {number|string} id - The case ID that wasn't found
   */
  notFound: (id) => ({
    code: "CASE_NOT_FOUND",
    message: `No se encontró el expediente con ID ${id}. Es posible que haya sido eliminado o que el ID sea incorrecto.`,
    field: "id",
    details: { searchedId: id },
  }),

  /**
   * Required field missing
   * @param {string} field - Field name
   * @param {string} fieldLabel - Human-readable field name in Spanish
   */
  requiredField: (field, fieldLabel) => ({
    code: "CASE_REQUIRED_FIELD",
    message: `El campo '${fieldLabel}' es obligatorio. Por favor, rellene este campo antes de continuar.`,
    field,
    details: { required: true },
  }),

  /**
   * Invalid ARAG reference format
   * @param {string} value - The invalid reference
   */
  aragReferenceInvalid: (value) => ({
    code: "CASE_ARAG_REFERENCE_INVALID",
    message: `La referencia ARAG '${value}' no tiene el formato correcto. Debe ser DJ00 seguido de 6 dígitos (ejemplo: DJ00123456).`,
    field: "aragReference",
    details: { received: value, expected: "DJ00XXXXXX", pattern: "^DJ00\\d{6}$" },
  }),

  /**
   * Duplicate ARAG reference
   * @param {string} reference - The duplicate reference
   */
  aragReferenceDuplicate: (reference) => ({
    code: "CASE_ARAG_REFERENCE_DUPLICATE",
    message: `Ya existe un expediente con la referencia ARAG '${reference}'. Cada referencia ARAG debe ser única. Verifique el número e inténtelo de nuevo.`,
    field: "aragReference",
    details: { duplicateReference: reference },
  }),

  /**
   * Invalid state transition
   * @param {string} currentState - Current state
   * @param {string} newState - Attempted new state
   * @param {string[]} validTransitions - Valid states from current
   */
  invalidStateTransition: (currentState, newState, validTransitions) => ({
    code: "CASE_INVALID_STATE_TRANSITION",
    message: `No se puede cambiar el estado de '${currentState}' a '${newState}'. Los estados válidos desde '${currentState}' son: ${validTransitions.join(", ")}.`,
    field: "state",
    details: { currentState, attemptedState: newState, validTransitions },
  }),

  /**
   * Archive requires closure date
   */
  archiveRequiresClosureDate: () => ({
    code: "CASE_ARCHIVE_REQUIRES_CLOSURE_DATE",
    message:
      "Para archivar un expediente debe indicar la fecha de cierre. Por favor, seleccione una fecha de cierre antes de archivar.",
    field: "closureDate",
  }),

  /**
   * Cannot modify archived case
   * @param {string} field - Field attempted to modify
   */
  archivedCaseReadOnly: (field) => ({
    code: "CASE_ARCHIVED_READ_ONLY",
    message: `No se puede modificar el campo '${field}' de un expediente archivado. Los expedientes archivados son de solo lectura (excepto observaciones).`,
    field,
  }),

  /**
   * Invalid date format
   * @param {string} field - Date field name
   * @param {string} value - The invalid date value
   */
  dateInvalid: (field, value) => ({
    code: "CASE_DATE_INVALID",
    message: `La fecha '${value}' en el campo '${field}' no es válida. Use el formato AAAA-MM-DD (ejemplo: 2024-12-31).`,
    field,
    details: { received: value, expected: "YYYY-MM-DD" },
  }),

  /**
   * Invalid case type
   * @param {string} value - The invalid type
   */
  typeInvalid: (value) => ({
    code: "CASE_TYPE_INVALID",
    message: `El tipo de expediente '${value}' no es válido. Los tipos válidos son: ARAG, PARTICULAR, TURNO_OFICIO.`,
    field: "type",
    details: { received: value, validTypes: ["ARAG", "PARTICULAR", "TURNO_OFICIO"] },
  }),

  /**
   * Reference generation failed
   * @param {string} type - Case type
   */
  referenceGenerationFailed: (type) => ({
    code: "CASE_REFERENCE_GENERATION_FAILED",
    message: `No se pudo generar la referencia interna para el expediente de tipo ${type}. Por favor, inténtelo de nuevo.`,
    details: { caseType: type },
  }),
};

/**
 * Error messages for concurrency/conflict errors
 */
export const ConflictErrors = {
  /**
   * Optimistic locking version mismatch
   * @param {number} expectedVersion - Version the client had
   * @param {number} currentVersion - Current version in database
   */
  versionMismatch: (expectedVersion, currentVersion) => ({
    code: "CONFLICT_VERSION_MISMATCH",
    message:
      "El expediente ha sido modificado por otro usuario mientras lo editaba. Sus cambios no se han guardado. Por favor, recargue la página para ver la versión actual y vuelva a realizar sus cambios.",
    field: "version",
    details: { yourVersion: expectedVersion, currentVersion },
  }),

  /**
   * Resource locked by another process
   */
  resourceLocked: () => ({
    code: "CONFLICT_RESOURCE_LOCKED",
    message:
      "El recurso está siendo utilizado por otro proceso. Por favor, espere unos segundos e inténtelo de nuevo.",
  }),

  /**
   * Duplicate resource
   * @param {string} field - Field with duplicate
   * @param {string} value - Duplicate value
   */
  duplicateResource: (field, value) => ({
    code: "CONFLICT_DUPLICATE",
    message: `Ya existe un registro con el valor '${value}' en el campo '${field}'. Por favor, use un valor diferente.`,
    field,
    details: { duplicateValue: value },
  }),
};

/**
 * Error messages for database errors
 */
export const DatabaseErrors = {
  /**
   * Connection failed
   */
  connectionFailed: () => ({
    code: "DB_CONNECTION_FAILED",
    message:
      "No se pudo conectar con la base de datos. El servicio puede estar temporalmente no disponible. Por favor, inténtelo de nuevo en unos minutos.",
  }),

  /**
   * Query timeout
   */
  queryTimeout: () => ({
    code: "DB_QUERY_TIMEOUT",
    message:
      "La operación tardó demasiado tiempo y fue cancelada. Por favor, inténtelo de nuevo. Si el problema persiste, contacte con soporte.",
  }),

  /**
   * Transaction failed
   * @param {string} operation - Operation that failed (e.g., 'guardar configuración')
   */
  transactionFailed: (operation) => ({
    code: "DB_TRANSACTION_FAILED",
    message: `Error al ${operation}. Los cambios han sido revertidos. Por favor, verifique los datos e inténtelo de nuevo.`,
    details: { operation },
  }),

  /**
   * Integrity constraint violation
   */
  integrityViolation: () => ({
    code: "DB_INTEGRITY_VIOLATION",
    message:
      "La operación viola una restricción de integridad de datos. Esto puede ocurrir si intenta eliminar un registro que tiene datos relacionados.",
  }),

  /**
   * Database busy (SQLITE_BUSY)
   */
  databaseBusy: () => ({
    code: "DB_BUSY",
    message:
      "La base de datos está ocupada procesando otras solicitudes. Por favor, espere unos segundos e inténtelo de nuevo.",
  }),

  /**
   * Generic database error (fallback)
   */
  genericError: () => ({
    code: "DB_ERROR",
    message:
      "Ha ocurrido un error en la base de datos. Por favor, inténtelo de nuevo. Si el problema persiste, contacte con soporte técnico.",
  }),
};

/**
 * Error messages for network/server errors
 */
export const ServerErrors = {
  /**
   * Internal server error
   */
  internalError: () => ({
    code: "SERVER_INTERNAL_ERROR",
    message:
      "Ha ocurrido un error interno del servidor. Por favor, inténtelo de nuevo más tarde. Si el problema persiste, contacte con soporte.",
  }),

  /**
   * Service unavailable
   */
  serviceUnavailable: () => ({
    code: "SERVER_UNAVAILABLE",
    message:
      "El servicio no está disponible temporalmente. Por favor, inténtelo de nuevo en unos minutos.",
  }),

  /**
   * Rate limited
   */
  rateLimited: () => ({
    code: "SERVER_RATE_LIMITED",
    message:
      "Ha realizado demasiadas solicitudes. Por favor, espere un momento antes de continuar.",
  }),

  /**
   * Invalid request format
   */
  invalidRequest: () => ({
    code: "SERVER_INVALID_REQUEST",
    message:
      "La solicitud no tiene el formato esperado. Por favor, recargue la página e inténtelo de nuevo.",
  }),
};

/**
 * Helper to create an error from a message object
 * @param {Object} errorMsg - Error message object from factories above
 * @param {Function} ErrorClass - Error class to instantiate
 * @returns {AppError} Constructed error instance
 */
export function createError(errorMsg, ErrorClass) {
  const ClassMap = {
    ValidationError,
    NotFoundError,
    ConflictError,
    DatabaseError,
  };

  const ActualClass = ClassMap[ErrorClass.name] || ErrorClass;
  return new ActualClass(errorMsg.message, errorMsg.field, errorMsg.details);
}

export default {
  ConfigErrors,
  CaseErrors,
  ConflictErrors,
  DatabaseErrors,
  ServerErrors,
  createError,
};
