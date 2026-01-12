// Tests for Admin Service
// Task 5.1 - Requirements: 14.1-14.8

import { describe, it, expect, afterAll } from "vitest";
import {
  listTables,
  getTableContents,
  validateQuery,
  executeQuery,
  AdminError,
} from "../services/adminService.js";
import { closeDatabase } from "../database.js";

// Expected tables in the system
const EXPECTED_TABLES = [
  "cases",
  "document_history",
  "email_history",
  "configuration",
  "reference_counters",
];

// Dangerous keywords that should be blocked
const DANGEROUS_KEYWORDS_LIST = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
];

// Clean up after all tests
afterAll(() => {
  closeDatabase();
});

describe("Admin Service", () => {
  describe("listTables", () => {
    // Requirements: 14.2
    it("should return list of all allowed tables with counts", () => {
      const tables = listTables();

      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBe(EXPECTED_TABLES.length);

      tables.forEach((table) => {
        expect(table).toHaveProperty("name");
        expect(table).toHaveProperty("count");
        expect(typeof table.name).toBe("string");
        expect(typeof table.count).toBe("number");
        expect(table.count).toBeGreaterThanOrEqual(0);
        expect(EXPECTED_TABLES).toContain(table.name);
      });
    });
  });

  describe("getTableContents", () => {
    // Requirements: 14.3
    it("should return table contents with pagination info", () => {
      const result = getTableContents("configuration");

      expect(result).toHaveProperty("tableName", "configuration");
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("offset");
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it("should respect pagination parameters", () => {
      const result = getTableContents("configuration", { limit: 5, offset: 0 });

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
      expect(result.rows.length).toBeLessThanOrEqual(5);
    });

    it("should reject invalid table names", () => {
      expect(() => getTableContents("invalid_table")).toThrow(AdminError);
      expect(() => getTableContents("invalid_table")).toThrow(
        "Tabla no permitida"
      );
    });

    it("should reject SQL injection attempts in table name", () => {
      expect(() => getTableContents("cases; DROP TABLE cases;")).toThrow(
        AdminError
      );
      expect(() => getTableContents("cases--")).toThrow(AdminError);
    });
  });

  describe("validateQuery", () => {
    // Requirements: 14.5
    it("should accept valid SELECT queries", () => {
      expect(validateQuery("SELECT * FROM cases")).toBe(true);
      expect(validateQuery("SELECT id, client_name FROM cases")).toBe(true);
      expect(validateQuery("SELECT COUNT(*) FROM cases")).toBe(true);
      expect(validateQuery("SELECT * FROM cases WHERE state = 'ABIERTO'")).toBe(
        true
      );
      expect(validateQuery("select * from cases")).toBe(true); // lowercase
    });

    it("should reject non-SELECT queries", () => {
      expect(() => validateQuery("INSERT INTO cases VALUES (1)")).toThrow(
        AdminError
      );
      expect(() =>
        validateQuery("UPDATE cases SET state = 'ARCHIVADO'")
      ).toThrow(AdminError);
      expect(() => validateQuery("DELETE FROM cases")).toThrow(AdminError);
    });

    it("should reject queries with dangerous keywords", () => {
      DANGEROUS_KEYWORDS_LIST.forEach((keyword) => {
        expect(() =>
          validateQuery(`SELECT * FROM cases; ${keyword} TABLE cases`)
        ).toThrow(AdminError);
      });
    });

    it("should reject DROP statements", () => {
      expect(() => validateQuery("DROP TABLE cases")).toThrow(AdminError);
      expect(() =>
        validateQuery("SELECT * FROM cases; DROP TABLE cases")
      ).toThrow(AdminError);
    });

    it("should reject multiple statements", () => {
      expect(() =>
        validateQuery("SELECT * FROM cases; SELECT * FROM configuration")
      ).toThrow(AdminError);
    });

    it("should reject empty or null queries", () => {
      expect(() => validateQuery("")).toThrow(AdminError);
      expect(() => validateQuery(null)).toThrow(AdminError);
      expect(() => validateQuery(undefined)).toThrow(AdminError);
      expect(() => validateQuery("   ")).toThrow(AdminError);
    });
  });

  describe("executeQuery", () => {
    // Requirements: 14.4, 14.6, 14.7
    it("should execute valid SELECT queries and return results", () => {
      const result = executeQuery("SELECT * FROM configuration LIMIT 5");

      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("rowCount");
      expect(result).toHaveProperty("executionTime");
      expect(Array.isArray(result.rows)).toBe(true);
      expect(typeof result.rowCount).toBe("number");
      expect(typeof result.executionTime).toBe("number");
    });

    it("should return correct row count", () => {
      const result = executeQuery("SELECT * FROM configuration");

      expect(result.rowCount).toBe(result.rows.length);
    });

    it("should handle queries with no results", () => {
      const result = executeQuery("SELECT * FROM cases WHERE id = -999999");

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it("should reject dangerous queries", () => {
      expect(() => executeQuery("DROP TABLE cases")).toThrow(AdminError);
      expect(() => executeQuery("DELETE FROM cases")).toThrow(AdminError);
    });

    it("should handle queries with trailing semicolon", () => {
      const result = executeQuery(
        "SELECT COUNT(*) as count FROM configuration;"
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0]).toHaveProperty("count");
    });
  });
});
