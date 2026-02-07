-- Migration 004: Add Language Field to Cases
--
-- Adds a language column to track client language preference (es/en).
-- Default is 'es' (Spanish). Backfills existing cases where observations
-- contain English-related keywords.
--
-- IMPORTANT: This migration is idempotent (safe to run multiple times)
-- Run with: sqlite3 /path/to/legal-cases.db < migrations/004_add_language_field.sql

-- Add language column (will error if already exists - safe to ignore)
ALTER TABLE cases ADD COLUMN language TEXT NOT NULL DEFAULT 'es';

-- Backfill: set language to 'en' for cases with English-related keywords in observations
UPDATE cases
SET language = 'en'
WHERE language = 'es'
  AND (
    LOWER(observations) LIKE '%english%'
    OR LOWER(observations) LIKE '%inglés%'
    OR LOWER(observations) LIKE '%ingles%'
    OR LOWER(observations) LIKE '%english-speaking%'
    OR LOWER(observations) LIKE '%británico%'
    OR LOWER(observations) LIKE '%britanico%'
    OR LOWER(observations) LIKE '%british%'
    OR LOWER(observations) LIKE '%american%'
  );

-- Record this migration
INSERT OR IGNORE INTO _schema_version (version, description)
VALUES (4, 'Add language field to cases table with English backfill');

-- Verification: Uncomment to verify
-- SELECT name FROM pragma_table_info('cases') WHERE name = 'language';
-- SELECT id, client_name, language, observations FROM cases WHERE language = 'en';
-- SELECT * FROM _schema_version WHERE version = 4;
