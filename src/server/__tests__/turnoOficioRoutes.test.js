/**
 * Turno de Oficio Routes Tests
 * Tests for public defender case management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fc from "fast-check";
import { join, dirname } from "path";
import { existsSync, rmSync } from "fs";
import { fileURLToPath } from "url";

// Set up test environment
const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, "test-turno.db");
const TEST_DOCS_PATH = join(__dirname, "test-documents");

process.env.DB_PATH = TEST_DB_PATH;
process.env.DOCUMENTS_PATH = TEST_DOCS_PATH;

// Import after setting env vars
import { getDatabase, closeDatabase, execute } from "../database.js";
import {
  create,
  getById,
  finalizeTurno,
  archive,
  CASE_TYPES,
  CASE_STATES,
  ValidationError,
  NotFoundError,
} from "../services/caseService.js";
import { DocumentHistoryService } from "../services/documentHistoryService.js";

/**
 * Initialize test database with schema
 */
function initTestDatabase() {
  const db = getDatabase();

  // Create tables - note: document_history uses generated_at per DocumentHistoryService
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('ARAG', 'PARTICULAR', 'TURNO_OFICIO')),
      client_name TEXT NOT NULL,
      internal_reference TEXT UNIQUE,
      arag_reference TEXT UNIQUE,
      designation TEXT,
      state TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (state IN ('ABIERTO', 'JUDICIAL', 'ARCHIVADO')),
      entry_date TEXT NOT NULL,
      judicial_date TEXT,
      judicial_district TEXT,
      closure_date TEXT,
      observations TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      file_path TEXT,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      signed INTEGER DEFAULT 0,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS reference_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      counter_type TEXT NOT NULL UNIQUE,
      counter_value INTEGER NOT NULL DEFAULT 0,
      year INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS configuration (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Clean up test database
 */
function cleanupTestDatabase() {
  closeDatabase();
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH, { force: true });
  }
  if (existsSync(TEST_DB_PATH + "-wal")) {
    rmSync(TEST_DB_PATH + "-wal", { force: true });
  }
  if (existsSync(TEST_DB_PATH + "-shm")) {
    rmSync(TEST_DB_PATH + "-shm", { force: true });
  }
  if (existsSync(TEST_DOCS_PATH)) {
    rmSync(TEST_DOCS_PATH, { recursive: true, force: true });
  }
}

/**
 * Create a test Turno de Oficio case
 */
function createTestTurnoCase(overrides = {}) {
  return create({
    type: CASE_TYPES.TURNO_OFICIO,
    clientName: overrides.clientName || "Test Client",
    entryDate: overrides.entryDate || "2025-01-15",
    designation: overrides.designation || "DES-2025-001",
    observations: overrides.observations || "",
  });
}

