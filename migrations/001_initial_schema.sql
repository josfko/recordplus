-- Migration: 001_initial_schema
-- Description: Initial database schema for legal case management
-- Created: 2026-01-12
-- Cases table
CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('ARAG', 'PARTICULAR', 'TURNO_OFICIO')),
    client_name TEXT NOT NULL,
    internal_reference TEXT UNIQUE,
    arag_reference TEXT UNIQUE,
    designation TEXT,
    state TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (state IN ('ABIERTO', 'JUDICIAL', 'ARCHIVADO')),
    entry_date TEXT NOT NULL,
    judicial_date TEXT,
    judicial_district TEXT,
    closure_date TEXT,
    observations TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Document history table
CREATE TABLE IF NOT EXISTS document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    signed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Email history table
CREATE TABLE IF NOT EXISTS email_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES document_history(id),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'ERROR')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Configuration table
CREATE TABLE IF NOT EXISTS configuration (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Reference counters table
CREATE TABLE IF NOT EXISTS reference_counters (
    type TEXT PRIMARY KEY,
    last_value INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(type);
CREATE INDEX IF NOT EXISTS idx_cases_state ON cases(state);
CREATE INDEX IF NOT EXISTS idx_cases_entry_date ON cases(entry_date);
CREATE INDEX IF NOT EXISTS idx_document_history_case_id ON document_history(case_id);
CREATE INDEX IF NOT EXISTS idx_email_history_case_id ON email_history(case_id);
-- Insert default configuration values
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('arag_base_fee', '203.00'),
    ('vat_rate', '21'),
    ('arag_email', 'facturacionsiniestros@arag.es'),
    ('mileage_torrox', '0.00'),
    ('mileage_velez_malaga', '0.00'),
    ('mileage_torremolinos', '0.00'),
    ('mileage_fuengirola', '0.00'),
    ('mileage_marbella', '0.00'),
    ('mileage_estepona', '0.00'),
    ('mileage_antequera', '0.00');
-- Rollback instructions:
-- DROP INDEX IF EXISTS idx_email_history_case_id;
-- DROP INDEX IF EXISTS idx_document_history_case_id;
-- DROP INDEX IF EXISTS idx_cases_entry_date;
-- DROP INDEX IF EXISTS idx_cases_state;
-- DROP INDEX IF EXISTS idx_cases_type;
-- DROP TABLE IF EXISTS reference_counters;
-- DROP TABLE IF EXISTS configuration;
-- DROP TABLE IF EXISTS email_history;
-- DROP TABLE IF EXISTS document_history;
-- DROP TABLE IF EXISTS cases;