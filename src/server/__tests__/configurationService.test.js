// Property-Based Tests for Configuration Service
// Task 4.5 - Property 10: Configuration Value Validation
// **Validates: Requirements 12.8, 12.9**

import { describe, it, afterAll } from "vitest";
import * as fc from "fast-check";
import {
  getAll,
  get,
  update,
  isValidEmail,
  isPositiveNumber,
  DEFAULT_CONFIG,
  ConfigValidationError,
} from "../services/configurationService.js";
import { closeDatabase } from "../database.js";

// Clean up after all tests
afterAll(() => {
  closeDatabase();
});

describe("Configuration Service - Property Tests", () => {
  /**
   * Property 10: Configuration Value Validation
   * For any configuration update: fee and VAT values must be positive numbers,
   * email values must match valid email format.
   * **Validates: Requirements 12.8, 12.9**
   */
  describe("Property 10: Configuration Value Validation", () => {
    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should accept valid positive numbers for numeric fields", () => {
      fc.assert(
        fc.property(fc.double({ min: 0, max: 10000, noNaN: true }), (value) => {
          // Test that positive numbers are accepted
          return isPositiveNumber(value) === true;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject negative numbers for numeric fields", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10000, max: -0.01, noNaN: true }),
          (value) => {
            // Negative numbers should be rejected
            return isPositiveNumber(value) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject non-numeric values for numeric fields", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(""),
            fc.constant("abc"),
            fc.constant("not-a-number"),
            fc.constant(NaN)
          ),
          (value) => {
            return isPositiveNumber(value) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should accept valid email formats", () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          return isValidEmail(email) === true;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject invalid email formats", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(""),
            fc.constant("notanemail"),
            fc.constant("missing@domain"),
            fc.constant("@nodomain.com"),
            fc.constant("spaces in@email.com"),
            fc.constant("no@dots")
          ),
          (email) => {
            return isValidEmail(email) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject updates with negative fee values", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10000, max: -0.01, noNaN: true }),
          (negativeValue) => {
            try {
              update({ arag_base_fee: negativeValue });
              return false; // Should have thrown
            } catch (e) {
              return (
                e instanceof ConfigValidationError &&
                e.field === "arag_base_fee"
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject updates with negative VAT values", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100, max: -0.01, noNaN: true }),
          (negativeValue) => {
            try {
              update({ vat_rate: negativeValue });
              return false; // Should have thrown
            } catch (e) {
              return (
                e instanceof ConfigValidationError && e.field === "vat_rate"
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject updates with invalid email format", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant("notanemail"),
            fc.constant("missing@domain"),
            fc.constant("@nodomain.com"),
            fc.constant("no@dots")
          ),
          (invalidEmail) => {
            try {
              update({ arag_email: invalidEmail });
              return false; // Should have thrown
            } catch (e) {
              return (
                e instanceof ConfigValidationError && e.field === "arag_email"
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should accept valid configuration updates", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000, noNaN: true }),
          fc.double({ min: 0, max: 100, noNaN: true }),
          fc.emailAddress(),
          (fee, vat, email) => {
            try {
              const result = update({
                arag_base_fee: fee,
                vat_rate: vat,
                arag_email: email,
              });

              // Verify the values were updated
              return (
                Math.abs(result.arag_base_fee - fee) < 0.01 &&
                Math.abs(result.vat_rate - vat) < 0.01 &&
                result.arag_email === email
              );
            } catch (e) {
              // Should not throw for valid values
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should reject unknown configuration keys", () => {
      // Use explicit unknown keys to avoid Object prototype properties
      const unknownKeys = [
        "unknown_key",
        "invalid_config",
        "random_setting",
        "test_value",
        "foo_bar",
        "some_other_key",
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...unknownKeys),
          fc.anything(),
          (unknownKey, value) => {
            try {
              update({ [unknownKey]: value });
              return false; // Should have thrown
            } catch (e) {
              return (
                e instanceof ConfigValidationError && e.field === unknownKey
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: core-case-management, Property 10: Configuration Value Validation
    // Validates: Requirements 12.8, 12.9
    it("should validate all mileage fields as positive numbers", () => {
      const mileageKeys = [
        "mileage_torrox",
        "mileage_velez_malaga",
        "mileage_torremolinos",
        "mileage_fuengirola",
        "mileage_marbella",
        "mileage_estepona",
        "mileage_antequera",
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...mileageKeys),
          fc.double({ min: -1000, max: -0.01, noNaN: true }),
          (key, negativeValue) => {
            try {
              update({ [key]: negativeValue });
              return false; // Should have thrown
            } catch (e) {
              return e instanceof ConfigValidationError && e.field === key;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
