// Property-Based Tests for Reference Generator
// Task 2.3 - Validates: Requirements 1.1, 1.2, 1.7, 2.1, 2.3, 7.1, 7.4, 7.5

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as fc from "fast-check";
import {
  validateAragExternalReference,
  generateAragReference,
  generateParticularReference,
  resetCounter,
  getCurrentCounter,
} from "../services/referenceGenerator.js";
import { closeDatabase, getDatabase } from "../database.js";

// Clean up after all tests
afterAll(() => {
  closeDatabase();
});

describe("Reference Generator - Property Tests", () => {
  /**
   * Property 1: ARAG Reference Format Validation
   * For any string input as ARAG reference, the system should accept it
   * if and only if it matches the pattern DJ00 followed by exactly 6 digits.
   * **Validates: Requirements 1.1, 1.7**
   */
  describe("Property 1: ARAG Reference Format Validation", () => {
    // Feature: core-case-management, Property 1: ARAG Reference Format Validation
    // Validates: Requirements 1.1, 1.7
    it("should accept only strings matching DJ00 + 6 digits", () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const isValid = validateAragExternalReference(input);
          const shouldBeValid = /^DJ00\d{6}$/.test(input);
          return isValid === shouldBeValid;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 1: ARAG Reference Format Validation
    // Validates: Requirements 1.1, 1.7
    it("should always accept valid DJ00xxxxxx format", () => {
      fc.assert(
        fc.property(
          fc.stringOf(
            fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
            { minLength: 6, maxLength: 6 }
          ),
          (digits) => {
            const ref = `DJ00${digits}`;
            return validateAragExternalReference(ref) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 1: ARAG Reference Format Validation
    // Validates: Requirements 1.1, 1.7
    it("should reject non-string inputs", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (input) => {
            return validateAragExternalReference(input) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Internal Reference Format and Uniqueness
   * For any sequence of cases created, all generated internal references should:
   * - Match their expected format (IY + 6 digits for ARAG, IY-YY-NNN for Particular)
   * - Be unique across all cases in the database
   * - Never be reused even after case deletion
   * **Validates: Requirements 1.2, 2.1, 7.1, 7.4, 7.5**
   */
  describe("Property 2: Internal Reference Format and Uniqueness", () => {
    beforeEach(() => {
      // Reset counters for clean test state
      resetCounter("ARAG");
      resetCounter("PARTICULAR_2026");
      resetCounter("PARTICULAR_2025");
    });

    // Feature: core-case-management, Property 2: Internal Reference Format and Uniqueness
    // Validates: Requirements 1.2, 2.1, 7.1, 7.4, 7.5
    it("ARAG references should match IY + 6 digits format", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 50 }), (count) => {
          resetCounter("ARAG");
          for (let i = 0; i < count; i++) {
            const ref = generateAragReference();
            if (!/^IY\d{6}$/.test(ref)) {
              return false;
            }
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 2: Internal Reference Format and Uniqueness
    // Validates: Requirements 1.2, 2.1, 7.1, 7.4, 7.5
    it("Particular references should match IY-YY-NNN format", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 20 }),
          (year, count) => {
            resetCounter(`PARTICULAR_${year}`);
            const yy = year.toString().slice(-2);
            for (let i = 0; i < count; i++) {
              const ref = generateParticularReference(year);
              const pattern = new RegExp(`^IY-${yy}-\\d{3}$`);
              if (!pattern.test(ref)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 2: Internal Reference Format and Uniqueness
    // Validates: Requirements 1.2, 2.1, 7.1, 7.4, 7.5
    it("all generated ARAG references should be unique", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (count) => {
          resetCounter("ARAG");
          const refs = new Set();
          for (let i = 0; i < count; i++) {
            const ref = generateAragReference();
            if (refs.has(ref)) {
              return false; // Duplicate found
            }
            refs.add(ref);
          }
          return refs.size === count;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 2: Internal Reference Format and Uniqueness
    // Validates: Requirements 1.2, 2.1, 7.1, 7.4, 7.5
    it("all generated Particular references within same year should be unique", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 50 }),
          (year, count) => {
            resetCounter(`PARTICULAR_${year}`);
            const refs = new Set();
            for (let i = 0; i < count; i++) {
              const ref = generateParticularReference(year);
              if (refs.has(ref)) {
                return false;
              }
              refs.add(ref);
            }
            return refs.size === count;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Sequential Numbering for Particular Cases
   * For any sequence of N Particular cases created within the same year,
   * the sequential numbers should be consecutive starting from 001.
   * **Validates: Requirements 2.3**
   */
  describe("Property 3: Sequential Numbering for Particular Cases", () => {
    beforeEach(() => {
      resetCounter("PARTICULAR_2026");
    });

    // Feature: core-case-management, Property 3: Sequential Numbering for Particular Cases
    // Validates: Requirements 2.3
    it("sequential numbers should be consecutive starting from 001", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 50 }),
          (year, count) => {
            resetCounter(`PARTICULAR_${year}`);
            const yy = year.toString().slice(-2);

            for (let i = 1; i <= count; i++) {
              const ref = generateParticularReference(year);
              const expectedNum = i.toString().padStart(3, "0");
              const expected = `IY-${yy}-${expectedNum}`;
              if (ref !== expected) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 3: Sequential Numbering for Particular Cases
    // Validates: Requirements 2.3
    it("counter should persist and continue from last value", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (year, firstBatch, secondBatch) => {
            resetCounter(`PARTICULAR_${year}`);
            const yy = year.toString().slice(-2);

            // Generate first batch
            for (let i = 0; i < firstBatch; i++) {
              generateParticularReference(year);
            }

            // Generate second batch and verify continuation
            for (let i = 0; i < secondBatch; i++) {
              const ref = generateParticularReference(year);
              const expectedNum = (firstBatch + i + 1)
                .toString()
                .padStart(3, "0");
              const expected = `IY-${yy}-${expectedNum}`;
              if (ref !== expected) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
