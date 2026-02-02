# Troubleshooting Guide

## Issue: Main Content Not Rendering (Only Sidebar Visible)

**Date:** 2026-02-02
**Severity:** Critical
**Affected:** Both local development and production (Cloudflare Pages)

### Symptoms

- Application loads but only the sidebar is visible
- Main content area (`#main-content`) remains empty with just the HTML comment
- No JavaScript errors in console
- All JS files load successfully (200/304 status)
- API endpoints are healthy and accessible
- No API calls are made from the frontend

### Root Cause

**Race condition between ES module loading and `DOMContentLoaded` event.**

The `app.js` file imports 13+ component modules:

```javascript
import { router } from "./router.js";
import { api } from "./api.js";
import { DashboardView } from "./components/dashboard.js";
import { CaseListView } from "./components/caseList.js";
// ... 10 more imports
```

ES modules are **deferred by default** and load asynchronously. The browser fires `DOMContentLoaded` while these imports are still resolving. By the time `app.js` finishes loading all dependencies and adds its event listener, the event has already fired.

**Timeline:**
1. Browser parses HTML
2. Browser encounters `<script type="module" src="js/app.js">`
3. Browser starts loading `app.js` and all its imports (async)
4. Browser finishes parsing HTML
5. **`DOMContentLoaded` fires** ← Event happens here
6. All module imports finally resolve
7. `app.js` executes and adds `DOMContentLoaded` listener ← Too late!
8. Router never initializes, main content stays empty

### Solution

Check `document.readyState` before adding the event listener. If the DOM is already loaded, run initialization immediately.

**Before (broken):**
```javascript
document.addEventListener("DOMContentLoaded", () => {
  const mainContent = document.getElementById("main-content");
  router.init(mainContent);
  // ... register routes
  router.handleRoute();
});
```

**After (fixed):**
```javascript
function initApp() {
  const mainContent = document.getElementById("main-content");
  router.init(mainContent);
  // ... register routes
  router.handleRoute();
}

// Run initialization - handle case where DOMContentLoaded already fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM already loaded, run immediately
  initApp();
}
```

### How to Diagnose

1. **Check if router has routes registered:**
   ```javascript
   import('/js/router.js').then(m => console.log('Routes:', m.router.routes.size))
   // If 0, initialization never ran
   ```

2. **Check document state:**
   ```javascript
   console.log(document.readyState) // "complete" means DOMContentLoaded already fired
   ```

3. **Check main content:**
   ```javascript
   document.getElementById('main-content').innerHTML
   // If still has "<!-- Content will be rendered by router -->", router never ran
   ```

### Prevention

For any SPA with ES modules that rely on `DOMContentLoaded`:

1. Always check `document.readyState` before adding the listener
2. Consider using a pattern like:
   ```javascript
   function ready(fn) {
     if (document.readyState !== "loading") {
       fn();
     } else {
       document.addEventListener("DOMContentLoaded", fn);
     }
   }

   ready(() => {
     // initialization code
   });
   ```

### Related Commits

- `c22095e` - fix(app): handle DOMContentLoaded race condition with ES modules

### References

- [MDN: DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [MDN: document.readyState](https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState)
- [JavaScript modules are deferred](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#other_differences_between_modules_and_standard_scripts)
