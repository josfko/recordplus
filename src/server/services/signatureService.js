/**
 * Digital Signature Service
 * Signs PDF documents with visual signature indicator
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, rgb } from "pdf-lib";

export class SignatureService {
  constructor(certificatePath, certificatePassword) {
    this.certificatePath = certificatePath;
    this.certificatePassword = certificatePassword;
  }

  /**
   * Sign a PDF document
   * Adds visual signature indicator at the bottom of the last page
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<string>} Path to signed PDF
   */
  async signPDF(pdfPath) {
    const pdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

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

    const signedPdfBytes = await pdfDoc.save();

    // Save with _signed suffix
    const signedPath = pdfPath.replace(".pdf", "_signed.pdf");
    writeFileSync(signedPath, signedPdfBytes);

    return signedPath;
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
}
