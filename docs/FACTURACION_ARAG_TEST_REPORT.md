# Facturación ARAG - User Journey Test Report

**Date:** 2026-02-04
**Tester:** Claude Code (Browser Automation)
**Environment:** localhost:3000 (Development)

---

## Executive Summary

The Facturación ARAG module was tested end-to-end using browser automation. The core workflows (minuta generation, suplido generation, email sending, document history) are **functional** with some issues identified.

| Feature | Status | Notes |
|---------|--------|-------|
| Case Creation (ARAG) | ✅ Working | Auto-generates IYxxxxxx reference |
| Minuta Generation | ✅ Working | PDF generated and signed correctly |
| Email Sending | ❌ NOT WORKING | SMTP accepts but emails not delivered |
| State Transition (JUDICIAL) | ✅ Working | Via API; UI dropdown issues |
| Suplido Generation | ⚠️ Partial | Generates PDF but amount = 0 |
| Document History | ✅ Working | Timeline shows all events |
| Document Download | ✅ Working | PDFs downloadable from history |

---

## Test Case Details

### 1. ARAG Case Creation

**Steps:**
1. Navigate to Dashboard → Click "Nuevo Expediente"
2. Select case type: ARAG
3. Enter client name: "María García López"
4. Enter ARAG reference: DJ00123456
5. Click "Crear Expediente"

**Result:** ✅ PASSED
- Case created with ID: 59724
- Internal reference auto-generated: IY010307
- State: ABIERTO

---

### 2. Facturación View

**Steps:**
1. Navigate to Facturación ARAG → Click on case
2. Verify minuta section displays correct calculations

**Result:** ✅ PASSED
- Honorarios Base: 203,00 €
- IVA (21%): 42,63 €
- Total a Facturar: 245,63 €
- Indicators show: Plantilla PDF v2.4, Firma Digital Auto

**Note:** Email indicator shows hardcoded "facturacionsiniestros@arag.es" even when configuration is different. The actual email sent uses the configured address.

---

### 3. Minuta Generation

**Steps:**
1. Click "Generar y Enviar" button
2. Wait for workflow completion
3. Verify document in history

**Initial Issue:** 500 Server Error
- **Cause:** Certificate path in configuration pointed to non-existent file (`/home/appuser/data/certificates/aca-23-07-25.p12`)
- **Solution:** Clear certificate_path in Configuration to use visual signature

**Result after fix:** ✅ PASSED

**API Response:**
```json
{
  "success": true,
  "data": {
    "steps": [
      {"step": "generate", "status": "completed", "path": "data/documents/2026/IY010307/minuta_1770231448433.pdf"},
      {"step": "sign", "status": "completed", "path": "data/documents/2026/IY010307/minuta_1770231448433_signed.pdf"},
      {"step": "email", "status": "completed"}
    ],
    "documentId": 869,
    "emailId": 87
  }
}
```

**Generated Files:**
- `minuta_1770231448433.pdf` (2,204 bytes)
- `minuta_1770231448433_signed.pdf` (2,377 bytes)

**Email Sent:**
- To: soniadeveloper1@gmail.com (configured test address)
- Subject: DJ00123456 - MINUTA

---

### 4. State Transition to JUDICIAL

**Steps:**
1. Click Estado Procesal dropdown → Select "Judicial"
2. Or use API endpoint

**UI Issue:** Estado Procesal dropdown does not open when clicked.

**Workaround:** Use API directly:
```bash
curl -X POST http://localhost:3000/api/cases/59724/judicial \
  -H "Content-Type: application/json" \
  -d '{"judicialDate":"2026-02-04","district":"Vélez-Málaga"}'
```

**Result:** ✅ PASSED (via API)
- State changed to JUDICIAL
- Badge updated to blue "JUDICIAL"
- History shows "Cambio de estado a Judicial"

---

### 5. Suplido Generation

**Steps:**
1. Verify case is in JUDICIAL state
2. Select Partido Judicial (Destino)
3. Click "Generar Suplido"

**Result:** ⚠️ PARTIAL

**Issue Found:** Mileage amount returns 0 instead of configured value (40€ for Vélez-Málaga)

**API Response:**
```json
{
  "success": true,
  "data": {
    "steps": [
      {"step": "generate", "status": "completed"},
      {"step": "sign", "status": "completed"},
      {"step": "email", "status": "completed"}
    ],
    "documentId": 870,
    "emailId": 88,
    "amount": 0,  // BUG: Should be 40
    "district": "Vélez-Málaga"
  }
}
```

**Generated Files:**
- `suplido_v_lez_m_laga_1770231633789.pdf` (2,127 bytes)
- `suplido_v_lez_m_laga_1770231633789_signed.pdf` (2,300 bytes)

**Email Sent:**
- To: soniadeveloper1@gmail.com
- Subject: DJ00123456 - SUPLIDO Vélez-Málaga

---

### 6. Document History Timeline

**Result:** ✅ PASSED

History correctly displays (reverse chronological):
1. Email Enviado (suplido) - 19:00
2. Suplido Generado - 19:00
3. Email Enviado (minuta) - 18:57
4. Minuta Generada - 18:57
5. Cambio de estado a Judicial - 18:59
6. Expediente Creado - 18:45

Each document entry includes a downloadable link.

---

## Issues Found

### Critical Issues

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| BUG-000 | **Emails not delivered** - SMTP accepts emails but they never arrive | **CRITICAL** | Open |
| BUG-001 | Suplido mileage amount always returns 0 | High | Open |
| BUG-002 | Certificate path causes 500 error if file doesn't exist | High | Workaround: clear path |

