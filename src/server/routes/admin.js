// Admin Panel API Routes
// Task 5.1 - Requirements: 14.1-14.8

import { Router } from "express";
import {
  listTables,
  getTableContents,
  executeQuery,
  AdminError,
} from "../services/adminService.js";

const router = Router();

/**
 * GET /api/admin/tables
 * List all database tables with row counts
 * Requirements: 14.2, 14.3
 */
router.get("/tables", (req, res, next) => {
  try {
    const tables = listTables();
    res.json(tables);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/table/:name
 * Get contents of a specific table with pagination
 * Query params: limit (default: 50), offset (default: 0)
 * Requirements: 14.3
 */
router.get("/table/:name", (req, res, next) => {
  try {
    const { name } = req.params;
    const { limit, offset } = req.query;

    const result = getTableContents(name, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof AdminError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/admin/query
 * Execute a custom SELECT query
 * Body: { sql: "SELECT ..." }
 * Requirements: 14.4, 14.5, 14.6, 14.7
 */
router.post("/query", (req, res, next) => {
  try {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Se requiere el campo 'sql' con la query a ejecutar",
        },
      });
    }

    const result = executeQuery(sql);

    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
    });
  } catch (error) {
    if (error instanceof AdminError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
});

export default router;
