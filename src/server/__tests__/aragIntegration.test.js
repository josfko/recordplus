/**
 * ARAG Integration Tests
 * End-to-end workflow tests for ARAG case automation
 * Validates: Requirements 5.1, 6.2, 7.1, 9.3
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execute, query, queryOne } from "../database.js";
import { MinutaWorkflowService } from "../services/minutaWorkflowService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { EmailHistoryService } from "../services/emailHistoryService.js";
import {
  canGenerateDocuments,
  canGenerateSuplido,
} from "../services/aragValidation.js";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

describe("ARAG Integration Tests", () => {
  let testCaseId;
  let testConfig;
  const testDocsPath = "data/documents/test";

  beforeAll(() => {
    // Ensure test documents directory exists
    mkdirSync(testDocsPath, { recursive: true });

    // Create a test ARAG case
    const result = execute(
      `INSERT INTO cases (type, state, client_name, internal_reference, arag_reference, entry_date)
       VALUES (?, ?, ?, ?, ?, date('now'))`,
      ["ARAG", "ABIERTO", "Integration Test Client", "IY777001", "DJ00777001"],
    );
    testCaseId = Number(result.lastInsertRowid);

    // Test configuration
    testConfig = {
      arag_base_fee: "203",
      vat_rate: "21",
      arag_email: "test@arag.es",
      documents_path: testDocsPath,
      mileage_torrox: "45.50",
      mileage_marbella: "75.00",
      // SMTP not configured for tests
    };
  });

  afterAll(() => {
    // Cleanup test data
    execute("DELETE FROM email_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM document_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM cases WHERE id = ?", [testCaseId]);
  });

  describe("19.1 Complete Minuta Workflow", () => {
    /**
     * Integration test for complete minuta workflow
     * Validates: Requirements 5.1
     */
    it("should generate minuta, sign, and record history", async () => {
      const rawCaseData = queryOne("SELECT * FROM cases WHERE id = ?", [
        testCaseId,
      ]);
      expect(rawCaseData).toBeTruthy();
      expect(rawCaseData.type).toBe("ARAG");

      // Convert snake_case to camelCase for service compatibility
      const caseData = {
        id: rawCaseData.id,
        type: rawCaseData.type,
        state: rawCaseData.state,
        clientName: rawCaseData.client_name,
        internalReference: rawCaseData.internal_reference,
        aragReference: rawCaseData.arag_reference,
        entryDate: rawCaseData.entry_date,
      };

      // Verify case can generate documents
      const canGenerate = canGenerateDocuments({
        type: caseData.type,
        state: caseData.state,
      });
      expect(canGenerate.allowed).toBe(true);

      // Execute minuta workflow
      const workflow = new MinutaWorkflowService(testConfig);
      const result = await workflow.executeMinutaWorkflow(caseData, testConfig);

      // Verify workflow completed
      expect(result).toBeTruthy();
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);

      // Verify PDF was generated
      const generateStep = result.steps.find((s) => s.step === "generate");
      expect(generateStep).toBeTruthy();
      expect(generateStep.status).toBe("completed");

      // Verify document was recorded in history
      const docHistory = new DocumentHistoryService();
      const docs = docHistory.getByCaseId(testCaseId);
      expect(docs.length).toBeGreaterThan(0);

      const minutaDoc = docs.find((d) => d.document_type === "MINUTA");
      expect(minutaDoc).toBeTruthy();

      // Verify email step (should be skipped since SMTP not configured)
      const emailStep = result.steps.find((s) => s.step === "email");
      expect(emailStep).toBeTruthy();
      expect(emailStep.status).toBe("skipped");
    });
  });

  describe("19.2 Suplido Workflow", () => {
    /**
     * Integration test for suplido workflow
     * Validates: Requirements 6.2, 7.1
     */
    it("should require judicial state for suplido generation", () => {
      const rawCaseData = queryOne("SELECT * FROM cases WHERE id = ?", [
        testCaseId,
      ]);

      // Case is in ABIERTO state, should not allow suplido
      const canGenerate = canGenerateSuplido({
        type: rawCaseData.type,
        state: rawCaseData.state,
      });
      expect(canGenerate.allowed).toBe(false);
      expect(canGenerate.reason).toContain("judiciales");
    });

    it("should generate suplido for judicial ARAG case", async () => {
      // Transition case to judicial state
      execute(
        "UPDATE cases SET state = ?, judicial_date = date('now'), judicial_district = ? WHERE id = ?",
        ["JUDICIAL", "Torrox", testCaseId],
      );

      const rawCaseData = queryOne("SELECT * FROM cases WHERE id = ?", [
        testCaseId,
      ]);
      expect(rawCaseData.state).toBe("JUDICIAL");

      // Convert snake_case to camelCase for service compatibility
      const caseData = {
        id: rawCaseData.id,
        type: rawCaseData.type,
        state: rawCaseData.state,
        clientName: rawCaseData.client_name,
        internalReference: rawCaseData.internal_reference,
        aragReference: rawCaseData.arag_reference,
        entryDate: rawCaseData.entry_date,
        judicialDistrict: rawCaseData.judicial_district,
      };

      // Verify case can generate suplido
      const canGenerate = canGenerateSuplido({
        type: caseData.type,
        state: caseData.state,
      });
      expect(canGenerate.allowed).toBe(true);

      // Execute suplido workflow
      const workflow = new MinutaWorkflowService(testConfig);
      const result = await workflow.executeSuplidoWorkflow(
        caseData,
        "Torrox",
        45.5,
        testConfig,
      );

      // Verify workflow completed
      expect(result).toBeTruthy();
      expect(result.steps).toBeDefined();

      // Verify document was recorded
      const docHistory = new DocumentHistoryService();
      const docs = docHistory.getByCaseId(testCaseId);
      const suplidoDoc = docs.find((d) => d.document_type === "SUPLIDO");
      expect(suplidoDoc).toBeTruthy();
    });
  });

  describe("19.3 Archive Restrictions", () => {
    /**
     * Integration test for archive restrictions
     * Validates: Requirements 9.3
     */
    it("should block document generation for archived cases", () => {
      // Archive the case
      execute(
        "UPDATE cases SET state = ?, closure_date = date('now') WHERE id = ?",
        ["ARCHIVADO", testCaseId],
      );

      const caseData = queryOne("SELECT * FROM cases WHERE id = ?", [
        testCaseId,
      ]);
      expect(caseData.state).toBe("ARCHIVADO");

      // Verify minuta generation is blocked
      const canGenerateMinuta = canGenerateDocuments({
        type: caseData.type,
        state: caseData.state,
      });
      expect(canGenerateMinuta.allowed).toBe(false);
      expect(canGenerateMinuta.reason).toContain("archivados");

      // Verify suplido generation is blocked
      const canGenerateSuplidoResult = canGenerateSuplido({
        type: caseData.type,
        state: caseData.state,
      });
      expect(canGenerateSuplidoResult.allowed).toBe(false);
    });

    it("should preserve history after archiving", () => {
      // Verify history is still accessible for archived case
      const docHistory = new DocumentHistoryService();
      const emailHistory = new EmailHistoryService();

      const docs = docHistory.getByCaseId(testCaseId);
      const emails = emailHistory.getByCaseId(testCaseId);

      // Should have documents from previous tests
      expect(docs.length).toBeGreaterThan(0);

      // Documents should still be retrievable by ID
      const firstDoc = docs[0];
      const retrieved = docHistory.getById(firstDoc.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.case_id).toBe(testCaseId);
    });
  });
});
