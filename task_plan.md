# Task Plan: Statistics Module MVP

## Status: PLANNING — AWAITING APPROVAL

## Objective
Replace the mock-data statistics frontend with a fully functional statistics module. Remove money-related metrics. Add real case activity stats, year-over-year comparisons, case type filtering, and export to Excel/PDF.

## Decisions Log
| Decision | Rationale | Date |
|----------|-----------|------|
| Remove money KPIs (Facturación, Ticket Medio, Pendiente Cobro) | User doesn't need revenue tracking for MVP | 2026-02-16 |
| 4 KPI cards with trends vs last month | Cases + Trends option chosen by user | 2026-02-16 |
| Stacked bar chart by case type | Shows ARAG/Particular/Turno breakdown per month | 2026-02-16 |
| Year selector (not full date range) | Simple dropdown for MVP, defers date range picker | 2026-02-16 |
| Keep all original spec requirements | Entry/archive counts, YoY, filtering, Excel + PDF export | 2026-02-16 |

---

## MVP Features

### KPI Cards (4 cards with trend indicators)
1. **Expedientes Nuevos** — Cases created this month + % change vs last month
2. **Expedientes Archivados** — Cases archived this month + % change vs last month
3. **Expedientes Pendientes** — Total open cases (ABIERTO + JUDICIAL)
4. **Media Mensual** — Average cases per month this year

### Bar Chart
- Stacked bars: ARAG (yellow) + Particular (indigo) + Turno (gray) per month
- Full year view (Jan–Dec for selected year)
- Hover tooltips showing breakdown per type

### Distribution Section
- Keep current design but show **case count %** instead of money
- ARAG: X% (N cases), Particular: Y% (N cases), Turno: Z% (N cases)

### Year-over-Year Comparison
- Compare current year vs previous 1-2 years
- Show in a compact visual (small multiples or overlay lines)

### Filtering
- Year selector dropdown (2025, 2026, etc.)
- Case type filter (All / ARAG / Particular / Turno de Oficio)

### Export
- Export to Excel (CSV compatible) — one button
- Export to PDF — one button

---

## Phases

### Phase 1: Backend — Statistics API
New endpoint: `GET /api/statistics?year=YYYY&type=ALL|ARAG|PARTICULAR|TURNO_OFICIO`

Returns all data the frontend needs in a single call:

```json
{
  "year": 2026,
  "filter": "ALL",
  "kpis": {
    "newThisMonth": { "count": 12, "previousMonth": 10, "changePercent": 20.0 },
    "archivedThisMonth": { "count": 5, "previousMonth": 8, "changePercent": -37.5 },
    "pending": { "count": 47 },
    "monthlyAverage": { "count": 9.5 }
  },
  "monthly": [
    { "month": 1, "label": "Ene", "arag": 5, "particular": 3, "turno": 2, "total": 10 },
    { "month": 2, "label": "Feb", "arag": 4, "particular": 2, "turno": 1, "total": 7 },
    ...
  ],
  "distribution": {
    "arag": { "count": 45, "percent": 62.5 },
    "particular": { "count": 20, "percent": 27.8 },
    "turno": { "count": 7, "percent": 9.7 }
  },
  "yearOverYear": {
    "2026": [10, 7, 12, 8, ...],
    "2025": [6, 9, 5, 11, ...],
    "2024": [4, 3, 7, 5, ...]
  },
  "availableYears": [2024, 2025, 2026]
}
```

Files to create/modify:
- [ ] Create `src/server/services/statisticsService.js` — all SQL queries
- [ ] Create `src/server/routes/statistics.js` — API route
- [ ] Register route in `src/server/index.js`
- [ ] Write property-based tests for the service

### Phase 2: Backend — Export Endpoints
Two new endpoints:
- `GET /api/statistics/export/excel?year=YYYY&type=...` → CSV file download
- `GET /api/statistics/export/pdf?year=YYYY&type=...` → PDF file download

Files to create/modify:
- [ ] Add export methods to `statisticsService.js`
- [ ] Add export routes to `statistics.js`
- [ ] PDF generation: reuse `pdfGeneratorService.js` patterns or add stats PDF template

### Phase 3: Frontend — Connect to Real Data
Replace `getMockStats()` with API calls and rewire all sections.

Files to modify:
- [ ] Rewrite `src/client/js/components/estadisticas.js`:
  - Remove `getMockStats()` entirely
  - Add `fetchStatistics(year, type)` method calling `GET /api/statistics`
  - Replace header title "Análisis Financiero" → "Estadísticas" or "Análisis de Expedientes"
  - Redesign 4 KPI cards (remove money, add case trends)
  - Rewrite bar chart renderer for stacked bars
  - Update distribution section (case counts instead of money)
  - Wire year selector dropdown
  - Wire case type filter
  - Wire Export Excel/PDF buttons
  - Add year-over-year comparison section

### Phase 4: Frontend — Year-over-Year & Polish
- [ ] Add YoY comparison visual (e.g., sparklines or small multi-year overlay)
- [ ] Ensure all hover tooltips work with real data
- [ ] Test with empty data (new year, no cases)
- [ ] Test light mode + dark mode

### Phase 5: Verification & Tests
- [ ] Property-based tests for statisticsService (following existing dashboard test patterns)
- [ ] Manual verification on local Mac with dev server
- [ ] Test export downloads (Excel/PDF)
- [ ] Edge cases: empty year, single case, all same type

---

## Blocked / Open Questions
- None currently — user decisions captured above
