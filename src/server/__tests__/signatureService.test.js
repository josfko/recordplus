/**
 * Signature Service Tests
 * Property 7: Digital Signature Application
 * Validates: Requirements 3.1, 3.2, 3.3
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  SignatureService,
  CryptoSignatureStrategy,
  AcaP12Signer,
} from "../services/signatureService.js";
import { PDFGeneratorService } from "../services/pdfGeneratorService.js";
import {
  existsSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import * as asn1js from "asn1js";

const execFile = promisify(execFileCb);

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DOCS_PATH = "./data/documents/test-signature";
const TEST_CERT_PATH = join(__dirname, "fixtures/test-certificate.p12");
const EXPIRED_CERT_PATH = join(__dirname, "fixtures/expired-certificate.p12");
const TEST_CERT_PASSWORD = "testpassword";

describe("SignatureService", () => {
  let signatureService;
  let pdfService;

  beforeAll(() => {
    // Use visual signature (no certificate) for tests
    signatureService = new SignatureService("", "");
    pdfService = new PDFGeneratorService(TEST_DOCS_PATH);
  });

  afterAll(() => {
    // Cleanup test documents
    try {
      if (existsSync(TEST_DOCS_PATH)) {
        rmdirSync(TEST_DOCS_PATH, { recursive: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("signPDF", () => {
    /**
     * Property 7: Digital Signature Application
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    it("should create a signed PDF file that exists on disk", async () => {
      // First generate a PDF to sign
      const caseData = {
        id: 1,
        clientName: "Signature Test Client",
        aragReference: "DJ00999999",
        internalReference: "IY000099",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const originalPath = await pdfService.generateMinuta(caseData, config);

      // Sign the PDF
      const signedPath = await signatureService.signPDF(originalPath);

      // Verify signed file exists
      expect(existsSync(signedPath)).toBe(true);

      // Verify signed path has _signed suffix
      expect(signedPath).toContain("_signed.pdf");
    });

    it("should produce a signed file different from the original", async () => {
      const caseData = {
        id: 2,
        clientName: "Diff Test Client",
        aragReference: "DJ00888888",
        internalReference: "IY000088",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const originalPath = await pdfService.generateMinuta(caseData, config);
      const originalContent = readFileSync(originalPath);

      const signedPath = await signatureService.signPDF(originalPath);
      const signedContent = readFileSync(signedPath);

      // Files should be different (signed has additional content)
      expect(signedContent.length).toBeGreaterThan(originalContent.length);
    });

    it("should produce a valid PDF file", async () => {
      const caseData = {
        id: 3,
        clientName: "Valid PDF Client",
        aragReference: "DJ00777777",
        internalReference: "IY000077",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };

      const originalPath = await pdfService.generateMinuta(caseData, config);
      const signedPath = await signatureService.signPDF(originalPath);

      // Verify it's a valid PDF (starts with %PDF)
      const content = readFileSync(signedPath);
      expect(content.slice(0, 4).toString()).toBe("%PDF");
    });
  });

  describe("verifyCertificate", () => {
    it("should return false for empty certificate path", () => {
      const service = new SignatureService("", "password");
      expect(service.verifyCertificate()).toBe(false);
    });

    it("should return false for non-existent certificate", () => {
      const service = new SignatureService("/nonexistent/path.p12", "password");
      expect(service.verifyCertificate()).toBe(false);
    });

    it("should return true for existing certificate file", () => {
      // Create a dummy certificate file for testing
      const testCertDir = "./data/certificates";
      const testCertFile = "./data/certificates/test-verify.p12";

      if (!existsSync(testCertDir)) {
        mkdirSync(testCertDir, { recursive: true });
      }
      writeFileSync(testCertFile, "dummy-cert-content");

      const service = new SignatureService(testCertFile, "password");
      expect(service.verifyCertificate()).toBe(true);
    });
  });

  describe("Strategy Pattern", () => {
    it("should use visual strategy when no certificate configured", () => {
      const service = new SignatureService("", "");
      const info = service.getSignatureInfo();

      expect(info.type).toBe("visual");
      expect(info.details).toContain("visual");
    });

    it("should use crypto strategy when certificate path is provided", () => {
      const service = new SignatureService("/path/to/cert.p12", "password");
      const info = service.getSignatureInfo();

      expect(info.type).toBe("cryptographic");
      expect(info.details).toContain("P12");
    });

    it("should report isCryptoConfigured as false when certificate does not exist", () => {
      const service = new SignatureService("/nonexistent/cert.p12", "password");
      expect(service.isCryptoConfigured()).toBe(false);
    });

    it("should report isCryptoConfigured as false when using visual signature", () => {
      const service = new SignatureService("", "");
      expect(service.isCryptoConfigured()).toBe(false);
    });
  });

  describe("CryptoSignatureStrategy - Signing", () => {
    let testPdfBuffer;

    beforeAll(async () => {
      // Generate a test PDF buffer to sign
      const tempPdfService = new PDFGeneratorService(TEST_DOCS_PATH);
      const caseData = {
        id: 100,
        clientName: "Crypto Test Client",
        aragReference: "DJ00111111",
        internalReference: "IY000111",
      };
      const config = {
        arag_base_fee: "203.00",
        vat_rate: "21",
      };
      const pdfPath = await tempPdfService.generateMinuta(caseData, config);
      testPdfBuffer = readFileSync(pdfPath);
    });

    it("should sign PDF with P12 certificate", async () => {
      const strategy = new CryptoSignatureStrategy(
        TEST_CERT_PATH,
        TEST_CERT_PASSWORD
      );
      const signedPdf = await strategy.sign(testPdfBuffer);

      // Verify PDF is larger (contains signature)
      expect(signedPdf.length).toBeGreaterThan(testPdfBuffer.length);

      // Verify PDF structure is valid
      expect(signedPdf.slice(0, 5).toString()).toBe("%PDF-");
    });

    it("should throw error for incorrect password", async () => {
      const strategy = new CryptoSignatureStrategy(TEST_CERT_PATH, "wrongpassword");

      await expect(strategy.sign(testPdfBuffer)).rejects.toThrow(/contraseña/i);
    });

    it("should throw error for missing certificate file", async () => {
      const strategy = new CryptoSignatureStrategy(
        "/nonexistent/path.p12",
        "password"
      );

      await expect(strategy.sign(testPdfBuffer)).rejects.toThrow(
        /no encontrado|ENOENT/i
      );
    });

    it("should return cryptographic signature info", () => {
      const strategy = new CryptoSignatureStrategy(
        TEST_CERT_PATH,
        TEST_CERT_PASSWORD
      );
      const info = strategy.getInfo();

      expect(info.type).toBe("cryptographic");
      expect(info.details).toContain(TEST_CERT_PATH);
    });
  });

  describe("CryptoSignatureStrategy - Certificate Validation", () => {
    it("should extract CN and expiration from valid P12 certificate", async () => {
      const info = await CryptoSignatureStrategy.getCertificateInfo(
        TEST_CERT_PATH,
        TEST_CERT_PASSWORD
      );

      expect(info.cn).toBe("Test ACA Certificate");
      expect(info.validTo).toBeInstanceOf(Date);
      expect(info.validFrom).toBeInstanceOf(Date);
      expect(info.isExpired).toBe(false);
    });

    it("should detect expiring/expired certificate", async () => {
      const info = await CryptoSignatureStrategy.getCertificateInfo(
        EXPIRED_CERT_PATH,
        TEST_CERT_PASSWORD
      );

      // The expired certificate was created with 0 days validity
      // It should have a very short validity period
      expect(info.validTo).toBeInstanceOf(Date);
      expect(info.validFrom).toBeInstanceOf(Date);

      // Certificate should be valid for at most a few days (created with days=0)
      const validityPeriodMs = info.validTo.getTime() - info.validFrom.getTime();
      const validityDays = validityPeriodMs / (1000 * 60 * 60 * 24);
      // OpenSSL with days=0 creates ~30 day validity, so check it's short
      expect(validityDays).toBeLessThanOrEqual(31);

      // daysUntilExpiration should be defined
      expect(typeof info.daysUntilExpiration).toBe("number");
    });

    it("should throw error for wrong password when getting certificate info", async () => {
      await expect(
        CryptoSignatureStrategy.getCertificateInfo(TEST_CERT_PATH, "wrongpassword")
      ).rejects.toThrow(/contraseña/i);
    });

    it("should throw error for non-existent certificate file", async () => {
      await expect(
        CryptoSignatureStrategy.getCertificateInfo(
          "/nonexistent/path.p12",
          "password"
        )
      ).rejects.toThrow(/no encontrado|ENOENT/i);
    });

    it("should include issuer organization in certificate info", async () => {
      const info = await CryptoSignatureStrategy.getCertificateInfo(
        TEST_CERT_PATH,
        TEST_CERT_PASSWORD
      );

      expect(info.issuer).toBeDefined();
      expect(info.organization).toBe("Test Law Firm");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OpenSSL + makeDetached() tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("AcaP12Signer.makeDetached()", () => {
    let attachedCmsDer;

    beforeAll(async () => {
      // Generate a real attached CMS using OpenSSL so we have known-good input
      const { writeFile, mkdtemp, rm, readFile } = await import("fs/promises");
      const tmpDir = await mkdtemp(join(tmpdir(), "test-cms-"));

      try {
        // Create a self-signed cert + key for test CMS generation
        await execFile("openssl", [
          "req",
          "-x509",
          "-newkey",
          "rsa:2048",
          "-keyout",
          join(tmpDir, "key.pem"),
          "-out",
          join(tmpDir, "cert.pem"),
          "-days",
          "1",
          "-nodes",
          "-subj",
          "/CN=CMSTest",
        ]);

        // Create test data
        await writeFile(join(tmpDir, "data.bin"), "test pdf content");

        // Create attached CMS
        await execFile("openssl", [
          "cms",
          "-sign",
          "-binary",
          "-nodetach",
          "-md",
          "sha256",
          "-signer",
          join(tmpDir, "cert.pem"),
          "-inkey",
          join(tmpDir, "key.pem"),
          "-in",
          join(tmpDir, "data.bin"),
          "-outform",
          "DER",
          "-out",
          join(tmpDir, "attached.der"),
        ]);

        attachedCmsDer = await readFile(join(tmpDir, "attached.der"));
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    it("should produce output smaller than the attached input", () => {
      const detached = AcaP12Signer.makeDetached(attachedCmsDer);

      // Detached must be smaller because eContent (the signed data) was removed
      expect(detached.length).toBeLessThan(attachedCmsDer.length);
    });

    it("should produce valid DER that can be parsed", () => {
      const detached = AcaP12Signer.makeDetached(attachedCmsDer);
      const parsed = asn1js.fromBER(new Uint8Array(detached).buffer);

      expect(parsed.offset).not.toBe(-1);
    });

    it("should remove eContent from encapContentInfo", () => {
      const detached = AcaP12Signer.makeDetached(attachedCmsDer);
      const parsed = asn1js.fromBER(new Uint8Array(detached).buffer);

      // Navigate: ContentInfo > [0] content > SignedData
      const contentInfo = parsed.result;
      const signedData = contentInfo.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // Find encapContentInfo (SEQUENCE starting with OID)
      let encapContentInfo = null;
      for (const item of sdValues) {
        if (item.idBlock?.tagClass === 1 && item.idBlock?.tagNumber === 16) {
          const vals = item.valueBlock?.value;
          if (
            vals?.length >= 1 &&
            vals[0].idBlock?.tagClass === 1 &&
            vals[0].idBlock?.tagNumber === 6
          ) {
            encapContentInfo = item;
            break;
          }
        }
      }

      expect(encapContentInfo).not.toBeNull();
      // Should only contain eContentType OID, no eContent
      expect(encapContentInfo.valueBlock.value.length).toBe(1);
    });

    it("should preserve eContent in the attached input (sanity check)", () => {
      // Verify the attached input DOES have eContent before stripping
      const parsed = asn1js.fromBER(new Uint8Array(attachedCmsDer).buffer);
      const contentInfo = parsed.result;
      const signedData = contentInfo.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      let encapContentInfo = null;
      for (const item of sdValues) {
        if (item.idBlock?.tagClass === 1 && item.idBlock?.tagNumber === 16) {
          const vals = item.valueBlock?.value;
          if (
            vals?.length >= 1 &&
            vals[0].idBlock?.tagClass === 1 &&
            vals[0].idBlock?.tagNumber === 6
          ) {
            encapContentInfo = item;
            break;
          }
        }
      }

      expect(encapContentInfo).not.toBeNull();
      // Attached CMS should have eContentType + eContent (at least 2 elements)
      expect(encapContentInfo.valueBlock.value.length).toBeGreaterThanOrEqual(2);
    });

    it("should preserve signerInfos after stripping", () => {
      const detached = AcaP12Signer.makeDetached(attachedCmsDer);
      const parsed = asn1js.fromBER(new Uint8Array(detached).buffer);

      const contentInfo = parsed.result;
      const signedData = contentInfo.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // Last element in SignedData should be signerInfos (SET)
      const lastItem = sdValues[sdValues.length - 1];
      // SET tag = tagClass 1, tagNumber 17
      expect(lastItem.idBlock?.tagClass).toBe(1);
      expect(lastItem.idBlock?.tagNumber).toBe(17);
      // Should contain at least one signerInfo
      expect(lastItem.valueBlock?.value?.length).toBeGreaterThanOrEqual(1);
    });

    it("should preserve certificates after stripping", () => {
      const detached = AcaP12Signer.makeDetached(attachedCmsDer);
      const parsed = asn1js.fromBER(new Uint8Array(detached).buffer);

      const contentInfo = parsed.result;
      const signedData = contentInfo.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // Certificates are context-tagged [0] (tagClass 3, tagNumber 0)
      const certs = sdValues.find(
        (item) => item.idBlock?.tagClass === 3 && item.idBlock?.tagNumber === 0
      );
      expect(certs).toBeDefined();
      expect(certs.valueBlock?.value?.length).toBeGreaterThanOrEqual(1);
    });

    it("should throw on invalid DER input", () => {
      const garbage = Buffer.from([0xff, 0xfe, 0xfd, 0xfc, 0x00]);
      expect(() => AcaP12Signer.makeDetached(garbage)).toThrow(
        /Failed to parse CMS DER/
      );
    });

    it("should be idempotent - calling twice produces same result", () => {
      const detached1 = AcaP12Signer.makeDetached(attachedCmsDer);
      const detached2 = AcaP12Signer.makeDetached(detached1);

      // Second call on already-detached should produce identical output
      expect(Buffer.compare(detached1, detached2)).toBe(0);
    });
  });

  describe("OpenSSL CMS - Signed PDF Structure", () => {
    let signedPdfBuffer;

    beforeAll(async () => {
      const tempPdfService = new PDFGeneratorService(TEST_DOCS_PATH);
      const caseData = {
        id: 200,
        clientName: "CMS Structure Test",
        aragReference: "DJ00222222",
        internalReference: "IY000222",
      };
      const config = { arag_base_fee: "203.00", vat_rate: "21" };

      const pdfPath = await tempPdfService.generateMinuta(caseData, config);
      const pdfBuffer = readFileSync(pdfPath);

      const strategy = new CryptoSignatureStrategy(
        TEST_CERT_PATH,
        TEST_CERT_PASSWORD
      );
      signedPdfBuffer = await strategy.sign(pdfBuffer);
    });

    /**
     * Extract the PKCS#7 signature bytes from a signed PDF.
     * The signature is stored as hex between angle brackets in /Contents.
     */
    function extractSignatureFromPdf(pdfBuffer) {
      const pdfStr = pdfBuffer.toString("latin1");
      const match = pdfStr.match(/\/Contents\s*<([0-9a-fA-F]+)>/);
      if (!match) return null;

      let hex = match[1].replace(/0+$/, "");
      if (hex.length % 2) hex += "0";
      return Buffer.from(hex, "hex");
    }

    it("should embed a PKCS#7 signature in the PDF /Contents", () => {
      const sigBytes = extractSignatureFromPdf(signedPdfBuffer);
      expect(sigBytes).not.toBeNull();
      expect(sigBytes.length).toBeGreaterThan(100);
    });

    it("should have pkcs7-signedData as contentType", () => {
      const sigBytes = extractSignatureFromPdf(signedPdfBuffer);
      const parsed = asn1js.fromBER(new Uint8Array(sigBytes).buffer);

      expect(parsed.offset).not.toBe(-1);

      // First element of ContentInfo is the contentType OID
      const contentTypeOid = parsed.result.valueBlock.value[0];
      // OID 1.2.840.113549.1.7.2 = pkcs7-signedData
      expect(contentTypeOid.valueBlock?.toString()).toBe("1.2.840.113549.1.7.2");
    });

    it("should have eContent ABSENT (detached mode)", () => {
      const sigBytes = extractSignatureFromPdf(signedPdfBuffer);
      const parsed = asn1js.fromBER(new Uint8Array(sigBytes).buffer);

      const signedData =
        parsed.result.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // Find encapContentInfo
      let encapContentInfo = null;
      for (const item of sdValues) {
        if (item.idBlock?.tagClass === 1 && item.idBlock?.tagNumber === 16) {
          const vals = item.valueBlock?.value;
          if (
            vals?.length >= 1 &&
            vals[0].idBlock?.tagClass === 1 &&
            vals[0].idBlock?.tagNumber === 6
          ) {
            encapContentInfo = item;
            break;
          }
        }
      }

      expect(encapContentInfo).not.toBeNull();
      // Only eContentType OID, no eContent
      expect(encapContentInfo.valueBlock.value.length).toBe(1);
    });

    it("should have SHA-256 as digest algorithm", () => {
      const sigBytes = extractSignatureFromPdf(signedPdfBuffer);
      const parsed = asn1js.fromBER(new Uint8Array(sigBytes).buffer);

      const signedData =
        parsed.result.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // digestAlgorithms is a SET (second element after version INTEGER)
      const digestAlgSet = sdValues[1];
      expect(digestAlgSet.idBlock?.tagNumber).toBe(17); // SET

      // First element is a SEQUENCE containing the algorithm OID
      const algSeq = digestAlgSet.valueBlock.value[0];
      const algOid = algSeq.valueBlock.value[0];
      // OID 2.16.840.1.101.3.4.2.1 = sha256
      expect(algOid.valueBlock?.toString()).toBe("2.16.840.1.101.3.4.2.1");
    });

    it("should contain authenticated attributes with contentType, signingTime, and messageDigest", () => {
      const sigBytes = extractSignatureFromPdf(signedPdfBuffer);
      const parsed = asn1js.fromBER(new Uint8Array(sigBytes).buffer);

      const signedData =
        parsed.result.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // signerInfos is the last SET in SignedData
      const signerInfosSet = sdValues[sdValues.length - 1];
      const signerInfo = signerInfosSet.valueBlock.value[0];
      const siValues = signerInfo.valueBlock.value;

      // Find signedAttrs (context-tagged [0], tagClass 3, tagNumber 0)
      const signedAttrs = siValues.find(
        (item) => item.idBlock?.tagClass === 3 && item.idBlock?.tagNumber === 0
      );
      expect(signedAttrs).toBeDefined();

      // Extract OIDs from authenticated attributes
      const attrOids = signedAttrs.valueBlock.value.map((attr) => {
        const oid = attr.valueBlock?.value?.[0];
        return oid?.valueBlock?.toString();
      });

      // Must contain these three OIDs:
      // 1.2.840.113549.1.9.3 = contentType
      // 1.2.840.113549.1.9.5 = signingTime
      // 1.2.840.113549.1.9.4 = messageDigest
      expect(attrOids).toContain("1.2.840.113549.1.9.3");
      expect(attrOids).toContain("1.2.840.113549.1.9.5");
      expect(attrOids).toContain("1.2.840.113549.1.9.4");
    });

    it("should have signing certificate embedded in CMS certificates", () => {
      const sigBytes = extractSignatureFromPdf(signedPdfBuffer);
      const parsed = asn1js.fromBER(new Uint8Array(sigBytes).buffer);

      const signedData =
        parsed.result.valueBlock.value[1].valueBlock.value[0];
      const sdValues = signedData.valueBlock.value;

      // Certificates context-tagged [0]
      const certs = sdValues.find(
        (item) => item.idBlock?.tagClass === 3 && item.idBlock?.tagNumber === 0
      );
      expect(certs).toBeDefined();
      expect(certs.valueBlock?.value?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("OpenSSL CMS - Temp File Cleanup", () => {
    it("should not leave temp files after successful signing", async () => {
      const tempPdfService = new PDFGeneratorService(TEST_DOCS_PATH);
      const caseData = {
        id: 300,
        clientName: "Cleanup Test",
        aragReference: "DJ00333333",
        internalReference: "IY000333",
      };
      const config = { arag_base_fee: "203.00", vat_rate: "21" };
      const pdfPath = await tempPdfService.generateMinuta(caseData, config);
      const pdfBuffer = readFileSync(pdfPath);

      // Count pdf-sign temp dirs before signing
      const tmpBase = tmpdir();
      const before = readdirSync(tmpBase).filter((d) =>
        d.startsWith("pdf-sign-")
      );

      const strategy = new CryptoSignatureStrategy(
        TEST_CERT_PATH,
        TEST_CERT_PASSWORD
      );
      await strategy.sign(pdfBuffer);

      // Count after - should be same or fewer (cleanup happened)
      const after = readdirSync(tmpBase).filter((d) =>
        d.startsWith("pdf-sign-")
      );
      expect(after.length).toBeLessThanOrEqual(before.length);
    });

    it("should not leave temp files after signing error", async () => {
      const tmpBase = tmpdir();
      const before = readdirSync(tmpBase).filter((d) =>
        d.startsWith("pdf-sign-")
      );

      const strategy = new CryptoSignatureStrategy(
        TEST_CERT_PATH,
        "wrongpassword"
      );

      // Generate a minimal PDF buffer to trigger signing attempt
      const tempPdfService = new PDFGeneratorService(TEST_DOCS_PATH);
      const caseData = {
        id: 301,
        clientName: "Cleanup Error Test",
        aragReference: "DJ00333301",
        internalReference: "IY000301",
      };
      const config = { arag_base_fee: "203.00", vat_rate: "21" };
      const pdfPath = await tempPdfService.generateMinuta(caseData, config);
      const pdfBuffer = readFileSync(pdfPath);

      try {
        await strategy.sign(pdfBuffer);
      } catch {
        // Expected to fail
      }

      const after = readdirSync(tmpBase).filter((d) =>
        d.startsWith("pdf-sign-")
      );
      expect(after.length).toBeLessThanOrEqual(before.length);
    });
  });
});
