# Responsive Design Constraints - Implementation Tasks

## Overview

Implementation of CSS constraints to prevent text wrapping in UI elements and establish minimum widths for professional responsive behavior. This is a CSS-only change with no JavaScript modifications required.

## IMPORTANT: Task Completion Protocol

**MANDATORY:** Each task MUST be marked with `[x]` immediately after completion. Do NOT batch completions. This ensures context is preserved across the implementation session.

Example:
- [ ] Pending task
- [x] Completed task ✓

## Phase 1: CSS Variables and Utilities

### 1.1 Add Layout Constraint Variables
- [x] Add `--min-main-width: 800px` to variables.css **[REQ-RC-005]** ✓
- [x] Add `--min-viewport-width: 1056px` to variables.css **[REQ-RC-005]** ✓
- [x] Add `--min-table-width: 700px` to variables.css **[REQ-RC-008]** ✓
- [x] Add `--min-form-width: 600px` to variables.css **[REQ-RC-005]** ✓
- [x] Add `--min-metrics-grid-width: 720px` to variables.css **[REQ-RC-005]** ✓
- [x] Add `--min-search-width: 200px` to variables.css **[REQ-RC-007]** ✓
- [x] Add `--max-search-width: 400px` to variables.css **[REQ-RC-007]** ✓
- [x] Add scrollbar styling variables to variables.css **[REQ-RC-010]** ✓

### 1.2 Add Utility Classes
- [x] Add `.no-wrap` utility class to main.css **[REQ-RC-001, REQ-RC-002, REQ-RC-003]** ✓
- [x] Add `.scroll-x` utility class with styled scrollbar **[REQ-RC-010]** ✓
- [x] Add `.scroll-x-hidden` utility class with hidden scrollbar **[REQ-RC-001, REQ-RC-010]** ✓

---

## **CHECKPOINT 1: Verify variables and utilities**
Run visual inspection to confirm variables are defined and utility classes work.

---

## Phase 2: Global Layout Constraints

### 2.1 Body and App Container
- [x] Add `min-width: var(--min-viewport-width)` to `html` **[REQ-RC-005]** ✓
- [x] Add `min-width: var(--min-viewport-width)` and `overflow-x: auto` to `body` **[REQ-RC-005, REQ-RC-010]** ✓
- [x] Add `min-width: var(--min-viewport-width)` to `.app` **[REQ-RC-005]** ✓

### 2.2 Main Content Area
- [x] Add `min-width: var(--min-main-width)` to `.main` **[REQ-RC-005]** ✓
- [x] Verify `max-width` calculation remains correct **[REQ-RC-005]** ✓

### 2.3 Sidebar Stability
- [x] Confirm `.sidebar` has fixed `width: var(--sidebar-width)` **[REQ-RC-006]** ✓
- [x] Add `flex-shrink: 0` to `.sidebar` if not present **[REQ-RC-006]** ✓

---

## **CHECKPOINT 2: Verify main layout constraints**
Resize browser to various widths. Verify:
- Horizontal scroll appears below 1056px
- Main content never shrinks below 800px
- Sidebar remains fixed at 256px

---

## Phase 3: Button No-Wrap

### 3.1 Button Base Styles
- [x] Add `white-space: nowrap` to `.btn` base class **[REQ-RC-002]** ✓
- [x] Add `flex-shrink: 0` to `.btn` base class **[REQ-RC-002]** ✓

### 3.2 Button Variants
- [x] Verify `.btn-primary` inherits no-wrap **[REQ-RC-002]** ✓
- [x] Verify `.btn-secondary` inherits no-wrap **[REQ-RC-002]** ✓
- [x] Verify `.btn-outline` inherits no-wrap **[REQ-RC-002]** ✓
- [x] Add `white-space: nowrap` to `.btn-icon` **[REQ-RC-002]** ✓
- [x] Add `white-space: nowrap` to `.btn-action` **[REQ-RC-002]** ✓
- [x] Add `white-space: nowrap` to `.btn-danger-outline` **[REQ-RC-002]** ✓

### 3.3 Button Groups
- [x] Add `flex-wrap: nowrap` to `.header-actions` **[REQ-RC-004]** ✓
- [x] Add `flex-wrap: nowrap` to `.facturacion-actions` **[REQ-RC-004]** ✓
- [x] Add `flex-wrap: nowrap` to `.turno-header-actions` **[REQ-RC-004]** ✓
- [x] Add `flex-wrap: nowrap` to `.cell-actions` **[REQ-RC-004]** ✓
- [x] Add `flex-shrink: 0` to all action containers **[REQ-RC-004]** ✓

---

## **CHECKPOINT 3: Verify button no-wrap**
Test all views with narrow viewport. Verify:
- All buttons remain single-line
- Button groups never wrap to new row
- Button text with icons stays on one line

