---
name: record-frontend-component
description: Create vanilla JavaScript frontend components for Record+ legal case management system. Use when adding new views, creating UI components, modifying the SPA, or styling elements. Triggers on requests for frontend features, UI changes, views, pages, or client-side functionality.
---

# Record+ Frontend Component Patterns

## Component Structure

All components follow this class-based view pattern:

```javascript
// src/client/js/components/{componentName}.js
import { api } from "../api.js";
import { router } from "../router.js";
import { showToast, formatDate } from "../app.js";

export class ComponentNameView {
  constructor(container, optionalId = null) {
    this.container = container;
    this.id = optionalId;
    this.data = null;
  }

  async render() {
    try {
      // Fetch data if needed
      if (this.id) {
        this.data = await api.getSomething(this.id);
      }
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Component error:", error);
      showToast("Error al cargar", "error");
    }
  }

  template() {
    return `
      <div class="header">...</div>
      <div class="data-table-container">...</div>
    `;
  }

  bindEvents() {
    // Attach event listeners
  }
}

export default ComponentNameView;
```

## Register Route in app.js

```javascript
import { ComponentNameView } from "./components/componentName.js";

router.register("/path", async () => {
  const view = new ComponentNameView(mainContent);
  await view.render();
});

router.register("/path/:id", async (params) => {
  const view = new ComponentNameView(mainContent, params.id);
  await view.render();
});
```

## Page Header Template

```html
<div class="header">
  <div class="header-title">
    <nav class="breadcrumb" style="font-size: 12px; color: var(--text-dimmed); margin-bottom: 8px;">
      <a href="#/" style="color: var(--text-dimmed); text-decoration: none;">Dashboard</a>
      <span style="margin: 0 8px;">›</span>
      <span style="color: var(--text-muted);">Current Page</span>
    </nav>
    <h1>Page Title</h1>
    <p>Optional subtitle description.</p>
  </div>
  <div class="header-actions">
    <a href="#/action" class="btn btn-primary">
      <svg>...</svg>
      Action Button
    </a>
  </div>
</div>
```

## Common UI Components

### Type Badges

```html
<span class="badge arag"><span class="badge-dot"></span>ARAG</span>
<span class="badge particular"><span class="badge-dot"></span>Particular</span>
<span class="badge turno"><span class="badge-dot"></span>Turno Oficio</span>
```

### Filter Tabs

```html
<div class="filter-tabs">
  <button class="filter-tab active" data-filter="all">Todos</button>
  <button class="filter-tab" data-filter="ARAG">ARAG</button>
  <button class="filter-tab" data-filter="PARTICULAR">Particulares</button>
</div>
```

### Search Input

```html
<div class="search-input">
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
  </svg>
  <input type="text" placeholder="Buscar..." id="search-input">
</div>
```

### Data Table

```html
<div class="data-table-container">
  <table class="data-table">
    <thead>
      <tr><th>Column 1</th><th>Column 2</th><th>Acciones</th></tr>
    </thead>
    <tbody id="table-body">
      <tr data-id="1">
        <td><span class="cell-reference">IY004921</span></td>
        <td>Content</td>
        <td><div class="cell-actions">...</div></td>
      </tr>
    </tbody>
  </table>
  <div class="table-footer">
    <span class="table-info">Mostrando X de Y</span>
    <div class="pagination">
      <button class="btn btn-secondary">Anterior</button>
      <button class="btn btn-secondary">Siguiente</button>
    </div>
  </div>
</div>
```

### Form Input (Inline Style)

```html
<div style="margin-bottom: 20px;">
  <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">
    Label *
  </label>
  <input type="text" name="fieldName" id="field-id"
    style="width: 100%; padding: 10px 12px; background: var(--bg-input);
           border: 1px solid var(--border-default); border-radius: 8px;
           color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;"
    placeholder="Placeholder text">
</div>
```

### Buttons

```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-icon" title="Icon Button">
  <svg>...</svg>
</button>
<button class="btn-action" title="Action" data-action="view" data-id="1">
  <svg>...</svg>
</button>
```

## Event Binding Patterns

### Filter Tabs

```javascript
this.container.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    this.currentFilter = e.target.dataset.filter;
    this.applyFilters();
  });
});
```

### Search with Debounce

```javascript
const searchInput = this.container.querySelector("#search-input");
let searchTimeout;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    this.searchQuery = e.target.value;
    this.applyFilters();
  }, 300);
});
```

### Action Buttons

```javascript
this.container.querySelectorAll(".btn-action").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const action = e.currentTarget.dataset.action;
    const id = e.currentTarget.dataset.id;
    this.handleAction(action, id);
  });
});
```

### Row Click Navigation

```javascript
this.container.querySelectorAll("tr[data-id]").forEach((row) => {
  row.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-action")) {
      router.navigate(`/resource/${row.dataset.id}`);
    }
  });
  row.style.cursor = "pointer";
});
```

## Design System Reference

See [references/design-system.md](references/design-system.md) for CSS variables and styling.

## Checklist

When creating a new component:

1. Create component file in `src/client/js/components/`
2. Import and register route in `src/client/js/app.js`
3. Use class-based view pattern with `render()`, `template()`, `bindEvents()`
4. Use Spanish for all user-facing text
5. Use CSS variables from `variables.css` (never hardcode colors)
6. Import helpers: `api`, `router`, `showToast`, `formatDate`
7. Handle loading and error states
8. Rebind events after dynamic content updates
