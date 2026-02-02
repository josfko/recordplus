# Cloudflare Deployment - Implementation Tasks

## Overview

Deploy Record+ to production using Cloudflare's free infrastructure:
- **Frontend:** Cloudflare Pages (`recordplus.pages.dev`)
- **Backend:** Cloudflare Tunnel (`recordplus-api.cfargotunnel.com`)
- **Auth:** Cloudflare Zero Trust (optional, email-based)

**Prerequisites:**
- VPS running with PM2 and working app (✅ done)
- ACA certificate uploaded and tested (✅ done)
- Code changes for CORS and env detection (✅ done)

---

## Phase 1: Commit and Push Code Changes

### 1.1 Verify Local Changes
- [x] `src/client/config.example.js` created with documentation
- [x] `src/client/js/api.js` updated with env detection + credentials
- [x] `src/server/index.js` updated with CORS for Pages/Tunnel
- [x] `.gitignore` updated to exclude `src/client/config.js`
- [x] Local `src/client/config.js` created for testing

### 1.2 Test Locally
- [ ] Run `npm run dev`
- [ ] Open `http://localhost:3000`
- [ ] Verify Configuración → Probar Certificado still works
- [ ] Check console shows `[API] Development mode: using /api`

### 1.3 Commit Changes
- [ ] `git add .gitignore src/client/config.example.js src/client/js/api.js src/server/index.js`
- [ ] `git commit -m "feat(deploy): add Cloudflare Pages + Tunnel support"`
- [ ] `git push origin main`

**Checkpoint 1:** Code pushed to GitHub, local dev still works

---

## Phase 2: Create Cloudflare Account

### 2.1 Sign Up
- [ ] Go to https://dash.cloudflare.com/sign-up
- [ ] Create account with your email
- [ ] Verify email
- [ ] Complete initial setup (skip adding domain)

**Checkpoint 2:** Cloudflare account created and verified

---

## Phase 3: Set Up Cloudflare Tunnel (VPS)

### 3.1 Install cloudflared

SSH to VPS as root:

```bash
ssh root@217.71.207.83
```

Install cloudflared:

```bash
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb
cloudflared --version
# Should output: cloudflared version 2024.x.x
```

- [ ] cloudflared installed successfully

### 3.2 Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser URL. Copy it to your local browser, log in, and authorize.

- [ ] Authentication successful (creates `~/.cloudflared/cert.pem`)

### 3.3 Create Tunnel

```bash
cloudflared tunnel create recordplus-api
```

