# Responsive Design Constraints - Technical Design

## 1. Overview

### 1.1 Technology Stack
- **CSS:** Pure CSS with custom properties
- **Layout Systems:** Flexbox, CSS Grid
- **No frameworks:** Vanilla CSS only

### 1.2 Design Philosophy
Instead of responsive breakpoints that stack/wrap elements, we enforce **minimum widths** and use **horizontal scrolling** as the graceful degradation strategy. This maintains a professional, predictable interface at all viewport sizes.

## 2. Architecture

### 2.1 Layout Constraint System

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser Viewport                            │
│  min-width: 1056px (sidebar 256px + main 800px)                     │
│                                                                      │
│  ┌──────────────┐  ┌─────────────────────────────────────────────┐  │
│  │   Sidebar    │  │              Main Content                    │  │
│  │              │  │           min-width: 800px                   │  │
│  │  fixed 256px │  │                                              │  │
│  │              │  │  ┌─────────────────────────────────────────┐ │  │
│  │  no-wrap     │  │  │  Header Actions (no-wrap, overflow-x)   │ │  │
│  │  nav links   │  │  └─────────────────────────────────────────┘ │  │
│  │              │  │                                              │  │
│  │              │  │  ┌─────────────────────────────────────────┐ │  │
│  │              │  │  │  Filter Controls (no-wrap, overflow-x)  │ │  │
│  │              │  │  │  ┌─────────────┐ ┌──────────────────┐   │ │  │
│  │              │  │  │  │ Tab Group   │ │   Search Input   │   │ │  │
│  │              │  │  │  │ (no-wrap)   │ │   (min: 200px)   │   │ │  │
│  │              │  │  │  └─────────────┘ └──────────────────┘   │ │  │
│  │              │  │  └─────────────────────────────────────────┘ │  │
│  │              │  │                                              │  │
│  │              │  │  ┌─────────────────────────────────────────┐ │  │
│  │              │  │  │  Content Grid (min-width constraints)    │ │  │
│  │              │  │  └─────────────────────────────────────────┘ │  │
│  │              │  │                                              │  │
│  └──────────────┘  └─────────────────────────────────────────────┘  │
│                                                                      │
│  ← horizontal scroll when viewport < 1056px →                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 No-Wrap Zones

```
┌────────────────────────────────────────────────────────────────────┐
│                        No-Wrap Zones                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Tab Groups                                                      │
│     ┌────────┬──────────┬────────────┬───────────┐                 │
│     │ Todos  │ Abiertos │ Judiciales │ Archivados│  ← never wraps  │
│     └────────┴──────────┴────────────┴───────────┘                 │
│                                                                     │
│  2. Button Groups                                                   │
│     ┌──────────────┬────────────┬─────────────────┐                │
│     │ + Nuevo Caso │ ⚙ Config   │ 🔔 Notificaciones│  ← never wraps │
│     └──────────────┴────────────┴─────────────────┘                │
│                                                                     │
│  3. Badges                                                          │
│     ┌──────┐ ┌────────────┐ ┌───────────────┐                      │
│     │ ARAG │ │ PARTICULAR │ │ TURNO OFICIO │  ← never wraps        │
│     └──────┘ └────────────┘ └───────────────┘                      │
│                                                                     │
│  4. Table Headers                                                   │
│     ┌────────────┬──────────┬────────┬────────┬─────────┐          │
│     │ Referencia │ Cliente  │  Tipo  │ Estado │ Acciones│ ← no wrap│
│     └────────────┴──────────┴────────┴────────┴─────────┘          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## 3. CSS Design Tokens (New Variables)

Add to `variables.css`:

```css
:root {
  /* Layout Constraints */
  --min-main-width: 800px;
  --min-viewport-width: 1056px;  /* sidebar + main minimum */
  --min-table-width: 700px;
  --min-form-width: 600px;
  --min-metrics-grid-width: 720px;
  --min-search-width: 200px;
  --max-search-width: 400px;

  /* Overflow Scrollbar Styling */
  --scrollbar-width: 6px;
  --scrollbar-track-bg: transparent;
  --scrollbar-thumb-bg: rgba(255, 255, 255, 0.1);
  --scrollbar-thumb-hover-bg: rgba(255, 255, 255, 0.2);
}
```

## 4. Core CSS Components

### 4.1 Global No-Wrap Utility Classes

```css
/* Utility class for no-wrap containers */
.no-wrap {
  white-space: nowrap;
  flex-wrap: nowrap !important;
}

