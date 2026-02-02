# Cloudflare Deployment - Technical Design

## Overview

Production deployment architecture for Record+ using Cloudflare's free infrastructure:

| Component | Service | URL |
|-----------|---------|-----|
| **Frontend** | Cloudflare Pages | `https://recordplus.pages.dev` |
| **Backend API** | Cloudflare Tunnel | `https://recordplus-api.cfargotunnel.com` |
| **Authentication** | Cloudflare Zero Trust | Email-based (free tier: 50 users) |

**No custom domain required.** All URLs are provided free by Cloudflare.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Record+ SPA                                                           │  │
│  │  ├── api.js → detects environment, includes credentials               │  │
│  │  └── config.js → API_URL: https://recordplus-api.cfargotunnel.com    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                │                                         │
                │ HTTPS (Static)                          │ HTTPS (API + Cookie)
                ▼                                         ▼
┌───────────────────────────────┐      ┌─────────────────────────────────────┐
│    CLOUDFLARE PAGES           │      │      CLOUDFLARE ZERO TRUST          │
│    recordplus.pages.dev       │      │      (Access Application)           │
│                               │      │                                     │
│  • Global CDN (275+ cities)   │      │  • Email OTP authentication         │
│  • Automatic HTTPS            │      │  • CF_Authorization cookie          │
│  • HTTP/3 + Brotli            │      │  • 24-hour session (configurable)   │
│  • DDoS protection            │      │  • Audit logging                    │
└───────────────────────────────┘      └─────────────────────────────────────┘
                                                        │
                                                        ▼
                                       ┌─────────────────────────────────────┐
                                       │      CLOUDFLARE TUNNEL              │
                                       │      recordplus-api                 │
                                       │                                     │
                                       │  • No open ports (outbound only)    │
                                       │  • Encrypted TLS 1.3                │
                                       │  • Automatic reconnect              │
                                       │  • Health checks                    │
                                       └─────────────────────────────────────┘
                                                        │
                                                        │ localhost:3000
                                                        ▼
                                       ┌─────────────────────────────────────┐
                                       │           VPS (Ubuntu 22.04)        │
                                       │           217.71.207.83             │
                                       │                                     │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ systemd: cloudflared.service  │  │
                                       │  └───────────────────────────────┘  │
                                       │               │                     │
                                       │               ▼                     │
                                       │  ┌───────────────────────────────┐  │
                                       │  │ PM2: recordplus               │  │
                                       │  │  └── Node.js (Express)        │  │
                                       │  │       ├── CORS (credentials)  │  │
                                       │  │       └── SQLite DB           │  │
                                       │  └───────────────────────────────┘  │
                                       │                                     │
                                       │  /home/appuser/                     │
                                       │  ├── recordplus/    (app code)      │
                                       │  └── data/                          │
                                       │      ├── legal-cases.db             │
                                       │      ├── documents/                 │
                                       │      └── certificates/              │
                                       └─────────────────────────────────────┘
```

---

## Security Model

### Defense in Depth

```
Layer 1: Cloudflare DDoS Protection (automatic)
    ↓
Layer 2: Zero Trust Authentication (email verification)
    ↓
Layer 3: Cloudflare Tunnel (no exposed ports)
    ↓
Layer 4: CORS Policy (allowlist origins)
    ↓
Layer 5: Application Logic (input validation)
    ↓
Layer 6: Database (appuser permissions)
```

### Zero Trust Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Session Duration | 24 hours | Balance security/convenience |
| Auth Method | Email OTP | Simple, no password to manage |
| Allowed Emails | `your-email@example.com` | Restrict to authorized users |
| Warp Requirement | Disabled | Not needed for web app |

---

## Components Implementation

### 1. Client Configuration (`src/client/config.js`)

```javascript
// Production configuration - gitignored
export const config = {
  API_URL: "https://recordplus-api.cfargotunnel.com",
  DEBUG: false,
};
```

### 2. API Client (`src/client/js/api.js`)

Key changes:
- Dynamic config import with fallback
- Environment detection (localhost vs production)
- `credentials: "include"` for Zero Trust cookies
- HTML response detection for session expiration

```javascript
// Load config (may not exist locally)
let config = { API_URL: null, DEBUG: false };
try {
  const imported = await import("../config.js");
  config = imported.config || config;
} catch {
  // Development mode - use /api
}

class ApiClient {
  constructor() {
    this.baseUrl = this._detectBaseUrl();
  }

  _detectBaseUrl() {
    const hostname = window.location.hostname;

    // Development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "/api";
    }

    // Production
    if (config.API_URL) {
      let url = config.API_URL.replace(/\/+$/, "");
      return url.endsWith("/api") ? url : `${url}/api`;
    }

    console.warn("[API] No API_URL configured");
    return "/api";
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const fetchConfig = {
      credentials: "include", // Zero Trust cookie
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    };

    const response = await fetch(url, fetchConfig);

    // Detect Zero Trust redirect
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const error = new Error("Sesión expirada. Por favor, recargue la página.");
      error.code = "SESSION_EXPIRED";
      throw error;
    }

    // ... rest of error handling
  }
}
```

### 3. Backend CORS (`src/server/index.js`)

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Same-origin, curl

    // Development
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }

    // Cloudflare Pages
    if (origin.includes(".pages.dev")) {
      return callback(null, true);
    }

    // Cloudflare Tunnel
    if (origin.includes("cfargotunnel.com")) {
      return callback(null, true);
    }

    // Custom domains (env var)
    const allowed = process.env.CORS_ORIGINS?.split(",") || [];
    if (allowed.some(d => origin.includes(d.trim()))) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

---

## Cloudflare Tunnel Setup

### Installation (VPS)

```bash
# As root on VPS
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb
cloudflared --version
```

### Authentication

```bash
cloudflared tunnel login
# Opens browser - authenticate with Cloudflare account
# Creates: ~/.cloudflared/cert.pem
```

### Tunnel Creation

```bash
cloudflared tunnel create recordplus-api
# Output: Created tunnel recordplus-api with id XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
# Creates: ~/.cloudflared/TUNNEL_ID.json
```

### Configuration

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: TUNNEL_ID
credentials-file: /root/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: recordplus-api.cfargotunnel.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: false
  - service: http_status:404
```

