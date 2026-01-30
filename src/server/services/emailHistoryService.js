/**
 * Email History Service
 * Manages email sending records for cases
 */
import { execute, queryOne, query } from "../database.js";

export class EmailHistoryService {
  /**
   * Create email history record
   * @param {Object} data - Email data
   * @param {number} data.caseId - Case ID
   * @param {number|null} data.documentId - Related document ID
   * @param {string} data.recipient - Email recipient
   * @param {string} data.subject - Email subject
   * @param {string} data.status - 'SENT' | 'ERROR'
   * @param {string|null} data.errorMessage - Error details if failed
   * @returns {Object} Created record
   */
  create(data) {
    const result = execute(
      `INSERT INTO email_history (case_id, document_id, recipient, subject, sent_at, status, error_message)
       VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`,
      [
        data.caseId,
        data.documentId || null,
        data.recipient,
        data.subject,
        data.status,
        data.errorMessage || null,
      ],
    );
    return this.getById(result.lastInsertRowid);
  }

  /**
   * Get email by ID
   * @param {number} id - Email ID
   * @returns {Object|null}
   */
  getById(id) {
    return queryOne("SELECT * FROM email_history WHERE id = ?", [id]);
  }

  /**
   * Get emails for a case, ordered by date descending
   * @param {number} caseId - Case ID
   * @returns {Array}
   */
  getByCaseId(caseId) {
    return query(
      "SELECT * FROM email_history WHERE case_id = ? ORDER BY sent_at DESC",
      [caseId],
    );
  }

  /**
   * Get emails by status for a case
   * @param {number} caseId - Case ID
   * @param {string} status - 'SENT' | 'ERROR'
   * @returns {Array}
   */
  getByCaseIdAndStatus(caseId, status) {
    return query(
      "SELECT * FROM email_history WHERE case_id = ? AND status = ? ORDER BY sent_at DESC",
      [caseId, status],
    );
  }

  /**
   * Get count of emails for a case
   * @param {number} caseId - Case ID
   * @returns {number}
   */
  getCountByCaseId(caseId) {
    const result = queryOne(
      "SELECT COUNT(*) as count FROM email_history WHERE case_id = ?",
      [caseId],
    );
    return result?.count || 0;
  }

  /**
   * Get failed emails for retry
   * @param {number} caseId - Case ID
   * @returns {Array}
   */
  getFailedByCaseId(caseId) {
    return query(
      "SELECT * FROM email_history WHERE case_id = ? AND status = ? ORDER BY sent_at DESC",
      [caseId, "ERROR"],
    );
  }
}
