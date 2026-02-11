# CSV Export + Syncthing Integration for Record+

## Phases

### Phase 1: Backend Service [COMPLETE]
- [x] Create `csvExportService.js` with CSV formatting, table export, ZIP creation
- [x] Create `csvExport.js` route with 4 endpoints
- [x] Register route in `index.js`

### Phase 2: Frontend Integration [COMPLETE]
- [x] Add API methods to `api.js`
- [x] Add CSV export section to `backupPanel.js`
- [x] Add minimal CSS styles

### Phase 3: Configuration & Deploy Prep [COMPLETE]
- [x] Update `ecosystem.config.cjs` with CSV_EXPORT_DIR
- [x] Test locally end-to-end

### Phase 4: Verification [COMPLETE]
- [x] Unit test `formatCsvValue()` — 10/10 passed
- [x] Verify UTF-8 BOM present in generated CSVs
- [x] Verify all 4 API endpoints return correct responses
- [x] Verify ZIP download produces valid archive with 5 CSV files
- [x] Verify sensitive config values excluded from export
- [x] Verify path traversal protection

## Decisions
- **Spanish column headers** in CSV files for Excel readability
- **Manual export only** — no auto-triggers on case mutations
- **No external CSV library** — RFC 4180 is simple enough to implement manually
- **ZIP via CLI** (`zip -j`) — consistent with existing `backupService.js` pattern
- **Sensitive config excluded** — `smtp_password`, `certificate_password` filtered out entirely

## Files Created
| File | Description |
|------|-------------|
| `src/server/services/csvExportService.js` | Core CSV generation, file writing, ZIP creation |
| `src/server/routes/csvExport.js` | 4 API endpoints: status, generate, download, list files |

## Files Modified
| File | Change |
|------|--------|
| `src/server/index.js` | Added import + `app.use("/api/csv-export", csvExportRouter)` |
| `src/client/js/api.js` | Added 4 CSV export methods to ApiClient |
| `src/client/js/components/backupPanel.js` | Added "Exportacion CSV" section below existing backup UI |
| `src/client/css/main.css` | Added CSS styles for CSV export section |
| `ecosystem.config.cjs` | Added `CSV_EXPORT_DIR` env var for production + development |

## Post-Deploy (Manual)
- On VPS: Configure Syncthing to share `/home/appuser/data/csv-export/` with user's devices
- Syncthing watches the directory and syncs changes automatically when CSVs are regenerated
