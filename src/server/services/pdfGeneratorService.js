/**
 * PDF Generator Service
 * Generates minuta and suplido PDF documents for ARAG cases
 */
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";

export class PDFGeneratorService {
  constructor(documentsPath = "./data/documents") {
    this.documentsPath = documentsPath;
  }

  /**
   * Generate ARAG minuta PDF
   * @param {Object} caseData - Case information
   * @param {Object} config - Configuration (arag_base_fee, vat_rate)
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateMinuta(caseData, config) {
    const baseFee = parseFloat(config.arag_base_fee) || 203.0;
    const vatRate = parseFloat(config.vat_rate) || 21;
    const vatAmount = baseFee * (vatRate / 100);
    const total = baseFee + vatAmount;

    const year = new Date().getFullYear();
    const ref = caseData.internalReference || caseData.aragReference;
    const outputDir = join(this.documentsPath, year.toString(), ref);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `minuta_${Date.now()}.pdf`;
    const outputPath = join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("MINUTA DE HONORARIOS", { align: "center" });
      doc.moveDown(2);

      // Case details
      doc.fontSize(12).font("Helvetica");
      doc.text(`Cliente: ${caseData.clientName}`);
      doc.text(`Referencia ARAG: ${caseData.aragReference}`);
      doc.text(`Referencia Interna: ${caseData.internalReference}`);
      doc.text(`Fecha: ${this.formatDate(new Date())}`);
      doc.moveDown(2);

      // Fee breakdown table header
      doc.font("Helvetica-Bold");
      doc.text("CONCEPTO", 50, doc.y);
      doc.text("IMPORTE", 450, doc.y - 14, { align: "right" });
      doc.moveDown();

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Fee items
      doc.font("Helvetica");
      doc.text("Honorarios profesionales", 50, doc.y);
      doc.text(this.formatCurrency(baseFee), 450, doc.y - 14, {
        align: "right",
      });
      doc.moveDown();

      doc.text(`IVA (${vatRate}%)`, 50, doc.y);
      doc.text(this.formatCurrency(vatAmount), 450, doc.y - 14, {
        align: "right",
      });
      doc.moveDown();

      // Total separator
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Total
      doc.font("Helvetica-Bold");
      doc.text("TOTAL", 50, doc.y);
      doc.text(this.formatCurrency(total), 450, doc.y - 14, { align: "right" });

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  }

  /**
   * Generate suplido (mileage expense) PDF
   * @param {Object} caseData - Case information
   * @param {string} district - Judicial district
   * @param {number} amount - Mileage amount
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateSuplido(caseData, district, amount) {
    const year = new Date().getFullYear();
    const ref = caseData.internalReference || caseData.aragReference;
    const outputDir = join(this.documentsPath, year.toString(), ref);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `suplido_${district.toLowerCase().replace(/[^a-z]/g, "_")}_${Date.now()}.pdf`;
    const outputPath = join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SUPLIDO POR DESPLAZAMIENTO", { align: "center" });
      doc.moveDown(2);

      // Case details
      doc.fontSize(12).font("Helvetica");
      doc.text(`Cliente: ${caseData.clientName}`);
      doc.text(`Referencia ARAG: ${caseData.aragReference}`);
      doc.text(`Referencia Interna: ${caseData.internalReference}`);
      doc.text(`Fecha: ${this.formatDate(new Date())}`);
      doc.moveDown(2);

      // Mileage details
      doc.text(`Partido Judicial: ${district}`);
      doc.moveDown();

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Amount
      doc.font("Helvetica-Bold");
      doc.text("Importe por desplazamiento:", 50, doc.y);
      doc.text(this.formatCurrency(amount), 450, doc.y - 14, {
        align: "right",
      });

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  }

  /**
   * Generate Hoja de Encargo (Engagement Letter) PDF for Particular cases
   * @param {Object} caseData - Case information
   * @param {Object} hojaData - Hoja de Encargo specific data
   * @param {string} hojaData.services - Services description
   * @param {number} hojaData.fees - Professional fees amount
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateHojaEncargo(caseData, hojaData) {
    const { services, fees } = hojaData;

    const year = new Date().getFullYear();
    const ref = caseData.internal_reference || caseData.internalReference;
    const outputDir = join(this.documentsPath, year.toString(), ref);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `hoja_encargo_${Date.now()}.pdf`;
    const outputPath = join(outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("HOJA DE ENCARGO PROFESIONAL", { align: "center" });
      doc.moveDown(2);

      // Client details
      const clientName = caseData.client_name || caseData.clientName;
      const reference = caseData.internal_reference || caseData.internalReference;

      doc.fontSize(12).font("Helvetica");
      doc.text(`Cliente: ${clientName}`);
      doc.text(`Referencia: ${reference}`);
      doc.text(`Fecha: ${this.formatDate(new Date())}`);
      doc.moveDown(2);

      // Services section
      doc.font("Helvetica-Bold").text("SERVICIOS CONTRATADOS:");
      doc.moveDown(0.5);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font("Helvetica").text(services, {
        width: 500,
        align: "left",
      });
      doc.moveDown(2);

      // Fees section
      doc.font("Helvetica-Bold").text("HONORARIOS PROFESIONALES:");
      doc.moveDown(0.5);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font("Helvetica");
      doc.text("Importe acordado:", 50, doc.y);
      doc.text(this.formatCurrency(fees), 450, doc.y - 14, { align: "right" });
      doc.moveDown(2);

      // Terms section
      doc.font("Helvetica-Bold").text("CONDICIONES:");
      doc.moveDown(0.5);

      doc.font("Helvetica").fontSize(10);
      doc.text(
        "El cliente acepta los términos y condiciones del presente encargo profesional. " +
        "Los honorarios indicados no incluyen suplidos ni gastos judiciales que pudieran derivarse. " +
        "El presente documento tiene validez como acuerdo de servicios entre las partes.",
        { width: 500 }
      );
      doc.moveDown(3);

      // Signature lines
      doc.fontSize(12);
      doc.text("_______________________________", 50, doc.y);
      doc.text("_______________________________", 300, doc.y - 14);
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text("Firma del Cliente", 80, doc.y);
      doc.text("Firma del Abogado", 340, doc.y - 12);

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  }

  /**
   * Format date in Spanish format (DD/MM/YYYY)
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  /**
   * Format currency in Spanish locale (€ symbol, comma decimal)
   * @param {number} amount
   * @returns {string}
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }
}
