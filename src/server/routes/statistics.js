// Statistics API Routes
// Provides statistics data, CSV export, and PDF export for the estadísticas view

import { Router } from "express";
import { getStatistics, generateStatsCsv } from "../services/statisticsService.js";

const router = Router();

const VALID_TYPES = ["ALL", "ARAG", "PARTICULAR", "TURNO_OFICIO"];

/**
 * GET /api/statistics
 * Get full statistics for a given year
 * Query params: year (default current), type (default ALL)
 */
router.get("/", (req, res, next) => {
  try {
    const { year, type } = req.query;

    let parsedYear = new Date().getFullYear();
    if (year) {
      parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Año inválido", field: "year" },
        });
      }
    }

    let typeFilter = "ALL";
    if (type) {
      typeFilter = type.toUpperCase();
      if (!VALID_TYPES.includes(typeFilter)) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Tipo de caso inválido", field: "type" },
        });
      }
    }

    const stats = getStatistics(parsedYear, typeFilter);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/statistics/export/excel
 * Download statistics as CSV (Excel-compatible with BOM + semicolons)
 */
router.get("/export/excel", (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const typeFilter = VALID_TYPES.includes(req.query.type?.toUpperCase())
      ? req.query.type.toUpperCase()
      : "ALL";

    const csv = generateStatsCsv(year, typeFilter);
    const filename = `estadisticas_${year}${typeFilter !== "ALL" ? `_${typeFilter}` : ""}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/statistics/export/pdf
 * Download statistics as PDF
 */
router.get("/export/pdf", async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const typeFilter = VALID_TYPES.includes(req.query.type?.toUpperCase())
      ? req.query.type.toUpperCase()
      : "ALL";

    const stats = getStatistics(year, typeFilter);
    const pdf = await generateStatsPdfAsync(stats);
    const filename = `estadisticas_${year}${typeFilter !== "ALL" ? `_${typeFilter}` : ""}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

/**
 * Generate a simple PDF report from statistics data
 * Uses pdf-lib for lightweight PDF generation (no external dependencies needed beyond what's installed)
 */
async function generateStatsPdfAsync(stats) {
  // Lazy import to avoid loading pdf-lib on every request
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 50;
  const margin = 50;

  // Title
  page.drawText(`Estadisticas ${stats.year}${stats.filter !== "ALL" ? ` - ${stats.filter}` : ""}`, {
    x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  // KPIs
  const kpiLabels = [
    ["Expedientes Nuevos (mes actual)", stats.kpis.newThisMonth.count],
    ["Expedientes Archivados (mes actual)", stats.kpis.archivedThisMonth.count],
    ["Expedientes Pendientes", stats.kpis.pending.count],
    ["Media Mensual", stats.kpis.monthlyAverage.count],
  ];

  for (const [label, value] of kpiLabels) {
    page.drawText(`${label}: ${value}`, {
      x: margin, y, size: 11, font, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;
  }
  y -= 10;

  // Monthly table header
  page.drawText("Mes", { x: margin, y, size: 10, font: fontBold });
  page.drawText("ARAG", { x: 150, y, size: 10, font: fontBold });
  page.drawText("Particulares", { x: 220, y, size: 10, font: fontBold });
  page.drawText("Turno", { x: 320, y, size: 10, font: fontBold });
  page.drawText("Total", { x: 400, y, size: 10, font: fontBold });
  y -= 4;

  // Line under header
  page.drawLine({
    start: { x: margin, y }, end: { x: width - margin, y },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
  });
  y -= 14;

  // Monthly rows
  for (const m of stats.monthly) {
    page.drawText(m.label, { x: margin, y, size: 10, font });
    page.drawText(String(m.arag), { x: 160, y, size: 10, font });
    page.drawText(String(m.particular), { x: 240, y, size: 10, font });
    page.drawText(String(m.turno), { x: 330, y, size: 10, font });
    page.drawText(String(m.total), { x: 410, y, size: 10, font });
    y -= 16;
  }
  y -= 10;

  // Distribution
  page.drawText("Distribucion por Tipo", { x: margin, y, size: 12, font: fontBold });
  y -= 18;

  const distItems = [
    ["ARAG", stats.distribution.arag],
    ["Particulares", stats.distribution.particular],
    ["Turno de Oficio", stats.distribution.turno],
  ];

  for (const [label, d] of distItems) {
    page.drawText(`${label}: ${d.count} (${d.percent}%)`, {
      x: margin, y, size: 10, font, color: rgb(0.3, 0.3, 0.3),
    });
    y -= 16;
  }

  page.drawText(`Total: ${stats.distribution.total}`, {
    x: margin, y, size: 10, font: fontBold,
  });

  return Buffer.from(await doc.save());
}

export default router;
