# Cryptographic PDF Signatures with ACA Certificate

This guide explains how to configure cryptographic PDF signatures in Record+ using your ACA (Autoridad de Certificación de la Abogacía) certificate.

## Overview

Record+ supports two signature modes:

| Mode | Description | Legal Validity |
|------|-------------|----------------|
| **Visual** (default) | Text box: "Documento firmado digitalmente" | Limited |
| **Cryptographic** | P12/PKCS12 digital signature | Full (eIDAS compliant) |

When a certificate is configured, Record+ automatically uses cryptographic signatures.

## ACA Certificate (Recommended for Lawyers)

### What is ACA?

ACA (Autoridad de Certificación de la Abogacía) is the digital certificate authority for Spanish lawyers, operated by the Consejo General de la Abogacía Española.

**Two certificate types available:**

| Type | Format | Signature Level | Best For |
|------|--------|-----------------|----------|
| **ACA Software** | `.p12` file | Advanced | Invoices, general documents |
| **ACA Plus Cualificada** | Smart card | Qualified (= handwritten) | Court submissions |

For Record+ invoicing, the **ACA Software** certificate is sufficient and easier to integrate.

### Obtaining Your ACA Certificate

1. Log in to your Colegio de Abogados portal
2. Navigate to the ACA certificate section
3. Download your certificate as `.p12` format
4. **Important:** Remember your password - it's set during download and cannot be recovered

More info: https://www.abogacia.es/faq/acaplus/

## Configuration Steps

### 1. Upload Certificate to Server

```bash
# Create certificates directory (if not exists)
mkdir -p /home/appuser/data/certificates

# Upload your certificate (via SCP, SFTP, etc.)
scp your-certificate.p12 appuser@server:/home/appuser/data/certificates/firma.p12

# Secure permissions (important!)
chmod 600 /home/appuser/data/certificates/firma.p12
```

### 2. Configure in Application

1. Navigate to **Configuración** in Record+
2. In the "Certificado Digital ACA" section:
   - **Ruta del Certificado**: `/home/appuser/data/certificates/firma.p12`
   - **Contraseña del Certificado**: Your certificate password
3. Click **Probar Certificado** to verify
4. Click **Guardar Configuración**

### 3. Verify Configuration

After saving, the "Probar Certificado" button should show:
- Certificate holder name (CN)
- Organization
- Issuer
- Validity dates
- Days until expiration

If successful, all future documents (minutas, suplidos) will be cryptographically signed.

## Verifying Signatures

### In Adobe Reader

1. Open a signed PDF
2. Look for the signature panel (blue ribbon icon)
3. Click to see signature details
4. Should show: "Signed by [Your Name]" with certificate chain

### In Preview (macOS)

1. Open PDF
2. Go to Tools > Show Inspector > Signatures
3. View signature details

## Troubleshooting

### "Certificado no encontrado"

**Cause:** File path is incorrect or file doesn't exist

**Solution:**
```bash
# Verify file exists
ls -la /home/appuser/data/certificates/firma.p12

# Check permissions
stat /home/appuser/data/certificates/firma.p12
```

### "Contraseña del certificado incorrecta"

**Cause:** Wrong password entered

**Solution:**
- Verify the password used when downloading the certificate
- Passwords are case-sensitive
- If forgotten, you may need to revoke and request a new certificate

### "Certificate has expired"

**Cause:** ACA certificates are valid for 2-4 years

**Solution:**
1. Log in to your Colegio de Abogados portal
2. Renew your ACA certificate
3. Download the new `.p12` file
4. Update the certificate file on server
5. Update password in Configuration if changed

### Signature Not Trusted in Adobe

**Cause:** Adobe doesn't trust the ACA root certificate by default

**Solution:**
1. In Adobe Reader: Edit > Preferences > Signatures > Identities & Trusted Certificates
2. Click "More..." and import the ACA root certificate
3. Or configure Adobe to trust the European Trust List (EUTL)

## Security Best Practices

1. **Never commit certificates to git** - `.gitignore` already excludes `data/certificates/*`
2. **Secure file permissions** - Always `chmod 600` on certificate files
3. **Use strong passwords** - ACA password should be complex
4. **Backup certificates** - Store encrypted backup in secure location
5. **Monitor expiration** - Application shows days until expiration
6. **Limit access** - Only the application user should read the certificate file

## Certificate Expiration Warnings

Record+ shows warnings when:
- Certificate expires within 30 days (yellow warning)
- Certificate is expired (red error, signing will fail)

## Technical Details

### Signature Metadata

Each signed PDF includes:
- **Reason:** "Factura ARAG - Firma Digital ACA"
- **Location:** "Málaga, España"
- **Name:** Certificate CN (your name)
- **Timestamp:** Signing date/time

### Dependencies

```json
{
  "@signpdf/signpdf": "^3.x",
  "@signpdf/signer-p12": "^3.x",
  "@signpdf/placeholder-pdf-lib": "^3.x",
  "node-forge": "^1.x"
}
```

### Strategy Pattern

The `SignatureService` automatically selects the signing strategy:

```javascript
// If certificate configured → CryptoSignatureStrategy
// Otherwise → VisualSignatureStrategy (text box)
```

### Fallback Behavior

If cryptographic signing fails:
- An error is thrown
- Document is NOT signed
- Visual signature is NOT used as fallback (to avoid confusion)

To revert to visual signatures, clear the certificate path in Configuration.

## API Reference

### Test Certificate Endpoint

```
POST /api/config/test-certificate
Content-Type: application/json

{
  "path": "/home/appuser/data/certificates/firma.p12",
  "password": "your-password"
}
```

**Response (success):**
```json
{
  "valid": true,
  "cn": "NOMBRE APELLIDO APELLIDO",
  "organization": "COLEGIO DE ABOGADOS DE MALAGA",
  "issuer": "ACA",
  "validFrom": "2024-01-15T00:00:00.000Z",
  "validTo": "2026-01-15T23:59:59.000Z",
  "isExpired": false,
  "daysUntilExpiration": 714
}
```

**Response (error):**
```json
{
  "valid": false,
  "error": "Contraseña del certificado incorrecta"
}
```
