/**
 * Digital Signature Service
 *
 * Uses Strategy Pattern to support both visual and cryptographic signatures.
 *
 * Implementation:
 * - VisualSignatureStrategy: Adds visual "Documento firmado digitalmente" box (default)
 * - CryptoSignatureStrategy: P12 certificate signing with ACA (Abogacía) certificates
 *
 * To enable cryptographic signatures:
 * 1. Configure certificate_path and certificate_password in Configuration
 * 2. Service auto-selects CryptoSignatureStrategy when certificate is configured
 *
 * @see SIGNATURE_UPGRADE.md for detailed upgrade instructions
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, rgb } from "pdf-lib";
import signpdfModule from "@signpdf/signpdf";
// Handle ESM/CJS interop - the package exports a SignPdf instance as default
const signpdf = signpdfModule.default || signpdfModule;
import { P12Signer } from "@signpdf/signer-p12";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import forge from "node-forge";

// ═══════════════════════════════════════════════════════════════════════════
// SIGNATURE STRATEGY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base class for signature strategies
 * @abstract
 */
class SignatureStrategy {
  /**
   * Sign a PDF buffer
   * @param {Buffer} pdfBuffer - PDF file contents
   * @returns {Promise<Buffer>} Signed PDF contents
   * @abstract
   */
  async sign(pdfBuffer) {
    throw new Error("sign() must be implemented by subclass");
  }

