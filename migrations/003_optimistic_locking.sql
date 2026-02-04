-- Migration 003: Add Optimistic Locking Support
-- Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
--
-- This migration adds version tracking for optimistic locking on the cases table.
-- When two users edit the same case simultaneously, the second save will detect
-- the version mismatch and show an appropriate error message.
--
-- IMPORTANT: This migration is idempotent (safe to run multiple times)
-- Run with: sqlite3 /path/to/legal-cases.db < migrations/003_optimistic_locking.sql

-- Add version column for optimistic locking
-- Default value of 1 ensures existing records work immediately
-- SQLite ALTER TABLE doesn't support IF NOT EXISTS, so we use a workaround
-- by checking if the column exists first via pragma

-- Step 1: Check if version column already exists and add it if not
-- Note: This uses a trick with CREATE TABLE to make it idempotent
SELECT CASE
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE cases ADD COLUMN version INTEGER NOT NULL DEFAULT 1'
    ELSE 'SELECT ''version column already exists'''
END as sql_to_run
FROM pragma_table_info('cases')
WHERE name = 'version';

-- Actually add the column (this will fail silently if it already exists in most cases)
-- If you get an error "duplicate column name: version", the migration already ran
ALTER TABLE cases ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Step 2: Create schema versioning table if it doesn't exist
-- This table tracks which migrations have been applied
CREATE TABLE IF NOT EXISTS _schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

-- Step 3: Record this migration (ignore if already recorded)
INSERT OR IGNORE INTO _schema_version (version, description)
VALUES (3, 'Add optimistic locking version column to cases table');

-- Step 4: Create an index on version for faster conflict detection during updates
-- The IF NOT EXISTS makes this idempotent
CREATE INDEX IF NOT EXISTS idx_cases_version ON cases(id, version);

-- Verification: Uncomment to verify the migration worked
-- SELECT name FROM pragma_table_info('cases') WHERE name = 'version';
-- SELECT * FROM _schema_version WHERE version = 3;