### DNS Route

```bash
cloudflared tunnel route dns recordplus-api recordplus-api
# Creates: recordplus-api.cfargotunnel.com → TUNNEL_ID
```

### System Service

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared
```

---

## Zero Trust Setup

### 1. Create Access Application

Cloudflare Dashboard → Zero Trust → Access → Applications → Add Application

| Field | Value |
|-------|-------|
| Name | Record+ API |
| Type | Self-hosted |
| Domain | `recordplus-api.cfargotunnel.com` |
| Path | (leave empty for all paths) |

### 2. Configure Policy

| Field | Value |
|-------|-------|
| Policy Name | Allow Authorized Users |
| Action | Allow |
| Rule | Emails - `your-email@example.com` |

### 3. Session Settings

| Setting | Value |
|---------|-------|
| Session Duration | 24 hours |
| Enable WARP | No |

### 4. (Optional) Protect Frontend Too

Repeat for `recordplus.pages.dev` to require authentication before loading the app.

---

## Cloudflare Pages Setup

### 1. Connect Repository

Cloudflare Dashboard → Pages → Create Project → Connect to Git

| Field | Value |
|-------|-------|
| Repository | `josfko/recordplus` |
| Branch | `main` |
| Build command | (leave empty) |
| Build output | `src/client` |

### 2. Create Production Config

Before deploying, create `src/client/config.js` with your tunnel URL.

**Option A: Local file (simple)**
```bash
# In your local repo (will be deployed)
cat > src/client/config.js << 'EOF'
export const config = {
  API_URL: "https://recordplus-api.cfargotunnel.com",
  DEBUG: false,
};
EOF
```

**Option B: Cloudflare Functions (advanced)**
Create `functions/config.js.ts` to inject config at runtime.

### 3. Deploy

```bash
git add src/client/config.js
git commit -m "chore: add production config for Cloudflare Pages"
git push origin main
```

Cloudflare auto-deploys on push.

---

## Monitoring & Operations

### Health Checks

```bash
# API health (from anywhere)
curl https://recordplus-api.cfargotunnel.com/api/health

# Tunnel status (on VPS)
systemctl status cloudflared
journalctl -u cloudflared -f

# PM2 status (on VPS)
pm2 status
pm2 logs recordplus --lines 50
```

### Rollback Procedure

```bash
# On VPS as appuser
cd /home/appuser/recordplus
git log --oneline -5           # Find good commit
git checkout <commit>          # Rollback code
pm2 reload recordplus          # Apply changes
```

### Tunnel Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| 502 Bad Gateway | PM2 running? | `pm2 restart recordplus` |
| Connection refused | cloudflared running? | `systemctl restart cloudflared` |
| CORS error | Origin allowed? | Check CORS config |
| Session expired | Zero Trust policy | Refresh browser |

---

## Correctness Properties

### Property 1: Environment Detection

_For any_ hostname, the correct baseUrl is selected:

| Hostname | Expected |
|----------|----------|
| `localhost` | `/api` |
| `127.0.0.1` | `/api` |
| `recordplus.pages.dev` | `https://recordplus-api.cfargotunnel.com/api` |

### Property 2: Zero Trust Cookie Flow

_For all_ authenticated requests:
1. Browser includes `CF_Authorization` cookie
2. Tunnel validates cookie with Zero Trust
3. Request reaches backend if valid
4. HTML redirect returned if expired

### Property 3: CORS Compliance

_For any_ cross-origin request from `.pages.dev`:
1. Preflight OPTIONS returns correct headers
2. Actual request includes `credentials: include`
3. Response includes `Access-Control-Allow-Credentials: true`

### Property 4: Graceful Degradation

_For any_ missing config:
1. App loads without JavaScript errors
2. Console shows warning about missing API_URL
3. API calls fail with clear error message

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/client/config.example.js` | CREATE | Template for config |
| `src/client/config.js` | CREATE (gitignored) | Production API URL |
| `src/client/js/api.js` | MODIFY | Env detection, credentials |
| `src/server/index.js` | MODIFY | CORS for cross-origin |
| `.gitignore` | MODIFY | Exclude config.js |

---

## Verification Checklist

### Pre-Deployment

- [ ] `npm run dev` works locally
- [ ] Certificate test works at `localhost:3000`
- [ ] config.example.js exists with documentation
- [ ] config.js is gitignored

### Post-Deployment (VPS)

- [ ] `cloudflared --version` shows installed
- [ ] `systemctl status cloudflared` is active
- [ ] `curl localhost:3000/api/health` returns OK
- [ ] `curl https://recordplus-api.cfargotunnel.com/api/health` returns OK

### Post-Deployment (Pages)

- [ ] `https://recordplus.pages.dev` loads
- [ ] Browser console shows `[API] Production mode: using https://...`
- [ ] Configuración → Probar Certificado works
- [ ] Network tab shows requests to `cfargotunnel.com`

### Zero Trust (Optional)

- [ ] Accessing API directly prompts for email
- [ ] After auth, cookie is set
- [ ] Subsequent requests work without re-auth
