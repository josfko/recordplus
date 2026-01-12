// Export/Import Service
// Task 4.6 - Requirements: 8.4, 8.5

import { query, execute, transaction, getDatabase } from "../database.js";

/**
 * Export error class
 */
export class ExportError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExportError";
    this.code = "EXPORT_ERROR";
  }
}

/**
 * Import error class
 */
export class ImportError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ImportError";
    this.field = field;
    this.code = "IMPORT_ERROR";
  }
}

/**
 * Export all data as JSON
 * @returns {Object} All database data
 */
export function exportData() {
  try {
    const cases = query("SELECT * FROM cases ORDER BY id");
    const documentHistory = query("SELECT * FROM document_history ORDER BY id");
    const emailHistory = query("SELECT * FROM email_history ORDER BY id");
    const configuration = query("SELECT * FROM configuration ORDER BY key");
    const referenceCounters = query(
      "SELECT * FROM reference_counters ORDER BY type"
    );

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        cases,
        documentHistory,
        emailHistory,
        configuration,
        referenceCounters,
      },
    };
  } catch (error) {
    throw new ExportError(`Error al exportar datos: ${error.message}`);
  }
}

/**
 * Import data from JSON
 * @param {Object} importData - Data to import
 * @param {Object} options - Import options
 * @param {boolean} options.clearExisting - Clear existing data before import
 * @returns {Object} Import summary
 */
