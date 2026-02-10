// Cases API Routes
// Task 4.1 - Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.6, 4.1-4.8, 5.1-5.7

import { Router } from "express";
import {
  create,
  getById,
  list,
  update,
  archive,
  transitionToJudicial,
  CASE_TYPES,
  CASE_STATES,
  CASE_LANGUAGES,
  SORTABLE_COLUMNS,
} from "../services/caseService.js";

const router = Router();

/**
 * GET /api/cases
 * List cases with filters and pagination
 * Query params: type, state, search, page, pageSize, sortBy, sortOrder
 */
router.get("/", (req, res, next) => {
  try {
    const { type, state, search, language, page, pageSize, sortBy, sortOrder } = req.query;

    // Validate type filter if provided
    if (type && !Object.values(CASE_TYPES).includes(type)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Tipo inválido. Debe ser uno de: ${Object.values(
            CASE_TYPES
          ).join(", ")}`,
          field: "type",
        },
      });
    }

    // Validate state filter if provided
    if (state && !Object.values(CASE_STATES).includes(state)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Estado inválido. Debe ser uno de: ${Object.values(
            CASE_STATES
          ).join(", ")}`,
          field: "state",
        },
      });
    }

    // Validate language filter if provided
    if (language && !Object.values(CASE_LANGUAGES).includes(language)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Idioma inválido. Debe ser uno de: ${Object.values(
            CASE_LANGUAGES
          ).join(", ")}`,
          field: "language",
        },
      });
    }

    // Validate sortBy if provided
    if (sortBy && !SORTABLE_COLUMNS[sortBy]) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Columna de ordenación inválida. Debe ser una de: ${Object.keys(
            SORTABLE_COLUMNS
          ).join(", ")}`,
          field: "sortBy",
        },
      });
    }

    // Validate sortOrder if provided
    const validSortOrders = ['ASC', 'DESC'];
    if (sortOrder && !validSortOrders.includes(sortOrder.toUpperCase())) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Orden inválido. Debe ser ASC o DESC",
          field: "sortOrder",
        },
      });
    }

    const filters = {};
    if (type) filters.type = type;
    if (state) filters.state = state;
    if (search) filters.search = search;
    if (language) filters.language = language;

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };

    // Validate pagination values
    if (pagination.page < 1) pagination.page = 1;
    if (pagination.pageSize < 1) pagination.pageSize = 20;
    if (pagination.pageSize > 100) pagination.pageSize = 100;

    const sort = {};
    if (sortBy) sort.sortBy = sortBy;
    if (sortOrder) sort.sortOrder = sortOrder.toUpperCase();

    const result = list(filters, pagination, sort);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases/:id
 * Get case by ID
 */
router.get("/:id", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de expediente inválido",
          field: "id",
        },
      });
    }

    const caseData = getById(id);

    if (!caseData) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Expediente no encontrado",
        },
      });
    }

    res.json(caseData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases
 * Create a new case
 * Now uses atomic transactions for reference generation
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
router.post("/", (req, res, next) => {
  try {
    const caseData = create(req.body);
    res.status(201).json(caseData);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/cases/:id
 * Update a case with optional optimistic locking
 * Body can include expectedVersion for concurrent edit detection
 * Requirements: 3.2, 3.3, 3.5, 3.6
 */
router.put("/:id", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de expediente inválido",
          field: "id",
        },
      });
    }

    // Extract expectedVersion for optimistic locking
    const { expectedVersion, ...updateData } = req.body;

    // Parse version if provided (it may come as string from JSON)
    const version =
      expectedVersion !== undefined ? parseInt(expectedVersion, 10) : null;

    const caseData = update(id, updateData, version);
    res.json(caseData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases/:id/archive
 * Archive a case (requires closureDate in body)
 */
router.post("/:id/archive", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de expediente inválido",
          field: "id",
        },
      });
    }

    const { closureDate } = req.body;
    const caseData = archive(id, closureDate);
    res.json(caseData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases/:id/judicial
 * Transition an ARAG case to judicial state
 * Requires judicialDate and district in body
 */
router.post("/:id/judicial", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID de expediente inválido",
          field: "id",
        },
      });
    }

    const { judicialDate, district } = req.body;
    const caseData = transitionToJudicial(id, judicialDate, district);
    res.json(caseData);
  } catch (error) {
    next(error);
  }
});

export default router;
