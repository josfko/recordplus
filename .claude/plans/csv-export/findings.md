# Findings — CSV Export Simplification

## Requirements
- Export ONLY the `cases` table (expedientes) as a single CSV
- Spanish column headers for Excel readability
- UTF-8 BOM so Excel detects encoding
- Direct CSV download (no ZIP)
- Still write to Syncthing directory for device sync
- Remove all other tables (document_history, email_history, configuration, reference_counters)

## Current State (what exists)
- `csvExportService.js`: 405 lines, exports 5 tables, creates ZIP, manages export dir
- `csvExport.js` route: 4 endpoints (status, generate, download, files)
- `api.js`: 4 methods (getCsvExportStatus, generateCsvExport, getCsvExportDownloadUrl, listCsvFiles)
- `backupPanel.js`: CSV section with generate button, ZIP download button, file listing table
- Downloaded `expedientes.csv` has correct headers but 0 rows (local DB has no cases — production VPS does)

## What to Remove
- TABLE_CONFIGS entries: `document_history`, `email_history`, `configuration`, `reference_counters`
- SENSITIVE_KEYS filter (no config table = no passwords to filter)
- ZIP creation logic (`createCsvZip()`, `getZipPath()`, `execSync` zip command)
- `getCsvExportStatus()`, `listCsvFiles()` functions
- Route endpoints: `/status`, `/files`, `/download/:filename`
- Frontend: ZIP button, file listing table, status API call

## What to Keep
- `formatCsvValue()` — RFC 4180 escaping (working correctly)
- `tableToCsv()` — BOM + headers + rows (working correctly)
- `CSV_EXPORT_DIR` — still needed for Syncthing
- Cases table Spanish headers (already correct)
- `CsvExportError` class

## Technical Notes
- Download endpoint should set `Content-Disposition: attachment; filename="expedientes.csv"` and `Content-Type: text/csv; charset=utf-8`
- No need for file-on-disk for download — can generate CSV in memory and stream it
- But still write to disk for Syncthing sync
