/**
 * Digital Signature Service
 *
 * Uses Strategy Pattern to support both visual and cryptographic signatures.
 *
 * Current Implementation (Phase 2):
 * - VisualSignatureStrategy: Adds visual "Documento firmado digitalmente" box (default)
 * - CryptoSignatureStrategy: Placeholder for P12 certificate signing (Phase 4)
 *
 * To enable cryptographic signatures:
 * 1. Install packages: npm install @signpdf/signpdf @signpdf/signer-p12 @signpdf/placeholder-pdf-lib node-forge
 * 2. Configure certificate_path and certificate_password in Configuration
 * 3. Service auto-selects CryptoSignatureStrategy when certificate is configured
 *
 * @see SIGNATURE_UPGRADE.md for detailed upgrade instructions
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, rgb } from "pdf-lib";

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
// CRYPTOGRAPHIC SIGNATURE STRATEGY (Phase 4 - Placeholder)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cryptographic signature using P12/PKCS12 certificate
 *
 * PHASE 4 IMPLEMENTATION:
 * Requires installation of:
 * - @signpdf/signpdf
 * - @signpdf/signer-p12
 * - @signpdf/placeholder-pdf-lib
 * - node-forge
 *
 * Implementation steps:
 * 1. Add signature placeholder to PDF using pdflibAddPlaceholder
 * 2. Create P12Signer with certificate and password
 * 3. Sign PDF with signpdf.sign()
 * 4. Return signed PDF buffer
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
   * @throws {Error} If certificate not configured or signing fails
   */
  async sign(pdfBuffer) {
    // Phase 4 implementation - uncomment when packages are installed:
    //
    // import signpdf from '@signpdf/signpdf';
    // import { P12Signer } from '@signpdf/signer-p12';
    // import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
    //
    // // Load certificate
    // const certBuffer = readFileSync(this.certificatePath);
    //
    // // Load and prepare PDF
    // const pdfDoc = await PDFDocument.load(pdfBuffer);
    //
    // // Add signature placeholder
    // pdflibAddPlaceholder({
    //   pdfDoc,
    //   reason: 'Factura ARAG - Firma Digital',
    //   contactInfo: 'despacho@example.com',
    //   name: 'Despacho de Abogados',
    //   location: 'Málaga, España',
    // });
    //
    // // Create signer
    // const signer = new P12Signer(certBuffer, {
    //   passphrase: this.certificatePassword,
    // });
    //
    // // Sign PDF
    // const signedPdf = await signpdf.sign(await pdfDoc.save(), signer);
    // return signedPdf;

    throw new Error(
      "Firma criptográfica no disponible. " +
      "Configure el certificado .p12 en la página de Configuración. " +
      "Consulte SIGNATURE_UPGRADE.md para más información."
    );
  }

  getInfo() {
    return {
      type: "cryptographic",
      details: `Firma criptográfica P12 (${this.certificatePath})`,
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