**Save the Tunnel ID** (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

```bash
# Verify tunnel created
cloudflared tunnel list
```

- [ ] Tunnel created
- [ ] Tunnel ID saved: `________________`

### 3.4 Configure Tunnel

Create config file:

```bash
nano ~/.cloudflared/config.yml
```

Add this content (replace `TUNNEL_ID` with your actual ID):

```yaml
tunnel: TUNNEL_ID
credentials-file: /root/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: recordplus-api.cfargotunnel.com
    service: http://localhost:3000
  - service: http_status:404
```

- [ ] Config file created at `~/.cloudflared/config.yml`

### 3.5 Create DNS Route

```bash
cloudflared tunnel route dns recordplus-api recordplus-api
```

This creates: `recordplus-api.cfargotunnel.com` → your tunnel

- [ ] DNS route created

### 3.6 Test Tunnel Manually

```bash
# In one terminal
cloudflared tunnel run recordplus-api

# In another terminal (or from your Mac)
curl https://recordplus-api.cfargotunnel.com/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

- [ ] Tunnel works manually
- [ ] Health check returns OK

### 3.7 Install as System Service

```bash
# Stop manual tunnel (Ctrl+C)
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared
```

- [ ] Service installed and running
- [ ] Status shows "active (running)"

### 3.8 Verify Service

```bash
# From your Mac
curl https://recordplus-api.cfargotunnel.com/api/health
```

- [ ] Health check works via system service

**Checkpoint 3:** Tunnel running as service, API accessible via `cfargotunnel.com`

---

## Phase 4: Deploy Backend Update

### 4.1 Update VPS Code

```bash
# As appuser
su - appuser
cd /home/appuser/recordplus
git pull origin main
```

- [ ] Latest code pulled

### 4.2 Restart PM2

```bash
pm2 reload recordplus
pm2 logs recordplus --lines 20
```

- [ ] PM2 restarted without errors
- [ ] Logs show "API running on http://localhost:3000"

### 4.3 Test CORS

```bash
# From your Mac - test CORS preflight
curl -X OPTIONS https://recordplus-api.cfargotunnel.com/api/health \
  -H "Origin: https://recordplus.pages.dev" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep -i "access-control"
```

Should show:
```
< access-control-allow-origin: https://recordplus.pages.dev
< access-control-allow-credentials: true
```

- [ ] CORS headers present

**Checkpoint 4:** Backend updated with CORS, tunnel serving API

---

## Phase 5: Deploy to Cloudflare Pages

### 5.1 Create Pages Project

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Select "Connect to Git"
4. Authorize GitHub access
5. Select `josfko/recordplus` repository

Build settings:
| Field | Value |
|-------|-------|
| Production branch | `main` |
| Build command | (leave empty) |
| Build output directory | `src/client` |

- [ ] Pages project created
- [ ] GitHub connected

### 5.2 Create Production Config

Before first deploy, you need `config.js` in `src/client/`.

**Option A: Add to repo (simple)**

On your local machine:

```bash
cat > src/client/config.js << 'EOF'
export const config = {
  API_URL: "https://recordplus-api.cfargotunnel.com",
  DEBUG: false,
};
EOF

# This file IS needed for production, but gitignored for security
# For Pages, we commit it directly or use a different approach
```

Since `config.js` is gitignored, use Cloudflare's file override:

**Option B: Use Cloudflare Pages Functions (recommended)**

This injects config at build time. Skip for now - use Option A.

- [ ] config.js created with tunnel URL

### 5.3 Deploy

If using Option A (adding config.js):

```bash
# Temporarily remove from gitignore to deploy
git add -f src/client/config.js
git commit -m "chore: add production config for Cloudflare Pages"
git push origin main
```

Cloudflare Pages auto-deploys on push.

- [ ] Deployment triggered
- [ ] Build successful (check Pages dashboard)

### 5.4 Get Pages URL

After deployment, note your URL:
- `https://recordplus.pages.dev` (or similar)

- [ ] Pages URL: `https://________________.pages.dev`

**Checkpoint 5:** Frontend deployed to Cloudflare Pages

---

## Phase 6: End-to-End Verification

### 6.1 Basic Access Test

- [ ] Open `https://recordplus.pages.dev`
- [ ] App loads without JavaScript errors
- [ ] Console shows `[API] Production mode: using https://recordplus-api.cfargotunnel.com/api`

### 6.2 API Test

- [ ] Go to Configuración tab
- [ ] Enter certificate path: `/home/appuser/data/certificates/aca-23-07-25.p12`
- [ ] Enter certificate password
- [ ] Click "Probar Certificado"
- [ ] Green success message appears with certificate details

### 6.3 Network Verification

Open browser DevTools → Network tab:

- [ ] Requests go to `recordplus-api.cfargotunnel.com`
- [ ] No CORS errors in console
- [ ] Responses are JSON (not HTML)

**Checkpoint 6:** Production deployment verified working

---

## Phase 7: Zero Trust Setup (Optional)

### 7.1 Enable Zero Trust

1. Cloudflare Dashboard → Zero Trust
2. Complete onboarding (free plan)

- [ ] Zero Trust enabled

### 7.2 Create Access Application

1. Zero Trust → Access → Applications
2. Add Application → Self-hosted

| Field | Value |
|-------|-------|
| Name | Record+ API |
| Session Duration | 24 hours |
| Domain | `recordplus-api.cfargotunnel.com` |

- [ ] Application created

### 7.3 Add Policy

1. Click on your application
2. Add a policy

| Field | Value |
|-------|-------|
| Policy name | Allow Owner |
| Action | Allow |
| Include: Emails | `your-email@example.com` |

- [ ] Policy added

### 7.4 Test Zero Trust

1. Open incognito window
2. Go to `https://recordplus-api.cfargotunnel.com/api/health`
3. Should see Cloudflare Access login page
4. Enter your email, receive code, verify
5. After auth, should see `{"status":"ok"}`

- [ ] Zero Trust login works
- [ ] After auth, API accessible

### 7.5 Test with Frontend

1. Clear cookies for `pages.dev` and `cfargotunnel.com`
2. Open `https://recordplus.pages.dev`
3. First API call should redirect to Zero Trust login
4. After auth, app should work normally

- [ ] Frontend works with Zero Trust

**Checkpoint 7:** Zero Trust protecting API

---

## Phase 8: Documentation & Cleanup

### 8.1 Document URLs

Record your production URLs:

| Service | URL |
|---------|-----|
| Frontend | `https://recordplus.pages.dev` |
| API | `https://recordplus-api.cfargotunnel.com` |
| Cloudflare Dashboard | `https://dash.cloudflare.com` |

### 8.2 Update deploy docs

- [ ] Update `deploy/cloudflare-setup.md` with actual URLs
- [ ] Add troubleshooting section

### 8.3 Set up monitoring (optional)

- [ ] Configure Cloudflare Analytics
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure PM2 alerts

**Checkpoint 8:** Documentation complete

---

## Current Status

- [x] Phase 1: Code Changes (COMPLETE)
- [ ] Phase 2: Cloudflare Account
- [ ] Phase 3: Tunnel Setup (VPS)
- [ ] Phase 4: Backend Deploy
- [ ] Phase 5: Pages Deploy
- [ ] Phase 6: Verification
- [ ] Phase 7: Zero Trust (Optional)
- [ ] Phase 8: Documentation

---

## Quick Reference Commands

### VPS (as root)
```bash
# Tunnel status
systemctl status cloudflared
journalctl -u cloudflared -f

# Tunnel restart
systemctl restart cloudflared
```

### VPS (as appuser)
```bash
# App status
pm2 status
pm2 logs recordplus

# Deploy update
cd /home/appuser/recordplus
git pull origin main
pm2 reload recordplus
```

### Local (Mac)
```bash
# Test tunnel
curl https://recordplus-api.cfargotunnel.com/api/health

# Test certificate
curl -X POST https://recordplus-api.cfargotunnel.com/api/config/test-certificate \
  -H "Content-Type: application/json" \
  -d '{"path":"/home/appuser/data/certificates/aca-23-07-25.p12","password":"YOUR_PASSWORD"}'
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 502 Bad Gateway | PM2 not running | `pm2 restart recordplus` |
| CORS error | Origin not allowed | Check `src/server/index.js` CORS config |
| "Session expired" | Zero Trust cookie expired | Refresh page, re-authenticate |
| Tunnel not connecting | cloudflared not running | `systemctl restart cloudflared` |
| config.js not loading | File not deployed | Force add: `git add -f src/client/config.js` |
