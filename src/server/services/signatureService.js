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
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { writeFile, readFile, mkdtemp, rm } from "fs/promises";
import { dirname, join, extname } from "path";
import { tmpdir } from "os";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { PDFDocument, rgb } from "pdf-lib";
import signpdfModule from "@signpdf/signpdf";
// Handle ESM/CJS interop - the package exports a SignPdf instance as default
const signpdf = signpdfModule.default || signpdfModule;
import { Signer } from "@signpdf/utils";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import forge from "node-forge";
import * as asn1js from "asn1js";

const execFile = promisify(execFileCb);

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM ACA P12 SIGNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom P12 Signer for ACA (Abogacía) certificates
 *
 * The standard @signpdf/signer-p12 assumes certBag[i].cert is always populated,
 * but ACA certificates may store certificate data in ASN1 format instead.
 * This custom signer handles multiple P12 formats.
 */
class AcaP12Signer extends Signer {
  /**
   * @param {Buffer} p12Buffer - P12 certificate file contents
   * @param {{ passphrase?: string }} options - Signer options
   */
  constructor(p12Buffer, options = {}) {
    super();
    this.p12Buffer = p12Buffer;
    this.passphrase = options.passphrase || "";
    this.caCertBuffers = options.caCertBuffers || [];
  }

