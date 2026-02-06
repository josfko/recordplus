# ACA Digital Certificate Setup - Record+

## Last Updated: 2026-02-06

## Overview

Record+ uses ACA (Autoridad de Certificación de la Abogacía) digital certificates to cryptographically sign PDF documents (minutas and suplidos) for ARAG insurance cases. This document tracks the complete certificate setup status.

## Certificate Files

### 1. Personal Signing Certificate (ACA PLUS)
- **File:** `ACA PLUS 23-07-25.p12`
- **Type:** PKCS#12 (personal certificate + private key)
- **Subject:** SONIA CAMARA GAMERO
- **Issued by:** ACA (Autoridad de Certificación de la Abogacía)
- **Purpose:** Signs PDF documents - this is the certificate Record+ uses
- **Password protected:** YES (password required to use it)
- **Location on Mac:** `/Users/jo/ACA PLUS 23-07-25.p12`
- **Location on VPS:** Needs to be confirmed (was previously uploaded)

### 2. Raíz ACA ROOT 2 (Root CA Certificate)
- **File:** `ACA_ROOTCA.CER`
- **Type:** DER-encoded X.509 certificate
- **Subject:** `CN=ACA ROOT 2, O=CONSEJO GENERAL DE LA ABOGACIA ESPAÑOLA, C=ES`
- **Issuer:** Self-signed (issuer = subject)
- **Valid:** 2024-03-18 to 2044-09-18
- **Purpose:** Top of the trust chain - proves ACA is a legitimate CA
- **Location on Mac:** `/Users/jo/ACA_ROOTCA.CER`
- **Downloaded from:** https://www.abogacia.es/site/acaplus/guias-y-software-de-instalacion/ (Certificados Raíz section)

### 3. Subordinada ACA 1 (Intermediate CA)
- **File:** `ACA_SUB1CA.cer`
- **Type:** DER-encoded X.509 certificate
- **Subject:** `CN=ACA 1, OU=AUTORIDAD DE CERTIFICACION DE LA ABOGACIA, O=CONSEJO GENERAL DE LA ABOGACIA ESPAÑOLA, C=ES`
- **Issuer:** ACA ROOT 2
- **Purpose:** Intermediate CA in the trust chain
- **Location on Mac:** `/Users/jo/ACA_SUB1CA.cer`

### 4. Subordinada ACA 2 (Intermediate CA)
- **File:** `ACA_SUB2CA.cer`
- **Type:** DER-encoded X.509 certificate
- **Subject:** `CN=ACA 2, OU=AUTORIDAD DE CERTIFICACION DE LA ABOGACIA, O=CONSEJO GENERAL DE LA ABOGACIA ESPAÑOLA, C=ES`
- **Issuer:** ACA ROOT 2
- **Purpose:** Intermediate CA in the trust chain (likely the one that directly issued the personal cert)
- **Location on Mac:** `/Users/jo/ACA_SUB2CA.cer`

## Trust Chain

```
Raíz ACA ROOT 2  (self-signed root)
  ├── Subordinada ACA 1  (intermediate)
  └── Subordinada ACA 2  (intermediate)
        └── SONIA CAMARA GAMERO  (personal .p12 cert)
```

For Adobe Reader to show a green checkmark on signed PDFs, the machine viewing the PDF needs to trust the root certificate. The intermediate certificates complete the chain.

## Installation Status

### Mac (Local Development Machine - /Users/jo)

| Certificate | Downloaded | Installed in Keychain | Status |
|---|---|---|---|
| ACA PLUS 23-07-25.p12 | YES (`/Users/jo/`) | N/A (used by Record+ directly) | Ready |
| ACA_ROOTCA.CER | YES (`/Users/jo/`) | YES - System Keychain (trusted root) | DONE |
| ACA_SUB1CA.cer | YES (`/Users/jo/`) | User was asked to run security command | NEEDS VERIFICATION |
| ACA_SUB2CA.cer | YES (`/Users/jo/`) | User was asked to run security command | NEEDS VERIFICATION |

**Commands used to install on Mac:**
```bash
# Root certificate
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "/Users/jo/ACA_ROOTCA.CER"

# Intermediate certificates (user said "done!" but not verified via terminal)
sudo security add-trusted-cert -d -r trustAsRoot -k /Library/Keychains/System.keychain "/Users/jo/ACA_SUB1CA.cer"
sudo security add-trusted-cert -d -r trustAsRoot -k /Library/Keychains/System.keychain "/Users/jo/ACA_SUB2CA.cer"
```

### VPS (Clouding.io - Production)

