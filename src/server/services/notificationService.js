// Notification Service
// Computes live notifications from existing data (no dedicated table)

import { query } from "../database.js";
import { get as getConfigValue } from "./configurationService.js";
import { getStatus as getBackupStatus } from "./backupService.js";
import { execSync } from "child_process";
import { existsSync } from "fs";

/**
 * Get all notifications aggregated from existing data
 * @returns {Object} { notifications: Array, totalCount: number, criticalCount: number }
 */
export function getNotifications() {
  const notifications = [];

  // Run all notification checks
  checkFailedEmails(notifications);
  checkMissingMinutas(notifications);
  checkMissingSuplidos(notifications);
  checkMissingHojasEncargo(notifications);
  checkCertificateExpiry(notifications);
  checkStaleCases(notifications);
  checkBackupStatus(notifications);

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  notifications.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  const criticalCount = notifications.filter(
    (n) => n.severity === "critical"
  ).length;

  return {
    notifications,
    totalCount: notifications.length,
    criticalCount,
  };
}

/**
 * Check for failed emails on non-archived cases
 */
function checkFailedEmails(notifications) {
  const rows = query(`
    SELECT eh.id, eh.case_id, eh.recipient, eh.error_message, eh.sent_at,
           c.client_name, c.internal_reference, c.type
    FROM email_history eh
    JOIN cases c ON c.id = eh.case_id
    WHERE eh.status = 'ERROR'
      AND c.state != 'ARCHIVADO'
    ORDER BY eh.sent_at DESC
  `);

  if (rows.length > 0) {
    const caseIds = [...new Set(rows.map((r) => r.case_id))];
    notifications.push({
      type: "failed_emails",
      severity: "critical",
      message:
        rows.length === 1
          ? "1 email fallido pendiente de reenvío"
          : `${rows.length} emails fallidos pendientes de reenvío`,
      count: rows.length,
      caseIds,
      items: rows.slice(0, 5).map((r) => ({
        caseId: r.case_id,
        clientName: r.client_name,
        reference: r.internal_reference,
        caseType: r.type,
        error: r.error_message,
        date: r.sent_at,
      })),
      timestamp: rows[0].sent_at,
    });
  }
}

/**
 * Check for ARAG cases (non-archived) without a minuta document
 */
function checkMissingMinutas(notifications) {
  const rows = query(`
    SELECT c.id, c.client_name, c.internal_reference, c.entry_date
    FROM cases c
    LEFT JOIN document_history dh ON dh.case_id = c.id AND dh.document_type = 'MINUTA'
    WHERE c.type = 'ARAG'
      AND c.state != 'ARCHIVADO'
      AND dh.id IS NULL
    ORDER BY c.entry_date ASC
  `);

  if (rows.length > 0) {
    notifications.push({
      type: "missing_minuta",
      severity: "warning",
      message:
        rows.length === 1
          ? "1 expediente ARAG sin minuta"
          : `${rows.length} expedientes ARAG sin minuta`,
      count: rows.length,
      caseIds: rows.map((r) => r.id),
      items: rows.slice(0, 5).map((r) => ({
        caseId: r.id,
        clientName: r.client_name,
        reference: r.internal_reference,
        entryDate: r.entry_date,
      })),
      timestamp: rows[0].entry_date,
    });
  }
}

/**
 * Check for ARAG judicial cases without a suplido document
 */
function checkMissingSuplidos(notifications) {
  const rows = query(`
    SELECT c.id, c.client_name, c.internal_reference, c.judicial_date
    FROM cases c
    LEFT JOIN document_history dh ON dh.case_id = c.id AND dh.document_type = 'SUPLIDO'
    WHERE c.type = 'ARAG'
      AND c.state = 'JUDICIAL'
      AND dh.id IS NULL
    ORDER BY c.judicial_date ASC
  `);

  if (rows.length > 0) {
    notifications.push({
      type: "missing_suplido",
      severity: "warning",
      message:
        rows.length === 1
          ? "1 expediente judicial sin suplido"
          : `${rows.length} expedientes judiciales sin suplido`,
      count: rows.length,
      caseIds: rows.map((r) => r.id),
      items: rows.slice(0, 5).map((r) => ({
        caseId: r.id,
        clientName: r.client_name,
        reference: r.internal_reference,
        judicialDate: r.judicial_date,
      })),
      timestamp: rows[0].judicial_date,
    });
  }
}

/**
 * Check for Particular cases without a Hoja de Encargo document
 */
