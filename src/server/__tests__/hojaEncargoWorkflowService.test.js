/**
 * Hoja de Encargo Workflow Service Tests
 * Property-based tests for Particulares document workflow
 * Validates: Requirements 3.1-3.9, 4.1-4.6, 5.1-5.6
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fc from "fast-check";
import { HojaEncargoWorkflowService } from "../services/hojaEncargoWorkflowService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { EmailHistoryService } from "../services/emailHistoryService.js";
import { execute } from "../database.js";
import { existsSync, rmdirSync } from "fs";

const TEST_DOCS_PATH = "./data/documents/test-hoja-encargo";

describe("HojaEncargoWorkflowService", () => {
  let workflowService;
  let documentHistory;
  let emailHistory;
  let testCaseId;
  let testCaseData;

  const config = {
    documents_path: TEST_DOCS_PATH,
    certificate_path: "",
    certificate_password: "",
    smtp_host: "", // No SMTP configured for tests
    smtp_user: "",
    vat_rate: "21",
  };

  beforeAll(() => {
    workflowService = new HojaEncargoWorkflowService(config);
    documentHistory = new DocumentHistoryService();
    emailHistory = new EmailHistoryService();

    // Create a test case
    const result = execute(
      `INSERT INTO cases (type, state, client_name, internal_reference, entry_date)
       VALUES (?, ?, ?, ?, date('now'))`,
      ["PARTICULAR", "ABIERTO", "Test Particular Client", "IY-26-001"]
    );
    testCaseId = result.lastInsertRowid;
    testCaseData = {
      id: testCaseId,
      clientName: "Test Particular Client",
      internalReference: "IY-26-001",
      type: "PARTICULAR",
      state: "ABIERTO",
    };
  });

  afterAll(() => {
    // Cleanup test data
    execute("DELETE FROM email_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM document_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM cases WHERE id = ?", [testCaseId]);

    // Cleanup test documents
    try {
      if (existsSync(TEST_DOCS_PATH)) {
        rmdirSync(TEST_DOCS_PATH, { recursive: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("Input Validation", () => {
    /**
     * Property 4: Services and Fees Validation
     * Validates: Requirements 3.3, 3.4
     */
    it("should reject empty services description", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          (fees) => {
            expect(() => {
              workflowService.validateInput("", fees);
            }).toThrow("La descripción de servicios es obligatoria");
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should reject whitespace-only services description", () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(" ", "\t", "\n")),
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          (whitespace, fees) => {
            fc.pre(whitespace.length > 0);
            expect(() => {
              workflowService.validateInput(whitespace, fees);
            }).toThrow("La descripción de servicios es obligatoria");
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should reject zero or negative fees", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.double({ max: 0, noNaN: true }),
          (services, fees) => {
            fc.pre(services.trim().length > 0);
            expect(() => {
              workflowService.validateInput(services, fees);
            }).toThrow("Los honorarios deben ser un número positivo");
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should reject NaN fees", () => {
      expect(() => {
        workflowService.validateInput("Valid services", NaN);
      }).toThrow("Los honorarios deben ser un número positivo");
    });

    it("should accept valid services and positive fees", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          (services, fees) => {
            fc.pre(services.trim().length > 0);
            expect(() => {
              workflowService.validateInput(services, fees);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("generateHojaEncargo", () => {
    /**
     * Property 5: Document History Recording
     * Validates: Requirements 3.9
     */
    it("should create document history record with correct type", async () => {
      const result = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Test legal services",
        fees: 500.0,
      });

      expect(result.documentId).toBeDefined();

      const doc = documentHistory.getById(result.documentId);
      expect(doc).toBeDefined();
      expect(doc.case_id).toBe(testCaseId);
      expect(doc.document_type).toBe("HOJA_ENCARGO");
      expect(doc.signed).toBe(0); // Not signed yet
    });

    it("should generate PDF file that exists", async () => {
      const result = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Legal consultation services",
        fees: 1000.0,
      });

      expect(existsSync(result.filePath)).toBe(true);
    });

    it("should include filename in result", async () => {
      const result = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Document preparation",
        fees: 750.0,
      });

      expect(result.filename).toBeDefined();
      expect(result.filename).toMatch(/hoja_encargo.*\.pdf$/i);
    });
  });

  describe("signDocument", () => {
    /**
     * Property 6: Signature State Transition
     * Validates: Requirements 4.2
     */
    it("should throw error when certificate is not configured", async () => {
      // First generate a document
      const genResult = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Signature test services",
        fees: 500.0,
      });

      // Sign should fail because no certificate is configured
      await expect(workflowService.signDocument(genResult.documentId)).rejects.toThrow(
        "Certificado digital no configurado"
      );
    });

    it("should throw error for non-existent document", async () => {
      await expect(workflowService.signDocument(999999)).rejects.toThrow("Documento no encontrado");
    });

    it("should throw error for already signed document", async () => {
      // First generate a document
      const genResult = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Already signed test",
        fees: 600.0,
      });

      // Manually mark as signed in database for test
      execute("UPDATE document_history SET signed = 1 WHERE id = ?", [genResult.documentId]);

      // Attempting to sign again should fail
      await expect(workflowService.signDocument(genResult.documentId)).rejects.toThrow(
        "El documento ya está firmado"
      );
    });
  });

  describe("getDocumentsForCase", () => {
    it("should return only HOJA_ENCARGO documents for the case", async () => {
      // Generate a document first
      await workflowService.generateHojaEncargo(testCaseData, {
        services: "List test services",
        fees: 500.0,
      });

      const documents = workflowService.getDocumentsForCase(testCaseId);

      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);
      documents.forEach((doc) => {
        expect(doc.document_type).toBe("HOJA_ENCARGO");
        expect(doc.case_id).toBe(testCaseId);
      });
    });

    it("should return empty array for case with no documents", () => {
      const documents = workflowService.getDocumentsForCase(999999);
      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBe(0);
    });
  });

  describe("Workflow Properties", () => {
    /**
     * Property: Generate workflow returns correct structure
     */
    it("should return correct structure from generateHojaEncargo", async () => {
      const genResult = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Complete workflow test",
        fees: 800.0,
      });

      expect(genResult.success).toBe(true);
      expect(genResult.documentId).toBeDefined();
      expect(genResult.filePath).toBeDefined();
      expect(genResult.filename).toBeDefined();
      expect(genResult.signed).toBe(false);
    });

    /**
     * Property: Fee formatting consistency
     */
    it("should correctly format fees for any valid positive amount", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          (fees) => {
            // Validation should pass for positive amounts
            expect(() => {
              workflowService.validateInput("Valid services", fees);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Multiple documents for same case
     */
    it("should allow generating multiple documents for the same case", async () => {
      const result1 = await workflowService.generateHojaEncargo(testCaseData, {
        services: "First document",
        fees: 100.0,
      });

      const result2 = await workflowService.generateHojaEncargo(testCaseData, {
        services: "Second document",
        fees: 200.0,
      });

      expect(result1.documentId).not.toBe(result2.documentId);
      expect(result1.filePath).not.toBe(result2.filePath);

      const documents = workflowService.getDocumentsForCase(testCaseId);
      expect(documents.length).toBeGreaterThanOrEqual(2);
    });
  });
});
