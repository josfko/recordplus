/**
 * Signature Service Tests
 * Property 7: Digital Signature Application
 * Validates: Requirements 3.1, 3.2, 3.3
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SignatureService } from "../services/signatureService.js";
import { PDFGeneratorService } from "../services/pdfGeneratorService.js";
import {
  existsSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
  mkdirSync,
} from "fs";

const TEST_DOCS_PATH = "./data/documents/test-signature";
const TEST_CERT_PATH = "./data/certificates/test.p12";

describe("SignatureService", () => {
  let signatureService;
  let pdfService;

  beforeAll(() => {
    // Use visual signature (no certificate) for tests
    signatureService = new SignatureService("", "");
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

  describe("signPDF", () => {
    /**
     * Property 7: Digital Signature Application
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    it("should create a signed PDF file that exists on disk", async () => {
      // First generate a PDF to sign
      const caseData = {
        id: 1,
        clientName: "Signature Test Client",
        aragReference: "DJ00999999",
        internalReference: "IY000099",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const originalPath = await pdfService.generateMinuta(caseData, config);

      // Sign the PDF
      const signedPath = await signatureService.signPDF(originalPath);

      // Verify signed file exists
      expect(existsSync(signedPath)).toBe(true);

      // Verify signed path has _signed suffix
      expect(signedPath).toContain("_signed.pdf");
    });

    it("should produce a signed file different from the original", async () => {
      const caseData = {
        id: 2,
        clientName: "Diff Test Client",
        aragReference: "DJ00888888",
        internalReference: "IY000088",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const originalPath = await pdfService.generateMinuta(caseData, config);
      const originalContent = readFileSync(originalPath);

      const signedPath = await signatureService.signPDF(originalPath);
      const signedContent = readFileSync(signedPath);

      // Files should be different (signed has additional content)
      expect(signedContent.length).toBeGreaterThan(originalContent.length);
    });

    it("should produce a valid PDF file", async () => {
      const caseData = {
        id: 3,
        clientName: "Valid PDF Client",
        aragReference: "DJ00777777",
        internalReference: "IY000077",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const originalPath = await pdfService.generateMinuta(caseData, config);
      const signedPath = await signatureService.signPDF(originalPath);

      // Verify it's a valid PDF (starts with %PDF)
      const content = readFileSync(signedPath);
      expect(content.slice(0, 4).toString()).toBe("%PDF");
    });
  });

  describe("verifyCertificate", () => {
    it("should return false for empty certificate path", () => {
      const service = new SignatureService("", "password");
      expect(service.verifyCertificate()).toBe(false);
    });

    it("should return false for non-existent certificate", () => {
      const service = new SignatureService("/nonexistent/path.p12", "password");
      expect(service.verifyCertificate()).toBe(false);
    });

    it("should return true for existing certificate file", () => {
      // Create a dummy certificate file for testing
      const testCertDir = "./data/certificates";
      const testCertFile = "./data/certificates/test-verify.p12";

      if (!existsSync(testCertDir)) {
        mkdirSync(testCertDir, { recursive: true });
      }
      writeFileSync(testCertFile, "dummy-cert-content");

      const service = new SignatureService(testCertFile, "password");
      expect(service.verifyCertificate()).toBe(true);
    });
  });

  describe("Strategy Pattern", () => {
    it("should use visual strategy when no certificate configured", () => {
      const service = new SignatureService("", "");
      const info = service.getSignatureInfo();

      expect(info.type).toBe("visual");
      expect(info.details).toContain("visual");
    });

    it("should use crypto strategy when certificate path is provided", () => {
      const service = new SignatureService("/path/to/cert.p12", "password");
      const info = service.getSignatureInfo();

      expect(info.type).toBe("cryptographic");
      expect(info.details).toContain("P12");
    });

    it("should report isCryptoConfigured as false when certificate does not exist", () => {
      const service = new SignatureService("/nonexistent/cert.p12", "password");
      expect(service.isCryptoConfigured()).toBe(false);
    });

    it("should report isCryptoConfigured as false when using visual signature", () => {
      const service = new SignatureService("", "");
      expect(service.isCryptoConfigured()).toBe(false);
    });
  });
});
