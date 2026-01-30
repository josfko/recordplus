# Service Layer Pattern

## File Structure

```javascript
// src/server/services/{resource}Service.js
import { getDatabase, query, queryOne, execute, transaction } from "../database.js";

// Constants
export const RESOURCE_TYPES = {
  TYPE_A: "TYPE_A",
  TYPE_B: "TYPE_B",
};

// Custom Error Classes
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.code = "VALIDATION_ERROR";
  }
}

export class ConflictError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ConflictError";
    this.field = field;
    this.code = "CONFLICT_ERROR";
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.code = "NOT_FOUND";
  }
}
```

## Database Helpers

```javascript
import { query, queryOne, execute, transaction } from "../database.js";

// SELECT multiple rows
const rows = query("SELECT * FROM table WHERE col = ?", [value]);

// SELECT single row
const row = queryOne("SELECT * FROM table WHERE id = ?", [id]);

// INSERT/UPDATE/DELETE
const result = execute("INSERT INTO table (col) VALUES (?)", [value]);
// result.lastInsertRowid, result.changes

// Transaction
const result = transaction(() => {
  execute("INSERT ...", [...]);
  execute("UPDATE ...", [...]);
  return someValue;
});
```

## CRUD Functions

### Create

```javascript
export function create(data) {
  validateData(data);

  // Check for conflicts
  if (existsAlready(data.uniqueField)) {
    throw new ConflictError("Ya existe un registro con este valor", "uniqueField");
  }

  const result = execute(
    `INSERT INTO table (col1, col2) VALUES (?, ?)`,
    [data.field1, data.field2]
  );

  return getById(result.lastInsertRowid);
}
```

### Get by ID

```javascript
export function getById(id) {
  const row = queryOne("SELECT * FROM table WHERE id = ?", [id]);
  if (!row) return null;
  return mapRowToObject(row);
}
```

### List with Filters

```javascript
export function list(filters = {}, pagination = {}) {
  const { type, state, search } = filters;
  const { page = 1, pageSize = 20 } = pagination;

  let whereClauses = [];
  let params = [];

  if (type) {
    whereClauses.push("type = ?");
    params.push(type);
  }

  if (search) {
    whereClauses.push("(name LIKE ? OR reference LIKE ?)");
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  // Count
  const { total } = queryOne(
    `SELECT COUNT(*) as total FROM table ${whereClause}`,
    params
  );

  // Paginate
  const offset = (page - 1) * pageSize;
  const rows = query(
    `SELECT * FROM table ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { items: rows.map(mapRowToObject), total, page, pageSize };
}
```

### Update

```javascript
export function update(id, data) {
  const existing = getById(id);
  if (!existing) {
    throw new NotFoundError("Recurso no encontrado");
  }

  // Business rules (e.g., archived items are read-only)
  if (existing.state === "ARCHIVADO") {
    throw new ValidationError("No se puede modificar un registro archivado");
  }

  const allowedFields = ["field1", "field2"];
  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${toSnakeCase(field)} = ?`);
      params.push(data[field]);
    }
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = datetime('now')");
  params.push(id);

  execute(`UPDATE table SET ${updates.join(", ")} WHERE id = ?`, params);

  return getById(id);
}
```

## Row Mapping

Convert snake_case DB columns to camelCase JS:

```javascript
function mapRowToObject(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    entryDate: row.entry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

## Validation Pattern

```javascript
function validateData(data) {
  // Required field
  if (!data.name || !data.name.trim()) {
    throw new ValidationError("El nombre es obligatorio", "name");
  }

  // Enum validation
  if (!Object.values(VALID_TYPES).includes(data.type)) {
    throw new ValidationError(
      `Tipo inválido. Debe ser uno de: ${Object.values(VALID_TYPES).join(", ")}`,
      "type"
    );
  }

  // Date format (YYYY-MM-DD)
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new ValidationError("Formato de fecha inválido. Use YYYY-MM-DD", "date");
  }

  // Regex validation
  if (data.reference && !/^[A-Z]{2}\d{6}$/.test(data.reference)) {
    throw new ValidationError("Formato de referencia inválido", "reference");
  }
}
```

## Default Export

```javascript
export default {
  create,
  getById,
  list,
  update,
  RESOURCE_TYPES,
  ValidationError,
  ConflictError,
  NotFoundError,
};
```