function checkMissingHojasEncargo(notifications) {
  const rows = query(`
    SELECT c.id, c.client_name, c.internal_reference, c.entry_date
    FROM cases c
    LEFT JOIN document_history dh ON dh.case_id = c.id AND dh.document_type = 'HOJA_ENCARGO'
    WHERE c.type = 'PARTICULAR'
      AND c.state != 'ARCHIVADO'
      AND dh.id IS NULL
    ORDER BY c.entry_date ASC
  `);

  if (rows.length > 0) {
    notifications.push({
      type: "missing_hoja",
      severity: "warning",
      message:
        rows.length === 1
          ? "1 expediente sin Hoja de Encargo"
          : `${rows.length} expedientes sin Hoja de Encargo`,
      count: rows.length,
      caseIds: rows.map((r) => r.id),
      items: rows.slice(0, 5).map((r) => ({
        caseId: r.id,
        clientName: r.client_name,
        reference: r.internal_reference,
        entryDate: r.entry_date,
      })),
      timestamp: rows[0].entry_date,
    });
  }
}

/**
 * Check certificate expiry (if configured)
 */
function checkCertificateExpiry(notifications) {
  try {
    const certPath = getConfigValue("certificate_path");
    const certPassword = getConfigValue("certificate_password");

    if (!certPath || !certPassword || !existsSync(certPath)) {
      return;
    }

    // Extract certificate expiry using openssl
    const expiryStr = execSync(
      `openssl pkcs12 -in "${certPath}" -passin pass:"${certPassword}" -nokeys -clcerts 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2`,
      { encoding: "utf8", timeout: 5000 }
    ).trim();

    if (!expiryStr) return;

    const expiryDate = new Date(expiryStr);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate - now) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0) {
      notifications.push({
        type: "certificate_expiry",
        severity: "critical",
        message: "El certificado digital ha expirado",
        count: 1,
        caseIds: [],
        items: [],
        timestamp: now.toISOString(),
      });
    } else if (daysUntilExpiry <= 30) {
      notifications.push({
        type: "certificate_expiry",
        severity: daysUntilExpiry <= 7 ? "critical" : "warning",
        message: `Certificado expira en ${daysUntilExpiry} día${daysUntilExpiry !== 1 ? "s" : ""}`,
        count: 1,
        caseIds: [],
        items: [],
        timestamp: expiryDate.toISOString(),
      });
    }
  } catch {
    // Certificate check failed silently — not critical
  }
}

/**
 * Check for cases with no activity in 30+ days
 */
function checkStaleCases(notifications) {
  const rows = query(`
    SELECT c.id, c.client_name, c.internal_reference, c.type, c.updated_at,
           julianday('now') - julianday(c.updated_at) as days_inactive
    FROM cases c
    WHERE c.state IN ('ABIERTO', 'JUDICIAL')
      AND julianday('now') - julianday(c.updated_at) > 30
    ORDER BY c.updated_at ASC
  `);

  if (rows.length > 0) {
    notifications.push({
      type: "stale_cases",
      severity: "info",
      message:
        rows.length === 1
          ? "1 expediente sin actividad en 30+ días"
          : `${rows.length} expedientes sin actividad en 30+ días`,
      count: rows.length,
      caseIds: rows.map((r) => r.id),
      items: rows.slice(0, 5).map((r) => ({
        caseId: r.id,
        clientName: r.client_name,
        reference: r.internal_reference,
        caseType: r.type,
        daysInactive: Math.floor(r.days_inactive),
      })),
      timestamp: rows[0].updated_at,
    });
  }
}

/**
 * Check backup status (last backup > 7 days ago)
 */
function checkBackupStatus(notifications) {
  try {
    const status = getBackupStatus();

    if (!status.lastBackup) {
      notifications.push({
        type: "backup_stale",
        severity: "warning",
        message: "No hay backups registrados",
        count: 1,
        caseIds: [],
        items: [],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const lastBackupDate = new Date(status.lastBackup.createdAt);
    const now = new Date();
    const daysSinceBackup = Math.floor(
      (now - lastBackupDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBackup > 7) {
      notifications.push({
        type: "backup_stale",
        severity: "warning",
        message: `Último backup hace ${daysSinceBackup} días`,
        count: 1,
        caseIds: [],
        items: [],
        timestamp: lastBackupDate.toISOString(),
      });
    }
  } catch {
    // Backup check failed silently
  }
}

export default {
  getNotifications,
};