  /**
   * Get information about this signature strategy
   * @returns {{ type: 'visual' | 'cryptographic', details: string }}
   */
  getInfo() {
    return { type: "unknown", details: "Unknown signature strategy" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VISUAL SIGNATURE STRATEGY (Current Implementation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Visual signature - adds text box indicator
 * This is NOT a cryptographic signature, just a visual indicator.
 */
class VisualSignatureStrategy extends SignatureStrategy {
  /**
   * Add visual signature box to PDF
   * @param {Buffer} pdfBuffer - PDF file contents
   * @returns {Promise<Buffer>} PDF with visual signature added
   */
  async sign(pdfBuffer) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Get the last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    // Add signature box at bottom
    const signatureY = 40;
    const signatureX = 50;

    // Draw signature border
    lastPage.drawRectangle({
      x: signatureX,
      y: signatureY - 5,
      width: 250,
      height: 35,
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 0.5,
    });

    // Add signature text
    lastPage.drawText("Documento firmado digitalmente", {
      x: signatureX + 5,
      y: signatureY + 15,
      size: 8,
      color: rgb(0.3, 0.3, 0.3),
    });

    const signatureDate = new Date().toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    lastPage.drawText(`Fecha de firma: ${signatureDate}`, {
      x: signatureX + 5,
      y: signatureY + 3,
      size: 8,
      color: rgb(0.3, 0.3, 0.3),
    });

    return await pdfDoc.save();
  }

  getInfo() {
    return {
      type: "visual",
      details: "Firma visual (indicador de texto, no criptográfica)",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC SIGNATURE STRATEGY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cryptographic signature using P12/PKCS12 certificate (ACA, FNMT, etc.)
 *
 * Creates legally valid digital signatures compliant with eIDAS (EU 910/2014).
 * Supports ACA (Autoridad de Certificación de la Abogacía) certificates.
 */
class CryptoSignatureStrategy extends SignatureStrategy {
  constructor(certificatePath, certificatePassword) {
    super();
    this.certificatePath = certificatePath;
    this.certificatePassword = certificatePassword;
  }

  /**
   * Sign PDF with cryptographic certificate
   * @param {Buffer} pdfBuffer - PDF file contents
   * @returns {Promise<Buffer>} Cryptographically signed PDF
   * @throws {Error} If certificate not found, password incorrect, or signing fails
   */
  async sign(pdfBuffer) {
    // Validate certificate file exists
    if (!existsSync(this.certificatePath)) {
      throw new Error(
        `Certificado no encontrado: ${this.certificatePath}. ` +
          "Verifique la ruta del certificado en Configuración."
      );
    }

    // Load certificate
    let certBuffer;
    try {
      certBuffer = readFileSync(this.certificatePath);
    } catch (err) {
      throw new Error(
        `Error al leer el certificado: ${err.message}. ` +
          "Verifique los permisos del archivo."
      );
    }

    // Load and prepare PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Get certificate info for signature metadata
    let certInfo;
    try {
      certInfo = await CryptoSignatureStrategy.getCertificateInfo(
        this.certificatePath,
        this.certificatePassword
      );
    } catch (err) {
      // Re-throw with Spanish message
      if (err.message.includes("contraseña")) {
        throw err;
      }
      throw new Error(`Error al leer información del certificado: ${err.message}`);
    }

    // Add signature placeholder with certificate metadata
    pdflibAddPlaceholder({
      pdfDoc,
      reason: "Factura ARAG - Firma Digital ACA",
      contactInfo: certInfo.cn || "Abogado",
      name: certInfo.cn || "Firmante",
      location: "Málaga, España",
    });

    // Create signer with P12 certificate
    let signer;
    try {
      signer = new P12Signer(certBuffer, {
        passphrase: this.certificatePassword,
      });
    } catch (err) {
      if (
        err.message.includes("MAC") ||
        err.message.includes("password") ||
        err.message.includes("decrypt")
      ) {
        throw new Error(
          "Contraseña del certificado incorrecta. " +
            "Verifique la contraseña en Configuración."
        );
      }
      throw new Error(`Error al procesar el certificado: ${err.message}`);
    }

    // Sign PDF
    try {
      const pdfWithPlaceholder = await pdfDoc.save();
      const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);
      return Buffer.from(signedPdf);
    } catch (err) {
      if (
        err.message.includes("MAC") ||
        err.message.includes("password") ||
        err.message.includes("decrypt")
      ) {
        throw new Error(
          "Contraseña del certificado incorrecta. " +
            "Verifique la contraseña en Configuración."
        );
      }
      throw new Error(`Error al firmar el documento: ${err.message}`);
    }
  }

  getInfo() {
    return {
      type: "cryptographic",
      details: `Firma criptográfica P12 (${this.certificatePath})`,
    };
  }

  /**
   * Extract certificate information from P12 file
   * @param {string} certificatePath - Path to .p12/.pfx file
   * @param {string} password - Certificate password
   * @returns {Promise<Object>} Certificate info (cn, issuer, organization, validFrom, validTo, isExpired)
   * @throws {Error} If certificate cannot be read or password is incorrect
   */
  static async getCertificateInfo(certificatePath, password) {
    // Validate file exists
    if (!existsSync(certificatePath)) {
      throw new Error(`Certificado no encontrado: ${certificatePath}`);
    }

    // Read certificate file
    const p12Buffer = readFileSync(certificatePath);
    const p12Der = forge.util.decode64(p12Buffer.toString("base64"));
    const p12Asn1 = forge.asn1.fromDer(p12Der);

    // Parse P12
    let p12;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch (err) {
      if (
        err.message.includes("MAC") ||
        err.message.includes("Invalid password") ||
        err.message.includes("decrypt")
      ) {
        throw new Error(
          "Contraseña del certificado incorrecta. " +
            "Verifique la contraseña introducida."
        );
      }
      throw new Error(`Error al leer el certificado P12: ${err.message}`);
    }

    // Extract certificate from bags - try multiple approaches for different P12 formats
    // ACA certificates may store certs differently than standard P12 files
    let cert = null;

    // Approach 1: Standard certBag extraction
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];

    if (certBag && certBag.length > 0) {
      // Try direct cert property first
      if (certBag[0].cert) {
        cert = certBag[0].cert;
      } else if (certBag[0].asn1) {
        // Some P12 files have ASN1 that needs conversion
        try {
          cert = forge.pki.certificateFromAsn1(certBag[0].asn1);
        } catch {
          // ASN1 conversion failed, try next approach
        }
      }
    }

    // Approach 2: Try getting all bags and find certificate
    if (!cert) {
      const allBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      for (const bagType in allBags) {
        const bags = allBags[bagType];
        if (Array.isArray(bags)) {
          for (const bag of bags) {
            if (bag.cert) {
              cert = bag.cert;
              break;
            }
            if (bag.asn1) {
              try {
                cert = forge.pki.certificateFromAsn1(bag.asn1);
                break;
              } catch {
                // Continue to next bag
              }
            }
          }
        }
        if (cert) break;
      }
    }

    // Approach 3: Try to get safe bags directly (for non-standard P12)
    if (!cert) {
      try {
        const safeContents = p12.safeContents;
        if (safeContents) {
          for (const safeContent of safeContents) {
            if (safeContent.safeBags) {
              for (const safeBag of safeContent.safeBags) {
                if (safeBag.cert) {
                  cert = safeBag.cert;
                  break;
                }
                if (safeBag.type === forge.pki.oids.certBag && safeBag.asn1) {
                  try {
                    cert = forge.pki.certificateFromAsn1(safeBag.asn1);
                    break;
                  } catch {
                    // Continue
                  }
                }
              }
            }
            if (cert) break;
          }
        }
      } catch {
        // Safe contents access failed
      }
    }

    if (!cert) {
      throw new Error(
        "No se pudo extraer el certificado del archivo P12. " +
          "El formato del certificado ACA puede no ser compatible. " +
          "Verifique que el archivo .p12 es válido."
      );
    }

    // Extract subject fields
    const cnAttr = cert.subject.getField("CN");
    const orgAttr = cert.subject.getField("O");

    // Extract issuer fields
    const issuerCnAttr = cert.issuer.getField("CN");
    const issuerOrgAttr = cert.issuer.getField("O");

    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;
    const now = new Date();

    return {
      cn: cnAttr ? cnAttr.value : null,
      organization: orgAttr ? orgAttr.value : null,
      issuer: issuerCnAttr ? issuerCnAttr.value : issuerOrgAttr?.value || null,
      validFrom: validFrom,
      validTo: validTo,
      isExpired: now > validTo,
      isNotYetValid: now < validFrom,
      daysUntilExpiration: Math.ceil((validTo - now) / (1000 * 60 * 60 * 24)),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNATURE SERVICE (Main Export)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Signature Service
 *
 * Auto-selects signing strategy based on certificate configuration:
 * - If certificate_path is configured: Uses CryptoSignatureStrategy
 * - Otherwise: Uses VisualSignatureStrategy (default)
 */
export class SignatureService {
  /**
   * Create signature service
   * @param {string} certificatePath - Path to .p12/.pfx certificate (optional)
   * @param {string} certificatePassword - Certificate password (optional)
   */
  constructor(certificatePath, certificatePassword) {
    this.certificatePath = certificatePath;
    this.certificatePassword = certificatePassword;

    // Auto-select strategy based on certificate configuration
    if (certificatePath && certificatePath.trim() !== "") {
      this.strategy = new CryptoSignatureStrategy(
        certificatePath,
        certificatePassword
      );
    } else {
      this.strategy = new VisualSignatureStrategy();
    }
  }

  /**
   * Sign a PDF document
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<string>} Path to signed PDF
   */
  async signPDF(pdfPath) {
    const pdfBytes = readFileSync(pdfPath);
    const signedBytes = await this.strategy.sign(pdfBytes);

    // Save with _signed suffix
    const signedPath = pdfPath.replace(".pdf", "_signed.pdf");
    writeFileSync(signedPath, signedBytes);

    return signedPath;
  }

  /**
   * Get signature strategy information
   * @returns {{ type: 'visual' | 'cryptographic', details: string }}
   */
  getSignatureInfo() {
    return this.strategy.getInfo();
  }

  /**
   * Verify if certificate is valid and accessible
   * @returns {boolean}
   */
  verifyCertificate() {
    try {
      if (!this.certificatePath || this.certificatePath.trim() === "") {
        return false;
      }
      if (!existsSync(this.certificatePath)) {
        return false;
      }
      const certData = readFileSync(this.certificatePath);
      return certData.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if cryptographic signing is configured
   * @returns {boolean}
   */
  isCryptoConfigured() {
    return this.strategy instanceof CryptoSignatureStrategy && this.verifyCertificate();
  }
}

// Export strategies for testing
export { SignatureStrategy, VisualSignatureStrategy, CryptoSignatureStrategy };
