/**
 * ARAG Validation Tests
 * Property 1: ARAG Reference Format Validation
 * Property 14: Partido Judicial Validation
 * Property 17: Mileage Rate Validation
 * Property 5: Minuta Amount Calculation
 * Validates: Requirements 1.1, 1.5, 7.2, 8.3, 2.3
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateAragReference,
  isValidJudicialDistrict,
  isValidMileageRate,
  calculateMinutaAmounts,
  getMileageRate,
  VALID_JUDICIAL_DISTRICTS,
  canGenerateDocuments,
  canGenerateSuplido,
} from "../services/aragValidation.js";

describe("ARAG Validation", () => {
  describe("validateAragReference", () => {
    /**
     * Property 1: ARAG Reference Format Validation
     * Validates: Requirements 1.1, 1.5
     */
    it("should accept valid DJ00 + 6 digits format", () => {
      fc.assert(
        fc.property(
          fc.stringOf(
            fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
            { minLength: 6, maxLength: 6 },
          ),
          (digits) => {
            const validRef = `DJ00${digits}`;
            expect(validateAragReference(validRef)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid formats", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !/^DJ00\d{6}$/.test(s)),
          (invalidRef) => {
            expect(validateAragReference(invalidRef)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject non-string inputs", () => {
      expect(validateAragReference(null)).toBe(false);
      expect(validateAragReference(undefined)).toBe(false);
      expect(validateAragReference(123456)).toBe(false);
      expect(validateAragReference({})).toBe(false);
    });
  });

  describe("isValidJudicialDistrict", () => {
    /**
     * Property 14: Partido Judicial Validation
     * Validates: Requirements 7.2
     */
    it("should accept only valid districts", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_JUDICIAL_DISTRICTS),
          (district) => {
            expect(isValidJudicialDistrict(district)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject invalid districts", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !VALID_JUDICIAL_DISTRICTS.includes(s)),
          (invalidDistrict) => {
            expect(isValidJudicialDistrict(invalidDistrict)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject non-string inputs", () => {
      expect(isValidJudicialDistrict(null)).toBe(false);
      expect(isValidJudicialDistrict(undefined)).toBe(false);
      expect(isValidJudicialDistrict(123)).toBe(false);
    });
  });

  describe("isValidMileageRate", () => {
    /**
     * Property 17: Mileage Rate Validation
     * Validates: Requirements 8.3
     */
    it("should accept non-negative numbers", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1000, noNaN: true }), (rate) => {
          expect(isValidMileageRate(rate)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("should accept string representations of non-negative numbers", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1000, noNaN: true }), (rate) => {
          expect(isValidMileageRate(rate.toString())).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("should reject negative numbers", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(-1000),
            max: Math.fround(-0.01),
            noNaN: true,
          }),
          (rate) => {
            expect(isValidMileageRate(rate)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject non-numeric values", () => {
      expect(isValidMileageRate("abc")).toBe(false);
      expect(isValidMileageRate(null)).toBe(false);
      expect(isValidMileageRate(undefined)).toBe(false);
      expect(isValidMileageRate(NaN)).toBe(false);
    });
  });

  describe("calculateMinutaAmounts", () => {
    /**
     * Property 5: Minuta Amount Calculation
     * Validates: Requirements 2.3
     */
    it("should calculate total as base + (base * vatRate / 100)", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(0.01),
            max: Math.fround(10000),
            noNaN: true,
          }),
          fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
          (baseFee, vatRate) => {
            const result = calculateMinutaAmounts(baseFee, vatRate);

            const expectedVat = baseFee * (vatRate / 100);
            const expectedTotal = baseFee + expectedVat;

            // Allow for small floating point differences
            expect(result.vatAmount).toBeCloseTo(expectedVat, 1);
            expect(result.total).toBeCloseTo(expectedTotal, 1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle default ARAG values correctly", () => {
      const result = calculateMinutaAmounts(203, 21);

      expect(result.baseFee).toBe(203);
      expect(result.vatAmount).toBeCloseTo(42.63, 2);
      expect(result.total).toBeCloseTo(245.63, 2);
    });

    it("should handle string inputs", () => {
      const result = calculateMinutaAmounts("203.00", "21");

      expect(result.baseFee).toBe(203);
      expect(result.vatAmount).toBeCloseTo(42.63, 2);
    });
  });

  describe("getMileageRate", () => {
    it("should return rate from config for valid district", () => {
      const config = {
        mileage_torrox: "45.50",
        mileage_marbella: "75.00",
      };

      expect(getMileageRate(config, "Torrox")).toBe(45.5);
      expect(getMileageRate(config, "Marbella")).toBe(75.0);
    });

    it("should return 0 for invalid district", () => {
      const config = { mileage_torrox: "45.50" };
      expect(getMileageRate(config, "InvalidDistrict")).toBe(0);
    });

    it("should return 0 for missing config key", () => {
      const config = {};
      expect(getMileageRate(config, "Torrox")).toBe(0);
    });
  });
});

describe("State Transition Restrictions", () => {
  describe("canGenerateDocuments", () => {
    /**
     * Property 19: Archived Case Document Restriction
     * Validates: Requirements 9.3
     */
    it("should reject archived cases", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1 }),
            type: fc.constant("ARAG"),
            state: fc.constant("ARCHIVADO"),
            clientName: fc.string({ minLength: 1 }),
          }),
          (caseData) => {
            const result = canGenerateDocuments(caseData);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("archivados");
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should reject non-ARAG cases", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1 }),
            type: fc.constantFrom("PARTICULAR", "TURNO_OFICIO"),
            state: fc.constantFrom("ABIERTO", "JUDICIAL"),
            clientName: fc.string({ minLength: 1 }),
          }),
          (caseData) => {
            const result = canGenerateDocuments(caseData);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("ARAG");
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should allow non-archived ARAG cases", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1 }),
            type: fc.constant("ARAG"),
            state: fc.constantFrom("ABIERTO", "JUDICIAL"),
            clientName: fc.string({ minLength: 1 }),
          }),
          (caseData) => {
            const result = canGenerateDocuments(caseData);
            expect(result.allowed).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should reject invalid case data", () => {
      expect(canGenerateDocuments(null).allowed).toBe(false);
      expect(canGenerateDocuments(undefined).allowed).toBe(false);
      expect(canGenerateDocuments("string").allowed).toBe(false);
    });
  });

  describe("canGenerateSuplido", () => {
    /**
     * Property 13: Suplido State Restriction
     * Validates: Requirements 6.6
     */
    it("should only allow judicial ARAG cases", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1 }),
            type: fc.constant("ARAG"),
            state: fc.constant("JUDICIAL"),
            clientName: fc.string({ minLength: 1 }),
          }),
          (caseData) => {
            const result = canGenerateSuplido(caseData);
            expect(result.allowed).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should reject non-judicial ARAG cases", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1 }),
            type: fc.constant("ARAG"),
            state: fc.constantFrom("ABIERTO", "ARCHIVADO"),
            clientName: fc.string({ minLength: 1 }),
          }),
          (caseData) => {
            const result = canGenerateSuplido(caseData);
            expect(result.allowed).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should reject archived judicial cases", () => {
      const caseData = {
        id: 1,
        type: "ARAG",
        state: "ARCHIVADO",
        clientName: "Test",
      };
      const result = canGenerateSuplido(caseData);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("archivados");
    });
  });
});
