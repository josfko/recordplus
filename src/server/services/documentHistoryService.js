/**
 * Document History Service
 * Manages document generation records for cases
 */
import { execute, queryOne, query } from "../database.js";

export class DocumentHistoryService {
  /**
   * Create document history record
   * @param {Object} data - Document data
   * @param {number} data.caseId - Case ID
   * @param {string} data.documentType - 'MINUTA' | 'SUPLIDO'
   * @param {string} data.filePath - Path to PDF file
   * @param {boolean|number} data.signed - Whether document is signed
   * @returns {Object} Created record
   */
  create(data) {
    const result = execute(
      `INSERT INTO document_history (case_id, document_type, file_path, generated_at, signed)
       VALUES (?, ?, ?, datetime('now'), ?)`,
      [data.caseId, data.documentType, data.filePath, data.signed ? 1 : 0],
    );
    return this.getById(result.lastInsertRowid);
  }

  /**
   * Get document by ID
   * @param {number} id - Document ID
   * @returns {Object|null}
   */
  getById(id) {
    return queryOne("SELECT * FROM document_history WHERE id = ?", [id]);
  }

  /**
   * Get documents for a case, ordered by date descending
   * @param {number} caseId - Case ID
   * @returns {Array}
   */
  getByCaseId(caseId) {
    return query(
      "SELECT * FROM document_history WHERE case_id = ? ORDER BY generated_at DESC",
      [caseId],
    );
  }

  /**
   * Update signed status
   * @param {number} id - Document ID
   * @param {boolean} signed - Signed status
   */
  updateSigned(id, signed) {
    execute("UPDATE document_history SET signed = ? WHERE id = ?", [
      signed ? 1 : 0,
      id,
    ]);
  }

  /**
   * Update file path (used after signing to point to signed file)
   * @param {number} id - Document ID
   * @param {string} filePath - New file path
   */
  updateFilePath(id, filePath) {
    execute("UPDATE document_history SET file_path = ? WHERE id = ?", [
      filePath,
      id,
    ]);
  }

  /**
   * Get count of documents for a case
   * @param {number} caseId - Case ID
   * @returns {number}
   */
  getCountByCaseId(caseId) {
    const result = queryOne(
      "SELECT COUNT(*) as count FROM document_history WHERE case_id = ?",
      [caseId],
    );
    return result?.count || 0;
  }

  /**
   * Delete a document record and optionally its file
   * @param {number} id - Document ID
   * @param {boolean} deleteFile - Whether to delete the physical file
   * @returns {boolean} True if deleted
   */
  delete(id, deleteFile = true) {
    const doc = this.getById(id);
    if (!doc) return false;

    // Delete the physical file if requested and it exists
    if (deleteFile && doc.file_path) {
      try {
        const fs = require("fs");
        if (fs.existsSync(doc.file_path)) {
          fs.unlinkSync(doc.file_path);
        }
      } catch (err) {
        console.error(`Error deleting file ${doc.file_path}:`, err);
        // Continue with database deletion even if file deletion fails
      }
    }

    const result = execute("DELETE FROM document_history WHERE id = ?", [id]);
    return result.changes > 0;
  }

  /**
   * Get documents by type for a case
   * @param {number} caseId - Case ID
   * @param {string} documentType - 'MINUTA' | 'SUPLIDO'
   * @returns {Array}
   */
  getByCaseIdAndType(caseId, documentType) {
    return query(
      "SELECT * FROM document_history WHERE case_id = ? AND document_type = ? ORDER BY generated_at DESC",
      [caseId, documentType],
    );
  }
}
