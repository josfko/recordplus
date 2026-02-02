# Cloudflare Deployment - Requirements

## Introduction

### Overview

Record+ is a legal case management system deployed with a split architecture:

| Component | Current | Target |
|-----------|---------|--------|
| **Frontend** | localhost:3000 | Cloudflare Pages (`recordplus.pages.dev`) |
| **Backend** | localhost:3000 | VPS via Cloudflare Tunnel (`recordplus-api.cfargotunnel.com`) |
| **Auth** | None | Cloudflare Zero Trust (optional) |

**Key Constraint:** No custom domain required. Using Cloudflare's free subdomains.

### Problem Statement

Currently, the API client uses a relative `/api` path which only works when frontend and backend share the same origin. When deployed separately:

1. Frontend on Cloudflare Pages tries to call `/api` on Pages (fails)
2. Cross-origin requests require CORS configuration
3. Zero Trust auth requires cookie handling

### Module Dependencies

| Dependency | Purpose |
|------------|---------|
| `src/client/js/api.js` | API client - needs environment detection |
| `src/client/config.js` | Production API URL (gitignored) |
| `src/server/index.js` | CORS configuration |
| Cloudflare Pages | Free static hosting with CDN |
| Cloudflare Tunnel | Secure backend access without open ports |
| Cloudflare Zero Trust | Optional email-based authentication |

### Technical Context

| Aspect | Value |
|--------|-------|
| Frontend Stack | Vanilla JS, ES Modules, Pure CSS |
| Backend Stack | Node.js 20+, Express, SQLite |
| VPS | Clouding.io (Barcelona, Spain) - 217.71.207.83 |
| Process Manager | PM2 |
| Auth Cookie | `CF_Authorization` (set by Zero Trust) |
| Free Tier Limits | 50 Zero Trust users, unlimited Pages bandwidth |

---

## Glossary

| Term | Definition |
|------|------------|
| **Cloudflare Pages** | Static site hosting with global CDN, automatic HTTPS |
| **Cloudflare Tunnel** | Encrypted outbound-only connection from VPS to Cloudflare edge |
| **Zero Trust** | Authentication model requiring explicit identity verification |
| **cloudflared** | Tunnel daemon running on VPS |
| **Origin** | Protocol + domain + port (e.g., `https://recordplus.pages.dev`) |
| **CORS** | Cross-Origin Resource Sharing - browser security for cross-domain requests |
| **CF_Authorization** | Cookie set by Zero Trust after successful authentication |
| **cfargotunnel.com** | Free subdomain for Cloudflare Tunnels |
| **pages.dev** | Free subdomain for Cloudflare Pages projects |

---

## Requirements

### Requirement 1: Environment-Aware API Client

**User Story:** As a developer, I want the API client to automatically detect the environment and use the correct backend URL, so that the app works in both development and production without code changes.

**Acceptance Criteria:**

1. WHEN the app is accessed via `localhost`, THE System SHALL use `/api` as the base URL (same-origin)

2. WHEN the app is accessed via `127.0.0.1`, THE System SHALL use `/api` as the base URL (same-origin)

3. WHEN the app is accessed via any other hostname (production), THE System SHALL use the configured `API_URL` from `config.js`

4. THE System SHALL NOT hardcode production URLs in source code; they SHALL be in `config.js`

5. WHEN `config.js` is missing or `API_URL` is not set, THE System SHALL fall back to `/api` and log a console warning

6. THE System SHALL append `/api` to `API_URL` if not already present

---

### Requirement 2: Production Configuration

**User Story:** As an operator, I want to configure the production API URL separately from code, so that I can deploy to different environments.

**Acceptance Criteria:**

1. THE System SHALL support configuration via `src/client/config.js` file

2. THE `config.js` file SHALL be excluded from git via `.gitignore`

3. THE System SHALL provide `config.example.js` as a documented template

4. WHEN `config.js` exports `API_URL`, THE System SHALL use that value for production API requests

5. THE System SHALL support both `https://domain.com` and `https://domain.com/api` formats for `API_URL`