/* Scrollable container for overflowing inline content */
.scroll-x {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb-bg) var(--scrollbar-track-bg);
}

.scroll-x::-webkit-scrollbar {
  height: var(--scrollbar-width);
}

.scroll-x::-webkit-scrollbar-track {
  background: var(--scrollbar-track-bg);
}

.scroll-x::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-bg);
  border-radius: var(--radius-full);
}

.scroll-x::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover-bg);
}

/* Hide scrollbar visually but keep functionality */
.scroll-x-hidden {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.scroll-x-hidden::-webkit-scrollbar {
  display: none;
}
```

### 4.2 Main Layout Constraints

```css
/* Body minimum width */
html {
  min-width: var(--min-viewport-width);
}

body {
  min-width: var(--min-viewport-width);
  overflow-x: auto;
}

/* Main content area minimum width */
.main {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: var(--spacing-8);
  min-height: 100vh;
  min-width: var(--min-main-width);
  max-width: calc(100vw - var(--sidebar-width));
}

/* App container */
.app {
  display: flex;
  min-height: 100vh;
  min-width: var(--min-viewport-width);
  position: relative;
}
```

### 4.3 Button No-Wrap Styles

```css
/* All button types - no wrap */
.btn,
.btn-primary,
.btn-secondary,
.btn-outline,
.btn-icon,
.btn-action,
.btn-danger-outline {
  white-space: nowrap;
  flex-shrink: 0;
}

/* Button groups */
.header-actions,
.facturacion-actions,
.turno-header-actions,
.cell-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: nowrap;
  flex-shrink: 0;
}
```

### 4.4 Tab Groups No-Wrap

```css
/* Filter tabs container - never wrap */
.filter-tabs {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: nowrap;
  white-space: nowrap;
}

/* Individual tabs */
.filter-tab {
  white-space: nowrap;
  flex-shrink: 0;
}

/* List controls bar - scrollable if needed */
.list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-5);
  background: rgba(24, 24, 27, 0.4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.list-controls::-webkit-scrollbar {
  display: none;
}

/* Filters row - scrollable if needed */
.filters-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.filters-row::-webkit-scrollbar {
  display: none;
}
```

### 4.5 Badge No-Wrap Styles

```css
/* All badges - no wrap */
.badge,
.metric-badge,
.badge-judicial,
.badge-signed,
.filter-count {
  white-space: nowrap;
  flex-shrink: 0;
}
```

### 4.6 Header No-Wrap Styles

```css
/* Page headers - content doesn't wrap */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-8);
  padding-bottom: var(--spacing-6);
  border-bottom: 1px solid var(--border-subtle);
  flex-wrap: nowrap;
  gap: var(--spacing-4);
}

.header-title {
  flex-shrink: 0;
}

.header-title h1 {
  white-space: nowrap;
}

/* Facturacion header */
.facturacion-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: var(--spacing-4);
}

/* Turno header */
.turno-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: var(--spacing-4);
}
```

### 4.7 Table No-Wrap Styles

```css
/* Table container - scrollable */
.data-table-container {
  overflow-x: auto;
  min-width: 100%;
}

/* Table minimum width */
.data-table {
  width: 100%;
  min-width: var(--min-table-width);
  border-collapse: collapse;
}

/* Table headers - no wrap */
.data-table th {
  white-space: nowrap;
}

