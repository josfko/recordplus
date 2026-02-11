# Findings — CSV Export Research

## Existing Infrastructure
- JSON export exists at `POST /api/export` (exportImportService.js) — queries all 5 tables
- Backup system uses `sqlite3 .backup` CLI via execSync (backupService.js)
- BackupPanel UI has stats cards, create/download/delete buttons
- Database: better-sqlite3 singleton with WAL mode

## Database Tables for Export
1. **cases** (16 cols) — primary export target
2. **document_history** (7 cols) — document generation audit trail
3. **email_history** (9 cols) — email delivery tracking
4. **configuration** (3 cols) — key/value settings (filter passwords!)
5. **reference_counters** (3 cols) — internal counter state

## Patterns Followed
- Route registration: `app.use("/api/csv-export", csvExportRouter)` after backup route in index.js
- Service pattern: matches backupService.js (directory management, execSync for CLI tools)
- API client: methods on ApiClient class in api.js
- Frontend: extended existing backupPanel.js component
- Error class: `CsvExportError` matching `BackupError` pattern
- Security: filename validation regex + path traversal check (matching `getBackupPath`)

## CSV Technical Notes
- UTF-8 BOM (`\uFEFF` = bytes `EF BB BF`) required for Excel to read Spanish characters
- RFC 4180: comma delimiter, `\r\n` line endings, double-quote escaping
- `zip -j` available on both macOS and Ubuntu 22.04
- Initial bug: ZIP command used full path inside `cd` context — fixed to use just filename

## Security Considerations
- `smtp_password` and `certificate_password` filtered from configuration CSV
- ZIP filename validated with strict regex: `/^recordplus-csv-\d{8}-\d{6}\.zip$/`
- Path traversal protection via `resolve()` + `startsWith()` check
- Old ZIP files cleaned up on each generation (only latest kept)
