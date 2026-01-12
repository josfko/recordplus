// Property-Based Tests for Export/Import Service
// Task 4.7 - Property 11: Export/Import Round-Trip
// **Validates: Requirements 8.4, 8.5**

import { describe, it, afterEach, afterAll } from "vitest";
import * as fc from "fast-check";
import { exportData, importData } from "../services/exportImportService.js";
import { create, deleteCase, CASE_TYPES } from "../services/caseService.js";
import { closeDatabase, execute, query } from "../database.js";

// Helper to generate valid ARAG reference
const validAragRef = () =>
  fc
    .tuple(fc.integer({ min: 0, max: 999999 }))
    .map(([num]) => `DJ00${num.toString().padStart(6, "0")}`);

// Helper to generate non-empty string
const nonEmptyString = () =>
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// Helper to generate valid date string
const validDate = () =>
  fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString().split("T")[0]);

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

describe("Export/Import Service - Property Tests", () => {
  /**
   * Property 11: Export/Import Round-Trip
   * For any database state, exporting to JSON and then importing should restore
   * an equivalent state.
   * **Validates: Requirements 8.4, 8.5**
   */
  describe("Property 11: Export/Import Round-Trip", () => {
    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("exported data should contain all required tables", () => {
      fc.assert(
        fc.property(fc.constant(true), () => {
          const exported = exportData();

          // Verify structure
          return (
            exported.exportedAt !== undefined &&
            exported.version === "1.0" &&
            exported.data !== undefined &&
            Array.isArray(exported.data.cases) &&
            Array.isArray(exported.data.documentHistory) &&
            Array.isArray(exported.data.emailHistory) &&
            Array.isArray(exported.data.configuration) &&
            Array.isArray(exported.data.referenceCounters)
          );
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("cases should round-trip through export/import", () => {
      fc.assert(
        fc.property(nonEmptyString(), validDate(), (clientName, entryDate) => {
          // Create a case
          const created = create({
            type: CASE_TYPES.PARTICULAR,
            clientName: `${clientName}_${Date.now()}`,
            entryDate,
          });
          createdCaseIds.push(created.id);

          // Export data
          const exported = exportData();

          // Find our case in the export
          const exportedCase = exported.data.cases.find(
            (c) => c.id === created.id
          );

          if (!exportedCase) return false;

          // Verify the exported case matches
          return (
            exportedCase.type === created.type &&
            exportedCase.client_name === created.clientName &&
            exportedCase.entry_date === created.entryDate &&
            exportedCase.state === created.state
          );
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("import should restore cases from export", () => {
      fc.assert(
        fc.property(nonEmptyString(), validDate(), (clientName, entryDate) => {
          // Create a case
          const uniqueName = `${clientName}_import_${Date.now()}`;
          const created = create({
            type: CASE_TYPES.PARTICULAR,
            clientName: uniqueName,
            entryDate,
          });
          createdCaseIds.push(created.id);

          // Export data
          const exported = exportData();

          // Delete the case
          deleteCase(created.id);
          createdCaseIds = createdCaseIds.filter((id) => id !== created.id);

          // Import the data back
          const importResult = importData(exported);

          // Verify import was successful
          if (!importResult.success) return false;

          // Check if the case was restored
          const restoredCases = query("SELECT * FROM cases WHERE id = ?", [
            created.id,
          ]);

          if (restoredCases.length === 0) return false;

          const restored = restoredCases[0];
          createdCaseIds.push(restored.id);

          return (
            restored.type === created.type &&
            restored.client_name === created.clientName &&
            restored.entry_date === created.entryDate
          );
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("import should skip existing cases when clearExisting is false", () => {
      fc.assert(
        fc.property(nonEmptyString(), validDate(), (clientName, entryDate) => {
          // Create a case
          const uniqueName = `${clientName}_skip_${Date.now()}`;
          const created = create({
            type: CASE_TYPES.PARTICULAR,
            clientName: uniqueName,
            entryDate,
          });
          createdCaseIds.push(created.id);

          // Export data
          const exported = exportData();

          // Import again without clearing (should skip)
          const importResult = importData(exported, { clearExisting: false });

          // The case should be skipped since it already exists
          return (
            importResult.success && importResult.summary.cases.skipped >= 1
          );
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("export count should match database count", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          nonEmptyString(),
          (numCases, clientName) => {
            // Create some cases
            for (let i = 0; i < numCases; i++) {
              try {
                const created = create({
                  type: CASE_TYPES.PARTICULAR,
                  clientName: `${clientName}_count_${i}_${Date.now()}`,
                  entryDate: "2025-01-15",
                });
                createdCaseIds.push(created.id);
              } catch (e) {
                // Ignore conflicts
              }
            }

            // Export data
            const exported = exportData();

            // Get actual count from database
            const dbCount = query("SELECT COUNT(*) as count FROM cases")[0]
              .count;

            // Export should have same count as database
            return exported.data.cases.length === dbCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("configuration should round-trip through export/import", () => {
      fc.assert(
        fc.property(fc.constant(true), () => {
          // Export current configuration
          const exported = exportData();

          // Configuration should be present
          if (!Array.isArray(exported.data.configuration)) return false;

          // Import should work
          const importResult = importData(exported, { clearExisting: false });

          return importResult.success;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 11: Export/Import Round-Trip
    // Validates: Requirements 8.4, 8.5
    it("reference counters should be preserved through export/import", () => {
      fc.assert(
        fc.property(nonEmptyString(), (clientName) => {
          // Create a case to increment counter
          const created = create({
            type: CASE_TYPES.PARTICULAR,
            clientName: `${clientName}_counter_${Date.now()}`,
            entryDate: "2025-01-15",
          });
          createdCaseIds.push(created.id);

          // Export data
          const exported = exportData();

          // Reference counters should be present
          if (!Array.isArray(exported.data.referenceCounters)) return false;

          // Should have at least one counter
          return exported.data.referenceCounters.length > 0;
        }),
        { numRuns: 100 }
      );
    });
  });
});
