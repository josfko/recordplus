# Design System Reference

## Color Variables

### Backgrounds
```css
--bg-primary: #09090b;      /* Main app background */
--bg-body: #000000;         /* Body background */
--bg-card: rgba(24, 24, 27, 0.6);  /* Card/container background */
--bg-sidebar: rgba(0, 0, 0, 0.4);  /* Sidebar with blur */
--bg-input: rgba(24, 24, 27, 0.5); /* Form inputs */
--bg-hover: rgba(255, 255, 255, 0.1); /* Hover states */
```

### Text
```css
--text-primary: #ffffff;    /* Main text */
--text-secondary: #e4e4e7;  /* Secondary text */
--text-muted: #a1a1aa;      /* Muted text */
--text-dimmed: #71717a;     /* Dimmed/label text */
--text-placeholder: #52525b; /* Placeholder text */
```

### Borders
```css
--border-default: rgba(255, 255, 255, 0.1);
--border-light: rgba(255, 255, 255, 0.08);
--border-subtle: rgba(255, 255, 255, 0.05);
```

### Case Type Badge Colors

**ARAG (Yellow)**
```css
--badge-arag-bg: rgba(234, 179, 8, 0.1);
--badge-arag-border: rgba(234, 179, 8, 0.2);
--badge-arag-text: #facc15;
```

**Particular (Indigo)**
```css
--badge-particular-bg: rgba(99, 102, 241, 0.1);
--badge-particular-border: rgba(99, 102, 241, 0.2);
--badge-particular-text: #818cf8;
```

**Turno Oficio (Gray)**
```css
--badge-turno-bg: rgba(39, 39, 42, 0.5);
--badge-turno-border: #3f3f46;
--badge-turno-text: #a1a1aa;
```

### Status Colors
```css
--status-success-text: #34d399;
--status-judicial: #fb7185;
--status-error: #f87171;
```

### Metric Cards
```css
/* Entries (Indigo) */
--metric-entries-bg: rgba(99, 102, 241, 0.1);
--metric-entries-icon: #6366f1;

/* Archived (Pink) */
--metric-archived-bg: rgba(236, 72, 153, 0.1);
--metric-archived-icon: #ec4899;

/* Pending (Cyan) */
--metric-pending-bg: rgba(6, 182, 212, 0.1);
--metric-pending-icon: #06b6d4;
```

## Typography

### Fonts
```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: "Liberation Mono", "Courier New", monospace;
```

### Font Sizes
```css
--text-xs: 10px;   /* Small labels */
--text-sm: 12px;   /* Body small, labels */
--text-base: 14px; /* Default body */
--text-lg: 16px;   /* Large body */
--text-xl: 20px;   /* Subheadings */
--text-2xl: 24px;  /* Page titles */
```

### Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
```

## Spacing Scale

```css
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
```

## Border Radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;   /* Buttons, inputs, cards */
--radius-xl: 16px;  /* Large containers */
--radius-full: 9999px; /* Pills, avatars */
```

## Layout

```css
--sidebar-width: 256px;
--content-padding: 32px;
```

## Glassmorphism Effect

Apply to cards and containers:
```css
background: var(--bg-card);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid var(--border-default);
border-radius: var(--radius-xl);
```

## Button Styles

### Primary (Gradient)
```css
background: linear-gradient(90deg, #c026d3 0%, #db2777 100%);
color: white;
border-radius: 8px;
padding: 10px 16px;
```

### Secondary
```css
background: var(--bg-button-secondary);
border: 1px solid var(--border-default);
color: var(--text-secondary);
```

## Cell Classes

```css
.cell-reference   /* Monospace reference numbers (IY004921) */
.cell-date        /* Formatted dates */
.cell-state       /* State text */
.cell-state.judicial  /* Red judicial state */
.cell-actions     /* Action buttons container */
```

## Common SVG Icons

### Plus (New button)
```html
<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M7 1v12M1 7h12"/>
</svg>
```

### Search
```html
<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
  <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
</svg>
```

### Chevron Right (View)
```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M6 12l4-4-4-4"/>
</svg>
```

### Document
```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M4 2h5l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
  <path d="M9 2v4h4"/>
</svg>
```
