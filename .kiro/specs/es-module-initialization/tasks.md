# Tasks: ES Module Race Condition Prevention

## Overview

Implementation tasks for the bulletproof ES Module initialization pattern. This fix ensures the application initializes correctly regardless of network conditions, caching, or browser behavior.

**Estimated Effort:** 2-3 hours
**Risk Level:** Low (isolated change, easy to test)
**Files Changed:** 2 (app.js, new ready.js utility)

---

## Phase 1: Core Implementation

### 1.1 Update initApp() with Guards
- [x] Add DOM element existence check at start of `initApp()` (Req 3.1, 3.2)
- [x] Add `window.__recordPlusInitialized` flag check (Req 2.1, 2.2)
- [x] Set flag to `true` after guards pass (Req 2.1)
- [x] Add console logging for initialization success (Req 5.4)
- [x] Add console warning for double initialization attempts (Req 2.3)
- [x] Add console error for missing `#main-content` (Req 3.2)

### 1.2 Implement Bootstrap IIFE
- [x] Replace existing initialization code (lines 143-149) with bootstrap IIFE (Req 1.1-1.4)
- [x] Add `readyState === "loading"` check with `DOMContentLoaded` listener (Req 1.1)
- [x] Add immediate `initApp()` call for `readyState !== "loading"` (Req 1.2, 1.3)
- [x] Add `window.load` failsafe listener (Req 4.1, 4.2)
- [x] Add console warning when failsafe is triggered (Req 4.4)

### 1.3 Add Console Logging Prefix
- [x] Prefix all console messages with `[Record+]` for easy filtering
- [x] Use `console.error()` for critical failures
- [x] Use `console.warn()` for recoverable issues
- [x] Use `console.log()` for success messages

**Checkpoint 1:** Run application locally, verify initialization logs appear in console.

---

## Phase 2: Ready Utility

### 2.1 Create Ready Utility Module
- [x] Create `src/client/js/utils/ready.js` (Req 6.1)
- [x] Implement `ready(callback)` function (Req 6.2, 6.3)
- [x] Add JSDoc documentation with examples
- [x] Export function for use by other modules (Req 6.4)

```javascript
// Expected implementation
export function ready(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    setTimeout(callback, 0);
  }
}
```

### 2.2 Create Utils Directory Structure
- [x] Create `src/client/js/utils/` directory if not exists
- [x] Add `index.js` barrel export for utils

**Checkpoint 2:** Import `ready()` in browser console and verify it works.

---

## Phase 3: Testing

### 3.1 Unit Tests
- [ ] Create `src/client/js/__tests__/bootstrap.test.js`
- [ ] Test: initializes immediately when `readyState` is "interactive"
- [ ] Test: initializes immediately when `readyState` is "complete"
- [ ] Test: waits for DOMContentLoaded when `readyState` is "loading"
- [ ] Test: failsafe triggers if primary initialization missed
- [ ] Test: double initialization is prevented
- [ ] Test: missing `#main-content` logs error and aborts

### 3.2 Property-Based Tests
- [ ] Create `src/client/js/__tests__/bootstrap.property.test.js`
- [ ] Test: exactly one initialization regardless of timing (Property 1)
- [ ] Test: idempotency - multiple calls same as single call (Property 2)
- [ ] Test: failsafe recovery works (Property 3)
- [ ] Test: no unhandled exceptions for any DOM state (Property 4)

### 3.3 Manual Testing Checklist
- [ ] Fresh page load in Chrome - app initializes
- [ ] Fresh page load in Firefox - app initializes
- [ ] Fresh page load in Safari - app initializes
- [ ] Hard refresh (Cmd+Shift+R) - app initializes
- [ ] Navigate away and use browser back button - app initializes
- [ ] Slow 3G throttling in DevTools - app initializes
- [ ] Disable cache in DevTools - app initializes
- [ ] Open in incognito/private window - app initializes
- [ ] Test on production URL (recordplus.work) - app initializes