6. THE System SHALL support an optional `DEBUG` flag to enable console logging

---

### Requirement 3: CORS Compatibility

**User Story:** As a user, I want API requests to work from Cloudflare Pages to the VPS backend, so that I can use the application from the production URL.

**Acceptance Criteria:**

1. THE Backend SHALL allow requests from origins matching `*.pages.dev`

2. THE Backend SHALL allow requests from origins matching `*.cfargotunnel.com`

3. THE Backend SHALL allow requests from `localhost` and `127.0.0.1` for development

4. THE Backend SHALL respond to OPTIONS preflight requests with correct CORS headers

5. THE Backend SHALL include `Access-Control-Allow-Credentials: true` to support cookies

6. THE Backend SHALL allow methods: GET, POST, PUT, DELETE, OPTIONS

7. THE Backend SHALL allow headers: Content-Type, Authorization

8. THE Backend SHALL support additional origins via `CORS_ORIGINS` environment variable

---

### Requirement 4: Zero Trust Cookie Handling

**User Story:** As a user authenticated via Cloudflare Zero Trust, I want my authentication to persist across API requests, so that I don't have to re-authenticate for each action.

**Acceptance Criteria:**

1. WHEN making API requests, THE System SHALL include `credentials: 'include'` to send cookies

2. THE Backend CORS SHALL be configured with `credentials: true`

3. WHEN the API returns HTML instead of JSON (Zero Trust login page), THE System SHALL detect this and throw a `SESSION_EXPIRED` error

4. WHEN session expires, THE System SHALL display "Sesión expirada. Por favor, recargue la página."

5. THE System SHALL work both with and without Zero Trust enabled

---

### Requirement 5: Error Handling

**User Story:** As a user, I want meaningful error messages when something goes wrong, so that I understand what happened and what to do.

**Acceptance Criteria:**

1. WHEN an API request fails due to network error, THE System SHALL display "Error de conexión con el servidor"

2. WHEN the API returns HTML (Zero Trust redirect), THE System SHALL display "Sesión expirada. Por favor, recargue la página."

3. WHEN CORS blocks a request, THE System SHALL display "Error de conexión con el servidor" (CORS appears as TypeError)

4. THE System SHALL NOT display raw technical errors (stack traces, HTTP status codes) to end users

5. THE System SHALL log detailed errors to console in DEBUG mode

---

### Requirement 6: Deployment Documentation

**User Story:** As a developer/operator, I want clear deployment instructions, so that I can set up or troubleshoot the production environment.

**Acceptance Criteria:**

1. THE Documentation SHALL include step-by-step Cloudflare account setup

2. THE Documentation SHALL include Cloudflare Tunnel installation and configuration for VPS

3. THE Documentation SHALL include Cloudflare Pages project setup

4. THE Documentation SHALL include Zero Trust configuration (as optional enhancement)

5. THE Documentation SHALL include verification commands to test each component

6. THE Documentation SHALL include troubleshooting guide for common issues

7. THE Documentation SHALL specify the free subdomains used (no custom domain required)

---

## Non-Functional Requirements

### Performance

- Cloudflare Pages CDN latency: < 50ms globally
- Tunnel latency overhead: < 20ms
- No impact on API response times

### Security

- No open ports on VPS (tunnel is outbound-only)
- HTTPS everywhere (automatic via Cloudflare)
- Zero Trust authentication available (optional)
- CORS restricted to known origins

### Availability

- Cloudflare Pages: 99.99% SLA
- Tunnel auto-reconnects on failure
- PM2 auto-restarts crashed processes

### Cost

- Cloudflare Pages: Free (unlimited requests)
- Cloudflare Tunnel: Free
- Zero Trust: Free (up to 50 users)
- No additional infrastructure cost

---

## Out of Scope

1. Custom domain setup (using free `*.pages.dev` and `*.cfargotunnel.com`)
2. Multi-region backend deployment
3. Database replication
4. CI/CD pipeline (manual deploy via git push)
5. Load balancing (single VPS instance)
