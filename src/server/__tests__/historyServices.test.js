/**
 * History Services Tests
 * Property 6: Document History Recording
 * Property 9: Email History Recording
 * Property 21: History Ordering
 * Validates: Requirements 2.6, 4.4, 10.5
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fc from "fast-check";
import { DocumentHistoryService } from "../services/documentHistoryService.js";
import { EmailHistoryService } from "../services/emailHistoryService.js";
import { getDatabase, execute, query } from "../database.js";

describe("DocumentHistoryService", () => {
  let documentHistory;
  let testCaseId;

  beforeAll(() => {
    documentHistory = new DocumentHistoryService();
    // Create a test case
    const result = execute(
      `INSERT INTO cases (type, state, client_name, internal_reference, entry_date)
       VALUES (?, ?, ?, ?, date('now'))`,
      ["ARAG", "ABIERTO", "Test History Client", "IY999001"],
    );
    testCaseId = result.lastInsertRowid;
  });

  afterAll(() => {
    // Cleanup test data
    execute("DELETE FROM document_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM email_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM cases WHERE id = ?", [testCaseId]);
  });

  describe("create", () => {
    /**
     * Property 6: Document History Recording
     * Validates: Requirements 2.6
     */
    it("should create document record with correct fields", () => {
      const doc = documentHistory.create({
        caseId: testCaseId,
        documentType: "MINUTA",
        filePath: "/test/path/minuta.pdf",
        signed: 1,
      });

      expect(doc).toBeDefined();
      expect(doc.case_id).toBe(testCaseId);
      expect(doc.document_type).toBe("MINUTA");
      expect(doc.file_path).toBe("/test/path/minuta.pdf");
      expect(doc.signed).toBe(1);
      expect(doc.generated_at).toBeDefined();
    });

    it("should create suplido document record", () => {
      const doc = documentHistory.create({
        caseId: testCaseId,
        documentType: "SUPLIDO",
        filePath: "/test/path/suplido.pdf",
        signed: 1,
      });

      expect(doc.document_type).toBe("SUPLIDO");
    });
  });

  describe("getByCaseId", () => {
    /**
     * Property 21: History Ordering
     * Validates: Requirements 10.5
     */
    it("should return documents ordered by date descending", async () => {
      // Create multiple documents with slight delay
      documentHistory.create({
        caseId: testCaseId,
        documentType: "MINUTA",
        filePath: "/test/first.pdf",
        signed: 0,
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      documentHistory.create({
        caseId: testCaseId,
        documentType: "MINUTA",
        filePath: "/test/second.pdf",
        signed: 1,
      });

      const docs = documentHistory.getByCaseId(testCaseId);

      expect(docs.length).toBeGreaterThanOrEqual(2);
      // Most recent should be first
      for (let i = 0; i < docs.length - 1; i++) {
        const current = new Date(docs[i].generated_at);
        const next = new Date(docs[i + 1].generated_at);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe("updateSigned", () => {
    it("should update signed status", () => {
      const doc = documentHistory.create({
        caseId: testCaseId,
        documentType: "MINUTA",
        filePath: "/test/unsigned.pdf",
        signed: 0,
      });

      expect(doc.signed).toBe(0);

      documentHistory.updateSigned(doc.id, true);

      const updated = documentHistory.getById(doc.id);
      expect(updated.signed).toBe(1);
    });
  });
});

describe("EmailHistoryService", () => {
  let emailHistory;
  let testCaseId;

  beforeAll(() => {
    emailHistory = new EmailHistoryService();
    // Create a test case
    const result = execute(
      `INSERT INTO cases (type, state, client_name, internal_reference, entry_date)
       VALUES (?, ?, ?, ?, date('now'))`,
      ["ARAG", "ABIERTO", "Test Email Client", "IY999002"],
    );
    testCaseId = result.lastInsertRowid;
  });

  afterAll(() => {
    // Cleanup test data
    execute("DELETE FROM email_history WHERE case_id = ?", [testCaseId]);
    execute("DELETE FROM cases WHERE id = ?", [testCaseId]);
  });

  describe("create", () => {
    /**
     * Property 9: Email History Recording
     * Validates: Requirements 4.4
     */
    it("should create email record with SENT status", () => {
      const email = emailHistory.create({
        caseId: testCaseId,
        documentId: null,
        recipient: "test@arag.es",
        subject: "DJ00123456 - MINUTA",
        status: "SENT",
      });

      expect(email).toBeDefined();
      expect(email.case_id).toBe(testCaseId);
      expect(email.recipient).toBe("test@arag.es");
      expect(email.subject).toBe("DJ00123456 - MINUTA");
      expect(email.status).toBe("SENT");
      expect(email.sent_at).toBeDefined();
      expect(email.error_message).toBeNull();
    });

    /**
     * Property 9: Email History Recording - Error case
     * Validates: Requirements 4.5
     */
    it("should create email record with ERROR status and message", () => {
      const email = emailHistory.create({
        caseId: testCaseId,
        documentId: null,
        recipient: "test@arag.es",
        subject: "DJ00123456 - MINUTA",
        status: "ERROR",
        errorMessage: "SMTP connection refused",
      });

      expect(email.status).toBe("ERROR");
      expect(email.error_message).toBe("SMTP connection refused");
    });
  });

  describe("getByCaseId", () => {
    /**
     * Property 21: History Ordering
     * Validates: Requirements 10.5
     */
    it("should return emails ordered by date descending", async () => {
      emailHistory.create({
        caseId: testCaseId,
        recipient: "first@test.com",
        subject: "First email",
        status: "SENT",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      emailHistory.create({
        caseId: testCaseId,
        recipient: "second@test.com",
        subject: "Second email",
        status: "SENT",
      });

      const emails = emailHistory.getByCaseId(testCaseId);

      expect(emails.length).toBeGreaterThanOrEqual(2);
      // Most recent should be first
      for (let i = 0; i < emails.length - 1; i++) {
        const current = new Date(emails[i].sent_at);
        const next = new Date(emails[i + 1].sent_at);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe("getFailedByCaseId", () => {
    it("should return only failed emails", () => {
      const failed = emailHistory.getFailedByCaseId(testCaseId);

      for (const email of failed) {
        expect(email.status).toBe("ERROR");
      }
    });
  });
});

describe("History Preservation", () => {
  /**
   * Property 20: History Preservation on Archive
   * Validates: Requirements 9.4
   */
  describe("Property 20: History Preservation on Archive", () => {
    let preservationTestCaseId;

    beforeAll(() => {
      // Create a test case for preservation tests
      const result = execute(
        `INSERT INTO cases (type, state, client_name, internal_reference, entry_date)
         VALUES (?, ?, ?, ?, date('now'))`,
        ["ARAG", "ABIERTO", "Preservation Test Client", "IY888001"],
      );
      preservationTestCaseId = Number(result.lastInsertRowid);
    });

    afterAll(() => {
      // Cleanup
      execute("DELETE FROM document_history WHERE case_id = ?", [
        preservationTestCaseId,
      ]);
      execute("DELETE FROM email_history WHERE case_id = ?", [
        preservationTestCaseId,
      ]);
      execute("DELETE FROM cases WHERE id = ?", [preservationTestCaseId]);
    });

    it("document history should persist after case state changes", () => {
      const docService = new DocumentHistoryService();

      // Create a document record
      const doc = docService.create({
        caseId: preservationTestCaseId,
        documentType: "MINUTA",
        filePath: "/test/test_minuta.pdf",
        signed: false,
      });

      // Verify document exists
      const retrieved = docService.getById(doc.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.case_id).toBe(preservationTestCaseId);

      // Simulate archiving the case
      execute("UPDATE cases SET state = ? WHERE id = ?", [
        "ARCHIVADO",
        preservationTestCaseId,
      ]);

      // Verify document is still accessible after archive
      const afterArchive = docService.getById(doc.id);
      expect(afterArchive).toBeTruthy();
      expect(afterArchive.case_id).toBe(preservationTestCaseId);

      // Verify document is still in case history
      const caseHistory = docService.getByCaseId(preservationTestCaseId);
      expect(caseHistory.length).toBeGreaterThan(0);
      expect(caseHistory.some((d) => d.id === doc.id)).toBe(true);

      // Reset state for other tests
      execute("UPDATE cases SET state = ? WHERE id = ?", [
        "ABIERTO",
        preservationTestCaseId,
      ]);
    });

    it("email history should persist after case state changes", () => {
      const emailService = new EmailHistoryService();

      // Create an email record
      const email = emailService.create({
        caseId: preservationTestCaseId,
        recipient: "test@example.com",
        subject: "Test Subject - MINUTA",
        status: "SENT",
      });

      // Verify email exists
      const retrieved = emailService.getById(email.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.case_id).toBe(preservationTestCaseId);

      // Simulate archiving the case
      execute("UPDATE cases SET state = ? WHERE id = ?", [
        "ARCHIVADO",
        preservationTestCaseId,
      ]);

      // Verify email is still accessible after archive
      const afterArchive = emailService.getById(email.id);
      expect(afterArchive).toBeTruthy();
      expect(afterArchive.case_id).toBe(preservationTestCaseId);

      // Verify email is still in case history
      const caseHistory = emailService.getByCaseId(preservationTestCaseId);
      expect(caseHistory.length).toBeGreaterThan(0);
      expect(caseHistory.some((e) => e.id === email.id)).toBe(true);

      // Reset state
      execute("UPDATE cases SET state = ? WHERE id = ?", [
        "ABIERTO",
        preservationTestCaseId,
      ]);
    });

    it("history records should not be deleted when querying by case ID", () => {
      const docService = new DocumentHistoryService();
      const emailService = new EmailHistoryService();

      // Create multiple records for the test case
      const doc1 = docService.create({
        caseId: preservationTestCaseId,
        documentType: "MINUTA",
        filePath: "/test/persist_test1.pdf",
        signed: false,
      });

      const doc2 = docService.create({
        caseId: preservationTestCaseId,
        documentType: "SUPLIDO",
        filePath: "/test/persist_test2.pdf",
        signed: true,
      });

      const email1 = emailService.create({
        caseId: preservationTestCaseId,
        recipient: "persist@example.com",
        subject: "Persist Test Subject",
        status: "SENT",
      });

      // Query multiple times - records should persist
      for (let i = 0; i < 3; i++) {
        const docs = docService.getByCaseId(preservationTestCaseId);
        const emails = emailService.getByCaseId(preservationTestCaseId);

        expect(docs.length).toBeGreaterThanOrEqual(2);
        expect(emails.length).toBeGreaterThanOrEqual(1);
      }

      // Individual records should still be accessible
      expect(docService.getById(doc1.id)).toBeTruthy();
      expect(docService.getById(doc2.id)).toBeTruthy();
      expect(emailService.getById(email1.id)).toBeTruthy();
    });
  });
});
