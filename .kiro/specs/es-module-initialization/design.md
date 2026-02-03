# Design Document: ES Module Race Condition Prevention

## Overview

This document describes the technical design for a bulletproof ES Module initialization pattern that prevents the `DOMContentLoaded` race condition in Single Page Applications.

**Technology Stack:**
- **Language:** Vanilla JavaScript (ES Modules)
- **Browser APIs:** `document.readyState`, `DOMContentLoaded`, `window.load`
- **Hosting:** Cloudflare Pages (CDN with caching)

## Architecture

### The Race Condition Explained

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BROWSER LOADING TIMELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  │ Parse HTML │ Load CSS │ Parse HTML complete │ Load Images │ Complete │   │
│  ═══════════════════════════════════════════════════════════════════════    │
│        │                         │                               │          │
│        │                         ▼                               ▼          │
│        │              DOMContentLoaded fires              window.load       │
│        │                    (Event A)                      (Event B)        │
│        │                                                                    │
│        │                                                                    │
│  ═══════════════════════════════════════════════════════════════════════    │
│  │ Start app.js │ Load router.js │ Load 12 more modules │ Execute app.js │  │
│  ═══════════════════════════════════════════════════════════════════════    │
│        │                                                       │            │
│        │                                                       ▼            │
│        │                                          app.js adds listener      │
│        │                                              (Code B)              │
│        │                                                                    │
│        │              ┌─────────────────────────────────────────┐          │
│        │              │  RACE CONDITION: Event A fires before   │          │
│        │              │  Code B runs → Listener never called    │          │
│        └──────────────┤                                         │          │
│                       │  Result: initApp() never executes       │          │
│                       │           → Blank page                  │          │
│                       └─────────────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Solution: Multi-Layer Initialization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BULLETPROOF INITIALIZATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         bootstrap()                                 │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ 1. Check readyState                                          │  │    │
│  │  │    ├─ "loading"     → Add DOMContentLoaded listener          │  │    │
│  │  │    ├─ "interactive" → Run initApp() immediately              │  │    │
│  │  │    └─ "complete"    → Run initApp() immediately              │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ 2. Failsafe: Add window.load listener                        │  │    │
│  │  │    └─ If not initialized → Run initApp()                     │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         initApp()                                   │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ 1. Guard: Check #main-content exists                         │  │    │
│  │  │ 2. Guard: Check not already initialized                      │  │    │
│  │  │ 3. Set window.__recordPlusInitialized = true                 │  │    │
│  │  │ 4. Initialize router                                         │  │    │
│  │  │ 5. Register routes                                           │  │    │
│  │  │ 6. Handle initial route                                      │  │    │
│  │  │ 7. Log success                                               │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### readyState Values

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       document.readyState VALUES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  "loading"                                                                   │
│  ────────                                                                    │
│  HTML document is still being parsed.                                        │
│  Safe to add DOMContentLoaded listener.                                      │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│                                                                              │
│  "interactive"                                                               │
│  ─────────────                                                               │
│  HTML fully parsed, DOM tree built.                                          │
│  DOMContentLoaded has ALREADY fired (or is about to).                        │
│  Stylesheets, images, subframes may still be loading.                        │
│  ⚠️  TOO LATE to add DOMContentLoaded listener!                             │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│                                                                              │
│  "complete"                                                                  │
│  ──────────                                                                  │
│  Everything loaded (HTML, CSS, images, subframes).                           │
│  window.load has ALREADY fired.                                              │
│  ⚠️  WAY TOO LATE for any event listeners!                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Bootstrap Function

```javascript
// src/client/js/app.js

/**
 * Bulletproof initialization bootstrap.
 * Handles all three readyState values and includes failsafe.
 */
(function bootstrap() {
  // Layer 1: Check current state
  if (document.readyState === "loading") {
    // DOM still loading - safe to wait for event
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    // DOM already ready ("interactive" or "complete") - run now
    initApp();
  }

  // Layer 2: Failsafe for edge cases (bfcache, timing issues)
  window.addEventListener("load", () => {
    if (!window.__recordPlusInitialized) {
      console.warn("[Record+] Failsafe: initializing via window.load");
      initApp();
    }
  });
})();
```

### Initialization Function

```javascript
// src/client/js/app.js

/**
 * Initialize the application.
 * Idempotent - safe to call multiple times.
 */
function initApp() {
  // Guard 1: Verify container exists
  const mainContent = document.getElementById("main-content");
  if (!mainContent) {
    console.error("[Record+] Cannot initialize: #main-content not found");
    return;
  }

  // Guard 2: Prevent double initialization
  if (window.__recordPlusInitialized) {
    console.warn("[Record+] Already initialized, skipping");
    return;
  }
  window.__recordPlusInitialized = true;

  // Initialize router
  router.init(mainContent);

  // Register routes
  router.register("/", async () => { /* ... */ });
  // ... more routes ...

  // Handle initial route
  router.handleRoute();

  console.log("[Record+] Initialized successfully");
}
```

