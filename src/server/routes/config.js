// Configuration API Routes
// Task 4.4 - Requirements: 12.1-12.9

import { Router } from "express";
import {
  getAll,
  update,
  ConfigValidationError,
} from "../services/configurationService.js";

const router = Router();

/**
 * GET /api/config
 * Get all configuration values
 */
router.get("/", (req, res, next) => {
  try {
    const config = getAll();
    res.json(config);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/config
 * Update configuration values
 * Body: { key: value, ... }
 */
router.put("/", (req, res, next) => {
  try {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Se requiere al menos un valor de configuración para actualizar",
        },
      });
    }

    const config = update(req.body);
    res.json(config);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
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
