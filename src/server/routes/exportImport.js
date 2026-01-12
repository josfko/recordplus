// Export/Import API Routes
// Task 4.6 - Requirements: 8.4, 8.5

import { Router } from "express";
import {
  exportData,
  importData,
  ExportError,
  ImportError,
} from "../services/exportImportService.js";

const router = Router();

/**
 * POST /api/export
 * Export all data as JSON
 */
router.post("/export", (req, res, next) => {
  try {
    const data = exportData();
    res.json(data);
  } catch (error) {
    if (error instanceof ExportError) {
      return res.status(500).json({
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
 * POST /api/import
 * Import data from JSON
 * Body: { data: { cases: [], ... }, clearExisting?: boolean }
 */
router.post("/import", (req, res, next) => {
  try {
    const { clearExisting = false, ...importPayload } = req.body;

    if (!importPayload || Object.keys(importPayload).length === 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Se requieren datos para importar",
        },
      });
    }

    const result = importData(importPayload, { clearExisting });
    res.json(result);
  } catch (error) {
    if (error instanceof ImportError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          field: error.field,
        },
      });
    }
    next(error);
  }
});

export default router;
