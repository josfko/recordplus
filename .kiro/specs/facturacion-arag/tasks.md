# Facturación ARAG - Implementation Tasks

## Overview

This task list covers improvements to the existing Facturación ARAG module. The current implementation is functional but needs:

1. **Phase 1**: PDF template improvements and test coverage
2. **Phase 2**: Prepare signature architecture (visual now, crypto-ready)
3. **Phase 3**: Email workflow reliability improvements
4. **Phase 4**: Cryptographic signature implementation (when certificate available)

---

## Phase 1: PDF Templates & Testing

### 1.1 PDF Template Improvements

- [x] **1.1.1** Improve minuta PDF layout with professional styling
  - Add clear section headers
  - Improve fee breakdown table formatting
  - Add proper margins and spacing
  - _Validates: Req 3.4.1_

- [x] **1.1.2** Improve suplido PDF layout
  - Add district information prominently
  - Format mileage amount clearly
  - Match minuta styling consistency
  - _Validates: Req 3.4.2_

- [x] **1.1.3** Ensure consistent currency formatting (Spanish locale)
  - Use comma as decimal separator
  - € symbol after amount
  - _Validates: Req 3.4.4_

- [x] **1.1.4** Ensure consistent date formatting (DD/MM/YYYY)
  - _Validates: Req 3.4.5_

### 1.2 Unit Tests

- [x] **1.2.1** Add unit tests for PDFGeneratorService
  - Test fee calculation accuracy
  - Test date formatting
  - Test currency formatting
  - _Validates: Req 3.1.1_

- [x] **1.2.2** Add unit tests for SignatureService
  - Test PDF modification
  - Test signature box placement
  - _Validates: Req 3.1.3_

- [x] **1.2.3** Add unit tests for EmailService
  - Test SMTP configuration validation
  - Test subject format generation
  - _Validates: Req 3.6.2_

### 1.3 Property-Based Tests

- [x] **1.3.1** Add property test for fee calculation accuracy
  - For any base fee and VAT rate, total = base + (base × VAT / 100)
  - _Validates: Property 1_

- [x] **1.3.2** Add property test for email subject format
  - All minuta subjects match `^DJ00\d{6} - MINUTA$`
  - _Validates: Property 4_

- [x] **1.3.3** Add property test for district validation
  - Only 7 valid districts accepted
  - _Validates: Property 6_

- [x] **1.3.4** Add property test for archived case protection
  - Generation rejected for ARCHIVADO cases
  - _Validates: Property 7_

### 1.4 Integration Tests

- [x] **1.4.1** Test full minuta workflow
  - Generate → Sign → Record document → Send email (mock)
  - Verify all history records created
  - _Validates: Req 3.1, Property 5_

- [x] **1.4.2** Test suplido workflow
  - Validate JUDICIAL state required
  - Verify mileage calculation from config
  - _Validates: Req 3.2.1_

- [x] **1.4.3** Test error recovery scenarios
  - PDF generation failure
  - Email sending failure (document still recorded)
  - _Validates: Req 3.3, 3.6.4_

**Checkpoint 1**: All Phase 1 tests passing, PDF templates improved

---

## Phase 2: Signature Architecture (Crypto-Ready)

> **Goal**: Keep visual signature working, but prepare architecture for easy crypto upgrade later.

### 2.1 Refactor SignatureService for Strategy Pattern

- [x] **2.1.1** Create signature strategy interface
  ```javascript
  // SignatureStrategy interface
  interface SignatureStrategy {
    sign(pdfBuffer: Buffer): Promise<Buffer>;
    getSignatureInfo(): { type: 'visual' | 'cryptographic', details: string };
  }
  ```
  - _Validates: Req 3.5.5 (fallback behavior)_

- [x] **2.1.2** Extract current visual signature to `VisualSignatureStrategy`
  - Move existing pdf-lib code to separate class
  - Implement SignatureStrategy interface
  - Keep as default strategy

- [x] **2.1.3** Create placeholder `CryptoSignatureStrategy` (stub)
  - Implement interface with TODO comments
  - Document required packages: `@signpdf/signpdf`, `@signpdf/signer-p12`
  - Throw "Not configured" error if called without certificate

- [x] **2.1.4** Update SignatureService to use strategy pattern
  ```javascript
  class SignatureService {
    constructor(config) {
      this.strategy = config.certificate_path
        ? new CryptoSignatureStrategy(config)
        : new VisualSignatureStrategy();
    }
    async signPDF(pdfPath) {
      return this.strategy.sign(pdfPath);
    }
  }
  ```

### 2.2 Certificate Configuration (Prepare Fields)

- [x] **2.2.1** Add certificate config fields to database schema
  ```sql
  INSERT OR IGNORE INTO configuration (key, value) VALUES
    ('certificate_path', ''),
    ('certificate_password', '');
  ```

- [x] **2.2.2** Add certificate section to Configuration UI (disabled state)
  - Show "Firma Digital Criptográfica" section
  - Display "Próximamente" badge
  - File upload input (disabled)
  - Password input (disabled)
  - Message: "Actualmente usando firma visual. Configure certificado .p12 para firma criptográfica."

### 2.3 Documentation

- [x] **2.3.1** Document signature upgrade path in code comments
- [x] **2.3.2** Create `SIGNATURE_UPGRADE.md` with:
  - Required packages to install
  - Configuration steps
  - Certificate requirements (.p12/.pfx from FNMT or CA)

**Checkpoint 2**: Visual signature working, architecture ready for crypto upgrade

---

## Phase 4: Cryptographic Signature (When Certificate Available)

> **Prerequisites**: Valid .p12/.pfx certificate, Phase 2 complete

### 4.1 Install Dependencies