| Certificate | Uploaded | Installed in OS trust store | Status |
|---|---|---|---|
| ACA PLUS 23-07-25.p12 | YES (location TBD) | N/A (used by Record+ directly) | Needs path confirmation |
| ACA_ROOTCA.CER | NOT UPLOADED | NOT INSTALLED | TODO |
| ACA_SUB1CA.cer | NOT UPLOADED | NOT INSTALLED | TODO |
| ACA_SUB2CA.cer | NOT UPLOADED | NOT INSTALLED | TODO |

**IMPORTANT:** The root and intermediate certificates may NOT be strictly required on the VPS for signing to work. The .p12 file contains the private key and personal cert which is sufficient for creating signatures. However:
- The root/intermediate certs ARE needed on any machine that wants to **verify/validate** the signature (e.g., opening the PDF in Adobe Reader)
- They may also improve the signature by embedding the full certificate chain in the PDF itself

### Record+ Configuration (Production - recordplus.work)

| Setting | Value | Status |
|---|---|---|
| certificate_path | NEEDS TO BE SET | TODO - must point to .p12 location on VPS |
| certificate_password | NEEDS TO BE SET | TODO - password for the .p12 file |

**Local (localhost:3000) config was partially updated:**
- `certificate_path` was set to `/Users/jo/ACA PLUS 23-07-25.p12` during this session
- `certificate_password` is empty - signing failed with "Contraseña del certificado incorrecta"
- The password needs to be provided by the user

## Record+ Signing Architecture

The signing service is at: `src/server/services/signatureService.js`

**Strategy Pattern:**
- If `certificate_path` is configured → `CryptoSignatureStrategy` (real digital signature)
- If `certificate_path` is empty → `VisualSignatureStrategy` (just a text box, no crypto)

**Signing flow:**
1. `POST /api/cases/:id/minuta` triggers `minutaWorkflowService.js`
2. PDF is generated by `pdfGeneratorService.js`
3. PDF is signed by `signatureService.js` (uses configured strategy)
4. Document is recorded in history by `documentHistoryService.js`
5. Email is sent by `emailService.js` (if SMTP configured)

**Custom ACA Signer:** `AcaP12Signer` class in signatureService.js handles ACA's non-standard P12 format by trying multiple extraction approaches for certificate bags.

## TODO - Next Steps

### Immediate (to get crypto signing working on production)
1. [ ] Confirm .p12 file location on VPS (SSH in and find it)
2. [ ] Upload root + intermediate certs to VPS (for chain completeness)
3. [ ] Set `certificate_path` in production config to VPS path of .p12
4. [ ] Set `certificate_password` in production config
5. [ ] Generate a test minuta from recordplus.work
6. [ ] Download the signed PDF and verify in Adobe Reader

### For PDF Recipients (ARAG)
ARAG employees viewing signed PDFs need ACA root certificates trusted on their machines. Options:
- **EUTL update in Adobe Reader:** Preferences > Trust Manager > "Load trusted certificates from an Adobe EUTL server" > Update Now (ACA is on the EU Trusted List)
- **Manual install:** Download root certs from abogacia.es and install

## Useful Commands

### Inspect the .p12 certificate (requires password)
```bash
openssl pkcs12 -in "/Users/jo/ACA PLUS 23-07-25.p12" -nokeys -clcerts -passin pass:YOUR_PASSWORD | openssl x509 -noout -subject -issuer -dates
```

### Verify root cert is installed on Mac
```bash
security find-certificate -c "ACA ROOT" /Library/Keychains/System.keychain
```

### Verify intermediate certs on Mac
```bash
security find-certificate -c "ACA 1" /Library/Keychains/System.keychain
security find-certificate -c "ACA 2" /Library/Keychains/System.keychain
```

### Install certs on Ubuntu VPS (if needed)
```bash
# Copy .cer files to VPS trust store
sudo cp ACA_ROOTCA.CER /usr/local/share/ca-certificates/ACA_ROOTCA.crt
sudo cp ACA_SUB1CA.cer /usr/local/share/ca-certificates/ACA_SUB1CA.crt
sudo cp ACA_SUB2CA.cer /usr/local/share/ca-certificates/ACA_SUB2CA.crt
sudo update-ca-certificates
```

## Reference Links
- ACA certificate downloads: https://www.abogacia.es/site/acaplus/guias-y-software-de-instalacion/
- ACA documentation: https://documentacion.redabogacia.org/docushare/dsweb/View/Collection-1001
- Mac installation guide PDF: https://www.abogacia.es/wp-content/uploads/2014/12/InstalacionACA_Mac.pdf
- Adobe EUTL trust: Adobe Reader > Preferences > Trust Manager > Update Now
