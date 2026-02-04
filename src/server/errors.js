// Custom error classes for Record+
// Task 2.1 - Requirements: 9.1, 9.2, 9.3

/**
 * Base application error with structured response format
 * All custom errors extend this class
 */
export class AppError extends Error {
  /**
   * @param {string} code - Error code (e.g., 'CONFIG_VALIDATION_ERROR')
   * @param {string} message - User-facing message in Spanish
   * @param {number} statusCode - HTTP status code
   * @param {string} [field] - Field that caused the error (for validation errors)
   * @param {Object} [details] - Additional error details
   */
  constructor(code, message, statusCode, field = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   * @returns {Object} Structured error response
   */
  toJSON() {
    const response = {
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.field) {
      response.error.field = this.field;
    }

    if (this.details) {
      response.error.details = this.details;
    }

    return response;
  }
}

/**
 * Validation error (400 Bad Request)
 * Use for invalid input data
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - User-facing message
   * @param {string} [field] - Field that failed validation
   * @param {Object} [details] - Validation details (expected format, etc.)
   */
  constructor(message, field = null, details = null) {
    super("VALIDATION_ERROR", message, 400, field, details);
  }
}

/**
 * Not found error (404)
 * Use when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} message - User-facing message
   * @param {string} [field] - Resource identifier field
   */
  constructor(message, field = null) {
    super("NOT_FOUND", message, 404, field);
  }
}

/**
 * Conflict error (409)
 * Use for duplicate resources, version conflicts, concurrent modifications
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - User-facing message
   * @param {string} [field] - Field causing the conflict
   * @param {Object} [details] - Conflict details (current version, etc.)
   */
  constructor(message, field = null, details = null) {
    super("CONFLICT_ERROR", message, 409, field, details);
  }
}

/**
 * Database error (500)
 * Use for database connection issues, query failures, integrity errors
 */
export class DatabaseError extends AppError {
  /**
   * @param {string} message - User-facing message (simplified)
   * @param {Object} [details] - Technical details (logged server-side only)
   */
  constructor(message, details = null) {
    super("DATABASE_ERROR", message, 500, null, details);
  }
}

/**
 * Authentication error (401)
 * Use when authentication is required but not provided
 */
export class AuthenticationError extends AppError {
  /**
   * @param {string} message - User-facing message
   */
  constructor(message = "Autenticación requerida. Por favor, inicie sesión.") {
    super("AUTHENTICATION_ERROR", message, 401);
  }
}

/**
 * Authorization error (403)
 * Use when user lacks permission for an action
 */
export class AuthorizationError extends AppError {
  /**
   * @param {string} message - User-facing message
   */
  constructor(message = "No tiene permisos para realizar esta acción.") {
    super("AUTHORIZATION_ERROR", message, 403);
  }
}

export default {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
};
