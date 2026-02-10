// Configuration API Routes
// Task 4.4 - Requirements: 12.1-12.9

import { Router } from "express";
import {
  getAll,
  update,
} from "../services/configurationService.js";
import { CryptoSignatureStrategy } from "../services/signatureService.js";

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
    next(error);
  }
});

/**
 * POST /api/config/test-certificate
 * Test a P12/PKCS12 certificate and return its information
 * Body: { path: string, password: string }
 * Returns: { valid: boolean, cn: string, organization: string, issuer: string,
 *            validFrom: string, validTo: string, daysUntilExpiration: number }
 */
router.post("/test-certificate", async (req, res) => {
  const { path, password } = req.body;

  if (!path || typeof path !== "string" || path.trim() === "") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Se requiere la ruta del certificado",
        field: "path",
      },
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Se requiere la contraseña del certificado",
        field: "password",
      },
    });
  }

  try {
    const info = await CryptoSignatureStrategy.getCertificateInfo(
      path.trim(),
      password
    );

    res.json({
      valid: true,
      cn: info.cn,
      organization: info.organization,
      issuer: info.issuer,
      validFrom: info.validFrom.toISOString(),
      validTo: info.validTo.toISOString(),
      isExpired: info.isExpired,
      daysUntilExpiration: info.daysUntilExpiration,
    });
  } catch (error) {
    res.status(400).json({
      valid: false,
      error: error.message,
    });
  }
});

export default router;
