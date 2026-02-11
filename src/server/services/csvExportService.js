// CSV Export Service
// Generates CSV files from database tables for Excel/Numbers compatibility
// Supports Syncthing directory sync for business continuity

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";
import { query } from "../database.js";

// Export directory - configurable via env var
export const CSV_EXPORT_DIR =
  process.env.CSV_EXPORT_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/home/appuser/data/csv-export"
    : "./data/csv-export");

// UTF-8 BOM for Excel to detect encoding correctly
const UTF8_BOM = "\uFEFF";

// Sensitive config keys to exclude from export
const SENSITIVE_KEYS = ["smtp_password", "certificate_password"];

// Spanish column headers for each table
const TABLE_CONFIGS = {
  cases: {
    filename: "expedientes.csv",
    query: "SELECT * FROM cases ORDER BY id",
    headers: {
      id: "ID",
      type: "Tipo",
      client_name: "Nombre del Cliente",
      internal_reference: "Referencia Interna",
      arag_reference: "Referencia ARAG",
      designation: "Designacion",
      state: "Estado",
      language: "Idioma",
      entry_date: "Fecha de Entrada",
      judicial_date: "Fecha Judicial",
      judicial_district: "Partido Judicial",
      closure_date: "Fecha de Cierre",
      observations: "Observaciones",
      version: "Version",
      created_at: "Fecha de Creacion",
      updated_at: "Fecha de Actualizacion",
    },
  },
  document_history: {
    filename: "historial_documentos.csv",
    query: "SELECT * FROM document_history ORDER BY id",
    headers: {
      id: "ID",
      case_id: "ID Expediente",
      document_type: "Tipo de Documento",
      file_path: "Ruta del Archivo",
      generated_at: "Fecha de Generacion",
      signed: "Firmado",
      created_at: "Fecha de Creacion",
    },
  },
  email_history: {
    filename: "historial_emails.csv",
    query: "SELECT * FROM email_history ORDER BY id",
    headers: {
      id: "ID",
      case_id: "ID Expediente",
      document_id: "ID Documento",
      recipient: "Destinatario",
      subject: "Asunto",
      sent_at: "Fecha de Envio",
      status: "Estado",
      error_message: "Mensaje de Error",
      created_at: "Fecha de Creacion",
    },
  },
  configuration: {
    filename: "configuracion.csv",
    query: "SELECT * FROM configuration ORDER BY key",
    headers: {
      key: "Clave",
      value: "Valor",
      updated_at: "Fecha de Actualizacion",
    },
    filter: (row) => !SENSITIVE_KEYS.includes(row.key),
  },
  reference_counters: {
    filename: "contadores_referencia.csv",
    query: "SELECT * FROM reference_counters ORDER BY type",
    headers: {
      type: "Tipo",
      last_value: "Ultimo Valor",
      updated_at: "Fecha de Actualizacion",
    },
  },
};

export class CsvExportError extends Error {
  constructor(message, code = "CSV_EXPORT_ERROR") {
    super(message);
    this.name = "CsvExportError";
    this.code = code;
  }
}

/**
 * Ensure export directory exists
 */
function ensureExportDir() {
  if (!existsSync(CSV_EXPORT_DIR)) {
    mkdirSync(CSV_EXPORT_DIR, { recursive: true });
  }
}

/**
 * Format a single value for CSV output per RFC 4180
 * - Wraps in double quotes if value contains comma, quote, or newline
 * - Escapes double quotes by doubling them
 * - Handles null/undefined as empty string
 *
 * @param {*} value - Value to format
 * @returns {string} CSV-safe string
 */
export function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Check if quoting is needed
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Convert database rows to a CSV string with BOM and Spanish headers
 *
 * @param {Array<Object>} rows - Database rows
 * @param {Object} headers - Map of column_name -> Spanish header
 * @returns {string} Complete CSV string with BOM
 */
