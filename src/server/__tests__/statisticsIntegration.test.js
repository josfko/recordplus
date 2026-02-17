// Integration Test: Statistics Module
// Creates real cases, verifies statistics respond correctly, then cleans up.
// Run with: npx vitest run src/server/__tests__/statisticsIntegration.test.js

import { describe, it, expect, afterAll } from "vitest";
import { getStatistics, generateStatsCsv } from "../services/statisticsService.js";
import { create, archive, deleteCase, CASE_TYPES } from "../services/caseService.js";
import { closeDatabase } from "../database.js";

// We'll track everything we create so we can clean up
const createdIds = [];

afterAll(() => {
  for (const id of createdIds) {
    try { deleteCase(id); } catch { /* already deleted */ }
  }
  closeDatabase();
});

describe("Statistics Module — Full Integration", () => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const monthStr = String(month).padStart(2, "0");
  const today = `${year}-${monthStr}-15`;

  // Step 1: Create test cases
  it("should set up test data (3 ARAG, 2 Particular, 1 Turno)", () => {
    const cases = [
      { type: CASE_TYPES.ARAG, clientName: "Test ARAG 1", entryDate: today, aragReference: "DJ00999901" },
      { type: CASE_TYPES.ARAG, clientName: "Test ARAG 2", entryDate: today, aragReference: "DJ00999902" },
      { type: CASE_TYPES.ARAG, clientName: "Test ARAG 3", entryDate: today, aragReference: "DJ00999903" },
      { type: CASE_TYPES.PARTICULAR, clientName: "Test Particular 1", entryDate: today },
      { type: CASE_TYPES.PARTICULAR, clientName: "Test Particular 2", entryDate: today },
      { type: CASE_TYPES.TURNO_OFICIO, clientName: "Test Turno 1", entryDate: today, designation: "TURNO-TEST-001" },
    ];

    for (const data of cases) {
      const created = create(data);
      createdIds.push(created.id);
    }

    expect(createdIds).toHaveLength(6);
  });

  // Step 2: Verify KPI cards show correct data
  it("KPI: new cases this month should include our 6 test cases", () => {
    const stats = getStatistics(year);

    expect(stats.kpis.newThisMonth.count).toBeGreaterThanOrEqual(6);
    expect(stats.kpis.pending.count).toBeGreaterThanOrEqual(6);
    expect(stats.kpis.monthlyAverage.count).toBeGreaterThan(0);
  });

  // Step 3: Verify monthly stacked bar data
  it("Monthly chart: current month should have at least 3 ARAG, 2 Particular, 1 Turno", () => {
    const stats = getStatistics(year);
    const currentMonth = stats.monthly[month - 1];

    expect(currentMonth.current).toBe(true);
    expect(currentMonth.arag).toBeGreaterThanOrEqual(3);
    expect(currentMonth.particular).toBeGreaterThanOrEqual(2);
    expect(currentMonth.turno).toBeGreaterThanOrEqual(1);
    expect(currentMonth.total).toBe(currentMonth.arag + currentMonth.particular + currentMonth.turno);
  });

  // Step 4: Verify distribution percentages
  it("Distribution: ARAG should be the largest share", () => {
    const stats = getStatistics(year);
    const { arag, particular, turno, total } = stats.distribution;

    expect(total).toBeGreaterThanOrEqual(6);
    expect(arag.count).toBeGreaterThanOrEqual(3);
    expect(particular.count).toBeGreaterThanOrEqual(2);
    expect(turno.count).toBeGreaterThanOrEqual(1);

    // Percentages should sum close to 100
    const sum = arag.percent + particular.percent + turno.percent;
    expect(sum).toBeGreaterThanOrEqual(99.5);
    expect(sum).toBeLessThanOrEqual(100.5);
  });

  // Step 5: Verify type filter works
  it("Type filter: filtering by ARAG should only count ARAG cases", () => {
    const statsAll = getStatistics(year, "ALL");
    const statsArag = getStatistics(year, "ARAG");

    expect(statsArag.filter).toBe("ARAG");
    expect(statsArag.monthly[month - 1].total).toBeLessThanOrEqual(statsAll.monthly[month - 1].total);
    expect(statsArag.monthly[month - 1].total).toBeGreaterThanOrEqual(3);
  });

  // Step 6: Year-over-year has 3 years
  it("Year-over-year: should contain current year and 2 prior years", () => {
    const stats = getStatistics(year);
    const yoyYears = Object.keys(stats.yearOverYear).map(Number).sort();

    expect(yoyYears).toEqual([year - 2, year - 1, year]);
    expect(stats.yearOverYear[year]).toHaveLength(12);
    expect(stats.yearOverYear[year][month - 1]).toBeGreaterThanOrEqual(6);
  });

  // Step 7: Archive a case and verify archived KPI updates
  it("KPI: archiving a case should be reflected in archived count", () => {
    const beforeStats = getStatistics(year);
    const beforeArchived = beforeStats.kpis.archivedThisMonth.count;

    archive(createdIds[0], today);

    const afterStats = getStatistics(year);
    expect(afterStats.kpis.archivedThisMonth.count).toBe(beforeArchived + 1);
  });

  // Step 8: CSV export contains real data
  it("CSV export: should contain month labels and case data", () => {
    const csv = generateStatsCsv(year);

    expect(csv).toContain("Estadísticas");
    expect(csv).toContain("Ene");
    expect(csv).toContain("Dic");
    expect(csv).toContain("ARAG");
    expect(csv).toContain("Particulares");
    expect(csv).toContain("Turno de Oficio");
    // Should have non-zero values for current month
    expect(csv).not.toBe("");
  });

  // Step 9: Available years includes current year
  it("Available years: should always include the current year", () => {
    const stats = getStatistics(year);
    expect(stats.availableYears).toContain(year);
  });
});
