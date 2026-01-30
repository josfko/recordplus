/**
 * Email Service Tests
 * Property 8: Email Subject Format
 * Validates: Requirements 4.3
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { EmailService } from "../services/emailService.js";

describe("EmailService", () => {
  describe("formatMinutaSubject", () => {
    /**
     * Property 8: Email Subject Format
     * Validates: Requirements 4.3
     */
    it('should format minuta subject as "{aragReference} - MINUTA"', () => {
      fc.assert(
        fc.property(
          // Generate valid ARAG references (DJ00 + 6 digits)
          fc.stringOf(
            fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
            { minLength: 6, maxLength: 6 },
          ),
          (digits) => {
            const aragReference = `DJ00${digits}`;
            const subject = EmailService.formatMinutaSubject(aragReference);

            expect(subject).toBe(`${aragReference} - MINUTA`);
            expect(subject).toContain(aragReference);
            expect(subject).toContain("MINUTA");
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("formatSuplidoSubject", () => {
    it("should format suplido subject with reference and district", () => {
      const districts = [
        "Torrox",
        "Vélez-Málaga",
        "Torremolinos",
        "Fuengirola",
        "Marbella",
        "Estepona",
        "Antequera",
      ];

      fc.assert(
        fc.property(
          fc.stringOf(
            fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
            { minLength: 6, maxLength: 6 },
          ),
          fc.constantFrom(...districts),
          (digits, district) => {
            const aragReference = `DJ00${digits}`;
            const subject = EmailService.formatSuplidoSubject(
              aragReference,
              district,
            );

            expect(subject).toContain(aragReference);
            expect(subject).toContain("SUPLIDO");
            expect(subject).toContain(district);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("isConfigured", () => {
    it("should return false when SMTP host is missing", () => {
      const service = new EmailService({
        smtp_host: "",
        smtp_user: "user@example.com",
      });
      expect(service.isConfigured()).toBe(false);
    });

    it("should return false when SMTP user is missing", () => {
      const service = new EmailService({
        smtp_host: "smtp.example.com",
        smtp_user: "",
      });
      expect(service.isConfigured()).toBe(false);
    });

    it("should return true when both host and user are configured", () => {
      const service = new EmailService({
        smtp_host: "smtp.example.com",
        smtp_user: "user@example.com",
      });
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe("initialize", () => {
    it("should throw error when SMTP is not configured", async () => {
      const service = new EmailService({
        smtp_host: "",
        smtp_user: "",
      });

      await expect(service.initialize()).rejects.toThrow("SMTP no configurado");
    });
  });
});