export function tableToCsv(rows, headers) {
  const columns = Object.keys(headers);
  const headerRow = columns.map((col) => formatCsvValue(headers[col]));

  const lines = [headerRow.join(",")];

  for (const row of rows) {
    const values = columns.map((col) => formatCsvValue(row[col]));
    lines.push(values.join(","));
  }

  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

/**
 * Export all tables to individual CSV files in the export directory
 *
 * @returns {Object} Summary with file details
 */
export function exportAllCsv() {
  ensureExportDir();

  const files = [];
  const errors = [];

  for (const [tableName, config] of Object.entries(TABLE_CONFIGS)) {
    try {
      let rows = query(config.query);

      // Apply row filter if defined (e.g., exclude sensitive config)
      if (config.filter) {
        rows = rows.filter(config.filter);
      }

      const csv = tableToCsv(rows, config.headers);
      const filePath = join(CSV_EXPORT_DIR, config.filename);
      writeFileSync(filePath, csv, "utf-8");

      const stats = statSync(filePath);
      files.push({
        table: tableName,
        filename: config.filename,
        rows: rows.length,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
      });
    } catch (error) {
      errors.push({ table: tableName, error: error.message });
    }
  }

  if (files.length === 0) {
    throw new CsvExportError(
      "No se pudo exportar ninguna tabla",
      "EXPORT_FAILED"
    );
  }

  return {
    exportedAt: new Date().toISOString(),
    exportDir: CSV_EXPORT_DIR,
    files,
    errors,
    totalFiles: files.length,
    totalRows: files.reduce((sum, f) => sum + f.rows, 0),
  };
}

/**
 * Get status of the CSV export directory
 *
 * @returns {Object} Status info
 */
export function getCsvExportStatus() {
  ensureExportDir();

  try {
    const csvFiles = readdirSync(CSV_EXPORT_DIR)
      .filter((f) => f.endsWith(".csv"))
      .map((filename) => {
        const fullPath = join(CSV_EXPORT_DIR, filename);
        const stats = statSync(fullPath);
        return {
          filename,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename));

    const zipFiles = readdirSync(CSV_EXPORT_DIR)
      .filter((f) => f.endsWith(".zip"))
      .map((filename) => {
        const fullPath = join(CSV_EXPORT_DIR, filename);
        const stats = statSync(fullPath);
        return {
          filename,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const lastExport = csvFiles.length > 0
      ? csvFiles.reduce((latest, f) =>
          new Date(f.modifiedAt) > new Date(latest.modifiedAt) ? f : latest
        ).modifiedAt
      : null;

    const totalCsvSize = csvFiles.reduce((sum, f) => sum + f.size, 0);

    return {
      lastExport,
      csvFiles,
      zipFiles,
      totalCsvFiles: csvFiles.length,
      totalCsvSize,
      totalCsvSizeFormatted: formatBytes(totalCsvSize),
      exportDir: CSV_EXPORT_DIR,
    };
  } catch (error) {
    throw new CsvExportError(
      `Error leyendo directorio de exportacion: ${error.message}`,
      "STATUS_ERROR"
    );
  }
}

/**
 * Generate fresh CSVs and create a ZIP file for download
 *
 * @returns {Object} ZIP file info
 */
export function createCsvZip() {
  // Generate fresh CSVs first
  const exportResult = exportAllCsv();

  // Build ZIP filename with timestamp
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const zipFilename = `recordplus-csv-${dateStr}-${timeStr}.zip`;
  const zipPath = join(CSV_EXPORT_DIR, zipFilename);

  // Clean up old ZIP files (keep only the latest)
  try {
    const oldZips = readdirSync(CSV_EXPORT_DIR).filter((f) => f.endsWith(".zip"));
    for (const oldZip of oldZips) {
      unlinkSync(join(CSV_EXPORT_DIR, oldZip));
    }
  } catch {
    // Ignore cleanup errors
  }

  try {
    // Get list of CSV files to include
    const csvFiles = readdirSync(CSV_EXPORT_DIR)
      .filter((f) => f.endsWith(".csv"))
      .map((f) => `"${f}"`)
      .join(" ");

    // Use zip -j to store files without directory structure
    // Since we cd into the dir, use just the filename for the zip output
    execSync(`cd "${CSV_EXPORT_DIR}" && zip -j "${zipFilename}" ${csvFiles}`, {
      stdio: "pipe",
    });

    const stats = statSync(zipPath);

    return {
      filename: zipFilename,
      path: zipPath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.mtime.toISOString(),
      csvExport: exportResult,
    };
  } catch (error) {
    throw new CsvExportError(
      `Error creando archivo ZIP: ${error.message}`,
      "ZIP_ERROR"
    );
  }
}

/**
 * Get the full path to a ZIP file (with security validation)
 *
 * @param {string} filename - ZIP filename
 * @returns {string} Full path
 */
export function getZipPath(filename) {
  // Only allow safe filenames
  const safePattern = /^recordplus-csv-\d{8}-\d{6}\.zip$/;
  if (!safePattern.test(filename)) {
    throw new CsvExportError(
      "Nombre de archivo no valido",
      "INVALID_FILENAME"
    );
  }

  const fullPath = resolve(join(CSV_EXPORT_DIR, filename));

  // Prevent path traversal
  if (!fullPath.startsWith(resolve(CSV_EXPORT_DIR))) {
    throw new CsvExportError(
      "Acceso no autorizado",
      "PATH_TRAVERSAL"
    );
  }

  return fullPath;
}

/**
 * List individual CSV files in the export directory
 *
 * @returns {Array} List of CSV file details
 */
export function listCsvFiles() {
  ensureExportDir();

  return readdirSync(CSV_EXPORT_DIR)
    .filter((f) => f.endsWith(".csv"))
    .map((filename) => {
      const fullPath = join(CSV_EXPORT_DIR, filename);
      const stats = statSync(fullPath);
      return {
        filename,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        modifiedAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default {
  formatCsvValue,
  tableToCsv,
  exportAllCsv,
  getCsvExportStatus,
  createCsvZip,
  getZipPath,
  listCsvFiles,
  CsvExportError,
  CSV_EXPORT_DIR,
};
