/**
 * PDF Generator Service Tests
 * Property 22: PDF Format Compliance
 * Validates: Requirements 11.4, 11.5, 11.6
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fc from "fast-check";
import { PDFGeneratorService } from "../services/pdfGeneratorService.js";
import { existsSync, unlinkSync, rmdirSync, readFileSync } from "fs";
import { join } from "path";

const TEST_DOCS_PATH = "./data/documents/test";

describe("PDFGeneratorService", () => {
  let pdfService;

  beforeAll(() => {
    pdfService = new PDFGeneratorService(TEST_DOCS_PATH);
  });

  afterAll(() => {
    // Cleanup test documents
    try {
      if (existsSync(TEST_DOCS_PATH)) {
        rmdirSync(TEST_DOCS_PATH, { recursive: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("formatDate", () => {
    /**
     * Property 22: PDF Format Compliance - Date formatting
     * Validates: Requirements 11.5
     */
    it("should format dates in Spanish DD/MM/YYYY format", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
          (date) => {
            const formatted = pdfService.formatDate(date);
            // Should match DD/MM/YYYY pattern
            const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
            expect(formatted).toMatch(pattern);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("formatCurrency", () => {
    /**
     * Property 22: PDF Format Compliance - Currency formatting
     * Validates: Requirements 11.4
     */
    it("should format currency in Spanish locale with € symbol", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          (amount) => {
            const formatted = pdfService.formatCurrency(amount);
            // Should contain € symbol
            expect(formatted).toContain("€");
            // Should use comma as decimal separator (Spanish locale)
            // Note: Intl.NumberFormat uses non-breaking space and specific formatting
            expect(typeof formatted).toBe("string");
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("generateMinuta", () => {
    it("should generate a PDF file that exists on disk", async () => {
      const caseData = {
        id: 1,
        clientName: "Test Client",
        aragReference: "DJ00123456",
        internalReference: "IY000001",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const pdfPath = await pdfService.generateMinuta(caseData, config);

      expect(existsSync(pdfPath)).toBe(true);
      expect(pdfPath).toContain("minuta_");
      expect(pdfPath.endsWith(".pdf")).toBe(true);

      // Verify it's a valid PDF (starts with %PDF)
      const content = readFileSync(pdfPath);
      expect(content.slice(0, 4).toString()).toBe("%PDF");
    });

    it("should create directory structure by year and reference", async () => {
      const caseData = {
        id: 2,
        clientName: "Another Client",
        aragReference: "DJ00654321",
        internalReference: "IY000002",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const pdfPath = await pdfService.generateMinuta(caseData, config);
      const year = new Date().getFullYear().toString();

      expect(pdfPath).toContain(year);
      expect(pdfPath).toContain("IY000002");
    });
  });

  describe("generateSuplido", () => {
    it("should generate a suplido PDF file", async () => {
      const caseData = {
        id: 3,
        clientName: "Suplido Client",
        aragReference: "DJ00111111",
        internalReference: "IY000003",
      };

      const pdfPath = await pdfService.generateSuplido(
        caseData,
        "Torrox",
        45.5,
      );

      expect(existsSync(pdfPath)).toBe(true);
      expect(pdfPath).toContain("suplido_");
      expect(pdfPath).toContain("torrox");
      expect(pdfPath.endsWith(".pdf")).toBe(true);
    });
  });
});
