# Fix: Adobe PDF Signature Validation

## Date: 2026-02-06

## Problem

Adobe Reader rejected every cryptographically signed PDF from Record+ with:

> "Signature is INVALID - There are errors in the formatting or information contained in this signature"

This made the entire cryptographic signing feature non-functional. ARAG could not verify documents were legitimately signed.

## Root Cause

**node-forge produces malformed DER encoding.**

The PKCS#7/CMS signature contains **authenticated attributes** stored as an ASN.1 `SET OF`. DER encoding rules (ITU-T X.690, Section 11.6) require `SET OF` elements to be **sorted lexicographically by their encoded bytes**.

node-forge's `asn1.toDer()` does **not** sort `SET OF` elements. This is a [known bug (PR #731)](https://github.com/digitalbazaar/forge/pull/731) filed in 2019, never merged.

Adobe Reader strictly validates DER encoding. Unsorted `SET OF` = malformed structure = signature rejected. The cryptographic math was correct (hash matched, RSA valid, chain complete), but the **encoding** was wrong.

### What was NOT the problem

- Certificate chain embedding (fixed in commit `a508e8c`) - this was a real improvement but didn't fix the encoding bug
- SHA-256 hash computation - verified correct
- RSA signature math - verified valid
- P12 extraction - working correctly for ACA format

## Solution

**Replaced node-forge PKCS#7 generation with OpenSSL CLI.**

OpenSSL is the reference implementation that certificate authorities and Adobe test against. If OpenSSL produces it, Adobe accepts it.

### What changed

Only **one method** changed: `AcaP12Signer.sign()` in `src/server/services/signatureService.js`.

**Before (broken):**
```
P12 extraction (node-forge) -> PKCS#7 construction (node-forge) -> DER encoding (node-forge, BROKEN)
```

**After (fixed):**
```
P12 extraction (node-forge, unchanged) -> PEM conversion -> OpenSSL CLI -> DER content stripping (asn1js)
```

### The signing flow now

```
Step 1: Extract key + certs from P12 (existing node-forge code, unchanged)
Step 2: Convert to PEM format (forge.pki.privateKeyToPem / certificateToPem)
Step 3: Write temp files to /tmp/pdf-sign-XXXXXX/
        - key.pem (private key, mode 0600)
        - cert.pem (signing certificate)
        - chain.pem (CA chain certificates)
        - data.bin (PDF ByteRange content)
Step 4: openssl cms -sign -binary -nodetach -md sha256 ...
Step 5: Read sig.der (CMS with content attached)
Step 6: makeDetached() - strip eContent from CMS using asn1js
Step 7: Return detached DER bytes
Step 8: Cleanup temp directory (always, via finally block)
```

### Why content stripping (makeDetached)

OpenSSL `cms -sign` always produces **attached** CMS (data embedded inside the signature). But the PDF signature subfilter `adbe.pkcs7.detached` requires the data to be **absent** from the PKCS#7 - the PDF viewer reads data from the PDF's ByteRange instead.

The `makeDetached()` static method uses `asn1js` to:
1. Parse the CMS DER structure
2. Navigate to `ContentInfo > SignedData > encapContentInfo`
3. Remove the `eContent` field (keeping only the `eContentType` OID)
4. Re-encode to DER

This is safe because:
- The messageDigest attribute already contains the hash (computed by OpenSSL)
- The RSA signature is over the authenticated attributes (which include messageDigest)
- Removing embedded content doesn't change any hash or signature
- Adobe computes its own hash from the PDF ByteRange and compares with messageDigest

## Files Modified

| File | What changed |
|------|-------------|
| `src/server/services/signatureService.js` | New imports (child_process, fs/promises, os, asn1js). Replaced `AcaP12Signer.sign()` PKCS#7 builder with OpenSSL CLI call. Added `makeDetached()` static method. |
| `package.json` | Added `asn1js` dependency (~66KB, by PeculiarVentures) |

## What did NOT change

- PDF generation (`pdfGeneratorService.js`)
- Email sending (`emailService.js`)
- Document/email history services
- Minuta workflow orchestration (`minutaWorkflowService.js`)
- Visual signature box appearance
- Signature placeholder configuration
- Certificate info reading (`getCertificateInfo` - still uses node-forge)
- Strategy pattern selection logic (SignatureService, VisualSignatureStrategy)
- P12 extraction code in AcaP12Signer (handles ACA's non-standard format)
- Any frontend code, database schema, or API routes

## Security

### Temp file exposure
Private key is written to a temp file for ~200ms during signing.
- `mkdtemp()` creates directory with mode 0700
- Cleanup in `finally` block ensures deletion even on error
- Server runs as dedicated `appuser` (not root)

### Command injection
Using `execFile()` (not `exec()`). Arguments passed as array, not string. No shell spawned. Command injection is not possible.

### OpenSSL requirement
OpenSSL must be installed on the system. Pre-installed on Ubuntu 22.04 (VPS) and macOS. Error message shown if missing (`ENOENT` from `execFile`).

## Verification

### Tests
All 19 signature tests pass:
- Visual signature (unchanged code path)
- Crypto signing with test P12 (new OpenSSL path)
- Certificate info extraction (unchanged - still node-forge)
- Error handling (wrong password, missing file)

### CMS structure verified
```
CMS_ContentInfo:
  contentType: pkcs7-signedData
  d.signedData:
    version: 1
    digestAlgorithms: sha256
    encapContentInfo:
      eContentType: pkcs7-data
      eContent: <ABSENT>          <-- correctly detached
    certificates: [signer cert]
    signerInfos:
      signedAttrs:
        contentType: pkcs7-data
        signingTime: [timestamp]
        messageDigest: [hash]     <-- DER-sorted by OpenSSL
      signatureAlgorithm: rsaEncryption
      signature: [RSA bytes]
```

## Deployment

```bash
# On VPS (217.71.207.83):
ssh root@217.71.207.83
cd /home/appuser/recordplus
git pull
npm install          # installs asn1js
openssl version      # verify OpenSSL is available (should be 3.x)
pm2 restart all
```

Then test from recordplus.work:
1. Open any ARAG case
2. Generate a minuta
3. Download the signed PDF
4. Open in Adobe Acrobat Reader
5. Signature panel should show green checkmark / "Signature is VALID"

## Rollback

**Instant (no deploy needed):** Go to Configuracion > clear `certificate_path`. System falls back to `VisualSignatureStrategy`.

**Code rollback:** `git revert <commit>` on VPS, `pm2 restart all`.

## References

- [node-forge PR #731 - SET OF sorting bug](https://github.com/digitalbazaar/forge/pull/731) (unmerged since 2019)
- [node-signpdf Issue #111 - Adobe rejects signatures](https://github.com/vbuch/node-signpdf/issues/111)
- ITU-T X.690 Section 11.6 - DER encoding of SET OF
- RFC 5652 - CMS (Cryptographic Message Syntax)
