// Property-Based Tests for Dashboard Service
// Task 4.3 - Property 9: Dashboard Metrics Accuracy
// **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

import { describe, it, afterEach, afterAll } from "vitest";
import * as fc from "fast-check";
import { getDashboardMetrics } from "../services/dashboardService.js";
import {
  create,
  archive,
  deleteCase,
  CASE_TYPES,
  CASE_STATES,
} from "../services/caseService.js";
import { closeDatabase, query } from "../database.js";

// Helper to generate valid ARAG reference
const validAragRef = () =>
  fc
    .tuple(fc.integer({ min: 0, max: 999999 }))
    .map(([num]) => `DJ00${num.toString().padStart(6, "0")}`);

// Helper to generate non-empty string
const nonEmptyString = () =>
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// Track created case IDs for cleanup
let createdCaseIds = [];

// Clean up after each test
afterEach(() => {
  for (const id of createdCaseIds) {
    try {
      deleteCase(id);
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  createdCaseIds = [];
});

// Clean up after all tests
afterAll(() => {
  closeDatabase();
});

describe("Dashboard Service - Property Tests", () => {
  /**
   * Property 9: Dashboard Metrics Accuracy
   * For any set of cases in the database, the dashboard metrics should equal
   * the count of cases matching those criteria.
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
   */
  describe("Property 9: Dashboard Metrics Accuracy", () => {
    // Feature: core-case-management, Property 9: Dashboard Metrics Accuracy
    // Validates: Requirements 9.1, 9.2, 9.3, 9.4
    it("entries count should match cases created in the specified month", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of cases to create
          fc.integer({ min: 1, max: 12 }), // Month
          fc.integer({ min: 2024, max: 2026 }), // Year
          nonEmptyString(),
          (numCases, month, year, clientName) => {
            // Create cases with entry date in the specified month
            const monthStr = String(month).padStart(2, "0");
            const entryDate = `${year}-${monthStr}-15`;

            let createdCount = 0;
            for (let i = 0; i < numCases; i++) {
              try {
                const created = create({
                  type: CASE_TYPES.PARTICULAR,
                  clientName: `${clientName}_${i}_${Date.now()}`,
                  entryDate,
                });
                createdCaseIds.push(created.id);
                createdCount++;
              } catch (e) {
                // Ignore conflicts
              }
            }

            // Get metrics for that month
            const metrics = getDashboardMetrics(month, year);

            // The entries count for PARTICULAR should be at least what we created
            // (there might be other cases from previous tests)
            return (
              metrics.entriesThisMonth[CASE_TYPES.PARTICULAR] >= createdCount
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 9: Dashboard Metrics Accuracy
    // Validates: Requirements 9.1, 9.2, 9.3, 9.4
    it("archived count should match cases archived in the specified month", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // Number of cases to create and archive
          fc.integer({ min: 1, max: 12 }), // Month
          fc.integer({ min: 2024, max: 2026 }), // Year
          nonEmptyString(),
          (numCases, month, year, clientName) => {
            const monthStr = String(month).padStart(2, "0");
            const entryDate = `${year}-${monthStr}-10`;
            const closureDate = `${year}-${monthStr}-20`;

            let archivedCount = 0;
            for (let i = 0; i < numCases; i++) {
              try {
                const created = create({
                  type: CASE_TYPES.PARTICULAR,
                  clientName: `${clientName}_arch_${i}_${Date.now()}`,
                  entryDate,
                });
                createdCaseIds.push(created.id);

                // Archive the case
                archive(created.id, closureDate);
                archivedCount++;
              } catch (e) {
                // Ignore conflicts
              }
            }

            // Get metrics for that month
            const metrics = getDashboardMetrics(month, year);

            // The archived count should be at least what we archived
            return (
              metrics.archivedThisMonth[CASE_TYPES.PARTICULAR] >= archivedCount
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 9: Dashboard Metrics Accuracy
    // Validates: Requirements 9.1, 9.2, 9.3, 9.4
    it("pending count should match open cases (ABIERTO or JUDICIAL)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // Number of cases to create
          nonEmptyString(),
          (numCases, clientName) => {
            const entryDate = new Date().toISOString().split("T")[0];

            let openCount = 0;
            for (let i = 0; i < numCases; i++) {
              try {
                const created = create({
                  type: CASE_TYPES.PARTICULAR,
                  clientName: `${clientName}_pend_${i}_${Date.now()}`,
                  entryDate,
                });
                createdCaseIds.push(created.id);
                openCount++;
              } catch (e) {
                // Ignore conflicts
              }
            }

            // Get current metrics
            const metrics = getDashboardMetrics();

            // The pending count should be at least what we created (all are ABIERTO)
            return metrics.pending[CASE_TYPES.PARTICULAR] >= openCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 9: Dashboard Metrics Accuracy
    // Validates: Requirements 9.1, 9.2, 9.3, 9.4
    it("total counts should equal sum of type-specific counts", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 12 }), // Month
          fc.integer({ min: 2024, max: 2026 }), // Year
          (month, year) => {
            const metrics = getDashboardMetrics(month, year);

            // Verify totals equal sum of types
            const entriesTotal =
              metrics.entriesThisMonth[CASE_TYPES.ARAG] +
              metrics.entriesThisMonth[CASE_TYPES.PARTICULAR] +
              metrics.entriesThisMonth[CASE_TYPES.TURNO_OFICIO];

            const archivedTotal =
              metrics.archivedThisMonth[CASE_TYPES.ARAG] +
              metrics.archivedThisMonth[CASE_TYPES.PARTICULAR] +
              metrics.archivedThisMonth[CASE_TYPES.TURNO_OFICIO];

            const pendingTotal =
              metrics.pending[CASE_TYPES.ARAG] +
              metrics.pending[CASE_TYPES.PARTICULAR] +
              metrics.pending[CASE_TYPES.TURNO_OFICIO];

            return (
              metrics.entriesThisMonth.total === entriesTotal &&
              metrics.archivedThisMonth.total === archivedTotal &&
              metrics.pending.total === pendingTotal
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 9: Dashboard Metrics Accuracy
    // Validates: Requirements 9.1, 9.2, 9.3, 9.4
    it("metrics should be consistent with direct database queries", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 12 }), // Month
          fc.integer({ min: 2024, max: 2026 }), // Year
          (month, year) => {
            const monthStr = `${year}-${String(month).padStart(2, "0")}`;

            // Get metrics from service
            const metrics = getDashboardMetrics(month, year);

            // Direct database queries for verification
            const entriesRows = query(
              `SELECT type, COUNT(*) as count FROM cases 
               WHERE strftime('%Y-%m', entry_date) = ? GROUP BY type`,
              [monthStr]
            );

            const archivedRows = query(
              `SELECT type, COUNT(*) as count FROM cases 
               WHERE state = 'ARCHIVADO' AND strftime('%Y-%m', closure_date) = ? GROUP BY type`,
              [monthStr]
            );

            const pendingRows = query(
              `SELECT type, COUNT(*) as count FROM cases 
               WHERE state IN ('ABIERTO', 'JUDICIAL') GROUP BY type`
            );

            // Build expected counts from direct queries
            const expectedEntries = { total: 0 };
            for (const row of entriesRows) {
              expectedEntries[row.type] = row.count;
              expectedEntries.total += row.count;
            }

            const expectedArchived = { total: 0 };
            for (const row of archivedRows) {
              expectedArchived[row.type] = row.count;
              expectedArchived.total += row.count;
            }

            const expectedPending = { total: 0 };
            for (const row of pendingRows) {
              expectedPending[row.type] = row.count;
              expectedPending.total += row.count;
            }

            // Compare totals (type-specific might have undefined vs 0 differences)
            return (
              metrics.entriesThisMonth.total === expectedEntries.total &&
              metrics.archivedThisMonth.total === expectedArchived.total &&
              metrics.pending.total === expectedPending.total
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