describe("Turno de Oficio Routes", () => {
  beforeAll(() => {
    cleanupTestDatabase();
    initTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  beforeEach(() => {
    // Clear cases table before each test
    execute("DELETE FROM cases");
    execute("DELETE FROM document_history");
  });

  describe("Case Creation", () => {
    it("should create a Turno de Oficio case with required fields", () => {
      const caseData = createTestTurnoCase({
        clientName: "Juan García",
        designation: "DES-2025-123",
      });

      expect(caseData.type).toBe(CASE_TYPES.TURNO_OFICIO);
      expect(caseData.clientName).toBe("Juan García");
      expect(caseData.designation).toBe("DES-2025-123");
      expect(caseData.state).toBe(CASE_STATES.ABIERTO);
    });

    it("should NOT assign internal reference to Turno de Oficio case", () => {
      // Per caseService.js: TURNO_OFICIO doesn't get an internal reference
      const caseData = createTestTurnoCase();
      expect(caseData.internalReference).toBeNull();
    });

    it("should require a designation for Turno de Oficio", () => {
      // Designation IS required by the system for TURNO_OFICIO
      expect(() => {
        create({
          type: CASE_TYPES.TURNO_OFICIO,
          clientName: "Test",
          entryDate: "2025-01-15",
          // missing designation
        });
      }).toThrow(ValidationError);
    });
  });

  describe("State Transitions", () => {
    describe("ABIERTO → JUDICIAL (Finalizado)", () => {
      it("should finalize an open Turno case", () => {
        const caseData = createTestTurnoCase();
        expect(caseData.state).toBe(CASE_STATES.ABIERTO);

        const finalized = finalizeTurno(caseData.id);
        expect(finalized.state).toBe(CASE_STATES.JUDICIAL);
      });

      it("should not finalize an already finalized case", () => {
        const caseData = createTestTurnoCase();
        finalizeTurno(caseData.id);

        expect(() => finalizeTurno(caseData.id)).toThrow(ValidationError);
      });

      it("should not finalize an archived case", () => {
        const caseData = createTestTurnoCase();
        finalizeTurno(caseData.id);
        archive(caseData.id, "2025-02-01");

        expect(() => finalizeTurno(caseData.id)).toThrow(ValidationError);
      });

      it("should only allow Turno de Oficio cases to use finalizeTurno", () => {
        const aragCase = create({
          type: CASE_TYPES.ARAG,
          clientName: "Test ARAG",
          entryDate: "2025-01-15",
          aragReference: "DJ00123456",
        });

        expect(() => finalizeTurno(aragCase.id)).toThrow(ValidationError);
      });
    });

    describe("JUDICIAL → ARCHIVADO", () => {
      it("should archive a finalized Turno case with closure date", () => {
        const caseData = createTestTurnoCase();
        finalizeTurno(caseData.id);

        const archived = archive(caseData.id, "2025-03-15");
        expect(archived.state).toBe(CASE_STATES.ARCHIVADO);
        expect(archived.closureDate).toBe("2025-03-15");
      });

      it("should require closure date to archive", () => {
        const caseData = createTestTurnoCase();
        finalizeTurno(caseData.id);

        expect(() => archive(caseData.id)).toThrow(ValidationError);
      });
    });

    describe("ABIERTO → ARCHIVADO (direct)", () => {
      it("should allow direct archiving from ABIERTO state", () => {
        const caseData = createTestTurnoCase();
        const archived = archive(caseData.id, "2025-02-01");

        expect(archived.state).toBe(CASE_STATES.ARCHIVADO);
      });
    });
  });

  describe("Document Upload", () => {
    it("should record document upload in history", () => {
      const caseData = createTestTurnoCase();
      const docHistory = new DocumentHistoryService();

      const doc = docHistory.create({
        caseId: caseData.id,
        documentType: "MANUAL_UPLOAD",
        filePath: "/path/to/document.pdf",
        signed: 0,
      });

      expect(doc.id).toBeDefined();
      // Database returns snake_case field names
      expect(doc.document_type).toBe("MANUAL_UPLOAD");
    });

    it("should list all documents for a case", () => {
      const caseData = createTestTurnoCase();
      const docHistory = new DocumentHistoryService();

      docHistory.create({
        caseId: caseData.id,
        documentType: "MANUAL_UPLOAD",
        filePath: "/path/to/doc1.pdf",
      });
      docHistory.create({
        caseId: caseData.id,
        documentType: "MANUAL_UPLOAD",
        filePath: "/path/to/doc2.pdf",
      });

      const docs = docHistory.getByCaseId(caseData.id);
      expect(docs.length).toBe(2);
    });
  });

  describe("Property-Based Tests", () => {
    /**
     * Property 1: State Transitions are Irreversible for Archive
     */
    it("Property 1: Archived cases cannot transition to other states", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 50 }).filter((s) => s.trim().length > 0),
          fc.date({
            min: new Date("2020-01-01"),
            max: new Date("2030-12-31"),
          }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (clientName, entryDate, designation) => {
            // Sanitize inputs
            const safeName = clientName.replace(/[^\w\s]/g, "A").trim() || "Test";
            const safeDesignation = designation.replace(/[^\w\s-]/g, "X") || "DES-001";

            // Create and archive a case
            const caseData = create({
              type: CASE_TYPES.TURNO_OFICIO,
              clientName: safeName,
              entryDate: entryDate.toISOString().split("T")[0],
              designation: safeDesignation,
            });

            archive(caseData.id, "2025-12-31");

            // Try to finalize - should throw
            let threwError = false;
            try {
              finalizeTurno(caseData.id);
            } catch (e) {
              threwError = e instanceof ValidationError;
            }

            return threwError;
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 2: Case Type Validation
     */
    it("Property 2: Only TURNO_OFICIO cases can use finalizeTurno", () => {
      const caseData = create({
        type: CASE_TYPES.PARTICULAR,
        clientName: "Test Particular",
        entryDate: "2025-01-15",
      });

      expect(() => finalizeTurno(caseData.id)).toThrow(ValidationError);
    });

    /**
     * Property 3: Multiple Turno cases can be created
     */
    it("Property 3: Multiple Turno cases can be created successfully", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), (count) => {
          const ids = [];

          for (let i = 0; i < count; i++) {
            const caseData = create({
              type: CASE_TYPES.TURNO_OFICIO,
              clientName: `Client ${i}`,
              entryDate: "2025-01-15",
              designation: `DES-PROP-${i}-${Date.now()}`,
            });
            ids.push(caseData.id);
          }

          // All IDs should be unique
          return new Set(ids).size === count;
        }),
        { numRuns: 3 }
      );
    });

    /**
     * Property 4: State Consistency
     */
    it("Property 4: State transitions follow valid paths", () => {
      const caseData = createTestTurnoCase();

      // Valid path: ABIERTO → JUDICIAL → ARCHIVADO
      expect(caseData.state).toBe(CASE_STATES.ABIERTO);

      const finalized = finalizeTurno(caseData.id);
      expect(finalized.state).toBe(CASE_STATES.JUDICIAL);

      const archived = archive(caseData.id, "2025-06-01");
      expect(archived.state).toBe(CASE_STATES.ARCHIVADO);
    });

    /**
     * Property 5: Finalize is Idempotent (throws on repeat)
     */
    it("Property 5: Finalizing twice throws ValidationError", () => {
      const caseData = createTestTurnoCase();
      finalizeTurno(caseData.id);

      expect(() => finalizeTurno(caseData.id)).toThrow(ValidationError);
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-existent case ID", () => {
      expect(() => finalizeTurno(99999)).toThrow(NotFoundError);
    });

    it("should preserve designation when updating state", () => {
      const caseData = createTestTurnoCase({ designation: "DES-PRESERVE-001" });
      const finalized = finalizeTurno(caseData.id);

      expect(finalized.designation).toBe("DES-PRESERVE-001");
    });

    it("should update timestamp when changing state", () => {
      const caseData = createTestTurnoCase();

      const finalized = finalizeTurno(caseData.id);

      // updatedAt should exist
      expect(finalized.updatedAt).toBeDefined();
    });

    it("should allow observations on Turno cases", () => {
      const caseData = createTestTurnoCase({
        observations: "Initial observation",
      });

      expect(caseData.observations).toBe("Initial observation");
    });
  });
});

