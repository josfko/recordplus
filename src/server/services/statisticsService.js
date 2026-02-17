// Statistics Service
// Provides year-level case statistics, monthly breakdowns, and year-over-year comparisons

import { query } from "../database.js";
import { CASE_TYPES, CASE_STATES } from "./caseService.js";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/**
 * Get full statistics for a given year with optional case type filter
 * @param {number} year - Year to query
 * @param {string} typeFilter - "ALL", "ARAG", "PARTICULAR", or "TURNO_OFICIO"
 * @returns {Object} Complete statistics payload
 */
export function getStatistics(year, typeFilter = "ALL") {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const kpis = getKpis(year, typeFilter, currentMonth, currentYear);
  const monthly = getMonthlyBreakdown(year, typeFilter, currentMonth, currentYear);
  const distribution = getDistribution(year);
  const yearOverYear = getYearOverYear(year, typeFilter);
  const availableYears = getAvailableYears();

  return {
    year,
    filter: typeFilter,
    kpis,
    monthly,
    distribution,
    yearOverYear,
    availableYears,
  };
}

/**
 * KPI cards data: new this month, archived this month, pending, monthly average
 */
function getKpis(year, typeFilter, currentMonth, currentYear) {
  const isCurrentYear = year === currentYear;
  const targetMonth = isCurrentYear ? currentMonth : 12;
  const monthStr = `${year}-${String(targetMonth).padStart(2, "0")}`;

  // Previous month for trend comparison
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? year - 1 : year;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const typeClause = typeFilter !== "ALL" ? "AND type = ?" : "";
  const typeParams = typeFilter !== "ALL" ? [typeFilter] : [];

  // New cases this month
  const newThisMonth = countByMonth(monthStr, "entry_date", typeClause, typeParams);
  const newPrevMonth = countByMonth(prevMonthStr, "entry_date", typeClause, typeParams);
  const newChange = calcChange(newThisMonth, newPrevMonth);

  // Archived this month
  const archivedThisMonth = countArchivedByMonth(monthStr, typeClause, typeParams);
  const archivedPrevMonth = countArchivedByMonth(prevMonthStr, typeClause, typeParams);
  const archivedChange = calcChange(archivedThisMonth, archivedPrevMonth);

  // Pending (open cases)
  const pendingRow = query(
    `SELECT COUNT(*) as count FROM cases WHERE state IN (?, ?) ${typeClause}`,
    [CASE_STATES.ABIERTO, CASE_STATES.JUDICIAL, ...typeParams]
  );
  const pending = pendingRow[0]?.count || 0;

  // Monthly average for the year (total entries / months elapsed)
  const monthsElapsed = isCurrentYear ? currentMonth : 12;
  const yearStr = String(year);
  const totalEntries = query(
    `SELECT COUNT(*) as count FROM cases WHERE strftime('%Y', entry_date) = ? ${typeClause}`,
    [yearStr, ...typeParams]
  );
  const total = totalEntries[0]?.count || 0;
  const monthlyAverage = monthsElapsed > 0 ? Math.round((total / monthsElapsed) * 10) / 10 : 0;

  return {
    newThisMonth: { count: newThisMonth, previousMonth: newPrevMonth, changePercent: newChange },
    archivedThisMonth: { count: archivedThisMonth, previousMonth: archivedPrevMonth, changePercent: archivedChange },
    pending: { count: pending },
    monthlyAverage: { count: monthlyAverage },
  };
}

function countByMonth(monthStr, dateField, typeClause, typeParams) {
  const row = query(
    `SELECT COUNT(*) as count FROM cases WHERE strftime('%Y-%m', ${dateField}) = ? ${typeClause}`,
    [monthStr, ...typeParams]
  );
  return row[0]?.count || 0;
}

function countArchivedByMonth(monthStr, typeClause, typeParams) {
  const row = query(
    `SELECT COUNT(*) as count FROM cases WHERE state = ? AND strftime('%Y-%m', closure_date) = ? ${typeClause}`,
    [CASE_STATES.ARCHIVADO, monthStr, ...typeParams]
  );
  return row[0]?.count || 0;
}

function calcChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Monthly breakdown: cases entered per month, split by case type (for stacked bars)
 */
function getMonthlyBreakdown(year, typeFilter, currentMonth, currentYear) {
  const yearStr = String(year);
  const isCurrentYear = year === currentYear;

  const rows = query(
    `SELECT
       CAST(strftime('%m', entry_date) AS INTEGER) as month,
       type,
       COUNT(*) as count
     FROM cases
     WHERE strftime('%Y', entry_date) = ?
     GROUP BY month, type
     ORDER BY month`,
    [yearStr]
  );

  // Build a map: month -> { arag, particular, turno }
  const monthMap = {};
  for (let m = 1; m <= 12; m++) {
    monthMap[m] = { arag: 0, particular: 0, turno: 0 };
  }

  for (const row of rows) {
    const bucket = monthMap[row.month];
    if (!bucket) continue;
    if (row.type === CASE_TYPES.ARAG) bucket.arag = row.count;
    else if (row.type === CASE_TYPES.PARTICULAR) bucket.particular = row.count;
    else if (row.type === CASE_TYPES.TURNO_OFICIO) bucket.turno = row.count;
  }

  const result = [];
  for (let m = 1; m <= 12; m++) {
    const d = monthMap[m];
    let total;
    if (typeFilter === CASE_TYPES.ARAG) total = d.arag;
    else if (typeFilter === CASE_TYPES.PARTICULAR) total = d.particular;
    else if (typeFilter === CASE_TYPES.TURNO_OFICIO) total = d.turno;
    else total = d.arag + d.particular + d.turno;

    result.push({
      month: m,
      label: MONTH_LABELS[m - 1],
      arag: d.arag,
      particular: d.particular,
      turno: d.turno,
      total,
      current: isCurrentYear && m === currentMonth,
    });
  }

  return result;
}