/* Table cells with references */
.cell-reference,
.cell-state,
.cell-date {
  white-space: nowrap;
}
```

### 4.8 Navigation No-Wrap Styles

```css
/* Sidebar navigation */
.nav-link {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Breadcrumbs */
.turno-breadcrumb,
.facturacion-header-top {
  white-space: nowrap;
  flex-wrap: nowrap;
}
```

### 4.9 Grid Minimum Widths

```css
/* Metrics grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-6);
  min-width: var(--min-metrics-grid-width);
}

/* Case card grid */
.case-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-4);
  min-width: 100%;
}

/* Stats KPI grid */
.stats-kpi-grid {
  min-width: 600px;
}
```

### 4.10 Search Input Constraints

```css
/* Search input */
.search-input,
.search-box {
  min-width: var(--min-search-width);
  max-width: var(--max-search-width);
  flex-shrink: 1;
}
```

## 5. Media Query Updates

### 5.1 Rules to Remove/Modify

The following responsive rules need to be removed or modified:

```css
/* REMOVE: These cause unwanted wrapping */

/* From turno styles (line ~2924) */
@media (max-width: 768px) {
  .turno-header-main {
    flex-direction: column;  /* REMOVE */
    align-items: flex-start; /* REMOVE */
    gap: var(--spacing-4);
  }

  .turno-header-actions {
    width: 100%;            /* REMOVE */
    justify-content: flex-start;
  }
}

/* From stats styles (line ~3683) */
@media (max-width: 768px) {
  .stats-header {
    flex-direction: column; /* REMOVE */
    gap: var(--spacing-4);
  }
}

/* From list-controls (line ~4438) */
.list-controls {
  flex-wrap: wrap;  /* CHANGE TO: nowrap */
}

.filter-tabs {
  flex-wrap: wrap;  /* CHANGE TO: nowrap */
}
```

### 5.2 Revised Media Queries

```css
/* Only keep media queries that enhance UX without breaking layouts */

@media (max-width: 1200px) {
  /* Allow grid adjustments that don't break layouts */
  .stats-kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-charts-row {
    flex-direction: column;
  }

  .stats-chart-side {
    width: 100%;
  }
}

/* Remove all 768px breakpoint rules that cause stacking/wrapping */
```

## 6. Correctness Properties

### Property 1: Tab Group Integrity

_For any_ filter tab group container, _all child tabs_ shall remain on a single horizontal line.

**Validates:** REQ-RC-001.1, REQ-RC-001.3

**Test:** Resize viewport to any width; verify tabs never wrap to second line.

### Property 2: Button Text Atomicity

_For any_ button element, the text content shall remain on a single line regardless of container width.

**Validates:** REQ-RC-002.1, REQ-RC-002.4

**Test:** Inspect all buttons across views; verify `white-space: nowrap` is applied.

### Property 3: Main Content Minimum Bound

_For any_ viewport width, the main content area shall never be narrower than 800px.

**Validates:** REQ-RC-005.1, REQ-RC-005.3

**Test:** Resize browser to very narrow widths; verify `.main` element never shrinks below 800px.

### Property 4: Horizontal Scroll Fallback

_For any_ situation where content exceeds container width, horizontal scrolling shall be enabled rather than wrapping.

**Validates:** REQ-RC-010.1, REQ-RC-010.2

**Test:** Narrow viewport below minimum; verify horizontal scrollbar appears on body.

### Property 5: Badge Compactness

_For any_ badge element, text shall not wrap and dimensions shall remain constant across viewport sizes.

**Validates:** REQ-RC-003.1, REQ-RC-003.3

**Test:** Resize viewport; verify all badges maintain single-line text.

### Property 6: Sidebar Stability

_For any_ viewport configuration, the sidebar shall maintain exactly 256px width.

**Validates:** REQ-RC-006.1, REQ-RC-006.2

**Test:** Resize viewport to any width; verify sidebar width is constant.

### Property 7: Header Actions Linearity

_For any_ header with action buttons, all actions shall remain on a single horizontal line.

**Validates:** REQ-RC-004.1, REQ-RC-004.2

**Test:** Resize viewport; verify header actions never wrap to new row.

## 7. Error Handling

### 7.1 Overflow Scenarios

| Scenario | Behavior |
|----------|----------|
| Viewport < 1056px | Body shows horizontal scrollbar |
| Tab group overflows | Container scrolls horizontally (hidden scrollbar) |
| Header actions overflow | Parent container scrolls horizontally |
| Table exceeds container | Table container scrolls horizontally |
| Long text in fixed-width element | Text is truncated with ellipsis |

### 7.2 CSS Fallbacks

```css
/* Fallback for browsers without custom scrollbar support */
@supports not (scrollbar-width: thin) {
  .scroll-x {
    overflow-x: scroll;
  }
}