### Ready Utility Function

```javascript
// src/client/js/utils/ready.js

/**
 * Execute callback when DOM is ready.
 * Handles the race condition with ES modules.
 *
 * @param {Function} callback - Function to run when DOM is ready
 *
 * @example
 * ready(() => {
 *   console.log('DOM is ready!');
 *   initializeApp();
 * });
 */
export function ready(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    // Use setTimeout to ensure we're in the next event loop tick
    // This handles edge cases where DOM elements aren't fully accessible
    setTimeout(callback, 0);
  }
}
```

### Debug Logging (Development Only)

```javascript
// src/client/js/app.js (top of file, before imports)

// Debug: Log readyState before modules load
if (typeof window !== "undefined") {
  console.log("[Record+] Module loading started, readyState:", document.readyState);
}

// ... imports ...

// Debug: Log readyState after modules load
console.log("[Record+] All modules loaded, readyState:", document.readyState);
```

## Data Models

### Global State

```javascript
/**
 * Global initialization flag.
 * Stored on window to persist across module reloads (HMR).
 *
 * @type {boolean}
 */
window.__recordPlusInitialized = false;
```

### Initialization States

| State | Description | Action |
|-------|-------------|--------|
| `readyState === "loading"` | HTML parsing in progress | Add `DOMContentLoaded` listener |
| `readyState === "interactive"` | HTML parsed, DOM ready | Call `initApp()` immediately |
| `readyState === "complete"` | Everything loaded | Call `initApp()` immediately |
| `__recordPlusInitialized === true` | Already initialized | Skip, log warning |
| `#main-content` not found | Critical element missing | Log error, abort |

## Correctness Properties

### Property 1: Guaranteed Single Initialization

_For any_ page load scenario (fast network, slow network, cached, bfcache, etc.), the application SHALL initialize exactly once.

**Test:**
```javascript
// Property-based test with fast-check
fc.assert(
  fc.property(
    fc.constantFrom("loading", "interactive", "complete"),
    fc.boolean(), // bfcache restoration
    fc.boolean(), // fast network
    (readyState, bfcache, fastNetwork) => {
      // Simulate scenario
      simulatePageLoad({ readyState, bfcache, fastNetwork });

      // Assert exactly one initialization
      expect(initCallCount).toBe(1);
      expect(window.__recordPlusInitialized).toBe(true);
    }
  )
);
```

**Validates: Requirements 1, 2**

### Property 2: Idempotency

_For any_ number of `initApp()` calls, the application state SHALL be identical to a single call.

**Test:**
```javascript
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 100 }),
    (callCount) => {
      // Reset
      window.__recordPlusInitialized = false;

      // Call multiple times
      for (let i = 0; i < callCount; i++) {
        initApp();
      }

      // Assert state is same as single call
      expect(router.routes.size).toBe(EXPECTED_ROUTE_COUNT);
      expect(document.querySelectorAll(".view").length).toBe(1);
    }
  )
);
```

**Validates: Requirement 2**

### Property 3: Fail-Safe Recovery

_For any_ scenario where the primary initialization path fails, the failsafe SHALL recover.

**Test:**
```javascript
fc.assert(
  fc.property(
    fc.constantFrom("DOMContentLoaded_missed", "event_listener_failed"),
    (failureMode) => {
      // Simulate failure
      simulateFailure(failureMode);

      // Trigger failsafe
      window.dispatchEvent(new Event("load"));

      // Assert recovery
      expect(window.__recordPlusInitialized).toBe(true);
    }
  )
);
```

**Validates: Requirement 4**

### Property 4: DOM Element Validation

_For any_ DOM state, initialization SHALL NOT throw unhandled exceptions.

**Test:**
```javascript
fc.assert(
  fc.property(
    fc.boolean(), // #main-content exists
    (hasMainContent) => {
      // Setup DOM
      if (!hasMainContent) {
        document.getElementById("main-content")?.remove();
      }

      // Should not throw
      expect(() => initApp()).not.toThrow();

      // Should log appropriately
      if (!hasMainContent) {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("#main-content not found")
        );
      }
    }
  )
);
```

**Validates: Requirement 3**

### Property 5: Observable State

_For any_ initialization path, the system SHALL log which path was taken.

**Test:**
```javascript
fc.assert(
  fc.property(
    fc.constantFrom("loading", "interactive", "complete"),
    (initialReadyState) => {
      // Simulate readyState
      mockReadyState(initialReadyState);

      // Initialize
      bootstrap();

      // Assert logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("readyState")
      );
    }
  )
);
```

