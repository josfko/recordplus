// Property-Based Tests for Configuration Service
// Task 4.5 - Property 10: Configuration Value Validation
// **Validates: Requirements 12.8, 12.9**

import { describe, it, expect, afterAll } from "vitest";
import * as fc from "fast-check";
import {
  getAll,
  get,
  update,
  isValidEmail,
  isPositiveNumber,
  isValidNumericConfig,
  DEFAULT_CONFIG,
  ConfigValidationError,
} from "../services/configurationService.js";
import { closeDatabase, execute } from "../database.js";

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
      const validEmails = [
        "user@example.com",
        "test@domain.org",
        "name+tag@company.co",
        "user123@test.es",
        "info@sub.domain.com",
        "facturacionsiniestros@arag.es",
        "abogados@camaraygamero.org",
      ];
      for (const email of validEmails) {
        expect(isValidEmail(email)).toBe(true);
      }
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
      const validEmails = [
        "user@example.com",
        "test@domain.org",
        "info@company.es",
        "admin@site.co.uk",
      ];
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }).map((v) => v / 100),
          fc.integer({ min: 0, max: 10000 }).map((v) => v / 100),
          fc.constantFrom(...validEmails),
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

  describe("Range validation (isValidNumericConfig)", () => {
    it("should reject scientific notation extremes", () => {
      expect(isValidNumericConfig("arag_base_fee", 1.02e-35)).toBe(false);
      expect(isValidNumericConfig("vat_rate", 7.73e-17)).toBe(false);
      expect(isValidNumericConfig("arag_base_fee", 1e-10)).toBe(false);
    });

    it("should reject values above the max range", () => {
      expect(isValidNumericConfig("arag_base_fee", 99999)).toBe(false);
      expect(isValidNumericConfig("vat_rate", 101)).toBe(false);
      expect(isValidNumericConfig("mileage_torrox", 1001)).toBe(false);
    });

    it("should accept values within valid ranges", () => {
      expect(isValidNumericConfig("arag_base_fee", 203)).toBe(true);
      expect(isValidNumericConfig("vat_rate", 21)).toBe(true);
      expect(isValidNumericConfig("mileage_torrox", 0)).toBe(true);
      expect(isValidNumericConfig("mileage_marbella", 50.5)).toBe(true);
    });

    it("should reject NaN and Infinity", () => {
      expect(isValidNumericConfig("arag_base_fee", NaN)).toBe(false);
      expect(isValidNumericConfig("arag_base_fee", Infinity)).toBe(false);
      expect(isValidNumericConfig("arag_base_fee", -Infinity)).toBe(false);
    });

    it("should reject out-of-range values via update()", () => {
      expect(() => update({ arag_base_fee: 99999 })).toThrow(ConfigValidationError);
      expect(() => update({ vat_rate: 101 })).toThrow(ConfigValidationError);
      expect(() => update({ mileage_torrox: 1001 })).toThrow(ConfigValidationError);
    });

    it("should reject scientific notation extremes via update()", () => {
      expect(() => update({ arag_base_fee: 1.02e-35 })).toThrow(ConfigValidationError);
      expect(() => update({ vat_rate: 7.73e-17 })).toThrow(ConfigValidationError);
    });
  });

  describe("Stricter email validation", () => {
    it("should reject garbled and malformed email strings", () => {
      // Consecutive dots are rejected (corruption signal)
      expect(isValidEmail("a..b@example.com")).toBe(false);
      // No valid TLD (single char)
      expect(isValidEmail("user@domain.x")).toBe(false);
      // Missing local part
      expect(isValidEmail("@example.com")).toBe(false);
      // Spaces in email
      expect(isValidEmail("user name@example.com")).toBe(false);
    });

    it("should reject emails without valid TLD", () => {
      expect(isValidEmail("user@domain")).toBe(false);
      expect(isValidEmail("user@domain.x")).toBe(false);
    });

    it("should reject excessively long emails", () => {
      const longEmail = "a".repeat(250) + "@b.com";
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe("Self-healing on read", () => {
    it("should reset corrupted numeric values to defaults", () => {
      execute(
        "UPDATE configuration SET value = '1.02e-35' WHERE key = 'arag_base_fee'"
      );
      const config = getAll();
      expect(config.arag_base_fee).toBe(203.00);
    });

    it("should reset corrupted email values to defaults", () => {
      execute(
        "UPDATE configuration SET value = 'garbled@x.y' WHERE key = 'arag_email'"
      );
      const config = getAll();
      expect(config.arag_email).toBe("facturacionsiniestros@arag.es");
    });

    it("should auto-repair corrupted values in the database", () => {
      execute(
        "UPDATE configuration SET value = '9.99e+99' WHERE key = 'vat_rate'"
      );
      // First call detects and repairs
      getAll();
      // Verify the DB was actually fixed by reading raw value
      const result = get("vat_rate");
      expect(result).toBe(21);
    });

    it("should preserve valid values during self-healing", () => {
      update({ mileage_torrox: 45.50, arag_email: "test@example.com" });
      // Corrupt one value
      execute(
        "UPDATE configuration SET value = 'corrupt' WHERE key = 'arag_base_fee'"
      );
      const config = getAll();
      // Corrupted value reset to default
      expect(config.arag_base_fee).toBe(203.00);
      // Valid values preserved
      expect(config.mileage_torrox).toBe(45.50);
      expect(config.arag_email).toBe("test@example.com");
    });
  });

  describe("Password masking", () => {
    it("should mask non-empty password values in getAll()", () => {
      update({ smtp_password: "real_secret_123" });
      const config = getAll();
      expect(config.smtp_password).toBe("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
      expect(config.smtp_password).not.toBe("real_secret_123");
    });

    it("should return empty string for unset passwords", () => {
      update({ smtp_password: "" });
      const config = getAll();
      expect(config.smtp_password).toBe("");
    });

    it("should not overwrite password when placeholder is sent back", () => {
      update({ smtp_password: "my_actual_password" });
      // Simulate frontend sending the placeholder back (user didn't change it)
      update({ smtp_password: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" });
      // The actual password should be unchanged
      const raw = get("smtp_password");
      expect(raw).toBe("my_actual_password");
    });
  });
});
