---
name: record-api-endpoint
description: Create Express API endpoints for Record+ legal case management system. Use when adding new routes, creating CRUD endpoints, or implementing new API functionality. Triggers on requests to add API routes, endpoints, backend functionality, or Express handlers.
---

# Record+ API Endpoint Patterns

## Quick Reference

### Route File Structure

```javascript
// src/server/routes/{resource}.js
import { Router } from "express";
import {
  serviceFn,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../services/{resource}Service.js";

const router = Router();

// Route handlers...

export default router;
```

### Register in index.js

```javascript
import newRouter from "./routes/new.js";
app.use("/api/new", newRouter);
```

## Error Response Format

All errors return this structure:

```javascript
res.status(CODE).json({
  error: {
    code: "ERROR_CODE",      // VALIDATION_ERROR, NOT_FOUND, CONFLICT_ERROR, SERVER_ERROR
    message: "Spanish msg",  // User-facing message in Spanish
    field: "fieldName",      // Optional: which field caused the error
  },
});
```

### HTTP Status Codes

| Status | Code Constant | Usage |
|--------|--------------|-------|
| 200 | - | Success (GET, PUT) |
| 201 | - | Created (POST) |
| 400 | VALIDATION_ERROR | Invalid input |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT_ERROR | Duplicate/conflict |
| 500 | SERVER_ERROR | Unexpected error |

## Route Patterns

### GET List (with filters/pagination)

```javascript
router.get("/", (req, res, next) => {
  try {
    const { filter1, filter2, page, pageSize } = req.query;

    // Validate enum filters
    if (filter1 && !VALID_VALUES.includes(filter1)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Valor inválido para filter1",
          field: "filter1",
        },
      });
    }

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };

    const result = listService(filters, pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

### GET Single by ID

```javascript
router.get("/:id", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID inválido",
          field: "id",
        },
      });
    }

    const item = getById(id);

    if (!item) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Recurso no encontrado",
        },
      });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});
```

### POST Create

```javascript
router.post("/", (req, res, next) => {
  try {
    const item = createService(req.body);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          field: error.field,
        },
      });
    }
    if (error instanceof ConflictError) {
      return res.status(409).json({
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
```

### PUT Update

```javascript
router.put("/:id", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID inválido",
          field: "id",
        },
      });
    }

    const item = updateService(id, req.body);
    res.json(item);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: { code: error.code, message: error.message, field: error.field },
      });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
});
```

### POST Action (state transition)

```javascript
router.post("/:id/action", (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ID inválido",
          field: "id",
        },
      });
    }

    const { requiredField } = req.body;
    const item = actionService(id, requiredField);
    res.json(item);
  } catch (error) {
    // Handle ValidationError, NotFoundError...
    next(error);
  }
});
```

## Service Layer Pattern

See [references/service-pattern.md](references/service-pattern.md) for service layer conventions.

## Checklist

When creating a new endpoint:

1. Create route file in `src/server/routes/`
2. Create service file in `src/server/services/` (if new domain)
3. Register router in `src/server/index.js`
4. Export custom error classes from service
5. Use Spanish for all user-facing messages
6. Validate ID params with `parseInt` and `isNaN` check
7. Use `next(error)` for unexpected errors
8. Return 201 for POST creates, 200 for everything else
