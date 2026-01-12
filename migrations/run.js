/**
 * Migration Runner
 * Executes SQL migrations in order
 */

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || "./data/legal-cases.db";

function runMigrations() {
  console.log(`Running migrations on database: ${DB_PATH}`);

  // Create database connection
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get list of migration files
  const migrationFiles = readdirSync(__dirname)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Get already applied migrations
  const applied = new Set(
    db
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((r) => r.name)
  );

  // Run pending migrations
  let count = 0;
  for (const file of migrationFiles) {
    if (applied.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`  → Applying ${file}...`);
    const sql = readFileSync(join(__dirname, file), "utf-8");

    try {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
      console.log(`  ✓ ${file} applied successfully`);
      count++;
    } catch (error) {
      console.error(`  ✗ Error applying ${file}:`, error.message);
      db.close();
      process.exit(1);
    }
  }

  db.close();

  if (count === 0) {
    console.log("\nNo new migrations to apply.");
  } else {
    console.log(`\n${count} migration(s) applied successfully.`);
  }
}

runMigrations();