describe("Turno de Oficio - No Automatic Documents", () => {
  beforeAll(() => {
    cleanupTestDatabase();
    initTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  beforeEach(() => {
    execute("DELETE FROM cases");
    execute("DELETE FROM document_history");
  });

  it("should NOT generate minuta automatically", () => {
    const caseData = createTestTurnoCase();
    const docHistory = new DocumentHistoryService();

    // Check no documents were auto-generated
    const docs = docHistory.getByCaseId(caseData.id);
    expect(docs.length).toBe(0);
  });

  it("should NOT generate hoja de encargo automatically", () => {
    const caseData = createTestTurnoCase();
    finalizeTurno(caseData.id);

    const docHistory = new DocumentHistoryService();
    const docs = docHistory.getByCaseId(caseData.id);

    // No HOJA_ENCARGO documents should exist
    // Note: database returns snake_case fields
    const hojaEncargoDocs = docs.filter((d) => d.document_type === "HOJA_ENCARGO");
    expect(hojaEncargoDocs.length).toBe(0);
  });

  it("should only have MANUAL_UPLOAD documents if user uploads", () => {
    const caseData = createTestTurnoCase();
    const docHistory = new DocumentHistoryService();

    // Simulate manual upload
    docHistory.create({
      caseId: caseData.id,
      documentType: "MANUAL_UPLOAD",
      filePath: "/uploads/test.pdf",
    });

    const docs = docHistory.getByCaseId(caseData.id);
    expect(docs.length).toBe(1);
    // Database returns snake_case fields
    expect(docs[0].document_type).toBe("MANUAL_UPLOAD");
  });
});
