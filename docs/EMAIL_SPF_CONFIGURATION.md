# Email SPF Configuration - camaraygamero.org

**Date:** 2026-02-04
**Issue:** Emails sent via IONOS SMTP not being delivered
**Root Cause:** SPF record did not authorize IONOS servers

---

## Problem Description

Emails sent from the Record+ application via IONOS SMTP (`smtp.ionos.es`) were being silently rejected by receiving mail servers (Gmail, etc.) because the domain's SPF record did not authorize IONOS to send emails on behalf of `camaraygamero.org`.

### Symptoms
- SMTP connection test: **PASSED**
- `transporter.sendMail()` returns: `250 Requested mail action okay, completed`
- Email status in database: **SENT**
- Email actually delivered: **NO** (not in inbox, not in spam)

### Diagnosis
```bash
dig TXT camaraygamero.org +short
```
Result:
```
"v=spf1 include:_spf.basenet.nl -all"
```

This SPF record only authorized `basenet.nl` servers. The `-all` directive means "hard fail" (reject) for any unauthorized sender.

---

## What is SPF?

**SPF (Sender Policy Framework)** is a DNS TXT record that specifies which mail servers are authorized to send email for a domain.

When Gmail/Outlook receives an email "from" `abogados@camaraygamero.org`:
1. It looks up the SPF record for `camaraygamero.org`
2. It checks if the sending server's IP is authorized
3. If not authorized → Email is rejected or marked as spam

---

## The Fix

### Original SPF Record (BEFORE)
```
v=spf1 include:_spf.basenet.nl -all
```
- `include:_spf.basenet.nl` → Authorizes basenet.nl servers
- `-all` → Reject all others

### Updated SPF Record (AFTER)
```
v=spf1 include:_spf.basenet.nl include:_spf.perfora.net -all
```
- `include:_spf.basenet.nl` → Authorizes basenet.nl servers (unchanged)
- `include:_spf.perfora.net` → Authorizes IONOS servers (added)
- `-all` → Reject all others

### Why `_spf.perfora.net`?

IONOS (1&1) uses `perfora.net` infrastructure for their SMTP services. This can be verified:
```bash
dig TXT _spf.perfora.net +short
# Returns: "v=spf1 ip4:74.208.4.192/26 ip4:82.165.159.128/27 -all"
```

---

## How to Apply the Change

### Location
IONOS Control Panel → Domains → camaraygamero.org → DNS

### Steps
1. Find the TXT record with:
   - **Host:** `@`
   - **Value:** `v=spf1 include:_spf.basenet.nl -all`

2. Click the edit (pencil) icon

3. Change the value to:
   ```
   v=spf1 include:_spf.basenet.nl include:_spf.perfora.net -all
   ```

4. Save the changes

5. Wait 5-30 minutes for DNS propagation

### Verification
After propagation, verify with:
```bash
dig TXT camaraygamero.org +short
```
Expected result:
```
"v=spf1 include:_spf.basenet.nl include:_spf.perfora.net -all"
```

---

## Rollback Instructions

If there are any problems, revert to the original SPF record:

1. Go to IONOS DNS settings
2. Edit the TXT record for `@`
3. Change back to:
   ```
   v=spf1 include:_spf.basenet.nl -all
   ```
4. Save and wait for propagation

---

## Important Notes

- **Adding IONOS does NOT affect basenet** - SPF `include:` statements are additive
- Both basenet.nl AND IONOS will be authorized to send emails
- The `-all` at the end rejects unauthorized senders (keeps security intact)
- This change only affects email sending authorization, not email receiving

---

## SMTP Configuration Reference

**Current SMTP Settings (Record+ app):**
```
Host: smtp.ionos.es
Port: 587
Security: STARTTLS
User: abogados@camaraygamero.org
From: abogados@camaraygamero.org
```

**Email Recipients:**
- Production: facturacionsiniestros@arag.es
- Testing: soniadeveloper1@gmail.com

---

## Related Documentation

- [FACTURACION_ARAG_TEST_REPORT.md](./FACTURACION_ARAG_TEST_REPORT.md) - Full test report
- [SPF Record Syntax](https://www.spf-record.com/) - External reference

---

*Document created during Record+ Facturación ARAG testing - 2026-02-04*

100% sure - it does NOT affect basenet.                                                                                                    
                                         
  SPF include: statements are additive. Think of it like an "allowed list":                                                                  
                                                                                                                                             
  Before:                                                                                                                                    
  v=spf1 include:_spf.basenet.nl -all                       
  → Only basenet can send ✅

  After:
  v=spf1 include:_spf.basenet.nl include:_spf.perfora.net -a
  
  