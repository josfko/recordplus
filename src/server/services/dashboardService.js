// Dashboard Service
// Task 4.2 - Requirements: 9.1-9.6

import { query, queryOne } from "../database.js";
import { CASE_TYPES, CASE_STATES } from "./caseService.js";

/**
 * Get dashboard metrics for the current month
 * @param {number} month - Month (1-12), defaults to current month
 * @param {number} year - Year, defaults to current year
 * @returns {Object} Dashboard metrics
 */
export function getDashboardMetrics(month = null, year = null) {
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  // Format month for SQL comparison (YYYY-MM)
  const monthStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  // Count entries this month by type
  const entriesThisMonth = getEntriesByType(monthStr);

  // Count archived this month by type
  const archivedThisMonth = getArchivedByType(monthStr);

  // Count pending (open) cases by type
  const pending = getPendingByType();

  return {
    month: targetMonth,
    year: targetYear,
    entriesThisMonth,
    archivedThisMonth,
    pending,
  };
}

/**
 * Get count of cases entered in a specific month by type
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {Object} Counts by type and total
 */
function getEntriesByType(monthStr) {
  const rows = query(
    `SELECT type, COUNT(*) as count 
     FROM cases 
     WHERE strftime('%Y-%m', entry_date) = ?
     GROUP BY type`,
    [monthStr]
  );

  const result = {
    total: 0,
    [CASE_TYPES.ARAG]: 0,
    [CASE_TYPES.PARTICULAR]: 0,
    [CASE_TYPES.TURNO_OFICIO]: 0,
  };

  for (const row of rows) {
    result[row.type] = row.count;
    result.total += row.count;
  }

  return result;
}

/**
 * Get count of cases archived in a specific month by type
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {Object} Counts by type and total
 */
function getArchivedByType(monthStr) {
  const rows = query(
    `SELECT type, COUNT(*) as count 
     FROM cases 
     WHERE state = ? AND strftime('%Y-%m', closure_date) = ?
     GROUP BY type`,
    [CASE_STATES.ARCHIVADO, monthStr]
  );

  const result = {
    total: 0,
    [CASE_TYPES.ARAG]: 0,
    [CASE_TYPES.PARTICULAR]: 0,
    [CASE_TYPES.TURNO_OFICIO]: 0,
  };

  for (const row of rows) {
    result[row.type] = row.count;
    result.total += row.count;
  }

  return result;
}

/**
 * Get count of pending (open) cases by type
 * @returns {Object} Counts by type and total
 */
function getPendingByType() {
  // Pending = ABIERTO or JUDICIAL (not archived)
  const rows = query(
    `SELECT type, COUNT(*) as count 
     FROM cases 
     WHERE state IN (?, ?)
     GROUP BY type`,
    [CASE_STATES.ABIERTO, CASE_STATES.JUDICIAL]
  );

  const result = {
    total: 0,
    [CASE_TYPES.ARAG]: 0,
    [CASE_TYPES.PARTICULAR]: 0,
    [CASE_TYPES.TURNO_OFICIO]: 0,
  };

  for (const row of rows) {
    result[row.type] = row.count;
    result.total += row.count;
  }

  return result;
}

export default {
  getDashboardMetrics,
};
