// CSV Export Routes
// API endpoints for CSV export and Syncthing integration

import { Router } from "express";
import { existsSync } from "fs";
import {
  getCsvExportStatus,
  exportAllCsv,
  createCsvZip,
  getZipPath,
  listCsvFiles,
  CsvExportError,
} from "../services/csvExportService.js";

const router = Router();

/**
 * GET /api/csv-export/status
 * Get CSV export system status (last export time, file count, sizes)
 */
router.get("/status", (req, res, next) => {
  try {
    const status = getCsvExportStatus();
    res.json({ success: true, data: status });
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
 * POST /api/csv-export/generate
 * Generate CSV files (writes to export dir for Syncthing) and create ZIP for download
 */
router.post("/generate", (req, res, next) => {
  try {
    const result = createCsvZip();
    res.json({
      success: true,
      data: result,
      message: "Exportacion CSV generada correctamente",
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
 * GET /api/csv-export/download/:filename
 * Download a ZIP file
 */
router.get("/download/:filename", (req, res, next) => {
  try {
    const { filename } = req.params;
    const fullPath = getZipPath(filename);

    if (!existsSync(fullPath)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Archivo ZIP no encontrado. Genera una exportacion primero.",
        },
      });
    }

    res.download(fullPath, filename);
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
 * GET /api/csv-export/files
 * List individual CSV files in the export directory
 */
router.get("/files", (req, res, next) => {
  try {
    const files = listCsvFiles();
    res.json({ success: true, data: files });
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
