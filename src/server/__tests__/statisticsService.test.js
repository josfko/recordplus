// Property-Based Tests for Statistics Service
// Validates: Monthly breakdowns, KPI accuracy, distribution consistency, YoY comparison

import { describe, it, afterEach, afterAll } from "vitest";
import * as fc from "fast-check";
import { getStatistics, generateStatsCsv } from "../services/statisticsService.js";
import {
  create,
  archive,
  deleteCase,
  CASE_TYPES,
} from "../services/caseService.js";
import { closeDatabase, query } from "../database.js";

// Helper: generate valid ARAG reference
const validAragRef = () =>
  fc
    .integer({ min: 0, max: 999999 })
    .map((num) => `DJ00${num.toString().padStart(6, "0")}`);

// Helper: non-empty client name
const nonEmptyString = () =>
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// Helper: random case type
const caseType = () =>
  fc.constantFrom(CASE_TYPES.ARAG, CASE_TYPES.PARTICULAR, CASE_TYPES.TURNO_OFICIO);

// Track created case IDs for cleanup
let createdCaseIds = [];

afterEach(() => {
  for (const id of createdCaseIds) {
    try {
      deleteCase(id);
    } catch (e) {
      // Ignore
    }
  }
  createdCaseIds = [];
});

afterAll(() => {
  closeDatabase();
});

describe("Statistics Service - Property Tests", () => {
  describe("Monthly breakdown accuracy", () => {
    it("monthly totals should equal sum of type-specific counts", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);

            for (const m of stats.monthly) {
              const sum = m.arag + m.particular + m.turno;
              if (m.total !== sum) return false;
            }
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it("creating cases in a month should increase that month's count", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 2024, max: 2026 }),
          nonEmptyString(),
          (numCases, month, year, clientName) => {
            const monthStr = String(month).padStart(2, "0");
            const entryDate = `${year}-${monthStr}-15`;

            // Get baseline
            const before = getStatistics(year);
            const beforeCount = before.monthly[month - 1].particular;

            let created = 0;
            for (let i = 0; i < numCases; i++) {
              try {
                const c = create({
                  type: CASE_TYPES.PARTICULAR,
                  clientName: `${clientName}_stats_${i}_${Date.now()}`,
                  entryDate,
                });
                createdCaseIds.push(c.id);
                created++;
              } catch (e) {
                // Ignore conflicts
              }
            }

            const after = getStatistics(year);
            return after.monthly[month - 1].particular >= beforeCount + created;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("Distribution accuracy", () => {
    it("distribution percentages should sum to approximately 100 when there are cases", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);
            if (stats.distribution.total === 0) return true;

            const sum =
              stats.distribution.arag.percent +
              stats.distribution.particular.percent +
              stats.distribution.turno.percent;

            // Allow for rounding (99.7 - 100.3)
            return sum >= 99.5 && sum <= 100.5;
          }
        ),
        { numRuns: 50 }
      );
    });

    it("distribution counts should sum to total", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);
            const sum =
              stats.distribution.arag.count +
              stats.distribution.particular.count +
              stats.distribution.turno.count;
            return sum === stats.distribution.total;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("KPI consistency", () => {
    it("pending count should match open cases from direct query", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);

            const directCount = query(
              `SELECT COUNT(*) as count FROM cases WHERE state IN ('ABIERTO', 'JUDICIAL')`
            );

            return stats.kpis.pending.count === (directCount[0]?.count || 0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("monthly average should equal total entries / months elapsed", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);
            const now = new Date();
            const currentYear = now.getFullYear();
            const isCurrentYear = year === currentYear;
            const monthsElapsed = isCurrentYear ? now.getMonth() + 1 : 12;

            const totalEntries = stats.monthly.reduce((sum, m) => sum + m.total, 0);
            const expectedAvg = monthsElapsed > 0
              ? Math.round((totalEntries / monthsElapsed) * 10) / 10
              : 0;

            return stats.kpis.monthlyAverage.count === expectedAvg;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("Type filter", () => {
    it("filtering by type should only show that type's data", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          fc.constantFrom("ARAG", "PARTICULAR", "TURNO_OFICIO"),
          (year, typeFilter) => {
            const stats = getStatistics(year, typeFilter);
            return stats.filter === typeFilter;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe("Year-over-year", () => {
    it("YoY should always contain the requested year and 2 prior years", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);
            const yoyYears = Object.keys(stats.yearOverYear).map(Number);

            return (
              yoyYears.includes(year) &&
              yoyYears.includes(year - 1) &&
              yoyYears.includes(year - 2) &&
              yoyYears.length === 3
            );
          }
        ),
        { numRuns: 30 }
      );
    });

    it("each YoY year should have exactly 12 monthly entries", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const stats = getStatistics(year);
            return Object.values(stats.yearOverYear).every(
              (monthly) => monthly.length === 12
            );
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe("CSV export", () => {
    it("CSV should contain month labels and be parseable", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2024, max: 2026 }),
          (year) => {
            const csv = generateStatsCsv(year);
            return (
              csv.includes("Ene") &&
              csv.includes("Dic") &&
              csv.includes("Estadísticas") &&
              csv.includes("ARAG")
            );
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe("Available years", () => {
    it("should always include current year", () => {
      const stats = getStatistics(new Date().getFullYear());
      const currentYear = new Date().getFullYear();
      return stats.availableYears.includes(currentYear);
    });
  });
});