/* Fallback for older webkit browsers */
@supports not (-webkit-overflow-scrolling: touch) {
  .scroll-x {
    -webkit-overflow-scrolling: auto;
  }
}
```

## 8. Testing Strategy

### 8.1 Visual Regression Tests

1. **Viewport Width Matrix:**
   - 1920px (desktop)
   - 1440px (laptop)
   - 1280px (minimum supported)
   - 1056px (minimum before scroll)
   - 800px (force horizontal scroll)

2. **Views to Test:**
   - Dashboard
   - Facturación ARAG list
   - Facturación ARAG detail
   - Particulares list
   - Particulares detail
   - Turno de Oficio list
   - Turno de Oficio detail
   - Estadísticas
   - Configuración
   - Admin panel

### 8.2 Property-Based Tests

```javascript
// Test: All tab groups maintain no-wrap
describe('Tab Groups No-Wrap', () => {
  const viewports = [1920, 1440, 1280, 1056, 800];
  const tabSelectors = [
    '.filter-tabs',
    '.list-controls .filter-tabs',
    '.filters-row .filter-tabs'
  ];

  viewports.forEach(width => {
    tabSelectors.forEach(selector => {
      it(`${selector} at ${width}px should not wrap`, () => {
        cy.viewport(width, 900);
        cy.get(selector).should('have.css', 'flex-wrap', 'nowrap');
        // Verify all children are on same Y position
        cy.get(`${selector} > *`).then($tabs => {
          const tops = [...$tabs].map(el => el.getBoundingClientRect().top);
          const allSameTop = tops.every(t => t === tops[0]);
          expect(allSameTop).to.be.true;
        });
      });
    });
  });
});

// Test: Main content minimum width
describe('Main Content Minimum Width', () => {
  it('should maintain 800px minimum width', () => {
    cy.viewport(600, 900);
    cy.get('.main').invoke('outerWidth').should('be.gte', 800);
  });
});

// Test: Horizontal scroll appears below minimum
describe('Horizontal Scroll Fallback', () => {
  it('should show horizontal scroll at narrow viewports', () => {
    cy.viewport(800, 900);
    cy.document().its('documentElement.scrollWidth')
      .should('be.gt', 800);
  });
});
```

### 8.3 Manual Test Checklist

- [ ] Resize browser from 1920px to 800px continuously
- [ ] Verify no elements wrap to new lines
- [ ] Verify horizontal scrollbar appears at narrow widths
- [ ] Verify all text in buttons, tabs, badges remains single-line
- [ ] Verify sidebar remains fixed at 256px
- [ ] Verify tables scroll horizontally when needed
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test with zoom levels 100%, 125%, 150%

## 9. File Structure

```
src/client/css/
├── variables.css          # Add new layout constraint variables
├── main.css               # Update existing styles
└── components/            # (if needed for component-specific overrides)
    └── responsive.css     # New file for responsive constraint utilities
```

## 10. Migration Notes

### 10.1 Breaking Changes
- Elements that previously stacked on narrow viewports will now require horizontal scrolling
- Users with viewports narrower than 1056px will need to scroll horizontally

### 10.2 Backwards Compatibility
- All existing CSS classes are preserved
- New utility classes are additive
- No JavaScript changes required

## 11. Performance Considerations

- `overflow-x: auto` has minimal performance impact
- `white-space: nowrap` has no performance impact
- Hidden scrollbars use standard CSS properties
- No JavaScript is required for these constraints
