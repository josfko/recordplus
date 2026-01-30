---
name: record-database
description: SQLite database patterns for Record+ using better-sqlite3. Use when creating migrations, modifying schema, writing database queries, or working with the data layer. Triggers on database operations, SQL queries, migrations, or schema changes.
---

# Record+ Database Patterns

## Database Connection

```javascript
import { getDatabase, query, queryOne, execute, transaction } from "../database.js";

// Path: ./data/legal-cases.db (or DB_PATH env var)
```

## Query Helpers

### Read Multiple Rows
```javascript
const rows = query("SELECT * FROM cases WHERE type = ?", ["ARAG"]);
```

### Read Single Row
```javascript
const row = queryOne("SELECT * FROM cases WHERE id = ?", [id]);
// Returns undefined if not found
```

### Write Operations
```javascript
const result = execute(
  "INSERT INTO cases (type, client_name) VALUES (?, ?)",
  ["ARAG", "Client Name"]
);
// result.lastInsertRowid - new row ID
// result.changes - rows affected
```

### Transactions
```javascript
const result = transaction(() => {
  execute("INSERT INTO ...", [...]);
  execute("UPDATE ...", [...]);
  return someValue;
});
```

## Schema Conventions

### Column Naming
- Use `snake_case` for all columns
- Map to `camelCase` in JavaScript

### Standard Columns
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
created_at TEXT NOT NULL DEFAULT (datetime('now')),
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
```

### Date Storage
- Store as `TEXT` in ISO format: `YYYY-MM-DD` or `datetime('now')`
- SQLite has no native date type

### Enums
- Use `CHECK` constraints:
```sql
state TEXT NOT NULL CHECK (state IN ('ABIERTO', 'JUDICIAL', 'ARCHIVADO'))
```

### Foreign Keys
```sql
case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE
```

## Migration File Format

Location: `migrations/NNN_description.sql`

```sql
-- Migration: NNN_description
-- Description: What this migration does
-- Created: YYYY-MM-DD

-- Schema changes
CREATE TABLE IF NOT EXISTS new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ...
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_column ON table(column);

-- Default data
INSERT OR IGNORE INTO configuration (key, value) VALUES ('key', 'value');

-- Rollback instructions (comment):
-- DROP TABLE IF EXISTS new_table;
```

### Running Migrations
Migrations are run manually via SQLite CLI or on app startup.

## Schema Reference

See [references/schema.md](references/schema.md) for complete table definitions.

## Common Patterns

### Pagination
```javascript
const offset = (page - 1) * pageSize;
const rows = query(
  `SELECT * FROM table ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  [pageSize, offset]
);
```

### Count with Filters
```javascript
const { total } = queryOne(
  `SELECT COUNT(*) as total FROM table WHERE type = ?`,
  [type]
);
```

### Dynamic WHERE Clauses
```javascript
const whereClauses = [];
const params = [];

if (type) {
  whereClauses.push("type = ?");
  params.push(type);
}
if (search) {
  whereClauses.push("(name LIKE ? OR ref LIKE ?)");
  params.push(`%${search}%`, `%${search}%`);
}

const where = whereClauses.length > 0
  ? `WHERE ${whereClauses.join(" AND ")}`
  : "";

const rows = query(`SELECT * FROM table ${where}`, params);
```

### Update with Allowed Fields
```javascript
const allowedFields = ["client_name", "observations"];
const updates = [];
const params = [];

for (const [key, value] of Object.entries(data)) {
  if (allowedFields.includes(key)) {
    updates.push(`${key} = ?`);
    params.push(value);
  }
}

if (updates.length > 0) {
  updates.push("updated_at = datetime('now')");
  params.push(id);
  execute(`UPDATE table SET ${updates.join(", ")} WHERE id = ?`, params);
}
```

### Check Existence
```javascript
const exists = queryOne(
  "SELECT 1 FROM cases WHERE arag_reference = ?",
  [ref]
);
if (exists) throw new ConflictError("Already exists");
```

## Configuration Table

Key-value store for app settings:

```javascript
// Read all config
const rows = query("SELECT key, value FROM configuration");
const config = Object.fromEntries(rows.map(r => [r.key, r.value]));

// Update config
execute(
  "UPDATE configuration SET value = ?, updated_at = datetime('now') WHERE key = ?",
  [value, key]
);
```

## Reference Counters

Auto-incrementing counters for reference generation:

```javascript
// Get and increment atomically
const counter = transaction(() => {
  const row = queryOne(
    "SELECT last_value FROM reference_counters WHERE type = ?",
    [type]
  );
  const newValue = (row?.last_value || 0) + 1;
  execute(
    `INSERT OR REPLACE INTO reference_counters (type, last_value, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [type, newValue]
  );
  return newValue;
});
```
