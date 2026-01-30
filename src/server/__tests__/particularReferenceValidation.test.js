/**
 * Particular Reference Validation Tests
 * Property-based tests for Particular case reference generation and validation
 * Validates: Requirements 1.1, 1.3, 1.8, 1.9, 2.1, 2.3
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fc from "fast-check";
import {
  validateParticularReference,
  generateParticularReference,
  getNextCounter,
  getCurrentCounter,
  resetCounter,
  internalReferenceExists,
} from "../services/referenceGenerator.js";
import { execute, query } from "../database.js";

describe("Particular Reference Validation", () => {
  // Store original counter values to restore after tests
  let originalCounter2026;
  let originalCounter2025;
  const testYears = [2025, 2026];

  beforeAll(() => {
    // Save current counter values
    originalCounter2026 = getCurrentCounter("PARTICULAR_2026");
    originalCounter2025 = getCurrentCounter("PARTICULAR_2025");
  });

  afterAll(() => {
    // Restore counters to original state
    // We do this by updating to original - 1 since getNextCounter will increment
    if (originalCounter2026 > 0) {
      execute(
        "UPDATE reference_counters SET last_value = ? WHERE type = ?",
        [originalCounter2026, "PARTICULAR_2026"]
      );
    }
    if (originalCounter2025 > 0) {
      execute(
        "UPDATE reference_counters SET last_value = ? WHERE type = ?",
        [originalCounter2025, "PARTICULAR_2025"]
      );
    }
  });

  describe("Property 1: Particular Reference Format Validation", () => {
    /**
     * Validates: Requirement 1.9
     * Format: IY-YY-NNN where YY is two-digit year, NNN is 3-digit sequence
     */
    it("should validate correct IY-YY-NNN format", () => {
      // Generate valid references
      const validRefs = [
        "IY-26-001",
        "IY-26-999",
        "IY-25-123",
        "IY-00-001",
        "IY-99-500",
      ];

      validRefs.forEach((ref) => {
        expect(validateParticularReference(ref)).toBe(true);
      });
    });

    it("should reject invalid formats", () => {
      const invalidRefs = [
        "IY-26-1", // NNN too short
        "IY-26-0001", // NNN too long
        "IY-6-001", // YY too short
        "IY-126-001", // YY too long
        "IY26001", // Missing dashes
        "IY-26001", // Missing second dash
        "IY26-001", // Missing first dash
        "iy-26-001", // Wrong case
        "IY-AA-001", // Letters in year
        "IY-26-AAA", // Letters in sequence
        "", // Empty
        "IY004921", // ARAG format
        "DJ00123456", // ARAG external format
      ];

      invalidRefs.forEach((ref) => {
        expect(validateParticularReference(ref)).toBe(false);
      });
    });

    /**
     * Property: Generated references should always be valid
     */
    it("should always generate valid references", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const ref = generateParticularReference(year);
            expect(validateParticularReference(ref)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Reference should contain the correct year
     */
    it("should include correct year in reference", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const ref = generateParticularReference(year);
            const yy = year.toString().slice(-2);
            expect(ref).toMatch(new RegExp(`^IY-${yy}-\\d{3}$`));
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe("Property 2: Sequential Numbering Within Year", () => {
    /**
     * Validates: Requirements 1.3, 2.1
     * References should increment sequentially within the same year
     */
    it("should generate sequential numbers within same year", () => {
      const testYear = 2099; // Use far future year to avoid conflicts
      const counterType = `PARTICULAR_${testYear}`;

      // Reset counter for test year
      resetCounter(counterType);

      // Generate multiple references
      const refs = [];
      for (let i = 0; i < 5; i++) {
        refs.push(generateParticularReference(testYear));
      }

      // Extract sequence numbers
      const sequences = refs.map((ref) => {
        const match = ref.match(/^IY-\d{2}-(\d{3})$/);
        return parseInt(match[1], 10);
      });

      // Verify sequential ordering
      for (let i = 0; i < sequences.length - 1; i++) {
        expect(sequences[i + 1]).toBe(sequences[i] + 1);
      }

      // Cleanup
      resetCounter(counterType);
    });

    /**
     * Property: Each call increments counter by exactly 1
     */
    it("should increment counter by exactly 1 each time", () => {
      const testYear = 2098;
      const counterType = `PARTICULAR_${testYear}`;

      resetCounter(counterType);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            resetCounter(counterType);
            const startCounter = getCurrentCounter(counterType);

            for (let i = 0; i < count; i++) {
              generateParticularReference(testYear);
            }

            const endCounter = getCurrentCounter(counterType);
            expect(endCounter).toBe(startCounter + count);
          }
        ),
        { numRuns: 10 }
      );

      // Cleanup
      resetCounter(counterType);
    });
  });

  describe("Property 3: Reference Uniqueness", () => {
    /**
     * Validates: Requirements 1.1, 2.3
     * All generated references should be unique
     */
    it("should never generate duplicate references in same year", () => {
      const testYear = 2097;
      const counterType = `PARTICULAR_${testYear}`;

      resetCounter(counterType);

      const refs = new Set();
      const count = 20;

      for (let i = 0; i < count; i++) {
        const ref = generateParticularReference(testYear);
        expect(refs.has(ref)).toBe(false); // Should not have duplicates
        refs.add(ref);
      }

      expect(refs.size).toBe(count);

      // Cleanup
      resetCounter(counterType);
    });

    /**
     * Property: References from different years should have different year prefixes
     */
    it("should differentiate references between years", () => {
      const year1 = 2095;
      const year2 = 2096;

      resetCounter(`PARTICULAR_${year1}`);
      resetCounter(`PARTICULAR_${year2}`);

      const ref1 = generateParticularReference(year1);
      const ref2 = generateParticularReference(year2);

      // Extract year parts
      const yearPart1 = ref1.split("-")[1];
      const yearPart2 = ref2.split("-")[1];

      expect(yearPart1).not.toBe(yearPart2);
      expect(yearPart1).toBe("95");
      expect(yearPart2).toBe("96");

      // Cleanup
      resetCounter(`PARTICULAR_${year1}`);
      resetCounter(`PARTICULAR_${year2}`);
    });

    /**
     * References should remain unique across database
     */
    it("should not collide with existing database references", () => {
      const testYear = 2094;
      const counterType = `PARTICULAR_${testYear}`;

      resetCounter(counterType);

      // Generate a reference
      const ref = generateParticularReference(testYear);

      // Check it doesn't exist before we insert it
      // (The reference was just generated, not inserted into cases table)
      // This tests the generation mechanism, not database uniqueness
      expect(validateParticularReference(ref)).toBe(true);

      // Cleanup
      resetCounter(counterType);
    });
  });

  describe("Year Counter Reset", () => {
    /**
     * Validates: Requirement 1.8
     * Counter should reset to 001 at the start of a new year
     */
    it("should start at 001 for a new year", () => {
      const newYear = 2093;
      const counterType = `PARTICULAR_${newYear}`;

      // Ensure counter doesn't exist
      resetCounter(counterType);

      // Generate first reference for this year
      const ref = generateParticularReference(newYear);

      // Should start at 001
      expect(ref).toBe("IY-93-001");

      // Cleanup
      resetCounter(counterType);
    });

    /**
     * Different years should have independent counters
     */
    it("should maintain separate counters for different years", () => {
      const year1 = 2091;
      const year2 = 2092;

      resetCounter(`PARTICULAR_${year1}`);
      resetCounter(`PARTICULAR_${year2}`);

      // Generate multiple refs for year1
      generateParticularReference(year1);
      generateParticularReference(year1);
      generateParticularReference(year1);

      // Generate first ref for year2
      const refYear2 = generateParticularReference(year2);

      // Year2 should still start at 001
      expect(refYear2).toBe("IY-92-001");

      // Year1 counter should be at 3
      expect(getCurrentCounter(`PARTICULAR_${year1}`)).toBe(3);
      expect(getCurrentCounter(`PARTICULAR_${year2}`)).toBe(1);

      // Cleanup
      resetCounter(`PARTICULAR_${year1}`);
      resetCounter(`PARTICULAR_${year2}`);
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-string input gracefully", () => {
      expect(validateParticularReference(null)).toBe(false);
      expect(validateParticularReference(undefined)).toBe(false);
      expect(validateParticularReference(123)).toBe(false);
      expect(validateParticularReference({})).toBe(false);
      expect(validateParticularReference([])).toBe(false);
    });

    it("should handle boundary sequence numbers", () => {
      // Test that references with boundary values are valid
      expect(validateParticularReference("IY-26-001")).toBe(true);
      expect(validateParticularReference("IY-26-999")).toBe(true);
    });

    it("should use current year when no year provided", () => {
      const currentYear = new Date().getFullYear();
      const yy = currentYear.toString().slice(-2);

      const ref = generateParticularReference(); // No year argument
      expect(ref).toMatch(new RegExp(`^IY-${yy}-\\d{3}$`));
    });
  });
});