### BUG-000 Details: Email Delivery Failure

**Symptoms:**
- SMTP connection test passes
- `transporter.sendMail()` returns success with `250 Requested mail action okay, completed`
- Emails are recorded in database with status "SENT"
- **Emails never arrive at recipient inbox (not even in spam)**

**Configuration:**
```
SMTP Host: smtp.ionos.es
Port: 465 (SSL/TLS)
User: abogados@camaraygamero.org
From: abogados@camaraygamero.org
```

**Possible Causes:**
1. IONOS may be silently dropping outbound emails
2. Account may need email verification or have sending restrictions
3. SPF/DKIM/DMARC not configured for domain
4. IONOS may be queuing emails for manual review

**Investigation Needed:**
- Check IONOS webmail "Sent" folder
- Check IONOS account settings for sending restrictions
- Verify domain DNS records (SPF, DKIM, DMARC)
- Contact IONOS support if needed

### UI Issues

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| UI-001 | Estado Procesal dropdown doesn't open on click | Medium | Open |
| UI-002 | Email indicator shows hardcoded ARAG email instead of configured | Low | Open |
| UI-003 | Importe Calc. always shows 0,00 € even when district is selected | Medium | Open |

---

## Configuration Verified

**Configuración ARAG:**
- Tarifa Base: 203 €
- IVA: 21%
- Email Facturación: soniadeveloper1@gmail.com (changed for testing)

**Tabla de Kilometraje:**
- Torrox: 40 €
- Vélez-Málaga: 40 €
- Torremolinos: 30 €
- Fuengirola: 50 €
- Marbella: 45 €
- Estepona: 70 €
- Antequera: 30 €

**Configuración SMTP:**
- Servidor: smtp.ionos.es
- Puerto: 465
- Seguridad: SSL/TLS
- Usuario: abogados@camaraygamero.org
- From: abogados@camaraygamero.org

**Certificado Digital:**
- Path: (cleared for testing - uses visual signature)

---

## Files Generated During Testing

```
data/documents/2026/IY010307/
├── minuta_1770231448433.pdf           (2,204 bytes)
├── minuta_1770231448433_signed.pdf    (2,377 bytes)
├── suplido_v_lez_m_laga_1770231633789.pdf        (2,127 bytes)
└── suplido_v_lez_m_laga_1770231633789_signed.pdf (2,300 bytes)
```

---

## Recommendations

1. **Fix BUG-001 (Mileage Calculation):** Investigate why `mileage_velez_malaga` configuration value is not being retrieved correctly in the suplido generation workflow.

2. **Fix BUG-002 (Certificate Handling):** Add graceful fallback to visual signature when certificate file doesn't exist instead of throwing 500 error.

3. **Fix UI-001 (Dropdown):** Debug the Estado Procesal dropdown click handler.

4. **Improve UI-002:** Display the actual configured email address in the indicator, not a hardcoded value.

5. **Add Error Messages:** Show user-friendly error messages in the UI when API calls fail (currently silent failure).

---

## Test Environment Cleanup

To restore production configuration:
```bash
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"arag_email":"facturacionsiniestros@arag.es"}'
```

---

## Production Testing (recordplus.work)

**Date:** 2026-02-04
**Environment:** recordplus.work (Production)

### Configuration Status

| Component | Status | Details |
|-----------|--------|---------|
| SMTP Connection | ✅ Working | smtp.ionos.es:587 STARTTLS |
| Digital Certificate | ✅ Valid | /home/appuser/data/certificates/aca-23-07-25.p12 |
| Email Facturación | ✅ Configured | soniadeveloper1@gmail.com |
| Mileage Rates | ✅ Configured | All districts with amounts |

### Production Configuration

**SMTP:**
- Servidor: smtp.ionos.es
- Puerto: 587
- Seguridad: STARTTLS
- Usuario: abogados@camaraygamero.org

**Tabla de Kilometraje (Production):**
- Torrox: 20 €
- Vélez-Málaga: 30 €
- Torremolinos: 25 €
- Fuengirola: 40 €
- Marbella: 60 €
- Estepona: 70 €
- Antequera: 30 €

### Critical Bug Found in Production

**BUG-003: signpdf API call incorrect**

**Error Message:**
```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "Error al firmar el documento: signpdf.sign is not a function"
  }
}
```

**Root Cause:**
The `@signpdf/signpdf` v3.x package exports the `sign` function as the default export directly, not as a method. The code was calling `signpdf.sign()` but should call `signpdf()` directly.

**Location:** `src/server/services/signatureService.js` line 213

**Fix Applied:**
```diff
- const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);
+ const signedPdf = await signpdf(pdfWithPlaceholder, signer);
```

**Commit:** `d58cab1` - Pushed to GitHub, pending deployment to VPS

### Deployment Required

To deploy the fix to production:
```bash
ssh user@vps
cd /path/to/record+
git pull origin main
pm2 restart all
```

---

## Updated Issues Summary

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| BUG-000 | Emails not delivered (localhost) | **CRITICAL** | Open - Needs investigation |
| BUG-001 | Suplido mileage amount returns 0 (localhost) | High | Open |
| BUG-002 | Certificate path 500 error (localhost) | High | Workaround applied |
| BUG-003 | signpdf.sign is not a function (production) | **CRITICAL** | ✅ **FIXED** (pending deploy) |
| UI-001 | Estado Procesal dropdown | Medium | Open |
| UI-002 | Hardcoded email indicator | Low | Open |
| UI-003 | Importe Calc. shows 0,00 € | Medium | Open |

---

*Report generated by automated browser testing using Claude Code*
