# Upgrading to Cryptographic PDF Signatures

This guide explains how to enable real cryptographic PDF signatures in Record+.

## Current Status

**Visual Signature (Default)**
- Adds a text box at the bottom of PDFs: "Documento firmado digitalmente"
- Includes timestamp
- NOT a cryptographic signature - just visual indicator
- Legal validity may be limited

**Cryptographic Signature (Phase 4)**
- Uses PKCS#12 (.p12/.pfx) certificate
- Creates legally valid digital signature
- Verifiable in Adobe Reader and other PDF viewers
- Requires obtaining a certificate from CA or FNMT

## Prerequisites

### 1. Obtain a Digital Certificate

You need a .p12 or .pfx certificate file. Options:

**Spanish FNMT Certificate (Recommended for Spain)**
- Request from: https://www.sede.fnmt.gob.es/
- Requires Spanish DNI/NIE
- Free for individuals

**Other Certificate Authorities**
- DigiCert
- GlobalSign
- Sectigo
- Any CA that issues code signing or document signing certificates

### 2. Install Required Packages

```bash
npm install @signpdf/signpdf @signpdf/signer-p12 @signpdf/placeholder-pdf-lib node-forge
```

## Configuration Steps

### 1. Upload Certificate

Place your .p12/.pfx certificate file in a secure location on the server:

```bash
# Create certificates directory
mkdir -p /home/appuser/data/certificates

# Copy your certificate (example)
cp /path/to/your/certificate.p12 /home/appuser/data/certificates/firma.p12

# Secure permissions
chmod 600 /home/appuser/data/certificates/firma.p12
```

### 2. Configure in Application

Navigate to **Configuración** in the application and set:

- **Ruta del Certificado**: `/home/appuser/data/certificates/firma.p12`
- **Contraseña del Certificado**: Your certificate password

Click **Guardar Configuración**.

### 3. Verify Configuration

The application will automatically switch to cryptographic signatures when:
1. Certificate path is configured (non-empty)
2. Certificate file exists and is readable

You can verify by generating a test document and checking the signature in Adobe Reader.

## Implementation Details

### Strategy Pattern

The SignatureService uses a strategy pattern:

```javascript
// Auto-selects strategy based on certificate configuration
if (certificatePath && certificatePath.trim() !== '') {
  this.strategy = new CryptoSignatureStrategy(certificatePath, certificatePassword);
} else {
  this.strategy = new VisualSignatureStrategy();
}
```

### CryptoSignatureStrategy Implementation

The `CryptoSignatureStrategy` class in `src/server/services/signatureService.js` contains commented placeholder code showing the implementation:

```javascript
async sign(pdfBuffer) {
  // Load certificate
  const certBuffer = readFileSync(this.certificatePath);

  // Load and prepare PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Add signature placeholder
  pdflibAddPlaceholder({
    pdfDoc,
    reason: 'Factura ARAG - Firma Digital',
    contactInfo: 'despacho@example.com',
    name: 'Despacho de Abogados',
    location: 'Málaga, España',
  });

  // Create signer
  const signer = new P12Signer(certBuffer, {
    passphrase: this.certificatePassword,
  });

  // Sign PDF
  return await signpdf.sign(await pdfDoc.save(), signer);
}
```

## Troubleshooting

### "Firma criptográfica no disponible" Error

This means:
1. Packages are not installed (`npm install @signpdf/signpdf ...`)
2. Or the sign() method throws because implementation is not yet enabled

**Solution**: Uncomment the implementation in `CryptoSignatureStrategy.sign()` after installing packages.

### Certificate Password Incorrect

Error: "PKCS#12 MAC could not be verified"

**Solution**: Verify the certificate password is correct.

### Certificate Expired

Error: "Certificate has expired"

**Solution**: Renew your certificate with the issuing CA.

### Signature Not Showing in Adobe

- Ensure the PDF is not modified after signing
- Check Adobe Reader trust settings
- Verify certificate chain is complete

## Security Considerations

1. **Never commit certificates to git** - Add `*.p12` and `*.pfx` to .gitignore
2. **Secure file permissions** - `chmod 600` on certificate files
3. **Use strong passwords** - Certificate passwords should be complex
4. **Backup certificates** - Store backups in secure location
5. **Monitor expiration** - Set reminders for certificate renewal

## Fallback Behavior

If cryptographic signing fails for any reason (missing certificate, wrong password, etc.):
- The application will throw an error
- Documents will NOT be signed
- Visual signature will NOT be used as fallback (to avoid confusion)

To use visual signature, clear the certificate path in Configuration.
