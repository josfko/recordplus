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

---

## Issue: CORS Error When Using Custom Domain

**Date:** 2026-02-03
**Severity:** High
**Affected:** Custom domain accessing API (`recordplus.work` → `api.recordplus.work`)

### Symptoms

- Sidebar loads, but main content is blank (looks like the race condition issue!)
- Browser console shows: `Access to fetch... blocked by CORS policy`
- Error mentions: `No 'Access-Control-Allow-Origin' header is present`
- Works fine on `recordplus.pages.dev` but fails on `recordplus.work`

### How to Tell It's CORS (Not Race Condition)

| Issue | Console Shows |
|-------|---------------|
| Race condition | No errors, just `[Record+] Initialized successfully` |
| CORS error | Red errors with `CORS policy` and `Access-Control-Allow-Origin` |

**Check the Network tab:** You'll see failed requests (red) to `api.recordplus.work` with status `(failed)` or `CORS error`.

### Root Cause

The API server's CORS whitelist doesn't include your custom domain.

**CORS (Cross-Origin Resource Sharing)** is a browser security feature. When your frontend (`recordplus.work`) makes a request to a different origin (`api.recordplus.work`), the browser asks the API server: "Is this origin allowed?"

If the server doesn't respond with `Access-Control-Allow-Origin: https://recordplus.work`, the browser blocks the request.

### Why This Happens

The server's CORS configuration in `src/server/index.js` has a whitelist:

```javascript
// These origins are allowed:
if (origin.includes("localhost")) return callback(null, true);
if (origin.includes(".pages.dev")) return callback(null, true);
if (origin.includes("cfargotunnel.com")) return callback(null, true);
if (origin.includes("recordplus.work")) return callback(null, true);  // ← Add this!
```

If your custom domain isn't in the whitelist, requests are blocked.

### Solution

1. **Edit `src/server/index.js`** and add your custom domain to the CORS whitelist:

```javascript
// Allow recordplus.work custom domain
if (origin.includes("recordplus.work")) {
  return callback(null, true);
}
```

2. **Commit and push:**
```bash
git add src/server/index.js
git commit -m "fix(server): add custom domain to CORS whitelist"
git push origin main
```

3. **Deploy to VPS:**
```bash
# SSH to your VPS, then:
sudo -u appuser bash -c "cd /home/appuser/recordplus && git pull origin main && pm2 restart recordplus"
```

4. **Test:** Refresh `https://recordplus.work` - the CORS error should be gone.

### How CORS Works (Beginner Explanation)

Think of CORS like a guest list at a party:

1. Your frontend (`recordplus.work`) wants to talk to the API (`api.recordplus.work`)
2. The browser says: "Wait, let me check if you're on the guest list"
3. Browser asks API: "Is `recordplus.work` allowed?" (preflight OPTIONS request)
4. API checks its whitelist and responds:
   - **On the list:** "Yes, let them in" → Request succeeds
   - **Not on the list:** No response or error → Browser blocks request

The whitelist is configured in the server's CORS settings.

### Related Commits

- `3089572` - fix(server): add recordplus.work to CORS whitelist

### References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html)

---

## Issue: SMTP Email Not Working in Production

**Date:** 2026-02-03
**Severity:** High
**Affected:** Email sending functionality (minutas, suplidos, hojas de encargo)

### Symptoms

- "Probar Conexión" button in Configuration shows error (timeout or connection refused)
- Email works when testing locally but fails on deployed VPS
- Error messages like:
  - "Conexión rechazada" (Connection refused)
  - "Tiempo de espera agotado" (Timeout)
  - "Connection closed by server"

### How SMTP Configuration Works

**Important:** SMTP credentials are stored in the **SQLite database**, NOT in environment variables.

Configuration is stored in the `configuration` table with these keys:
- `smtp_host` - SMTP server (e.g., `smtp.ionos.es`)
- `smtp_port` - Port number (587 for STARTTLS, 465 for SSL/TLS)
- `smtp_secure` - `"false"` for STARTTLS (port 587), `"true"` for SSL/TLS (port 465)
- `smtp_user` - Email/username for authentication
- `smtp_password` - Password for authentication
- `smtp_from` - "From" address (optional, defaults to smtp_user)

To check current config on VPS:
```bash
sqlite3 /home/appuser/data/legal-cases.db \
  "SELECT key, CASE WHEN key='smtp_password' THEN '***' ELSE value END FROM configuration WHERE key LIKE 'smtp%';"
```

### Root Cause: VPS Provider Blocking Outbound SMTP

**Clouding.io (and most VPS providers) block outbound SMTP by default** to prevent spam.

