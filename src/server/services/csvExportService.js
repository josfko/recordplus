// CSV Export Service
// Exports expedientes (cases) table as a single CSV file
// Writes to disk for Syncthing sync + serves directly for download

import { existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import { query } from "../database.js";

// Export directory for Syncthing sync
export const CSV_EXPORT_DIR =
  process.env.CSV_EXPORT_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/home/appuser/data/csv-export"
    : "./data/csv-export");

// UTF-8 BOM for Excel to detect encoding correctly
const UTF8_BOM = "\uFEFF";

// Spanish column headers for the cases table
const EXPEDIENTES_HEADERS = {
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
};

export class CsvExportError extends Error {
  constructor(message, code = "CSV_EXPORT_ERROR") {
    super(message);
    this.name = "CsvExportError";
    this.code = code;
  }
}

/**
 * Format a single value for CSV output per RFC 4180
 * @param {*} value - Value to format
 * @returns {string} CSV-safe string
 */
export function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Convert database rows to a CSV string with BOM and Spanish headers
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
 * Generate expedientes CSV content and write to Syncthing directory
 * @returns {{ csv: string, rows: number, exportedAt: string }}
 */
export function generateExpedientesCsv() {
  const rows = query("SELECT * FROM cases ORDER BY id");
  const csv = tableToCsv(rows, EXPEDIENTES_HEADERS);

  // Write to disk for Syncthing sync
  if (!existsSync(CSV_EXPORT_DIR)) {
    mkdirSync(CSV_EXPORT_DIR, { recursive: true });
  }
  const filePath = join(CSV_EXPORT_DIR, "expedientes.csv");
  writeFileSync(filePath, csv, "utf-8");

  return {
    csv,
    rows: rows.length,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Get the expedientes CSV from disk (if it exists) for download
 * @returns {{ filePath: string, exists: boolean }}
 */
export function getExpedientesCsvPath() {
  const filePath = join(CSV_EXPORT_DIR, "expedientes.csv");
  return {
    filePath,
    exists: existsSync(filePath),
  };
}

export default {
  formatCsvValue,
  tableToCsv,
  generateExpedientesCsv,
  getExpedientesCsvPath,
  CsvExportError,
  CSV_EXPORT_DIR,
};
