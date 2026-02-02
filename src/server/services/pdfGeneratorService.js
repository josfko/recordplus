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
   * Generate ARAG minuta PDF with professional layout
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
      const doc = new PDFDocument({ size: "A4", margin: 60 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const leftMargin = 60;
      const rightMargin = pageWidth - 60;
      const contentWidth = rightMargin - leftMargin;

      // ═══════════════════════════════════════════════════════════════
      // DOCUMENT HEADER
      // ═══════════════════════════════════════════════════════════════

      // Header box with title
      doc.rect(leftMargin, 50, contentWidth, 50)
         .fillColor('#2c3e50')
         .fill();

      doc.fillColor('#ffffff')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('MINUTA DE HONORARIOS', leftMargin, 65, {
           width: contentWidth,
           align: 'center'
         });

      doc.fillColor('#000000');
      doc.y = 120;

      // ═══════════════════════════════════════════════════════════════
      // CASE INFORMATION SECTION
      // ═══════════════════════════════════════════════════════════════

      // Section header
      this.drawSectionHeader(doc, 'DATOS DEL EXPEDIENTE', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      // Info grid (2 columns)
      const col1X = leftMargin + 10;
      const col2X = leftMargin + contentWidth / 2;
      let infoY = doc.y;

      doc.fontSize(10).font('Helvetica');

      // Left column
      doc.fillColor('#666666').text('Cliente:', col1X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(caseData.clientName, col1X + 70, infoY);

      infoY += 18;
      doc.font('Helvetica').fillColor('#666666').text('Ref. ARAG:', col1X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(caseData.aragReference, col1X + 70, infoY);

      // Right column
      infoY = doc.y - 36;
      doc.font('Helvetica').fillColor('#666666').text('Ref. Interna:', col2X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(caseData.internalReference, col2X + 80, infoY);

      infoY += 18;
      doc.font('Helvetica').fillColor('#666666').text('Fecha:', col2X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(this.formatDate(new Date()), col2X + 80, infoY);

      doc.fillColor('#000000');
      doc.y = infoY + 40;

      // ═══════════════════════════════════════════════════════════════
      // FEE BREAKDOWN TABLE
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'DESGLOSE DE HONORARIOS', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      const tableTop = doc.y;
      const tableLeft = leftMargin;
      const tableWidth = contentWidth;
      const colConcepto = tableLeft + 10;
      const colImporte = tableLeft + tableWidth - 100;

      // Table header row
      doc.rect(tableLeft, tableTop, tableWidth, 25)
         .fillColor('#f5f5f5')
         .fill();

      doc.fillColor('#333333')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('CONCEPTO', colConcepto, tableTop + 8)
         .text('IMPORTE', colImporte, tableTop + 8, { width: 90, align: 'right' });

      // Table rows
      let rowY = tableTop + 25;

      // Row 1: Base fee
      doc.rect(tableLeft, rowY, tableWidth, 28)
         .strokeColor('#e0e0e0')
         .stroke();
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica')
         .text('Honorarios profesionales por gestión de expediente ARAG', colConcepto, rowY + 9)
         .text(this.formatCurrency(baseFee), colImporte, rowY + 9, { width: 90, align: 'right' });

      rowY += 28;

      // Row 2: VAT
      doc.rect(tableLeft, rowY, tableWidth, 28)
         .strokeColor('#e0e0e0')
         .stroke();
      doc.text(`IVA (${vatRate}%)`, colConcepto, rowY + 9)
         .text(this.formatCurrency(vatAmount), colImporte, rowY + 9, { width: 90, align: 'right' });

      rowY += 28;

      // Total row (highlighted)
      doc.rect(tableLeft, rowY, tableWidth, 32)
         .fillColor('#2c3e50')
         .fill();
      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TOTAL A PERCIBIR', colConcepto, rowY + 10)
         .text(this.formatCurrency(total), colImporte, rowY + 10, { width: 90, align: 'right' });

      doc.fillColor('#000000');
      doc.y = rowY + 60;

      // ═══════════════════════════════════════════════════════════════
      // LEGAL NOTICE
      // ═══════════════════════════════════════════════════════════════

      doc.fontSize(8)
         .fillColor('#888888')
         .font('Helvetica')
         .text(
           'Documento generado electrónicamente. Los honorarios indicados corresponden a la tarifa fija establecida ' +
           'por el convenio con ARAG Seguros.',
           leftMargin, doc.y,
           { width: contentWidth, align: 'center' }
         );

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    });
  }

  /**
   * Generate suplido (mileage expense) PDF with professional layout
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
      const doc = new PDFDocument({ size: "A4", margin: 60 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const leftMargin = 60;
      const rightMargin = pageWidth - 60;
      const contentWidth = rightMargin - leftMargin;

      // ═══════════════════════════════════════════════════════════════
      // DOCUMENT HEADER
      // ═══════════════════════════════════════════════════════════════

      // Header box with title
      doc.rect(leftMargin, 50, contentWidth, 50)
         .fillColor('#1a5276')
         .fill();

      doc.fillColor('#ffffff')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('SUPLIDO POR DESPLAZAMIENTO', leftMargin, 65, {
           width: contentWidth,
           align: 'center'
         });

      doc.fillColor('#000000');
      doc.y = 120;

      // ═══════════════════════════════════════════════════════════════
      // CASE INFORMATION SECTION
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'DATOS DEL EXPEDIENTE', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      // Info grid (2 columns)
      const col1X = leftMargin + 10;
      const col2X = leftMargin + contentWidth / 2;
      let infoY = doc.y;

      doc.fontSize(10).font('Helvetica');

      // Left column
      doc.fillColor('#666666').text('Cliente:', col1X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(caseData.clientName, col1X + 70, infoY);

      infoY += 18;
      doc.font('Helvetica').fillColor('#666666').text('Ref. ARAG:', col1X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(caseData.aragReference, col1X + 70, infoY);

      // Right column
      infoY = doc.y - 36;
      doc.font('Helvetica').fillColor('#666666').text('Ref. Interna:', col2X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(caseData.internalReference, col2X + 80, infoY);

      infoY += 18;
      doc.font('Helvetica').fillColor('#666666').text('Fecha:', col2X, infoY);
      doc.fillColor('#000000').font('Helvetica-Bold')
         .text(this.formatDate(new Date()), col2X + 80, infoY);

      doc.fillColor('#000000');
      doc.y = infoY + 40;

      // ═══════════════════════════════════════════════════════════════
      // JUDICIAL DISTRICT - PROMINENTLY DISPLAYED
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'PARTIDO JUDICIAL', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      // District highlight box
      doc.rect(leftMargin, doc.y, contentWidth, 45)
         .fillColor('#e8f4f8')
         .fill();

      doc.rect(leftMargin, doc.y, contentWidth, 45)
         .strokeColor('#1a5276')
         .lineWidth(1)
         .stroke();

      doc.fillColor('#1a5276')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(district.toUpperCase(), leftMargin, doc.y + 14, {
           width: contentWidth,
           align: 'center'
         });

      doc.fillColor('#000000');
      doc.y += 65;

      // ═══════════════════════════════════════════════════════════════
      // MILEAGE AMOUNT - PROMINENTLY DISPLAYED
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'IMPORTE POR DESPLAZAMIENTO', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      // Amount highlight box
      doc.rect(leftMargin, doc.y, contentWidth, 60)
         .fillColor('#1a5276')
         .fill();

      doc.fillColor('#ffffff')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text(this.formatCurrency(amount), leftMargin, doc.y + 18, {
           width: contentWidth,
           align: 'center'
         });

      doc.fillColor('#000000');
      doc.y += 90;

      // ═══════════════════════════════════════════════════════════════
      // LEGAL NOTICE
      // ═══════════════════════════════════════════════════════════════

      doc.fontSize(8)
         .fillColor('#888888')
         .font('Helvetica')
         .text(
           'Documento generado electrónicamente. El importe corresponde a los gastos de desplazamiento ' +
           'según la tarifa configurada para el partido judicial indicado.',
           leftMargin, doc.y,
           { width: contentWidth, align: 'center' }
         );

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
      const doc = new PDFDocument({ size: "A4", margin: 60 });
      const stream = createWriteStream(outputPath);

      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const leftMargin = 60;
      const rightMargin = pageWidth - 60;
      const contentWidth = rightMargin - leftMargin;

      const clientName = caseData.client_name || caseData.clientName;
      const reference = caseData.internal_reference || caseData.internalReference;

      // ═══════════════════════════════════════════════════════════════
      // DOCUMENT HEADER
      // ═══════════════════════════════════════════════════════════════

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text('HOJA DE ENCARGO PROFESIONAL', leftMargin, 60, {
           width: contentWidth,
           align: 'center'
         });

      // Subtle underline
      doc.moveTo(leftMargin + contentWidth * 0.25, 85)
         .lineTo(leftMargin + contentWidth * 0.75, 85)
         .strokeColor('#cccccc')
         .lineWidth(0.5)
         .stroke();

      doc.fillColor('#000000');
      doc.y = 105;

      // ═══════════════════════════════════════════════════════════════
      // CLIENT INFORMATION SECTION
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'DATOS DEL CLIENTE', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      // Client info - simple layout
      const col1X = leftMargin;
      const col2X = leftMargin + contentWidth / 2;
      let infoY = doc.y;

      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('Cliente:', col1X, infoY);
      doc.fillColor('#1a1a1a').font('Helvetica-Bold');
      doc.text(clientName, col1X + 50, infoY, { width: contentWidth / 2 - 60 });

      doc.font('Helvetica').fillColor('#666666');
      doc.text('Referencia:', col2X, infoY);
      doc.fillColor('#1a1a1a').font('Helvetica-Bold');
      doc.text(reference, col2X + 70, infoY);

      infoY += 20;
      doc.font('Helvetica').fillColor('#666666');
      doc.text('Fecha:', col1X, infoY);
      doc.fillColor('#1a1a1a').font('Helvetica-Bold');
      doc.text(this.formatDate(new Date()), col1X + 50, infoY);

      doc.fillColor('#000000');
      doc.y = infoY + 35;

      // ═══════════════════════════════════════════════════════════════
      // SERVICES SECTION
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'SERVICIOS PROFESIONALES CONTRATADOS', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#333333')
         .text(services, leftMargin, doc.y, {
           width: contentWidth,
           align: 'justify',
           lineGap: 4
         });

      doc.moveDown(2);

      // ═══════════════════════════════════════════════════════════════
      // FEES SECTION
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'HONORARIOS PROFESIONALES', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Importe total acordado:', leftMargin, doc.y);

      doc.font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text(this.formatCurrency(fees), leftMargin + 130, doc.y - 12);

      doc.moveDown(2);

      // ═══════════════════════════════════════════════════════════════
      // TERMS & CONDITIONS
      // ═══════════════════════════════════════════════════════════════

      this.drawSectionHeader(doc, 'CONDICIONES GENERALES', leftMargin, doc.y, contentWidth);
      doc.moveDown(0.8);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#6c757d')
         .text(
           '1. El cliente acepta expresamente los términos del presente encargo profesional y autoriza ' +
           'al abogado a actuar en su nombre y representación en el asunto objeto del encargo.',
           leftMargin, doc.y,
           { width: contentWidth, align: 'justify', lineGap: 3 }
         );

      doc.moveDown(0.6);
      doc.text(
        '2. Los honorarios indicados no incluyen suplidos, tasas judiciales ni gastos de terceros ' +
        'que pudieran derivarse de la tramitación del asunto.',
        { width: contentWidth, align: 'justify', lineGap: 3 }
      );

      doc.moveDown(0.6);
      doc.text(
        '3. El presente documento tiene plena validez como acuerdo de servicios profesionales entre las partes.',
        { width: contentWidth, align: 'justify', lineGap: 3 }
      );

      doc.y += 30;

      // ═══════════════════════════════════════════════════════════════
      // SIGNATURES SECTION
      // ═══════════════════════════════════════════════════════════════

      const signatureY = doc.y + 20;
      const signatureWidth = (contentWidth - 60) / 2;

      // Client signature
      doc.moveTo(leftMargin, signatureY + 40)
         .lineTo(leftMargin + signatureWidth, signatureY + 40)
         .strokeColor('#999999')
         .lineWidth(0.5)
         .stroke();

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Firma del Cliente', leftMargin, signatureY + 48, {
           width: signatureWidth,
           align: 'center'
         });

      // Lawyer signature
      const lawyerX = leftMargin + signatureWidth + 60;
      doc.moveTo(lawyerX, signatureY + 40)
         .lineTo(lawyerX + signatureWidth, signatureY + 40)
         .strokeColor('#999999')
         .lineWidth(0.5)
         .stroke();

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Firma del Abogado', lawyerX, signatureY + 48, {
           width: signatureWidth,
           align: 'center'
         });

      // ═══════════════════════════════════════════════════════════════
      // FOOTER
      // ═══════════════════════════════════════════════════════════════

      doc.fontSize(8)
         .fillColor('#999999')
         .font('Helvetica')
         .text(
           reference + ' · ' + this.formatDate(new Date()),
           leftMargin, doc.page.height - 50,
           { width: contentWidth, align: 'center' }
         );

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

  /**
   * Draw a section header with underline
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Section title
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Section width
   */
  drawSectionHeader(doc, title, x, y, width) {
    doc.fillColor('#333333')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(title, x, y);

    doc.moveTo(x, y + 16)
       .lineTo(x + width, y + 16)
       .strokeColor('#cccccc')
       .lineWidth(0.5)
       .stroke();

    doc.y = y + 20;
  }
}
