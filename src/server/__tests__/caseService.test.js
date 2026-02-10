// Property-Based Tests for Case Service
// Task 2.5 - Validates: Requirements 1.3, 1.8, 2.4, 3.1, 3.2, 4.4-4.6, 7.2, 8.1, 8.3

import { describe, it, expect, beforeEach, afterAll, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  create,
  getById,
  list,
  update,
  archive,
  transitionToJudicial,
  deleteCase,
  CASE_TYPES,
  CASE_STATES,
  JUDICIAL_DISTRICTS,
  SORTABLE_COLUMNS,
} from "../services/caseService.js";
import { ValidationError, ConflictError } from "../errors.js";
import { resetCounter } from "../services/referenceGenerator.js";
import { closeDatabase, execute } from "../database.js";

// Helper to generate valid ARAG reference
const validAragRef = () =>
  fc
    .stringOf(
      fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
      {
        minLength: 6,
        maxLength: 6,
      }
    )
    .map((digits) => `DJ00${digits}`);

// Helper to generate valid date string
const validDate = () =>
  fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString().split("T")[0]);

// Helper to generate non-empty string
const nonEmptyString = () =>
  fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

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

describe("Case Service - Property Tests", () => {
  /**
   * Property 4: Required Fields Validation
   * For any case creation attempt:
   * - Client name must be non-empty (not null, not empty string, not whitespace-only)
   * - ARAG cases must have a valid ARAG reference
   * - Turno de Oficio cases must have a designation number
   * **Validates: Requirements 1.3, 2.4, 3.1, 3.2**
   */
  describe("Property 4: Required Fields Validation", () => {
    // Feature: core-case-management, Property 4: Required Fields Validation
    // Validates: Requirements 1.3, 2.4, 3.1, 3.2
    it("should reject cases with empty or whitespace-only client names", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CASE_TYPES)),
          fc.oneof(
            fc.constant(""),
            fc.constant("   "),
            fc.constant("\t\n"),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (type, clientName) => {
            try {
              create({
                type,
                clientName,
                aragReference:
                  type === CASE_TYPES.ARAG ? "DJ00123456" : undefined,
                designation:
                  type === CASE_TYPES.TURNO_OFICIO ? "TO-001" : undefined,
              });
              return false; // Should have thrown
            } catch (e) {
              return e instanceof ValidationError && e.field === "clientName";
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 4: Required Fields Validation
    // Validates: Requirements 1.3, 2.4, 3.1, 3.2
    it("ARAG cases must have valid ARAG reference", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(""),
            fc.constant("INVALID"),
            fc.constant("DJ001234"), // Too short
            fc.constant("DJ001234567") // Too long
          ),
          (clientName, aragRef) => {
            try {
              create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
              });
              return false;
            } catch (e) {
              return (
                e instanceof ValidationError && e.field === "aragReference"
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 4: Required Fields Validation
    // Validates: Requirements 1.3, 2.4, 3.1, 3.2
    it("Turno de Oficio cases must have designation", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(""),
            fc.constant("   ")
          ),
          (clientName, designation) => {
            try {
              create({
                type: CASE_TYPES.TURNO_OFICIO,
                clientName,
                designation,
              });
              return false;
            } catch (e) {
              return e instanceof ValidationError && e.field === "designation";
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 4: Required Fields Validation
    // Validates: Requirements 1.3, 2.4, 3.1, 3.2
    it("valid cases should be created successfully", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validAragRef(),
          validDate(),
          (clientName, aragRef, entryDate) => {
            try {
              const created = create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
                entryDate,
              });
              createdCaseIds.push(created.id);
              return (
                created.clientName === clientName.trim() &&
                created.aragReference === aragRef &&
                created.state === CASE_STATES.ABIERTO
              );
            } catch (e) {
              // Conflict errors are acceptable (duplicate refs)
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: ARAG Reference Uniqueness
   * For any two ARAG cases in the system, their ARAG external references must be different.
   * **Validates: Requirements 1.8, 7.2**
   */
  describe("Property 5: ARAG Reference Uniqueness", () => {
    // Feature: core-case-management, Property 5: ARAG Reference Uniqueness
    // Validates: Requirements 1.8, 7.2
    it("should reject duplicate ARAG references", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          nonEmptyString(),
          validAragRef(),
          (client1, client2, aragRef) => {
            try {
              // Create first case
              const case1 = create({
                type: CASE_TYPES.ARAG,
                clientName: client1,
                aragReference: aragRef,
              });
              createdCaseIds.push(case1.id);

              // Try to create second case with same reference
              try {
                const case2 = create({
                  type: CASE_TYPES.ARAG,
                  clientName: client2,
                  aragReference: aragRef,
                });
                createdCaseIds.push(case2.id);
                return false; // Should have thrown
              } catch (e) {
                return (
                  e instanceof ConflictError && e.field === "aragReference"
                );
              }
            } catch (e) {
              // First case might fail due to existing ref from previous run
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Archive Requires Closure Date
   * For any case archive operation, the operation should succeed if and only if
   * a valid closure date is provided.
   * **Validates: Requirements 4.4, 4.5, 4.6**
   */
  describe("Property 6: Archive Requires Closure Date", () => {
    // Feature: core-case-management, Property 6: Archive Requires Closure Date
    // Validates: Requirements 4.4, 4.5, 4.6
    it("should reject archive without closure date", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validAragRef(),
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant("")),
          (clientName, aragRef, closureDate) => {
            try {
              const created = create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
              });
              createdCaseIds.push(created.id);

              try {
                archive(created.id, closureDate);
                return false; // Should have thrown
              } catch (e) {
                return (
                  e instanceof ValidationError && e.field === "closureDate"
                );
              }
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 6: Archive Requires Closure Date
    // Validates: Requirements 4.4, 4.5, 4.6
    it("should succeed archive with valid closure date", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validAragRef(),
          validDate(),
          (clientName, aragRef, closureDate) => {
            try {
              const created = create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
              });
              createdCaseIds.push(created.id);

              const archived = archive(created.id, closureDate);
              return (
                archived.state === CASE_STATES.ARCHIVADO &&
                archived.closureDate === closureDate
              );
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: State Transitions Validity
   * For any case, the state should always be one of: ABIERTO, JUDICIAL, or ARCHIVADO.
   * Valid transitions: ABIERTO → JUDICIAL → ARCHIVADO or ABIERTO → ARCHIVADO.
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  describe("Property 7: State Transitions Validity", () => {
    // Feature: core-case-management, Property 7: State Transitions Validity
    // Validates: Requirements 4.1, 4.2, 4.3
    it("new cases should always start in ABIERTO state", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CASE_TYPES)),
          nonEmptyString(),
          validAragRef(),
          nonEmptyString(),
          (type, clientName, aragRef, designation) => {
            try {
              const created = create({
                type,
                clientName,
                aragReference: type === CASE_TYPES.ARAG ? aragRef : undefined,
                designation:
                  type === CASE_TYPES.TURNO_OFICIO ? designation : undefined,
              });
              createdCaseIds.push(created.id);
              return created.state === CASE_STATES.ABIERTO;
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 7: State Transitions Validity
    // Validates: Requirements 4.1, 4.2, 4.3
    it("ARAG cases can transition ABIERTO → JUDICIAL → ARCHIVADO", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validAragRef(),
          validDate(),
          validDate(),
          fc.constantFrom(...JUDICIAL_DISTRICTS),
          (clientName, aragRef, judicialDate, closureDate, district) => {
            try {
              const created = create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
              });
              createdCaseIds.push(created.id);

              // Transition to judicial
              const judicial = transitionToJudicial(
                created.id,
                judicialDate,
                district
              );
              if (judicial.state !== CASE_STATES.JUDICIAL) return false;

              // Archive from judicial
              const archived = archive(created.id, closureDate);
              return archived.state === CASE_STATES.ARCHIVADO;
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 7: State Transitions Validity
    // Validates: Requirements 4.1, 4.2, 4.3
    it("cases can transition directly ABIERTO → ARCHIVADO", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validAragRef(),
          validDate(),
          (clientName, aragRef, closureDate) => {
            try {
              const created = create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
              });
              createdCaseIds.push(created.id);

              const archived = archive(created.id, closureDate);
              return archived.state === CASE_STATES.ARCHIVADO;
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 7: State Transitions Validity
    // Validates: Requirements 4.1, 4.2, 4.3
    it("only ARAG cases can transition to JUDICIAL", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(CASE_TYPES.PARTICULAR, CASE_TYPES.TURNO_OFICIO),
          nonEmptyString(),
          nonEmptyString(),
          validDate(),
          fc.constantFrom(...JUDICIAL_DISTRICTS),
          (type, clientName, designation, judicialDate, district) => {
            try {
              const created = create({
                type,
                clientName,
                designation:
                  type === CASE_TYPES.TURNO_OFICIO ? designation : undefined,
              });
              createdCaseIds.push(created.id);

              try {
                transitionToJudicial(created.id, judicialDate, district);
                return false; // Should have thrown
              } catch (e) {
                return e instanceof ValidationError;
              }
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Case Data Round-Trip Persistence
   * For any valid case object, saving it to the database and then retrieving it
   * should produce an equivalent object.
   * **Validates: Requirements 8.1, 8.3**
   */
  describe("Property 8: Case Data Round-Trip Persistence", () => {
    // Feature: core-case-management, Property 8: Case Data Round-Trip Persistence
    // Validates: Requirements 8.1, 8.3
    it("ARAG case data should round-trip correctly", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validAragRef(),
          validDate(),
          fc.string({ maxLength: 500 }),
          (clientName, aragRef, entryDate, observations) => {
            try {
              const created = create({
                type: CASE_TYPES.ARAG,
                clientName,
                aragReference: aragRef,
                entryDate,
                observations,
              });
              createdCaseIds.push(created.id);

              const retrieved = getById(created.id);
              return (
                retrieved.type === CASE_TYPES.ARAG &&
                retrieved.clientName === clientName.trim() &&
                retrieved.aragReference === aragRef &&
                retrieved.entryDate === entryDate &&
                retrieved.observations === (observations || "") &&
                retrieved.state === CASE_STATES.ABIERTO
              );
            } catch (e) {
              return e instanceof ConflictError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 8: Case Data Round-Trip Persistence
    // Validates: Requirements 8.1, 8.3
    it("PARTICULAR case data should round-trip correctly", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          validDate(),
          fc.string({ maxLength: 500 }),
          (clientName, entryDate, observations) => {
            const created = create({
              type: CASE_TYPES.PARTICULAR,
              clientName,
              entryDate,
              observations,
            });
            createdCaseIds.push(created.id);

            const retrieved = getById(created.id);
            return (
              retrieved.type === CASE_TYPES.PARTICULAR &&
              retrieved.clientName === clientName.trim() &&
              retrieved.entryDate === entryDate &&
              retrieved.observations === (observations || "") &&
              retrieved.state === CASE_STATES.ABIERTO &&
              /^IY-\d{2}-\d{3}$/.test(retrieved.internalReference)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 8: Case Data Round-Trip Persistence
    // Validates: Requirements 8.1, 8.3
    it("TURNO_OFICIO case data should round-trip correctly", () => {
      fc.assert(
        fc.property(
          nonEmptyString(),
          nonEmptyString(),
          validDate(),
          fc.string({ maxLength: 500 }),
          (clientName, designation, entryDate, observations) => {
            const created = create({
              type: CASE_TYPES.TURNO_OFICIO,
              clientName,
              designation,
              entryDate,
              observations,
            });
            createdCaseIds.push(created.id);

            const retrieved = getById(created.id);
            return (
              retrieved.type === CASE_TYPES.TURNO_OFICIO &&
              retrieved.clientName === clientName.trim() &&
              retrieved.designation === designation.trim() &&
              retrieved.entryDate === entryDate &&
              retrieved.observations === (observations || "") &&
              retrieved.state === CASE_STATES.ABIERTO
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Sort functionality", () => {
    beforeEach(() => {
      execute("DELETE FROM cases");
      resetCounter();

      // Create cases with known client names for sort verification
      // Using ASCII-only names to avoid SQLite BINARY collation quirks with accented chars
      create({
        type: CASE_TYPES.ARAG,
        clientName: "Alvarez Garcia, Ana",
        aragReference: "DJ00900001",
        entryDate: "2025-01-10",
      });
      create({
        type: CASE_TYPES.ARAG,
        clientName: "Martinez Lopez, Carlos",
        aragReference: "DJ00900002",
        entryDate: "2025-03-15",
      });
      create({
        type: CASE_TYPES.ARAG,
        clientName: "Benitez Ruiz, Beatriz",
        aragReference: "DJ00900003",
        entryDate: "2025-02-20",
      });
    });

    it("should sort by client_name ASC", () => {
      const result = list({}, {}, { sortBy: "client_name", sortOrder: "ASC" });
      const names = result.cases.map((c) => c.clientName);
      expect(names).toEqual([
        "Alvarez Garcia, Ana",
        "Benitez Ruiz, Beatriz",
        "Martinez Lopez, Carlos",
      ]);
    });

    it("should sort by client_name DESC", () => {
      const result = list({}, {}, { sortBy: "client_name", sortOrder: "DESC" });
      const names = result.cases.map((c) => c.clientName);
      expect(names).toEqual([
        "Martinez Lopez, Carlos",
        "Benitez Ruiz, Beatriz",
        "Alvarez Garcia, Ana",
      ]);
    });

    it("should sort by entry_date ASC", () => {
      const result = list({}, {}, { sortBy: "entry_date", sortOrder: "ASC" });
      const dates = result.cases.map((c) => c.entryDate);
      expect(dates).toEqual(["2025-01-10", "2025-02-20", "2025-03-15"]);
    });

    it("should use default sort (entry_date DESC) when no sort params", () => {
      const result = list({}, {});
      const dates = result.cases.map((c) => c.entryDate);
      expect(dates).toEqual(["2025-03-15", "2025-02-20", "2025-01-10"]);
    });

    it("should fall back to default sort for invalid sort column", () => {
      const result = list({}, {}, { sortBy: "invalid_column", sortOrder: "ASC" });
      const dates = result.cases.map((c) => c.entryDate);
      // Falls back to entry_date DESC
      expect(dates).toEqual(["2025-03-15", "2025-02-20", "2025-01-10"]);
    });

    it("should fall back to DESC for invalid sort order", () => {
      const result = list({}, {}, { sortBy: "client_name", sortOrder: "INVALID" });
      const names = result.cases.map((c) => c.clientName);
      // Invalid order defaults to DESC in the service
      expect(names).toEqual([
        "Martinez Lopez, Carlos",
        "Benitez Ruiz, Beatriz",
        "Alvarez Garcia, Ana",
      ]);
    });
  });
});
