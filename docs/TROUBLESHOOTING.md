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

Use a **three-layer defense** pattern with guards and failsafe:

1. **Guard 1:** Check DOM element exists
2. **Guard 2:** Prevent double initialization with a flag
3. **Failsafe:** Use `window.load` as backup

**Before (incomplete fix - can still fail):**
```javascript
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

**After (bulletproof):**
```javascript
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

  // Initialize router and routes
  router.init(mainContent);
  // ... register routes ...
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

  // Failsafe for edge cases (bfcache, timing issues)
  window.addEventListener("load", () => {
    if (!window.__recordPlusInitialized) {
      console.warn("[Record+] Failsafe: initializing via window.load");
      initApp();
    }
  });
})();
```

**Why this is better:**
- Handles all three `readyState` values: `"loading"`, `"interactive"`, `"complete"`
- Idempotent: safe to call multiple times
- Failsafe: `window.load` catches edge cases like bfcache
- Observable: console logs show which path was taken

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

1. **Always use the three-layer defense pattern** (guards + failsafe)
2. **Use the `ready()` utility** from `src/client/js/utils/ready.js`:
   ```javascript
   import { ready } from './utils/ready.js';

   ready(() => {
     // Your initialization code here
     // This runs immediately if DOM is ready, or waits if still loading
   });
   ```

3. **For complex apps, add idempotency guards:**
   ```javascript
   function initApp() {
     if (window.__appInitialized) return;
     window.__appInitialized = true;
     // ... init code ...
   }
   ```

4. **Full specification available at:** `.kiro/specs/es-module-initialization/`

### Related Commits

- `386779a` - fix(app): bulletproof ES module initialization with three-layer defense
- `c22095e` - fix(app): handle DOMContentLoaded race condition with ES modules (original fix, incomplete)

### References

- [MDN: DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [MDN: document.readyState](https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState)
- [JavaScript modules are deferred](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#other_differences_between_modules_and_standard_scripts)

---

## Issue: Custom Domain Not Working ("Safari Can't Find Server")

**Date:** 2026-02-03
**Severity:** Critical
**Affected:** Custom domain access (e.g., `recordplus.work`)

### Symptoms

- Your Cloudflare Pages site works perfectly at `yourproject.pages.dev`
- Zero Trust authentication works on the `.pages.dev` URL
- But your custom domain shows **"Safari can't find the server"** or **"This site can't be reached"**
- The error happens in all browsers, not just Safari

### What This Error Means

**"Can't find the server"** = DNS resolution failure.

Your browser is asking "What is the IP address for `recordplus.work`?" and getting no answer. This is NOT a Zero Trust issue or a code issue - it's a DNS configuration issue.

### Root Cause

**Missing DNS record for the root domain.**

When you add a custom domain to Cloudflare, you might create records for subdomains (like `api.yourdomain.com`) but forget to create a record for the root domain itself (`yourdomain.com` with no subdomain).

**Example of incomplete DNS setup:**
```
api.recordplus.work  → ✅ Has CNAME record → Works
www.recordplus.work  → ❌ No record        → Doesn't work
recordplus.work      → ❌ No record        → Doesn't work
```

### How DNS Works (Beginner Explanation)

Think of DNS like a phone book:
- Your domain (`recordplus.work`) is like a person's name
- DNS records are like phone numbers
- Without an entry in the phone book, nobody can call you

**Each subdomain needs its own entry:**
- `api.recordplus.work` needs a record
- `www.recordplus.work` needs a record
- `recordplus.work` (the "root" or "apex") needs a record

They're all separate entries, even though they look related.

### Solution

#### Step 1: Check if Your Domain Uses Cloudflare Nameservers

Run this in your terminal:
```bash
dig NS yourdomain.com +short
```

You should see something like:
```
jasper.ns.cloudflare.com.
surina.ns.cloudflare.com.
```

If you see different nameservers (not `cloudflare.com`), you need to update your domain registrar to use Cloudflare's nameservers.

#### Step 2: Add the Missing DNS Record

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on your domain (e.g., `recordplus.work`)
3. Click **DNS** in the sidebar
4. Click **Add record**
5. Fill in:
   - **Type:** `CNAME`
   - **Name:** `@` (this means "root domain")
   - **Target:** `yourproject.pages.dev`
   - **Proxy status:** **Proxied** (orange cloud ON)
6. Click **Save**

**Visual guide:**
```
┌──────────────────────────────────────────────────────────┐
│  Type      Name    Target                    Proxy       │
├──────────────────────────────────────────────────────────┤
│  CNAME     @       recordplus.pages.dev     ☁️ Proxied  │
│  CNAME     www     recordplus.work          ☁️ Proxied  │
│  CNAME     api     <tunnel-id>.cfargotunnel ☁️ Proxied  │
└──────────────────────────────────────────────────────────┘
```

#### Step 3: Wait for DNS Propagation

DNS changes can take up to 5 minutes to propagate globally. Usually it's faster.

#### Step 4: Verify It Works

```bash
# Check if the domain resolves to an IP
dig yourdomain.com +short

# Should return Cloudflare IPs like:
# 172.67.xxx.xxx
# 104.21.xxx.xxx
```

Or just open `https://yourdomain.com` in an incognito window.

### Common Mistakes

1. **Creating `www` but not `@`**
   The root domain (`example.com`) and `www.example.com` are different. You need both.

2. **Grey cloud instead of orange cloud**
   Grey cloud = "DNS only" = traffic doesn't go through Cloudflare = Zero Trust won't work.

3. **Forgetting to update nameservers**
   Even if you add DNS records in Cloudflare, they won't work unless your domain registrar points to Cloudflare's nameservers.

4. **Typo in the target**
   Make sure `yourproject.pages.dev` matches exactly what you see in Cloudflare Pages.

### After DNS Works: Add Zero Trust

Once your domain resolves, you still need to protect it with Zero Trust:

1. Go to [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Click **Access** → **Applications**
3. Click **Add an application** → **Self-hosted**
4. Enter:
   - **Application name:** `RecordPlus` (or whatever you want)
   - **Application domain:** `recordplus.work`
5. Click **Next** and add a policy (same rules as your `.pages.dev` one)
6. Click **Add application**

**Remember:** Each domain/subdomain needs its own Zero Trust application:
- `recordplus.work` → needs an application
- `api.recordplus.work` → needs another application

### The Full Picture

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT YOU NEED                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Domain registered somewhere (GoDaddy, Namecheap, etc.)  │
│                          ↓                                  │
│  2. Nameservers point to Cloudflare                         │
│                          ↓                                  │
│  3. DNS records in Cloudflare for each subdomain            │
│                          ↓                                  │
│  4. Zero Trust applications to protect each domain          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Quick Checklist

- [ ] Domain added to Cloudflare account
- [ ] Nameservers at registrar updated to Cloudflare's
- [ ] DNS record for `@` (root domain) pointing to Pages
- [ ] DNS record for `www` (optional but recommended)
- [ ] DNS record for `api` pointing to Tunnel
- [ ] Orange cloud (Proxied) enabled on all records
- [ ] Zero Trust Application for `recordplus.work`
- [ ] Zero Trust Application for `api.recordplus.work`

### References

- [Cloudflare: Add a custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare: DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
- [What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/) (beginner-friendly explanation)