export function importData(importData, options = {}) {
  const { clearExisting = false } = options;

  // Validate import data structure
  if (!importData || typeof importData !== "object") {
    throw new ImportError("Datos de importación inválidos");
  }

  if (!importData.data) {
    throw new ImportError(
      "Estructura de datos de importación inválida: falta 'data'"
    );
  }

  const {
    cases,
    documentHistory,
    emailHistory,
    configuration,
    referenceCounters,
  } = importData.data;

  const db = getDatabase();
  const summary = {
    cases: { imported: 0, skipped: 0 },
    documentHistory: { imported: 0, skipped: 0 },
    emailHistory: { imported: 0, skipped: 0 },
    configuration: { imported: 0, skipped: 0 },
    referenceCounters: { imported: 0, skipped: 0 },
  };

  try {
    db.transaction(() => {
      // Clear existing data if requested
      if (clearExisting) {
        execute("DELETE FROM email_history");
        execute("DELETE FROM document_history");
        execute("DELETE FROM cases");
        execute("DELETE FROM configuration");
        execute("DELETE FROM reference_counters");
      }

      // Import cases
      if (Array.isArray(cases)) {
        for (const row of cases) {
          try {
            if (clearExisting) {
              execute(
                `INSERT INTO cases (id, type, client_name, internal_reference, arag_reference, 
                 designation, state, entry_date, judicial_date, judicial_district, 
                 closure_date, observations, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  row.id,
                  row.type,
                  row.client_name,
                  row.internal_reference,
                  row.arag_reference,
                  row.designation,
                  row.state,
                  row.entry_date,
                  row.judicial_date,
                  row.judicial_district,
                  row.closure_date,
                  row.observations,
                  row.created_at,
                  row.updated_at,
                ]
              );
              summary.cases.imported++;
            } else {
              // Check if case exists
              const existing = db
                .prepare("SELECT id FROM cases WHERE id = ?")
                .get(row.id);
              if (!existing) {
                execute(
                  `INSERT INTO cases (id, type, client_name, internal_reference, arag_reference, 
                   designation, state, entry_date, judicial_date, judicial_district, 
                   closure_date, observations, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    row.id,
                    row.type,
                    row.client_name,
                    row.internal_reference,
                    row.arag_reference,
                    row.designation,
                    row.state,
                    row.entry_date,
                    row.judicial_date,
                    row.judicial_district,
                    row.closure_date,
                    row.observations,
                    row.created_at,
                    row.updated_at,
                  ]
                );
                summary.cases.imported++;
              } else {
                summary.cases.skipped++;
              }
            }
          } catch (e) {
            summary.cases.skipped++;
          }
        }
      }

      // Import document history
      if (Array.isArray(documentHistory)) {
        for (const row of documentHistory) {
          try {
            if (clearExisting) {
              execute(
                `INSERT INTO document_history (id, case_id, document_type, file_path, 
                 generated_at, signed, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  row.id,
                  row.case_id,
                  row.document_type,
                  row.file_path,
                  row.generated_at,
                  row.signed,
                  row.created_at,
                ]
              );
              summary.documentHistory.imported++;
            } else {
              const existing = db
                .prepare("SELECT id FROM document_history WHERE id = ?")
                .get(row.id);
              if (!existing) {
                execute(
                  `INSERT INTO document_history (id, case_id, document_type, file_path, 
                   generated_at, signed, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    row.id,
                    row.case_id,
                    row.document_type,
                    row.file_path,
                    row.generated_at,
                    row.signed,
                    row.created_at,
                  ]
                );
                summary.documentHistory.imported++;
              } else {
                summary.documentHistory.skipped++;
              }
            }
          } catch (e) {
            summary.documentHistory.skipped++;
          }
        }
      }

      // Import email history
      if (Array.isArray(emailHistory)) {
        for (const row of emailHistory) {
          try {
            if (clearExisting) {
              execute(
                `INSERT INTO email_history (id, case_id, document_id, recipient, 
                 subject, sent_at, status, error_message, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  row.id,
                  row.case_id,
                  row.document_id,
                  row.recipient,
                  row.subject,
                  row.sent_at,
                  row.status,
                  row.error_message,
                  row.created_at,
                ]
              );
              summary.emailHistory.imported++;
            } else {
              const existing = db
                .prepare("SELECT id FROM email_history WHERE id = ?")
                .get(row.id);
              if (!existing) {
                execute(
                  `INSERT INTO email_history (id, case_id, document_id, recipient, 
                   subject, sent_at, status, error_message, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    row.id,
                    row.case_id,
                    row.document_id,
                    row.recipient,
                    row.subject,
                    row.sent_at,
                    row.status,
                    row.error_message,
                    row.created_at,
                  ]
                );
                summary.emailHistory.imported++;
              } else {
                summary.emailHistory.skipped++;
              }
            }
          } catch (e) {
            summary.emailHistory.skipped++;
          }
        }
      }

      // Import configuration
      if (Array.isArray(configuration)) {
        for (const row of configuration) {
          try {
            if (clearExisting) {
              execute(
                `INSERT INTO configuration (key, value, updated_at) VALUES (?, ?, ?)`,
                [row.key, row.value, row.updated_at]
              );
              summary.configuration.imported++;
            } else {
              const existing = db
                .prepare("SELECT key FROM configuration WHERE key = ?")
                .get(row.key);
              if (!existing) {
                execute(
                  `INSERT INTO configuration (key, value, updated_at) VALUES (?, ?, ?)`,
                  [row.key, row.value, row.updated_at]
                );
                summary.configuration.imported++;
              } else {
                summary.configuration.skipped++;
              }
            }
          } catch (e) {
            summary.configuration.skipped++;
          }
        }
      }

      // Import reference counters
      if (Array.isArray(referenceCounters)) {
        for (const row of referenceCounters) {
          try {
            if (clearExisting) {
              execute(
                `INSERT INTO reference_counters (type, last_value, updated_at) VALUES (?, ?, ?)`,
                [row.type, row.last_value, row.updated_at]
              );
              summary.referenceCounters.imported++;
            } else {
              const existing = db
                .prepare("SELECT type FROM reference_counters WHERE type = ?")
                .get(row.type);
              if (!existing) {
                execute(
                  `INSERT INTO reference_counters (type, last_value, updated_at) VALUES (?, ?, ?)`,
                  [row.type, row.last_value, row.updated_at]
                );
                summary.referenceCounters.imported++;
              } else {
                // Update counter if imported value is higher
                const current = db
                  .prepare(
                    "SELECT last_value FROM reference_counters WHERE type = ?"
                  )
                  .get(row.type);
                if (row.last_value > current.last_value) {
                  execute(
                    `UPDATE reference_counters SET last_value = ?, updated_at = ? WHERE type = ?`,
                    [row.last_value, row.updated_at, row.type]
                  );
                  summary.referenceCounters.imported++;
                } else {
                  summary.referenceCounters.skipped++;
                }
              }
            }
          } catch (e) {
            summary.referenceCounters.skipped++;
          }
        }
      }
    })();

    return {
      success: true,
      importedAt: new Date().toISOString(),
      summary,
    };
  } catch (error) {
    throw new ImportError(`Error al importar datos: ${error.message}`);
  }
}

export default {
  exportData,
  importData,
  ExportError,
  ImportError,
};
