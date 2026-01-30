/**
 * Minuta Workflow Service Tests
 * Property 10: Workflow Step Ordering
 * Validates: Requirements 5.1
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MinutaWorkflowService } from "../services/minutaWorkflowService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { EmailHistoryService } from "../services/emailHistoryService.js";
import { execute, query } from "../database.js";
import { existsSync, rmdirSync } from "fs";

const TEST_DOCS_PATH = "./data/documents/test-workflow";

describe("MinutaWorkflowService", () => {
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
    arag_base_fee: "203.00",
    vat_rate: "21",
    arag_email: "test@arag.es",
  };

  beforeAll(() => {
    workflowService = new MinutaWorkflowService(config);
    documentHistory = new DocumentHistoryService();
    emailHistory = new EmailHistoryService();

    // Create a test case
    const result = execute(
      `INSERT INTO cases (type, state, client_name, internal_reference, arag_reference, entry_date)
       VALUES (?, ?, ?, ?, ?, date('now'))`,
      ["ARAG", "ABIERTO", "Workflow Test Client", "IY998001", "DJ00998001"],
    );
    testCaseId = result.lastInsertRowid;
    testCaseData = {
      id: testCaseId,
      clientName: "Workflow Test Client",
      internalReference: "IY998001",
      aragReference: "DJ00998001",
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

  describe("executeMinutaWorkflow", () => {
    /**
     * Property 10: Workflow Step Ordering
     * Validates: Requirements 5.1
     */
    it("should execute steps in order: generate → sign → record", async () => {
      const result = await workflowService.executeMinutaWorkflow(
        testCaseData,
        config,
      );

      // Verify step order
      expect(result.steps.length).toBe(3);
      expect(result.steps[0].step).toBe("generate");
      expect(result.steps[1].step).toBe("sign");
      expect(result.steps[2].step).toBe("email");

      // Generate and sign should complete
      expect(result.steps[0].status).toBe("completed");
      expect(result.steps[1].status).toBe("completed");

      // Email should be skipped (no SMTP configured)
      expect(result.steps[2].status).toBe("skipped");
    });

    it("should create document history record", async () => {
      const result = await workflowService.executeMinutaWorkflow(
        testCaseData,
        config,
      );

      expect(result.documentId).toBeDefined();

      const doc = documentHistory.getById(result.documentId);
      expect(doc).toBeDefined();
      expect(doc.case_id).toBe(testCaseId);
      expect(doc.document_type).toBe("MINUTA");
      expect(doc.signed).toBe(1);
    });

    it("should generate PDF file that exists", async () => {
      const result = await workflowService.executeMinutaWorkflow(
        testCaseData,
        config,
      );

      const signedPath = result.steps[1].path;
      expect(existsSync(signedPath)).toBe(true);
    });

    it("should mark workflow as successful", async () => {
      const result = await workflowService.executeMinutaWorkflow(
        testCaseData,
        config,
      );
      expect(result.success).toBe(true);
    });
  });

  describe("executeSuplidoWorkflow", () => {
    it("should generate suplido document", async () => {
      const result = await workflowService.executeSuplidoWorkflow(
        testCaseData,
        "Torrox",
        45.5,
        config,
      );

      expect(result.success).toBe(true);
      expect(result.documentId).toBeDefined();
      expect(result.amount).toBe(45.5);
      expect(result.district).toBe("Torrox");

      const doc = documentHistory.getById(result.documentId);
      expect(doc.document_type).toBe("SUPLIDO");
    });

    it("should execute steps in order for suplido", async () => {
      const result = await workflowService.executeSuplidoWorkflow(
        testCaseData,
        "Marbella",
        75.0,
        config,
      );

      expect(result.steps.length).toBe(2);
      expect(result.steps[0].step).toBe("generate");
      expect(result.steps[1].step).toBe("sign");
      expect(result.steps[0].status).toBe("completed");
      expect(result.steps[1].status).toBe("completed");
    });
  });
});
