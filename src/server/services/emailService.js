/**
 * Email Service
 * Sends emails with PDF attachments via SMTP
 *
 * Features:
 * - SMTP configuration with TLS/SSL support
 * - User-friendly Spanish error messages
 * - Connection testing before sending
 */
import nodemailer from "nodemailer";
import { basename } from "path";

/**
 * Custom SMTP error with user-friendly details
 * Follows pattern: what failed / why / what to do
 */
export class SmtpError extends Error {
  /**
   * @param {string} message - Short error message
   * @param {string} details - Why the error occurred
   * @param {string} action - What the user should do
   * @param {string} [originalCode] - Original nodemailer error code
   */
  constructor(message, details, action, originalCode = null) {
    super(message);
    this.name = "SmtpError";
    this.code = "SMTP_ERROR";
    this.details = details;
    this.action = action;
    this.originalCode = originalCode;
  }

  /**
   * Get full error message for display
   * @returns {string}
   */
  getFullMessage() {
    return `${this.message}: ${this.details} ${this.action}`;
  }
}

/**
 * Map nodemailer errors to user-friendly Spanish messages
 * @param {Error} error - Original nodemailer error
 * @returns {SmtpError} User-friendly error
 */
function mapSmtpError(error) {
  const errorMappings = {
    ECONNREFUSED: {
      message: "Conexión rechazada",
      details: "El servidor SMTP no está disponible o el puerto está cerrado.",
      action: "Verifique el host y puerto en Configuración.",
    },
    EAUTH: {
      message: "Error de autenticación",
      details: "Las credenciales SMTP son incorrectas o la cuenta está bloqueada.",
      action: "Verifique el usuario y contraseña SMTP.",
    },
    ETIMEDOUT: {
      message: "Tiempo de espera agotado",
      details: "El servidor SMTP no responde dentro del tiempo límite.",
      action: "Compruebe la conexión de red o intente más tarde.",
    },
    ESOCKET: {
      message: "Error de conexión",
      details: "No se pudo establecer conexión con el servidor SMTP.",
      action: "Verifique la configuración de seguridad (TLS/SSL).",
    },
    EENVELOPE: {
      message: "Destinatario inválido",
      details: "La dirección de email del destinatario fue rechazada por el servidor.",
      action: "Verifique que la dirección de email sea correcta.",
    },
    ENOTFOUND: {
      message: "Servidor no encontrado",
      details: "No se puede resolver el nombre del servidor SMTP.",
      action: "Verifique que el host SMTP sea correcto.",
    },
    ECONNRESET: {
      message: "Conexión interrumpida",
      details: "El servidor cerró la conexión inesperadamente.",
      action: "Intente de nuevo o verifique la configuración de seguridad.",
    },
    SELF_SIGNED_CERT_IN_CHAIN: {
      message: "Certificado no válido",
      details: "El servidor usa un certificado autofirmado no confiable.",
      action: "Contacte al administrador del servidor SMTP.",
    },
    CERT_HAS_EXPIRED: {
      message: "Certificado expirado",
      details: "El certificado SSL del servidor SMTP ha expirado.",
      action: "Contacte al administrador del servidor SMTP.",
    },
  };

  // Check for specific error codes
  const errorCode = error.code || error.errno;
  const mapped = errorMappings[errorCode];

  if (mapped) {
    return new SmtpError(mapped.message, mapped.details, mapped.action, errorCode);
  }

  // Check for authentication errors in message
  if (error.message && (
    error.message.includes("authentication") ||
    error.message.includes("credentials") ||
    error.message.includes("535") ||
    error.message.includes("Invalid login")
  )) {
    return new SmtpError(
      "Error de autenticación",
      "Las credenciales SMTP son incorrectas.",
      "Verifique el usuario y contraseña SMTP.",
      "AUTH_FAILED"
    );
  }

  // Check for TLS errors
  if (error.message && (
    error.message.includes("TLS") ||
    error.message.includes("SSL") ||
    error.message.includes("certificate")
  )) {
    return new SmtpError(
      "Error de seguridad TLS/SSL",
      error.message,
      "Verifique la configuración de seguridad del servidor.",
      "TLS_ERROR"
    );
  }

  // Default: wrap unknown errors
  return new SmtpError(
    "Error al enviar email",
    error.message || "Error desconocido al comunicarse con el servidor SMTP.",
    "Contacte al administrador del sistema.",
    errorCode
  );
}

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
   * @throws {SmtpError} User-friendly error if sending fails
   */
  async sendEmail({ to, subject, body, attachmentPath }) {
    if (!this.transporter) {
      try {
        await this.initialize();
      } catch (error) {
        throw mapSmtpError(error);
      }
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

    try {
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw mapSmtpError(error);
    }
  }

  /**
   * Test SMTP connection
   * @returns {Promise<boolean>} True if connection successful
   * @throws {SmtpError} User-friendly error if connection fails
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        await this.initialize();
      }
      return await this.transporter.verify();
    } catch (error) {
      throw mapSmtpError(error);
    }
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
   * Format: DJ00xxxxxx - SUPLIDO - [District]
   * @param {string} aragReference - ARAG case reference
   * @param {string} district - Judicial district
   * @returns {string} Formatted subject
   */
  static formatSuplidoSubject(aragReference, district) {
    return `${aragReference} - SUPLIDO - ${district}`;
  }
}
