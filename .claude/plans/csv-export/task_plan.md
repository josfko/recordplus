# Task Plan: Simplify CSV Export to Expedientes Only

## Goal
Strip the CSV export feature down to a single `expedientes.csv` file — no ZIP, no multi-table export, no file listing table. One button, one CSV download with all case data.

## Current Phase
Complete

## Phases

### Phase 1: Simplify Backend Service
- [x] Rewrite `csvExportService.js` — 405 lines → 115 lines
- [x] Keep only: `formatCsvValue()`, `tableToCsv()`, `generateExpedientesCsv()`, `getExpedientesCsvPath()`
- [x] Removed: `exportAllCsv()`, `createCsvZip()`, `getZipPath()`, `listCsvFiles()`, `getCsvExportStatus()`, SENSITIVE_KEYS, ZIP logic
- **Status:** complete

### Phase 2: Simplify Route
- [x] Rewrite `csvExport.js` — 2 endpoints: `POST /generate` + `GET /download`
- [x] `POST /generate` — generates CSV, writes to Syncthing dir, returns `{ rows, exportedAt }`
- [x] `GET /download` — generates fresh CSV, streams directly with Content-Disposition header
- **Status:** complete

### Phase 3: Simplify Frontend
- [x] `api.js` — 2 methods: `generateCsvExport()` + `getCsvDownloadUrl()`
- [x] `backupPanel.js` — single "Descargar Expedientes CSV" button, shows row count after export
- [x] Removed: ZIP button, file listing table, status API call
- [x] CSS — removed file listing table styles
- **Status:** complete

### Phase 4: Verify
- [x] `POST /generate` returns `{ rows: 0, exportedAt }` (0 because local DB has no cases)
- [x] `GET /download` returns CSV with UTF-8 BOM (EF BB BF) and correct Spanish headers
- [x] Syncthing dir `./data/csv-export/expedientes.csv` updated on generate
- [x] Chrome extension disconnected — browser test pending for user
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Single CSV, no ZIP | Only 1 file — ZIP wrapping adds complexity for no benefit |
| Direct CSV download | Browser downloads `expedientes.csv` directly, opens in Excel immediately |
| Keep Syncthing write | Still writes to `CSV_EXPORT_DIR` for device sync |
| Remove file listing from UI | Only 1 file — no need for a table listing it |
| Remove status endpoint | Overkill for single file — just show last export time from generate response |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |
