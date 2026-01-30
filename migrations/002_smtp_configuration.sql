-- Migration: 002_smtp_configuration.sql
-- Add SMTP and document configuration keys for ARAG workflow automation
-- Document storage configuration
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('documents_path', './data/documents');
-- Digital signature certificate configuration
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('certificate_path', '');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('certificate_password', '');
-- SMTP email configuration
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('smtp_host', '');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('smtp_port', '587');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('smtp_secure', 'false');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('smtp_user', '');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('smtp_password', '');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('smtp_from', '');
-- ARAG billing configuration
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('arag_base_fee', '203.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('vat_rate', '21');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('arag_email', 'facturacionsiniestros@arag.es');
-- Mileage rates per judicial district (in euros)
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_torrox', '0.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_velez_malaga', '0.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_torremolinos', '0.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_fuengirola', '0.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_marbella', '0.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_estepona', '0.00');
INSERT
    OR IGNORE INTO configuration (key, value)
VALUES ('mileage_antequera', '0.00');