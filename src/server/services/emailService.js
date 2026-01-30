/**
 * Email Service
 * Sends emails with PDF attachments via SMTP
 */
import nodemailer from "nodemailer";
import { basename } from "path";

export class EmailService {
  constructor(config) {
    this.config = config;
    this.transporter = null;
  }

  /**
   * Initialize SMTP transporter
   * @throws {Error} If SMTP is not configured
   */
  async initialize() {
    if (!this.config.smtp_host) {
      throw new Error(
        "SMTP no configurado. Configure el servidor de correo en Configuración.",
      );
    }

    const port = parseInt(this.config.smtp_port) || 587;
    const isSecure = this.config.smtp_secure === "true"; // SSL/TLS on port 465

    const transportConfig = {
      host: this.config.smtp_host,
      port: port,
      secure: isSecure, // true for 465, false for other ports (STARTTLS)
      auth: {
        user: this.config.smtp_user,
        pass: this.config.smtp_password,
      },
      // Connection settings for better compatibility
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000,
    };

    // For STARTTLS (port 587), explicitly require TLS upgrade
    if (!isSecure && port === 587) {
      transportConfig.requireTLS = true;
      transportConfig.tls = {
        rejectUnauthorized: false, // Allow self-signed certs (common with some providers)
        minVersion: "TLSv1.2",
      };
    }

    // For SSL/TLS (port 465), configure TLS options
    if (isSecure) {
      transportConfig.tls = {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      };
    }

    this.transporter = nodemailer.createTransport(transportConfig);
  }

  /**
   * Send email with optional PDF attachment
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} [options.body] - Email body text
   * @param {string} [options.attachmentPath] - Path to PDF attachment
   * @returns {Promise<Object>} Send result from nodemailer
   */
  async sendEmail({ to, subject, body, attachmentPath }) {
    if (!this.transporter) {
      await this.initialize();
    }

    const mailOptions = {
      from: this.config.smtp_from || this.config.smtp_user,
      to,
      subject,
      text: body || "Adjunto documento.",
      attachments: attachmentPath
        ? [
            {
              filename: basename(attachmentPath),
              path: attachmentPath,
            },
          ]
        : [],
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Test SMTP connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.transporter) {
      await this.initialize();
    }
    return this.transporter.verify();
  }

  /**
   * Check if SMTP is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.config.smtp_host && this.config.smtp_user);
  }

  /**
   * Format email subject for ARAG minuta
   * @param {string} aragReference - ARAG case reference
   * @returns {string} Formatted subject
   */
  static formatMinutaSubject(aragReference) {
    return `${aragReference} - MINUTA`;
  }

  /**
   * Format email subject for ARAG suplido
   * @param {string} aragReference - ARAG case reference
   * @param {string} district - Judicial district
   * @returns {string} Formatted subject
   */
  static formatSuplidoSubject(aragReference, district) {
    return `${aragReference} - SUPLIDO ${district}`;
  }
}