  /**
   * Extract certificate from P12 bag, handling various formats
   * @param {Object} bag - Certificate bag from forge
   * @returns {Object|null} - Certificate object or null
   */
  static extractCertFromBag(bag) {
    if (bag.cert) {
      return bag.cert;
    }
    if (bag.asn1) {
      try {
        return forge.pki.certificateFromAsn1(bag.asn1);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Sign PDF buffer using P12 certificate
   * @param {Buffer} pdfBuffer - PDF to sign
   * @param {Date} [signingTime] - Optional signing timestamp
   * @returns {Promise<Buffer>} - Signed PDF
   */
  async sign(pdfBuffer, signingTime = undefined) {
    // Parse P12 file
    const p12Der = forge.util.createBuffer(this.p12Buffer.toString("binary"));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, this.passphrase);

    // Extract private key
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag];

    if (!keyBags || keyBags.length === 0) {
      throw new Error("No se encontró la clave privada en el certificado P12.");
    }
    const privateKey = keyBags[0].key;

    // Extract certificates using multiple approaches for ACA compatibility
    const certBags = p12.getBags({
      bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag];

    const certificates = [];
    let signingCert = null;

    // Process cert bags
    if (certBags && certBags.length > 0) {
      for (const bag of certBags) {
        const cert = AcaP12Signer.extractCertFromBag(bag);
        if (cert) {
          certificates.push(cert);
          // Find the certificate that matches the private key
          if (
            cert.publicKey &&
            privateKey.n.compareTo(cert.publicKey.n) === 0 &&
            privateKey.e.compareTo(cert.publicKey.e) === 0
          ) {
            signingCert = cert;
          }
        }
      }
    }

    // Fallback: try safeContents for non-standard P12
    if (!signingCert) {
      try {
        const safeContents = p12.safeContents;
        if (safeContents) {
          for (const safeContent of safeContents) {
            if (safeContent.safeBags) {
              for (const safeBag of safeContent.safeBags) {
                const cert = AcaP12Signer.extractCertFromBag(safeBag);
                if (cert && !certificates.includes(cert)) {
                  certificates.push(cert);
                  if (
                    cert.publicKey &&
                    privateKey.n.compareTo(cert.publicKey.n) === 0 &&
                    privateKey.e.compareTo(cert.publicKey.e) === 0
                  ) {
                    signingCert = cert;
                  }
                }
              }
            }
          }
        }
      } catch {
        // Safe contents access failed
      }
    }

    if (!signingCert) {
      throw new Error(
        "No se encontró un certificado que coincida con la clave privada. " +
          "El formato del certificado ACA puede requerir configuración adicional."
      );
    }

    // Convert extracted key and certificates to PEM for OpenSSL
    const keyPem = forge.pki.privateKeyToPem(privateKey);
    const certPem = forge.pki.certificateToPem(signingCert);

    // Build CA chain PEM from caCertBuffers (DER or PEM .cer/.crt files)
    let chainPem = "";
    for (const caBuf of this.caCertBuffers) {
      const str = caBuf.toString("utf8").trim();
      if (str.startsWith("-----BEGIN")) {
        chainPem += str + "\n";
      } else {
        // DER → PEM conversion
        chainPem +=
          "-----BEGIN CERTIFICATE-----\n" +
          caBuf.toString("base64").match(/.{1,64}/g).join("\n") +
          "\n-----END CERTIFICATE-----\n";
      }
    }

    // Also include P12-embedded certificates (other than the signing cert)
    for (const cert of certificates) {
      if (cert !== signingCert) {
        chainPem += forge.pki.certificateToPem(cert) + "\n";
      }
    }

    // Write temp files and call OpenSSL
    const tmpDir = await mkdtemp(join(tmpdir(), "pdf-sign-"));
    try {
      const keyPath = join(tmpDir, "key.pem");
      const certPath = join(tmpDir, "cert.pem");
      const chainPath = join(tmpDir, "chain.pem");
      const dataPath = join(tmpDir, "data.bin");
      const sigPath = join(tmpDir, "sig.der");

      await Promise.all([
        writeFile(keyPath, keyPem, { mode: 0o600 }),
        writeFile(certPath, certPem),
        writeFile(dataPath, pdfBuffer),
        ...(chainPem.trim() ? [writeFile(chainPath, chainPem)] : []),
      ]);

      // Call OpenSSL to create CMS signature
      const args = [
        "cms",
        "-sign",
        "-binary",
        "-nodetach",
        "-md",
        "sha256",
        "-signer",
        certPath,
        "-inkey",
        keyPath,
        "-in",
        dataPath,
        "-outform",
        "DER",
        "-out",
        sigPath,
      ];

      // Add chain certificates if available
      if (chainPem.trim()) {
        args.push("-certfile", chainPath);
      }

      try {
        await execFile("openssl", args);
      } catch (err) {
        if (err.code === "ENOENT") {
          throw new Error(
            "OpenSSL no está instalado en el sistema. " +
              "Es necesario para la firma criptográfica de documentos."
          );
        }
        throw new Error(
          `Error de OpenSSL al firmar: ${err.stderr || err.message}`
        );
      }

      // Read the attached CMS and convert to detached
      const attachedDer = await readFile(sigPath);
      return AcaP12Signer.makeDetached(attachedDer);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Convert attached CMS/PKCS#7 to detached by removing eContent.
   *
   * OpenSSL produces attached CMS (data embedded). PDF adbe.pkcs7.detached
   * requires eContent absent. We parse the DER, strip the embedded content,
   * and re-encode.
   *
   * @param {Buffer} attachedDer - DER-encoded attached CMS
   * @returns {Buffer} DER-encoded detached CMS
   */
  static makeDetached(attachedDer) {
    const asn1 = asn1js.fromBER(new Uint8Array(attachedDer).buffer);
    if (asn1.offset === -1) {
      throw new Error("Failed to parse CMS DER structure");
    }

    // ContentInfo > [0] content > SignedData
    const contentInfo = asn1.result;
    const signedData = contentInfo.valueBlock.value[1].valueBlock.value[0];

    // Find encapContentInfo inside SignedData
    // SignedData: version, digestAlgorithms, encapContentInfo, [0]certificates, signerInfos
    const sdValues = signedData.valueBlock.value;

    for (const item of sdValues) {
      // encapContentInfo is a SEQUENCE containing eContentType OID
      // and optionally [0] EXPLICIT eContent
      if (
        item.constructor.name === "Sequence" ||
        (item.idBlock && item.idBlock.tagClass === 1 && item.idBlock.tagNumber === 16)
      ) {
        const seqValues = item.valueBlock?.value;
        if (!seqValues || seqValues.length < 1) continue;

        // Check if first element is an OID (eContentType)
        const first = seqValues[0];
        if (
          first.idBlock &&
          first.idBlock.tagClass === 1 &&
          first.idBlock.tagNumber === 6
        ) {
          // This is encapContentInfo. Remove [0] eContent if present.
          if (seqValues.length > 1) {
            seqValues.splice(1, seqValues.length - 1);
          }
          break;
        }
      }
    }

    // Re-encode to DER
    const derOut = asn1.result.toBER(false);
    return Buffer.from(derOut);
  }
}

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
    this.certificatePath = certificatePath?.trim() || "";
    this.certificatePassword = certificatePassword || "";
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

    // ═══════════════════════════════════════════════════════════════════════════
    // ADD VISUAL SIGNATURE BOX ON LAST PAGE
    // This provides immediate visual confirmation that the document is signed,
    // complementing the invisible cryptographic signature.
    // ═══════════════════════════════════════════════════════════════════════════
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    const signatureY = 40;
    const signatureX = 50;
    const boxWidth = 280;
    const boxHeight = 45;

    // Draw signature box with light green background
    lastPage.drawRectangle({
      x: signatureX,
      y: signatureY - 5,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0.3, 0.5, 0.3),
      borderWidth: 1,
      color: rgb(0.95, 0.98, 0.95),
    });

    // Signer name from certificate
    const signerName = certInfo.cn || "Firmante";
    lastPage.drawText(`Firmado digitalmente por: ${signerName}`, {
      x: signatureX + 8,
      y: signatureY + 22,
      size: 9,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Signing date/time
    const signatureDate = new Date().toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    lastPage.drawText(`Fecha de firma: ${signatureDate}`, {
      x: signatureX + 8,
      y: signatureY + 8,
      size: 8,
      color: rgb(0.4, 0.4, 0.4),
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ADD CRYPTOGRAPHIC SIGNATURE PLACEHOLDER
    // ═══════════════════════════════════════════════════════════════════════════

    // Add signature placeholder with certificate metadata
    // signatureLength must be large enough for PKCS#7 + all CA chain certs
    pdflibAddPlaceholder({
      pdfDoc,
      reason: "Factura ARAG - Firma Digital ACA",
      contactInfo: certInfo.cn || "Abogado",
      name: certInfo.cn || "Firmante",
      location: "Málaga, España",
      signatureLength: 16384,
    });

    // Load CA chain certificates from the same directory as the P12
    const caCertBuffers = [];
    try {
      const certDir = dirname(this.certificatePath);
      const files = readdirSync(certDir);
      for (const file of files) {
        const ext = extname(file).toLowerCase();
        if (ext === ".cer" || ext === ".crt" || ext === ".pem") {
          caCertBuffers.push(readFileSync(join(certDir, file)));
        }
      }
    } catch {
      // If directory read fails, continue without CA certs
    }

    // Create signer with P12 certificate using ACA-compatible signer
    let signer;
    try {
      signer = new AcaP12Signer(certBuffer, {
        passphrase: this.certificatePassword,
        caCertBuffers,
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
export {
  SignatureStrategy,
  VisualSignatureStrategy,
  CryptoSignatureStrategy,
  AcaP12Signer,
};