According to [Clouding.io's documentation](https://help.clouding.io/hc/en-us/articles/360010279719-SMTP-blocking):
- Trial accounts have SMTP blocked
- Paying customers should have it enabled, but may need to request it

### Diagnosis

**Step 1: SSH to the VPS**
```bash
ssh root@217.71.207.83
# Enter your password when prompted
```

**Step 2: Test SMTP port connectivity**
```bash
nc -zv smtp.ionos.es 587 -w 5
```

Results:
- `Connection succeeded!` → Port is open, issue is config/credentials
- `Connection timed out` → **VPS is blocking outbound SMTP**

**Step 3: Check PM2 logs for errors**
```bash
pm2 logs recordplus --lines 50 --nostream
```
Look for `[SMTP Test] Error:` entries.

### Solution: Request SMTP Access from Clouding.io

Send an email to **sales@clouding.io**:

```
Asunto: Solicitud de habilitación de SMTP saliente

Hola,

Soy cliente de Clouding y tengo un servidor VPS (IP: 217.71.207.83).

Necesito enviar correos desde mi aplicación a través de un servidor SMTP
externo (Ionos), pero las conexiones al puerto 587 están siendo bloqueadas.

Según vuestro artículo de ayuda sobre "SMTP blocking", el tráfico SMTP
está bloqueado en cuentas de prueba. ¿Podrían habilitarlo?

Uso previsto: Aplicación privada de gestión de expedientes legales.
Correos transaccionales individuales, no correo masivo.

Gracias.
```

**Response time:** Usually same-day or within 24 hours.

### After SMTP is Enabled

**Step 1: Verify connectivity**
```bash
nc -zv smtp.ionos.es 587 -w 5
# Should show: Connection succeeded!
```

**Step 2: Configure via Web UI**

Go to `https://recordplus.work/#config` and fill in:

| Field | Value (Ionos example) |
|-------|----------------------|
| Servidor SMTP | `smtp.ionos.es` |
| Puerto | `587` |
| Seguridad | `STARTTLS` (for port 587) |
| Usuario | your Ionos email |
| Contraseña | your Ionos password |
| Remitente | (optional) |

**Step 3: Test connection**

Click "Probar Conexión" - should show green success.

### Common SMTP Provider Settings

| Provider | Host | Port | Security |
|----------|------|------|----------|
| Ionos (1&1) | `smtp.ionos.es` | 587 | STARTTLS |
| Gmail | `smtp.gmail.com` | 587 | STARTTLS |
| Outlook/Office 365 | `smtp.office365.com` | 587 | STARTTLS |
| Generic SSL | varies | 465 | SSL/TLS |

**Gmail note:** Requires "App Password" (not regular password). Enable 2FA first.

### Clouding.io Firewall Notes

The Clouding.io firewall panel shows rules for ports 465 and 587, but these are **inbound rules** (allowing connections TO your server), not outbound rules. Outbound SMTP is controlled at the infrastructure level and must be requested via support.

### Related Files

- `src/server/services/emailService.js` - Nodemailer configuration
- `src/server/routes/arag.js` (lines 250-320) - `/api/email/test` endpoint
- `src/server/services/configurationService.js` - Config defaults

---

## Issue: ACA Digital Certificate Not Found

**Date:** 2026-02-03
**Severity:** Medium
**Affected:** PDF digital signature functionality

### Symptoms

- "Probar Certificado" button shows error
- Error message: "Introduzca la ruta del certificado"
- PDF signing falls back to visual signature only

### Root Cause

The `.p12` certificate file either:
1. Doesn't exist on the VPS at the configured path
2. Has a different filename than configured

### Diagnosis

**Step 1: Check what path is configured**

Look at the Configuration page in the web UI, or query the database:
```bash
sqlite3 /home/appuser/data/legal-cases.db \
  "SELECT value FROM configuration WHERE key='certificate_path';"
```

**Step 2: Check what files exist on VPS**
```bash
ls -la /home/appuser/data/certificates/
```

### Solution

#### If certificate file doesn't exist: Upload it

**From your local Mac:**
```bash
# Create directory on VPS (run as root)
ssh root@217.71.207.83 "mkdir -p /home/appuser/data/certificates && chown appuser:appuser /home/appuser/data/certificates"

# Upload certificate
scp /path/to/your/certificate.p12 root@217.71.207.83:/home/appuser/data/certificates/

# Fix permissions (run as root on VPS)
ssh root@217.71.207.83 "chown appuser:appuser /home/appuser/data/certificates/*.p12 && chmod 600 /home/appuser/data/certificates/*.p12"
```

#### If certificate exists with different name: Update config

If the file exists (e.g., `aca-23-07-25.p12`) but config points to different name:

1. Go to `https://recordplus.work/#config`
2. Update "Ruta del Certificado" to match actual filename:
   ```
   /home/appuser/data/certificates/aca-23-07-25.p12
   ```
3. Click "Guardar Configuración"
4. Click "Probar Certificado"

### Certificate Security

The `.p12` file contains your private key. Ensure:
- Permissions are `600` (owner read/write only)
- Owned by `appuser`
- Never commit to git repository

```bash
# Verify permissions
ls -la /home/appuser/data/certificates/
# Should show: -rw------- 1 appuser appuser ... filename.p12
```

### Related Files

- `src/server/services/pdfSigningService.js` - Certificate loading and signing
- `DEPLOYMENT_TROUBLESHOOTING.md` - ACA certificate deployment details

---

## Issue: App Goes Down After Inactivity (PM2 Not Configured)

**Date:** 2026-02-04
**Severity:** Critical
**Affected:** Production server uptime

### Symptoms

- Site works after you manually start it, but goes down after some time
- You have to "restart the server" to see the app again
- After SSH-ing in, running `pm2 list` shows an **empty table** (no processes)
- PM2 daemon is running, but no app is registered

### Root Cause

**PM2 is installed and running, but your app was never added to it.**

PM2 is a process manager - it keeps apps running 24/7. But you must:
1. **Start** the app with PM2
2. **Save** the process list so PM2 remembers it
3. **Enable startup** so PM2 starts on boot

If you only ran `node src/server/index.js` directly (or it was started once and never saved), PM2 doesn't know about it and won't restart it.

### Diagnosis

SSH to your VPS and run:

```bash
pm2 list
```

**If empty (no processes):** Your app isn't registered with PM2. That's the problem.

**If shows "recordplus" but status is "errored" or "stopped":** Different issue - check logs with `pm2 logs recordplus`.

### Solution

#### Step 1: Start the app with PM2

```bash
cd /home/appuser/recordplus
pm2 start src/server/index.js --name "recordplus"
```

#### Step 2: Verify it's running

```bash
pm2 list
```

You should see:
```
│ id │ name        │ mode   │ status │ cpu │ memory │
│ 0  │ recordplus  │ fork   │ online │ 0%  │ 50mb   │
```

#### Step 3: Save the process list

```bash
pm2 save
```

This tells PM2 "remember to start these apps after reboot."

#### Step 4: Enable auto-start on boot

```bash
pm2 startup
```

This outputs a command like:
```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

**Copy and run that exact command.**

Then run `pm2 save` again to ensure the process list is saved.

### Verification

After setup, your app will:
- Stay running 24/7
- Auto-restart if it crashes
- Start automatically when the server reboots

Test by visiting your site - it should always be up without manual intervention.

### What is PM2?

PM2 is a **process manager** for Node.js. Think of it as a babysitter for your app:

| Without PM2 | With PM2 |
|-------------|----------|
| App dies when you close terminal | App keeps running forever |
| If app crashes, it stays dead | PM2 auto-restarts it |
| Server reboot = app is gone | PM2 brings it back automatically |
| No monitoring | Shows CPU, memory, logs |

### Common PM2 Commands

```bash
pm2 list              # See what's running
pm2 start app.js      # Start an app
pm2 stop recordplus   # Stop the app
pm2 restart recordplus # Restart the app
pm2 logs recordplus   # View app logs
pm2 logs --err        # View error logs only
pm2 save              # Save current process list
pm2 startup           # Enable auto-start on boot
pm2 monit             # Live monitoring dashboard
```

### Prevention

When deploying a new server:

1. Always use `pm2 start` (not just `node`)
2. Always run `pm2 save` after starting
3. Always run `pm2 startup` and execute the output command
4. Verify with `pm2 list` before closing SSH

### Related Files

- `ecosystem.config.js` - PM2 configuration file (optional, for advanced setups)
- `/root/.pm2/` - PM2 daemon files and logs

---

## Complete Production Configuration Checklist

Use this checklist when setting up a new VPS or after a fresh deployment:

### 1. VPS Access & PM2
- [ ] Can SSH to VPS: `ssh root@217.71.207.83`
- [ ] PM2 is running: `pm2 list`
- [ ] App is registered: `pm2 list` shows "recordplus" with status "online"
- [ ] PM2 process saved: `pm2 save` (run after any changes)
- [ ] PM2 startup enabled: `pm2 startup` (run once per server)
- [ ] App is healthy: `curl http://localhost:3000/api/health`

### 2. SMTP Configuration
- [ ] Outbound SMTP enabled by Clouding.io (contact support if needed)
- [ ] Port 587 reachable: `nc -zv smtp.ionos.es 587 -w 5`
- [ ] SMTP settings saved via web UI (`#config`)
- [ ] "Probar Conexión" shows green success

### 3. ACA Certificate
- [ ] Certificate uploaded to `/home/appuser/data/certificates/`
- [ ] Permissions correct: `chmod 600` and `chown appuser:appuser`
- [ ] Path configured in web UI matches actual filename
- [ ] "Probar Certificado" shows green success

### 4. Network/DNS
- [ ] Custom domain resolves: `dig recordplus.work +short`
- [ ] API domain resolves: `dig api.recordplus.work +short`
- [ ] Zero Trust configured for both domains
- [ ] CORS whitelist includes custom domain

### 5. Database
- [ ] Database exists: `ls -la /home/appuser/data/legal-cases.db`
- [ ] Migrations applied: check for all expected tables
- [ ] Backups running: `crontab -l` (should show daily backup)