/**
 * Distribution: percentage of cases by type for the given year
 */
function getDistribution(year) {
  const yearStr = String(year);
  const rows = query(
    `SELECT type, COUNT(*) as count
     FROM cases
     WHERE strftime('%Y', entry_date) = ?
     GROUP BY type`,
    [yearStr]
  );

  let total = 0;
  const counts = {
    [CASE_TYPES.ARAG]: 0,
    [CASE_TYPES.PARTICULAR]: 0,
    [CASE_TYPES.TURNO_OFICIO]: 0,
  };

  for (const row of rows) {
    counts[row.type] = row.count;
    total += row.count;
  }

  const pct = (c) => (total > 0 ? Math.round((c / total) * 1000) / 10 : 0);

  return {
    arag: { count: counts[CASE_TYPES.ARAG], percent: pct(counts[CASE_TYPES.ARAG]) },
    particular: { count: counts[CASE_TYPES.PARTICULAR], percent: pct(counts[CASE_TYPES.PARTICULAR]) },
    turno: { count: counts[CASE_TYPES.TURNO_OFICIO], percent: pct(counts[CASE_TYPES.TURNO_OFICIO]) },
    total,
  };
}

/**
 * Year-over-year: monthly totals for current year and up to 2 previous years
 */
function getYearOverYear(year, typeFilter) {
  const result = {};
  const typeClause = typeFilter !== "ALL" ? "AND type = ?" : "";
  const typeParams = typeFilter !== "ALL" ? [typeFilter] : [];

  for (let y = year - 2; y <= year; y++) {
    const yearStr = String(y);
    const rows = query(
      `SELECT
         CAST(strftime('%m', entry_date) AS INTEGER) as month,
         COUNT(*) as count
       FROM cases
       WHERE strftime('%Y', entry_date) = ? ${typeClause}
       GROUP BY month
       ORDER BY month`,
      [yearStr, ...typeParams]
    );

    const monthly = new Array(12).fill(0);
    for (const row of rows) {
      monthly[row.month - 1] = row.count;
    }
    result[y] = monthly;
  }

  return result;
}

/**
 * Get list of years that have cases (for year selector)
 */
function getAvailableYears() {
  const rows = query(
    `SELECT DISTINCT CAST(strftime('%Y', entry_date) AS INTEGER) as year
     FROM cases
     ORDER BY year DESC`
  );

  const years = rows.map((r) => r.year);

  // Always include current year
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) {
    years.unshift(currentYear);
  }

  return years;
}

/**
 * Generate CSV export of statistics
 * @param {number} year
 * @param {string} typeFilter
 * @returns {string} CSV content
 */
export function generateStatsCsv(year, typeFilter = "ALL") {
  const stats = getStatistics(year, typeFilter);
  const BOM = "\uFEFF";

  const lines = [];
  lines.push(`Estadísticas ${year}${typeFilter !== "ALL" ? ` - ${typeFilter}` : ""}`);
  lines.push("");

  // KPIs
  lines.push("Resumen");
  lines.push(`Expedientes Nuevos (mes actual);${stats.kpis.newThisMonth.count}`);
  lines.push(`Expedientes Archivados (mes actual);${stats.kpis.archivedThisMonth.count}`);
  lines.push(`Expedientes Pendientes;${stats.kpis.pending.count}`);
  lines.push(`Media Mensual;${stats.kpis.monthlyAverage.count}`);
  lines.push("");

  // Monthly breakdown
  lines.push("Mes;ARAG;Particulares;Turno de Oficio;Total");
  for (const m of stats.monthly) {
    lines.push(`${m.label};${m.arag};${m.particular};${m.turno};${m.total}`);
  }
  lines.push("");

  // Distribution
  lines.push("Distribución por Tipo");
  lines.push(`ARAG;${stats.distribution.arag.count};${stats.distribution.arag.percent}%`);
  lines.push(`Particulares;${stats.distribution.particular.count};${stats.distribution.particular.percent}%`);
  lines.push(`Turno de Oficio;${stats.distribution.turno.count};${stats.distribution.turno.percent}%`);
  lines.push(`Total;${stats.distribution.total}`);

  return BOM + lines.join("\r\n");
}

export default {
  getStatistics,
  generateStatsCsv,
};
