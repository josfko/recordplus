# Requirements: ES Module Race Condition Prevention

## Introduction

### Overview

This specification defines a bulletproof initialization pattern for Single Page Applications (SPAs) that use ES Modules. The pattern prevents a critical race condition where the `DOMContentLoaded` event fires before the application's JavaScript modules finish loading, resulting in a blank page.

### Problem Statement

ES Modules are loaded asynchronously by browsers (equivalent to having `defer` attribute). When an application has many import statements, the browser may fire `DOMContentLoaded` before all modules resolve. If the application relies on this event to initialize, it never runs.

**Affected Scenarios:**
- Production deployments with CDN caching (pages load faster than JS)
- Browser back/forward cache (bfcache)
- HTTP/2 multiplexing (HTML arrives before JS executes)
- Any SPA using `<script type="module">`

### Module Dependencies

- **Extends:** Core frontend architecture
- **Affects:** `src/client/js/app.js`, `src/client/index.html`
- **Used by:** All frontend views and components

### Technical Context

- **Stack:** Vanilla JavaScript with ES Modules
- **Hosting:** Cloudflare Pages (CDN with aggressive caching)
- **Router:** Hash-based SPA router
- **Entry Point:** `src/client/js/app.js` (13+ module imports)

## Glossary

| Term | Definition |
|------|------------|
| **Race Condition** | A bug where system behavior depends on the sequence or timing of uncontrollable events |
| **DOMContentLoaded** | Browser event fired when the HTML document has been completely parsed (before stylesheets, images, and subframes finish loading) |
| **ES Module** | JavaScript module using `import`/`export` syntax, loaded asynchronously by default |
| **readyState** | DOM property indicating document loading status: `"loading"` → `"interactive"` → `"complete"` |
| **bfcache** | Back/Forward Cache - browser feature that stores page state for instant back/forward navigation |
| **Idempotent** | Operation that produces the same result regardless of how many times it's executed |

## Requirements

### Requirement 1: Guaranteed Initialization

**User Story:** As a user, I want the application to always initialize correctly so that I never see a blank page.

**Acceptance Criteria:**

1. WHEN the page loads with `document.readyState === "loading"`, THE System SHALL register a `DOMContentLoaded` listener AND initialize when the event fires
2. WHEN the page loads with `document.readyState === "interactive"`, THE System SHALL initialize immediately without waiting for any event
3. WHEN the page loads with `document.readyState === "complete"`, THE System SHALL initialize immediately without waiting for any event
4. THE System SHALL initialize successfully regardless of network speed, caching state, or browser behavior
5. THE System SHALL log the initialization path taken for debugging purposes

### Requirement 2: Double Initialization Prevention

**User Story:** As a developer, I want the initialization to be idempotent so that calling it multiple times doesn't cause errors.

**Acceptance Criteria:**

1. THE System SHALL track initialization state using a global flag (`window.__recordPlusInitialized`)
2. WHEN `initApp()` is called and the app is already initialized, THE System SHALL return immediately without re-executing
3. THE System SHALL log a warning if double initialization is attempted
4. THE System SHALL NOT register duplicate event listeners
5. THE System SHALL NOT re-initialize the router or re-render content if already initialized

### Requirement 3: DOM Element Validation

**User Story:** As a developer, I want the initialization to validate required DOM elements so that missing elements fail gracefully.

**Acceptance Criteria:**

1. WHEN `initApp()` runs, THE System SHALL verify that `#main-content` element exists
2. IF `#main-content` is not found, THE System SHALL log an error with the message "Cannot initialize: #main-content not found"
3. IF `#main-content` is not found, THE System SHALL NOT throw an unhandled exception
4. THE System SHALL NOT attempt to initialize the router without a valid container element

### Requirement 4: Failsafe Fallback

**User Story:** As a user, I want the application to recover even if the primary initialization method fails so that edge cases are handled.

**Acceptance Criteria:**

1. THE System SHALL register a `window.load` event listener as a failsafe
2. WHEN `window.load` fires AND the app is not yet initialized, THE System SHALL attempt initialization
3. WHEN `window.load` fires AND the app is already initialized, THE System SHALL do nothing
4. THE System SHALL log when failsafe initialization is triggered
5. THE System SHALL support pages restored from bfcache (back/forward navigation)

### Requirement 5: Observable Initialization

**User Story:** As a developer, I want to observe the initialization process so that I can debug issues in production.

**Acceptance Criteria:**

1. THE System SHALL log the `document.readyState` value at the top of the module (before imports resolve)
2. THE System SHALL log the `document.readyState` value after all imports resolve
3. THE System SHALL log which initialization path was taken (immediate, DOMContentLoaded, or failsafe)
4. THE System SHALL log when initialization completes successfully
5. THE System SHALL include timestamps in debug logs when `DEBUG` mode is enabled

### Requirement 6: Bootstrap Pattern

**User Story:** As a developer, I want a reusable bootstrap pattern so that other modules can use the same reliable initialization.

**Acceptance Criteria:**

1. THE System SHALL provide a `ready(callback)` utility function
2. WHEN `ready(callback)` is called with `readyState === "loading"`, THE System SHALL register the callback for `DOMContentLoaded`
3. WHEN `ready(callback)` is called with `readyState !== "loading"`, THE System SHALL execute the callback via `setTimeout(callback, 0)`
4. THE System SHALL export the `ready` utility for use by other modules
5. THE `ready` function SHALL NOT modify any global state other than adding event listeners

## Non-Functional Requirements

### Performance

- Initialization SHALL complete within 100ms of DOM being ready
- The bootstrap code SHALL add no more than 50 bytes to the bundle size (gzipped)
- No polling or retry loops SHALL be used

### Reliability

- The pattern SHALL work in all evergreen browsers (Chrome, Firefox, Safari, Edge)
- The pattern SHALL work with browser extensions that modify page load timing
- The pattern SHALL work when the page is loaded via Service Worker

### Maintainability

- The initialization code SHALL be self-contained in a single IIFE
- The pattern SHALL not require changes to `index.html`
- The pattern SHALL be documented in `docs/TROUBLESHOOTING.md`

## Out of Scope

- Server-side rendering (SSR) initialization patterns
- Module federation or micro-frontend initialization
- Web Component initialization timing
- Service Worker installation timing
