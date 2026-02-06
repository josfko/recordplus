# ACA Certificate Deployment Troubleshooting

## Deployment Date: 2026-02-01

## Overview

Deploying cryptographic PDF signing using ACA (Autoridad de Certificación de la Abogacía) certificate to production VPS.

---

## Infrastructure

| Component | Details |
|-----------|---------|
| **VPS Provider** | Clouding.io (Barcelona, Spain) |
| **VPS IP** | 217.71.207.83 |
| **OS** | Ubuntu 22.04 LTS |
| **Node.js** | v18.19.1 (package.json requires >=20.0.0, but works) |
| **App User** | `appuser` |
| **App Path** | `/home/appuser/recordplus/` |
| **Data Path** | `/home/appuser/data/` |
| **Database** | `/home/appuser/data/legal-cases.db` |
| **Certificate** | `/home/appuser/data/certificates/aca-23-07-25.p12` |
| **Process Manager** | PM2 (runs as `appuser`, NOT root) |

---

## Completed Steps

### 1. Code Deployment ✅

```bash
# As appuser (or with proper permissions)
cd /home/appuser/recordplus
git pull origin main
npm install --omit=dev
```

**Issues encountered:**
- `npm install` interrupted with SIGINT → Fixed by: `rm -rf node_modules && npm install --omit=dev`
- Git "dubious ownership" error → Fixed by: `git config --global --add safe.directory /home/appuser/recordplus`
- Ran npm as root → Fixed by: `chown -R appuser:appuser /home/appuser/recordplus/node_modules`

### 2. Certificate Upload ✅

```bash
# From local Mac (certificate had spaces in filename)
scp "/Users/jo/ACA PLUS 23-07-25.p12" root@217.71.207.83:/tmp/aca-certificate.p12

# On server as root
mkdir -p /home/appuser/data/certificates
mv /tmp/aca-certificate.p12 /home/appuser/data/certificates/aca-23-07-25.p12
chown appuser:appuser /home/appuser/data/certificates/aca-23-07-25.p12
chmod 600 /home/appuser/data/certificates/aca-23-07-25.p12
```

**Verified:**
```bash
ls -la /home/appuser/data/certificates/
# Output: -rw------- 1 appuser appuser 4068 Feb  1 21:31 aca-23-07-25.p12
```

### 3. Database Tables ✅

```bash
sqlite3 /home/appuser/data/legal-cases.db ".tables"
# Output: _migrations  cases  configuration  document_history  email_history  reference_counters
```

### 4. PM2 Restart ✅

```bash
su - appuser -c "pm2 restart recordplus"
```

### 5. Health Check ✅

```bash
curl http://localhost:3000/api/health
# Output: {"status":"ok"}
```

---

## Current Issue

**Problem:** "Probar Certificado" button returns HTTP 400 error.

**Test parameters:**
- Path: `/home/appuser/data/certificates/aca-23-07-25.p12`
- Password: User's certificate password

---

## Diagnostic Commands

Run these on the server and record the output:

### 1. Check PM2 Process Info
```bash
su - appuser -c "pm2 show recordplus"
```

### 2. Check Recent Logs
```bash
su - appuser -c "pm2 logs recordplus --lines 50 --nostream"
```

### 3. Test API Directly with curl
```bash
curl -X POST http://localhost:3000/api/config/test-certificate \
  -H "Content-Type: application/json" \
  -d '{"path":"/home/appuser/data/certificates/aca-23-07-25.p12","password":"YOUR_PASSWORD"}'
```

### 4. Check Required npm Packages
```bash
ls -la /home/appuser/recordplus/node_modules/@signpdf/
ls -la /home/appuser/recordplus/node_modules/node-forge/
```

### 5. Check signatureService.js Exists
```bash
ls -la /home/appuser/recordplus/src/server/services/signatureService.js
head -30 /home/appuser/recordplus/src/server/services/signatureService.js
```

### 6. Check config.js Route Exists
```bash
grep -n "test-certificate" /home/appuser/recordplus/src/server/routes/config.js
```

---

## Expected Responses

### Successful Certificate Test
```json
{
  "valid": true,
  "cn": "NOMBRE APELLIDO APELLIDO",
  "organization": "COLEGIO DE ABOGADOS DE MALAGA",
  "issuer": "ACA",
  "validFrom": "2023-07-25T00:00:00.000Z",
  "validTo": "2025-07-25T23:59:59.000Z",
  "isExpired": false,
  "daysUntilExpiration": 174
}
```

### Wrong Password Error
```json
{
  "valid": false,
  "error": "Contraseña del certificado incorrecta. Verifique la contraseña introducida."
}
```

### File Not Found Error
```json
{
  "valid": false,
  "error": "Certificado no encontrado: /path/to/file.p12"
}
```

---

## Common Issues & Solutions

### Issue: "Error: Cannot find module '@signpdf/signpdf'"
**Cause:** npm packages not installed correctly
**Solution:**
```bash
cd /home/appuser/recordplus
rm -rf node_modules
npm install --omit=dev
su - appuser -c "pm2 restart recordplus"
```

### Issue: "Error: no such table: cases"
**Cause:** Database not initialized
**Solution:**
```bash
sqlite3 /home/appuser/data/legal-cases.db < /home/appuser/recordplus/migrations/001_initial_schema.sql
su - appuser -c "pm2 restart recordplus"
```

### Issue: PM2 logs show nothing / different process
**Cause:** PM2 daemon running under different user
**Solution:** Always use `su - appuser -c "pm2 ..."` when running as root

### Issue: Certificate permission denied
**Cause:** File not readable by appuser
**Solution:**
```bash
chown appuser:appuser /home/appuser/data/certificates/aca-23-07-25.p12
chmod 600 /home/appuser/data/certificates/aca-23-07-25.p12
```

### Issue: HTTP 400 with no error details
**Cause:** Server-side error not properly caught
**Solution:** Check PM2 logs for stack trace:
```bash
su - appuser -c "pm2 logs recordplus --err --lines 100"
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server/services/signatureService.js` | CryptoSignatureStrategy class, certificate parsing |
| `src/server/routes/config.js` | POST /api/config/test-certificate endpoint |
| `src/client/js/api.js` | testCertificate(path, password) API client |
| `src/client/js/components/configuration.js` | Certificate UI, "Probar Certificado" button |

---

## Dependencies for Signing

```json
{
  "@signpdf/signpdf": "^3.x",
  "@signpdf/signer-p12": "^3.x",
  "@signpdf/placeholder-pdf-lib": "^3.x",
  "node-forge": "^1.x",
  "pdf-lib": "^1.x"
}
```

---

## Next Steps

1. Run diagnostic commands above
2. Identify specific error from PM2 logs or curl response
3. Fix based on error message
4. Restart PM2: `su - appuser -c "pm2 restart recordplus"`
5. Test again in browser

---

## Contact / References

- [SIGNATURE_UPGRADE.md](./SIGNATURE_UPGRADE.md) - Full ACA certificate setup guide
- [CLAUDE.md](./CLAUDE.md) - Project overview and conventions