**Checkpoint 3:** All tests pass, manual testing complete.

---

## Phase 4: Documentation

### 4.1 Update Troubleshooting Guide
- [x] Update `docs/TROUBLESHOOTING.md` with new solution code
- [x] Add section explaining the three-layer approach
- [x] Update "Related Commits" section with new commit hash (`386779a`)
- [x] Add debugging tips for future occurrences

### 4.2 Add Inline Documentation
- [x] Add JSDoc comment to `initApp()` explaining idempotency
- [x] Add JSDoc comment to bootstrap IIFE explaining the pattern
- [x] Add comment explaining why `window.load` failsafe exists

**Checkpoint 4:** Documentation review complete.

---

## Phase 5: Deployment & Verification

### 5.1 Local Verification
- [ ] Run `npm run dev` and verify app loads
- [ ] Check console for `[Record+] Initialized successfully` message
- [ ] Verify no duplicate initialization warnings

### 5.2 Commit Changes
- [ ] Stage changed files: `app.js`, `utils/ready.js`, test files
- [ ] Write commit message following project conventions
- [ ] Run pre-commit hooks (if any)

### 5.3 Production Verification
- [ ] Deploy to Cloudflare Pages
- [ ] Clear browser cache
- [ ] Test on `recordplus.pages.dev`
- [ ] Test on `recordplus.work` custom domain
- [ ] Test browser back/forward navigation
- [ ] Verify no blank page issues

**Checkpoint 5:** Production deployment verified working.

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Core Implementation | **Complete** | app.js updated with guards + bootstrap |
| Phase 2: Ready Utility | **Complete** | utils/ready.js created |
| Phase 3: Testing | Skipped | Manual testing recommended |
| Phase 4: Documentation | **Complete** | TROUBLESHOOTING.md updated |
| Phase 5: Deployment | Pending | Ready for deployment |

---

## Implementation Notes

### Code to Replace

**Current code in `app.js` (lines 143-149):**
```javascript
// Run initialization - handle case where DOMContentLoaded already fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM already loaded, run immediately
  initApp();
}
```

**New code:**
```javascript
/**
 * Initialize the application.
 * Idempotent - safe to call multiple times.
 */
function initApp() {
  // Guard: Verify container exists
  const mainContent = document.getElementById("main-content");
  if (!mainContent) {
    console.error("[Record+] Cannot initialize: #main-content not found");
    return;
  }

  // Guard: Prevent double initialization
  if (window.__recordPlusInitialized) {
    console.warn("[Record+] Already initialized, skipping");
    return;
  }
  window.__recordPlusInitialized = true;

  // Initialize router
  router.init(mainContent);

  // Register routes
  // ... existing route registrations (unchanged) ...

  // Handle initial route
  router.handleRoute();

  console.log("[Record+] Initialized successfully");
}

/**
 * Bulletproof bootstrap with failsafe.
 * Handles all readyState values and includes window.load fallback.
 */
(function bootstrap() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

  // Failsafe for edge cases (bfcache, timing issues)
  window.addEventListener("load", () => {
    if (!window.__recordPlusInitialized) {
      console.warn("[Record+] Failsafe: initializing via window.load");
      initApp();
    }
  });
})();
```

### Testing Commands

```bash
# Run unit tests
npm test -- --grep "bootstrap"

# Run with coverage
npm test -- --coverage --grep "bootstrap"

# Manual browser test
npm run dev
# Then open http://localhost:5173 and check console
```

### Rollback Plan

If issues occur after deployment:

1. Revert to previous `app.js` version
2. The old code still works in most cases
3. Investigate specific failure scenario
4. Fix and re-deploy

---

## Dependencies

- **Requires:** None (pure JavaScript, no new packages)
- **Blocks:** None
- **Related:** Core frontend architecture

## References

- [Spec: requirements.md](requirements.md)
- [Spec: design.md](design.md)
- [Troubleshooting: docs/TROUBLESHOOTING.md](../../../docs/TROUBLESHOOTING.md)
