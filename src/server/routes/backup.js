// Backup Routes
// API endpoints for backup management

import { Router } from "express";
import { existsSync } from "fs";
import {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupPath,
  getStatus,
  BackupError,
} from "../services/backupService.js";

const router = Router();

/**
 * GET /api/backup/status
 * Get backup system status
 */
router.get("/status", (req, res, next) => {
  try {
    const status = getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/backup/list
 * List all available backups
 */
router.get("/list", (req, res, next) => {
  try {
    const backups = listBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/backup/create
 * Create a new on-demand backup
 */
router.post("/create", (req, res, next) => {
  try {
    const backup = createBackup();
    res.json({
      success: true,
      data: backup,
      message: "Copia de seguridad creada correctamente",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/backup/:filename/download
 * Download a specific backup file
 */
router.get("/:filename/download", (req, res, next) => {
  try {
    const { filename } = req.params;
    const fullPath = getBackupPath(filename);

    if (!existsSync(fullPath)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Archivo de backup no encontrado",
        },
      });
    }

    res.download(fullPath, filename);
  } catch (error) {
    if (error instanceof BackupError) {
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
 * DELETE /api/backup/:filename
 * Delete a specific backup file
 */
router.delete("/:filename", (req, res, next) => {
  try {
    const { filename } = req.params;
    deleteBackup(filename);
    res.json({
      success: true,
      message: "Copia de seguridad eliminada correctamente",
    });
  } catch (error) {
    if (error instanceof BackupError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return res.status(status).json({
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