---

## Phase 4: Tab Groups No-Wrap

### 4.1 Filter Tabs Container
- [x] Change `.filter-tabs` `flex-wrap: wrap` to `flex-wrap: nowrap` **[REQ-RC-001]** ✓
- [x] Add `white-space: nowrap` to `.filter-tabs` **[REQ-RC-001]** ✓

### 4.2 Individual Tabs
- [x] Add `white-space: nowrap` to `.filter-tab` **[REQ-RC-001]** ✓
- [x] Add `flex-shrink: 0` to `.filter-tab` **[REQ-RC-001]** ✓

### 4.3 List Controls Container
- [x] Change `.list-controls` `flex-wrap: wrap` to `flex-wrap: nowrap` **[REQ-RC-007]** ✓
- [x] Add `overflow-x: auto` to `.list-controls` **[REQ-RC-007, REQ-RC-010]** ✓
- [x] Add hidden scrollbar styles to `.list-controls` **[REQ-RC-010]** ✓

### 4.4 Filters Row
- [x] Add `flex-wrap: nowrap` to `.filters-row` **[REQ-RC-007]** ✓
- [x] Add `overflow-x: auto` to `.filters-row` **[REQ-RC-007, REQ-RC-010]** ✓
- [x] Add hidden scrollbar styles to `.filters-row` **[REQ-RC-010]** ✓

---

## **CHECKPOINT 4: Verify tab groups no-wrap**
Test Dashboard, Facturación List, Particulares List, Turno List. Verify:
- Filter tabs never wrap to second line
- Container scrolls horizontally if needed
- Scrollbar is hidden but functional

---

## Phase 5: Badge No-Wrap

### 5.1 Type Badges
- [x] Add `white-space: nowrap` to `.badge` **[REQ-RC-003]** ✓
- [x] Add `flex-shrink: 0` to `.badge` **[REQ-RC-003]** ✓

### 5.2 Metric Badges
- [x] Add `white-space: nowrap` to `.metric-badge` **[REQ-RC-003]** ✓

### 5.3 Status Badges
- [x] Add `white-space: nowrap` to `.badge-judicial` **[REQ-RC-003]** ✓
- [x] Add `white-space: nowrap` to `.badge-signed` **[REQ-RC-003]** ✓

### 5.4 Count Badges
- [x] Add `white-space: nowrap` to `.filter-count` **[REQ-RC-003]** ✓

---

## Phase 6: Header No-Wrap

### 6.1 Page Header
- [x] Add `flex-wrap: nowrap` to `.header` **[REQ-RC-004]** ✓
- [x] Add `gap: var(--spacing-4)` to `.header` if not present **[REQ-RC-004]** ✓
- [x] Add `flex-shrink: 0` to `.header-title` **[REQ-RC-004]** ✓
- [x] Add `white-space: nowrap` to `.header-title h1` **[REQ-RC-004]** ✓

### 6.2 Facturación Header
- [x] Add `flex-wrap: nowrap` to `.facturacion-header-main` **[REQ-RC-004]** ✓
- [x] Add `gap: var(--spacing-4)` to `.facturacion-header-main` **[REQ-RC-004]** ✓

### 6.3 Turno Header
- [x] Add `flex-wrap: nowrap` to `.turno-header-main` **[REQ-RC-004]** ✓
- [x] Add `gap: var(--spacing-4)` to `.turno-header-main` **[REQ-RC-004]** ✓

### 6.4 Breadcrumbs
- [x] Add `white-space: nowrap` to `.turno-breadcrumb` **[REQ-RC-004]** ✓
- [x] Add `flex-wrap: nowrap` to `.turno-breadcrumb` **[REQ-RC-004]** ✓
- [x] Add `white-space: nowrap` to `.facturacion-header-top` **[REQ-RC-004]** ✓

---

## **CHECKPOINT 5: Verify header no-wrap**
Test all detail views (Facturación ARAG detail, Particulares detail, Turno detail). Verify:
- Headers never wrap
- Breadcrumbs stay on single line
- Action buttons stay aligned right

---

## Phase 7: Table No-Wrap

### 7.1 Table Container
- [x] Add `overflow-x: auto` to `.data-table-container` **[REQ-RC-008, REQ-RC-010]** ✓

### 7.2 Table Element
- [x] Add `min-width: var(--min-table-width)` to `.data-table` **[REQ-RC-008]** ✓

### 7.3 Table Headers
- [x] Add `white-space: nowrap` to `.data-table th` **[REQ-RC-008]** ✓

### 7.4 Table Cells
- [x] Add `white-space: nowrap` to `.cell-reference` **[REQ-RC-008]** ✓
- [x] Add `white-space: nowrap` to `.cell-state` **[REQ-RC-008]** ✓
- [x] Add `white-space: nowrap` to `.cell-date` **[REQ-RC-008]** ✓