**Validates: Requirement 5**

## Error Handling

### Error Codes

| Error | Code | Message | Recovery |
|-------|------|---------|----------|
| Missing container | `INIT_NO_CONTAINER` | "Cannot initialize: #main-content not found" | Abort, log error |
| Double init | `INIT_DUPLICATE` | "Already initialized, skipping" | Skip, log warning |
| Failsafe triggered | `INIT_FAILSAFE` | "Failsafe: initializing via window.load" | Continue, log warning |

### Console Output Format

```javascript
// Error format
console.error("[Record+] Cannot initialize: #main-content not found");

// Warning format
console.warn("[Record+] Already initialized, skipping");
console.warn("[Record+] Failsafe: initializing via window.load");

// Success format
console.log("[Record+] Initialized successfully");

// Debug format (when DEBUG=true)
console.log("[Record+] Module loading started, readyState:", "loading");
console.log("[Record+] All modules loaded, readyState:", "interactive");
```

## Testing Strategy

### Unit Tests

```javascript
// src/client/js/__tests__/bootstrap.test.js

describe("Bootstrap", () => {
  beforeEach(() => {
    window.__recordPlusInitialized = false;
    document.body.innerHTML = '<main id="main-content"></main>';
  });

  test("initializes immediately when readyState is interactive", () => {
    Object.defineProperty(document, "readyState", { value: "interactive" });
    bootstrap();
    expect(window.__recordPlusInitialized).toBe(true);
  });

  test("initializes immediately when readyState is complete", () => {
    Object.defineProperty(document, "readyState", { value: "complete" });
    bootstrap();
    expect(window.__recordPlusInitialized).toBe(true);
  });

  test("waits for DOMContentLoaded when readyState is loading", () => {
    Object.defineProperty(document, "readyState", { value: "loading" });
    bootstrap();
    expect(window.__recordPlusInitialized).toBe(false);

    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(window.__recordPlusInitialized).toBe(true);
  });

  test("failsafe triggers if primary initialization missed", () => {
    window.__recordPlusInitialized = false;
    window.dispatchEvent(new Event("load"));
    expect(window.__recordPlusInitialized).toBe(true);
  });
});
```

### Property-Based Tests

```javascript
// src/client/js/__tests__/bootstrap.property.test.js

import fc from "fast-check";

describe("Bootstrap Properties", () => {
  test("exactly one initialization regardless of timing", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("loading", "interactive", "complete"),
        fc.integer({ min: 1, max: 10 }), // number of init attempts
        (readyState, attempts) => {
          // Setup
          window.__recordPlusInitialized = false;
          let initCount = 0;
          const originalInit = initApp;
          initApp = () => { initCount++; originalInit(); };

          // Simulate
          Object.defineProperty(document, "readyState", { value: readyState });
          for (let i = 0; i < attempts; i++) {
            bootstrap();
          }

          // Assert
          expect(initCount).toBe(1);
        }
      )
    );
  });
});
```

### Manual Testing Checklist

1. [ ] Fresh page load - app initializes
2. [ ] Hard refresh (Cmd+Shift+R) - app initializes
3. [ ] Navigate away and back (bfcache) - app initializes
4. [ ] Slow 3G throttling - app initializes
5. [ ] Disable JavaScript cache - app initializes
6. [ ] Open in incognito - app initializes
7. [ ] Remove #main-content from HTML - graceful error

## File Structure

```
src/client/
├── js/
│   ├── app.js              # Modified: bulletproof bootstrap
│   ├── utils/
│   │   └── ready.js        # New: reusable ready() utility
│   └── __tests__/
│       ├── bootstrap.test.js          # New: unit tests
│       └── bootstrap.property.test.js # New: property tests
└── index.html              # Unchanged
```

## Migration Guide

### Before (Current Code)

```javascript
// src/client/js/app.js (lines 143-149)

// Run initialization - handle case where DOMContentLoaded already fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM already loaded, run immediately
  initApp();
}
```

### After (Bulletproof Code)

```javascript
// src/client/js/app.js (replace lines 143-149)

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
  // ... existing route registrations ...

  // Handle initial route
  router.handleRoute();

  console.log("[Record+] Initialized successfully");
}

// Bulletproof bootstrap with failsafe
(function bootstrap() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

  // Failsafe for edge cases
  window.addEventListener("load", () => {
    if (!window.__recordPlusInitialized) {
      console.warn("[Record+] Failsafe: initializing via window.load");
      initApp();
    }
  });
})();
```

## References

- [MDN: DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [MDN: document.readyState](https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState)
- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [web.dev: Back/forward cache](https://web.dev/bfcache/)
