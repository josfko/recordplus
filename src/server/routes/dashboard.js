// Dashboard API Routes
// Task 4.2 - Requirements: 9.1-9.6

import { Router } from "express";
import { getDashboardMetrics } from "../services/dashboardService.js";
import { getNotifications } from "../services/notificationService.js";

const router = Router();

/**
 * GET /api/dashboard
 * Get dashboard metrics for the current month
 * Optional query params: month (1-12), year
 */
router.get("/", (req, res, next) => {
  try {
    const { month, year } = req.query;

    let parsedMonth = null;
    let parsedYear = null;

    if (month) {
      parsedMonth = parseInt(month, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Mes inválido. Debe ser un número entre 1 y 12",
            field: "month",
          },
        });
      }
    }

    if (year) {
      parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Año inválido",
            field: "year",
          },
        });
      }
    }

    const metrics = getDashboardMetrics(parsedMonth, parsedYear);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/notifications
 * Get live-computed notifications from existing data
 */
router.get("/notifications", (req, res, next) => {
  try {
    const result = getNotifications();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