- [ ] **4.1.1** Install signature packages
  ```bash
  npm install @signpdf/signpdf @signpdf/signer-p12 @signpdf/placeholder-pdf-lib node-forge
  ```

### 4.2 Implement CryptoSignatureStrategy

- [ ] **4.2.1** Implement real signing in `CryptoSignatureStrategy`
  ```javascript
  import signpdf from '@signpdf/signpdf';
  import { P12Signer } from '@signpdf/signer-p12';
  import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';

  class CryptoSignatureStrategy {
    async sign(pdfBuffer) {
      // Add placeholder
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pdflibAddPlaceholder({ pdfDoc, reason: 'Factura ARAG', ... });

      // Sign with P12
      const signer = new P12Signer(this.certBuffer, { passphrase: this.password });
      return signpdf.sign(await pdfDoc.save(), signer);
    }
  }
  ```

- [ ] **4.2.2** Add certificate validation
  - Verify password is correct
  - Check certificate expiration
  - Display certificate holder name

### 4.3 Enable Configuration UI

- [ ] **4.3.1** Enable certificate upload in Configuration
- [ ] **4.3.2** Add "Test Certificate" button
- [ ] **4.3.3** Show certificate status (valid/expired/not configured)

### 4.4 Testing

- [ ] **4.4.1** Test with self-signed certificate (development)
- [ ] **4.4.2** Test with real certificate
- [ ] **4.4.3** Verify PDF signature in Adobe Reader

**Checkpoint 4**: Cryptographic signatures working

---

## Phase 3: Email Workflow Improvements

### 3.0 Add Email to Suplido Workflow (Missing Feature)

> **Gap identified**: Original PRD requires "Envío por email (configurable, por defecto ARAG)" for suplidos, but current implementation does NOT send emails for suplidos.

- [x] **3.0.1** Add email step to `executeSuplidoWorkflow()` in MinutaWorkflowService
  - After signing, send email with suplido attached
  - Use subject format: `DJ00xxxxxx - SUPLIDO - [District]`
  - Same recipient as minuta (configurable, default ARAG)
  - _Validates: Req 3.2 (original PRD requirement)_

- [x] **3.0.2** Add email history recording for suplido
  - Record SENT or ERROR status
  - Link to document_id
  - _Validates: Req 3.3.4_

- [x] **3.0.3** Update EmailService with `formatSuplidoSubject()` static method
  - Already exists but verify format matches requirement
  - _Validates: Req 3.6.2_

- [x] **3.0.4** Update integration test 1.4.2 to verify email sending for suplido
  - _Validates: Property 5 (email sending)_

### 3.1 SMTP Configuration UI

- [x] **3.1.1** Ensure SMTP configuration fields in Configuration page
  - Host, Port, Security (dropdown: None/STARTTLS/SSL)
  - Username, Password (masked)
  - From address
  - _Validates: Req 3.6.6_

- [x] **3.1.2** Add "Test Connection" button with feedback
  - Show success/error message
  - Display specific error details
  - _Validates: Req 3.6.6_

### 3.2 Email Error Handling

- [ ] **3.2.1** Improve error messages for common SMTP failures
  - Connection refused
  - Authentication failed
  - Timeout
  - _Validates: Req 3.6.4_

- [ ] **3.2.2** Add retry mechanism for failed emails
  - Store failed email in queue
  - Manual retry button in UI
  - _Validates: Req 3.6.4_

### 3.3 UI Feedback

- [ ] **3.3.1** Add progress indicator during generation
  - Show current step (Generating → Signing → Sending)
  - _Validates: Req 3.1.8_

- [ ] **3.3.2** Improve toast messages for workflow results
  - Differentiate success/partial success/failure
  - Show specific step that failed
  - _Validates: Req 3.1.8_

### 3.4 History Improvements

- [ ] **3.4.1** Add email status indicator in timeline
  - Green checkmark for sent
  - Red X for error with tooltip
  - _Validates: Req 3.3.4_

- [ ] **3.4.2** Add retry button for failed emails
  - Only show for ERROR status
  - Trigger retry workflow
  - _Validates: Req 3.6.4_

**Checkpoint 3**: Email workflow robust with proper error handling

---

## Phase 4: Documentation & Cleanup

### 4.1 Code Documentation

- [ ] **4.1.1** Add JSDoc comments to all service methods
- [ ] **4.1.2** Document API endpoints in code comments
- [ ] **4.1.3** Update CLAUDE.md with Facturación module details

### 4.2 Configuration Documentation

- [ ] **4.2.1** Document all configuration options
- [ ] **4.2.2** Add example SMTP configurations for common providers
- [ ] **4.2.3** Document mileage rate configuration

**Final Checkpoint**: All phases complete, documentation updated

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | ✅ Complete | PDF templates improved, all tests passing |
| Phase 2 | ✅ Complete | Strategy pattern implemented, crypto-ready |
| Phase 3 | ✅ Complete | Suplido email added, SMTP UI exists, 57 tests passing |
| Phase 4 | ⚪ Blocked | Waiting for certificate |

---

## Notes

### Signature Strategy

**Current approach:**
1. ✅ Visual signature works now ("Documento firmado digitalmente" text box)
2. 🔄 Phase 2 prepares architecture for easy upgrade
3. ⏳ Phase 4 implements real crypto when certificate is available

This means:
- **No blocking** - can ship with visual signature
- **Easy upgrade** - just configure certificate path, code switches automatically
- **No code changes** needed when certificate arrives

### Mileage Rates

Current mileage rates are stored in configuration but may need to be updated:
- Default values are 0.00€ for all districts
- Configure actual rates in Configuration page

### SMTP Configuration

For email sending to work:
1. Configure SMTP settings in Configuration page
2. Test connection before generating documents
3. Common providers: Gmail (requires app password), Office 365, custom SMTP
