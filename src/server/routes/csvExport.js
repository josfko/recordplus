// CSV Export Routes
// Exports expedientes as a single CSV file

import { Router } from "express";
import {
  generateExpedientesCsv,
  getExpedientesCsvPath,
  CsvExportError,
} from "../services/csvExportService.js";

const router = Router();

/**
 * POST /api/csv-export/generate
 * Generate fresh expedientes CSV, write to Syncthing dir, return summary
 */
router.post("/generate", (req, res, next) => {
  try {
    const result = generateExpedientesCsv();
    res.json({
      success: true,
      data: {
        rows: result.rows,
        exportedAt: result.exportedAt,
      },
      message: `Exportados ${result.rows} expedientes`,
    });
  } catch (error) {
    if (error instanceof CsvExportError) {
      return res.status(400).json({
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
});

/**
 * GET /api/csv-export/download
 * Generate fresh CSV and stream it as a download
 */
router.get("/download", (req, res, next) => {
  try {
    const result = generateExpedientesCsv();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="expedientes.csv"');
    res.send(result.csv);
  } catch (error) {
    if (error instanceof CsvExportError) {
      return res.status(400).json({
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
});

export default router;
