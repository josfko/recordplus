// Backup Service
// Handles database backup operations

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join, basename, resolve } from "path";
import { execSync } from "child_process";
import { DB_PATH } from "../database.js";

// Backup directory - production uses /home/appuser/backups, local uses ./data/backups
export const BACKUP_DIR =
  process.env.BACKUP_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/home/appuser/backups"
    : "./data/backups");

/**
 * Custom error for backup operations
 */
export class BackupError extends Error {
  constructor(message, code = "BACKUP_ERROR") {
    super(message);
    this.name = "BackupError";
    this.code = code;
  }
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Validate filename to prevent path traversal attacks
 * @param {string} filename - Filename to validate
 * @returns {boolean} True if filename is safe
 */
function isValidFilename(filename) {
  // Only allow alphanumeric, dash, underscore, and .db extension
  const safePattern = /^[a-zA-Z0-9_-]+\.db$/;
  return safePattern.test(filename) && !filename.includes("..");
}

/**
 * Get full path to a backup file (with security validation)
 * @param {string} filename - Backup filename
 * @returns {string} Full path to backup file
 * @throws {BackupError} If filename is invalid or file doesn't exist
 */
export function getBackupPath(filename) {
  if (!isValidFilename(filename)) {
    throw new BackupError(
      "Nombre de archivo no válido",
      "INVALID_FILENAME"
    );
  }

  const fullPath = resolve(join(BACKUP_DIR, filename));

  // Ensure path is within backup directory (prevent path traversal)
  if (!fullPath.startsWith(resolve(BACKUP_DIR))) {
    throw new BackupError(
      "Acceso no autorizado",
      "PATH_TRAVERSAL"
    );
  }

  return fullPath;
}

/**
 * List all backup files with metadata
 * @returns {Array<{filename: string, date: string, size: number, sizeFormatted: string}>}
 */
export function listBackups() {
  ensureBackupDir();

  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".db"))
      .map((filename) => {
        const fullPath = join(BACKUP_DIR, filename);
        const stats = statSync(fullPath);

        // Extract date from filename (format: legal-cases-YYYYMMDD.db)
        const dateMatch = filename.match(/(\d{8})/);
        let formattedDate = null;
        if (dateMatch) {
          const dateStr = dateMatch[1];
          formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        }

        return {
          filename,
          date: formattedDate || stats.mtime.toISOString().split("T")[0],
          createdAt: stats.mtime.toISOString(),
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
        };
      })
      // Sort by date descending (newest first)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  } catch (error) {
    throw new BackupError(
      `Error listando backups: ${error.message}`,
      "LIST_ERROR"
    );
  }
}

/**
 * Create a new backup
 * @returns {{filename: string, path: string, size: number, sizeFormatted: string}}
 */
export function createBackup() {
  ensureBackupDir();

  const date = new Date();
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "");
  const filename = `legal-cases-${dateStr}-${timeStr}.db`;
  const backupPath = join(BACKUP_DIR, filename);

  try {
    // Use SQLite's .backup command for a consistent backup
    const command = `sqlite3 "${DB_PATH}" ".backup '${backupPath}'"`;
    execSync(command, { stdio: "pipe" });

    const stats = statSync(backupPath);

    return {
      filename,
      path: backupPath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.mtime.toISOString(),
    };
  } catch (error) {
    throw new BackupError(
      `Error creando backup: ${error.message}`,
      "CREATE_ERROR"
    );
  }
}

/**
 * Delete a backup file
 * @param {string} filename - Backup filename to delete
 * @returns {boolean} True if deleted successfully
 */
export function deleteBackup(filename) {
  const fullPath = getBackupPath(filename);

  if (!existsSync(fullPath)) {
    throw new BackupError(
      "Archivo de backup no encontrado",
      "NOT_FOUND"
    );
  }

  try {
    unlinkSync(fullPath);
    return true;
  } catch (error) {
    throw new BackupError(
      `Error eliminando backup: ${error.message}`,
      "DELETE_ERROR"
    );
  }
}

/**
 * Get backup system status
 * @returns {{lastBackup: Object|null, totalBackups: number, totalSize: number, totalSizeFormatted: string, backupDir: string}}
 */
export function getStatus() {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return {
    lastBackup: backups.length > 0 ? backups[0] : null,
    totalBackups: backups.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    backupDir: BACKUP_DIR,
    dbPath: DB_PATH,
  };
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupPath,
  getStatus,
  BackupError,
  BACKUP_DIR,
};
