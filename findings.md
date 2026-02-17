# Findings

## Research & Discovery Notes

### Current Frontend (estadisticas.js)
The component is fully built with **mock data only** — no API calls. Uses `getMockStats()` method.

**What it currently renders:**

| Section | Content | Uses Money? |
|---------|---------|-------------|
| Header | "Análisis Financiero" + date picker + Export PDF btn | No |
| KPI Card 1 | Facturación Total: 42,850€ | **YES** |
| KPI Card 2 | Expedientes Nuevos: 128 | No |
| KPI Card 3 | Ticket Medio ARAG: 245.63€ | **YES** |
| KPI Card 4 | Pendiente de Cobro: 3,240€ | **YES** |
| Bar Chart | Monthly evolution (Jan-Oct) with "Facturación"/"Expedientes" tabs | **YES** (Facturación tab) |
| Distribution | Income by case type (ARAG 62%, Particulares 28%, Turno 10%) | **YES** (shows €) |
| Table | Procedures with case count, revenue, avg ticket, trend | **YES** |

**3 out of 4 KPI cards are money-related.** The monthly chart defaults to "Facturación" tab. The procedures table is entirely revenue-focused.

### Current Backend (dashboardService.js)
Single endpoint: `GET /api/dashboard?month=N&year=YYYY`

Returns:
- `entriesThisMonth` — cases created this month (total + per type)
- `archivedThisMonth` — cases archived this month (total + per type)
- `pending` — open/judicial cases (total + per type)

**This is a solid foundation but only covers ONE month at a time.** No multi-month or year-range queries.

### CSS (main.css lines 4030-4570)
Beautiful dark theme with glassmorphism, glow effects, responsive grid. Supports light mode too. The CSS is well-structured with `.stats-*` prefix classes. **This should be preserved as-is.**

### Non-functional UI elements
- Export PDF button → toast "en desarrollo"
- Date picker → purely visual
- Tab switching → toggles UI only, no data change
- "Ver todo" button → toast "en desarrollo"

## Relevant Files
| File | Purpose |
|------|---------|
| src/client/js/components/estadisticas.js | Frontend component (mock data) |
| src/client/css/main.css (lines 4030-4570) | Statistics CSS |
| src/client/css/variables.css | Stats color variables |
| src/server/routes/dashboard.js | Dashboard API route |
| src/server/services/dashboardService.js | Dashboard service (case counts) |
| src/server/__tests__/dashboardService.test.js | 5 property-based tests (passing) |

## Key Observations
- The frontend design is high quality — preserve the visual language
- 3/4 KPI cards and the procedures table are money-focused → user wants to remove these
- Backend only returns single-month snapshots — needs multi-month endpoint for bar chart
- No statistics-specific API endpoint exists yet — dashboard endpoint is basic
- The "Expedientes" tab concept on the chart is exactly what we need (cases over time)
- Distribution by case type is useful even without money (just show case counts %)

## Risks & Considerations
- Removing money KPIs leaves only 1 KPI card — need to design replacement cards
- The bar chart needs a new backend endpoint for monthly evolution across a year
- Export functionality (PDF/Excel) is deferred — buttons should remain but stay disabled or show "en desarrollo"