---

## Phase 8: Navigation No-Wrap

### 8.1 Sidebar Navigation
- [x] Add `white-space: nowrap` to `.nav-link` **[REQ-RC-006]** ✓
- [x] Add `overflow: hidden` to `.nav-link` **[REQ-RC-006]** ✓
- [x] Add `text-overflow: ellipsis` to `.nav-link` **[REQ-RC-006]** ✓

---

## Phase 9: Grid Minimum Widths

### 9.1 Metrics Grid
- [x] Add `min-width: var(--min-metrics-grid-width)` to `.metrics-grid` **[REQ-RC-005]** ✓

### 9.2 Stats Grid
- [x] Add `min-width: 600px` to `.stats-kpi-grid` **[REQ-RC-005]** ✓

### 9.3 Search Input
- [x] Verify `.search-box` has `min-width: var(--min-search-width)` **[REQ-RC-007]** ✓ (already has 200px)
- [x] Verify `.search-box` has `max-width: var(--max-search-width)` **[REQ-RC-007]** ✓ (already has 400px)
- [x] Verify `.search-input` constraints **[REQ-RC-007]** ✓ (has fixed 256px width)

---

## Phase 10: Remove Problematic Media Queries

### 10.1 Turno Styles (line ~2924)
- [x] Remove `flex-direction: column` from `.turno-header-main` at 768px **[REQ-RC-009]** ✓
- [x] Remove `align-items: flex-start` from `.turno-header-main` at 768px **[REQ-RC-009]** ✓
- [x] Remove `width: 100%` from `.turno-header-actions` at 768px **[REQ-RC-009]** ✓
- [x] Remove `justify-content: flex-start` from `.turno-header-actions` at 768px **[REQ-RC-009]** ✓

### 10.2 Stats Styles (line ~3683)
- [x] Remove `flex-direction: column` from `.stats-header` at 768px **[REQ-RC-009]** ✓

### 10.3 Review All Media Queries
- [x] Audit all `@media (max-width: 768px)` rules **[REQ-RC-009]** ✓
- [x] Remove any rules that cause element stacking/wrapping **[REQ-RC-009]** ✓
- [x] Keep only grid column adjustments that don't break layouts **[REQ-RC-009]** ✓ (kept 1200px breakpoint)

---

## **CHECKPOINT 6: Final verification**
Complete visual regression test:
- [ ] Test at 1920px, 1440px, 1280px, 1056px, 800px
- [ ] Test all views listed in design.md section 8.1
- [ ] Verify no elements wrap to new lines
- [ ] Verify horizontal scroll appears when needed
- [ ] Test in Chrome, Firefox, Safari

---

## Phase 11: Documentation

### 11.1 Update CLAUDE.md
- [x] Document minimum viewport requirement (1056px) ✓
- [x] Document no-wrap policy for inline elements ✓
- [x] Add responsive constraints to UI Design System section ✓

### 11.2 Add CSS Comments
- [x] Add comment block for responsive constraints section in main.css ✓ (added with utility classes)
- [x] Document purpose of min-width variables ✓ (comments in variables.css)

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Variables & Utilities | ✅ Complete | Added layout variables (sidebar-min-width) |
| Phase 2: Global Layout | ✅ Revised | Removed min-widths, no horizontal scroll |
| Phase 3: Button No-Wrap | ✅ Complete | All button types have white-space: nowrap |
| Phase 4: Tab Groups | ✅ Complete | Filter tabs and controls use flex-wrap: nowrap |
| Phase 5: Badge No-Wrap | ✅ Complete | All badges have white-space: nowrap |
| Phase 6: Header No-Wrap | ✅ Complete | Page headers use flex-wrap: nowrap |
| Phase 7: Table No-Wrap | ✅ Revised | Tables use overflow-x: auto (no min-width) |
| Phase 8: Navigation | ✅ Complete | Nav links have text-overflow: ellipsis |
| Phase 9: Grid Minimums | ✅ Revised | Removed min-widths from grids |
| Phase 10: Media Queries | ✅ Complete | Added sidebar shrink breakpoints |
| Phase 11: Documentation | ✅ Complete | Updated CLAUDE.md |

**Implementation completed: 2026-01-31**
**Revised (no horizontal scroll): 2026-01-31**

## Notes

### Implementation Order
Phases should be implemented in order as later phases depend on variables defined in Phase 1.

### Testing Approach
Test after each checkpoint before proceeding. Use browser DevTools responsive mode to quickly test multiple viewport widths.

### Rollback Strategy
All changes are CSS-only and additive. If issues arise, individual properties can be reverted without affecting other functionality.

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All CSS properties used are well-supported in these browsers.
