/**
 * Hoja de Encargo Modal Component
 * Handles the workflow for generating, signing, and sending Hoja de Encargo documents
 * for PARTICULAR (private client) cases.
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

export class HojaEncargoModal {
  constructor(caseData, config, onComplete) {
    this.caseData = caseData;
    this.config = config;
    this.onComplete = onComplete;
    this.modal = null;
    this.currentDocument = null;
    this.workflow = {
      generate: { status: "pending", data: null },
      sign: { status: "pending", data: null },
      send: { status: "pending", data: null },
    };
  }

  /**
   * Open the modal
   */
  open() {
    this.createModal();
    document.body.appendChild(this.modal);
    // Trigger reflow for animation
    requestAnimationFrame(() => {
      this.modal.classList.add("modal-visible");
    });
    this.attachEventListeners();
  }

  /**
   * Close the modal
   */
  close() {
    this.modal.classList.remove("modal-visible");
    setTimeout(() => {
      this.modal.remove();
      if (this.onComplete) {
        this.onComplete();
      }
    }, 200);
  }

  /**
   * Create the modal DOM structure
   */
  createModal() {
    this.modal = document.createElement("div");
    this.modal.className = "modal-overlay";
    this.modal.innerHTML = this.renderContent();
  }

  /**
   * Render the modal content
   */
  renderContent() {
    const c = this.caseData;

    return `
      <div class="modal modal-hoja-encargo">
        <div class="modal-header">
          <div class="modal-header-content">
            <div class="icon-box icon-box-indigo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 class="modal-title">Hoja de Encargo</h2>
              <p class="modal-subtitle">${c.clientName} · <span class="mono">${c.internalReference}</span></p>
            </div>
          </div>
          <button class="btn-icon modal-close" id="modal-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Input Form Section -->
          <div class="hoja-form-section" id="form-section">
            <div class="form-group">
              <label class="form-label">Servicios Profesionales *</label>
              <textarea
                class="form-textarea"
                id="hoja-services"
                rows="4"
                placeholder="Describe los servicios a prestar al cliente..."
              >${c.services || ""}</textarea>
              <span class="form-hint">Descripción de los servicios legales a prestar</span>
            </div>

            <div class="form-group">
              <label class="form-label">Honorarios (€) *</label>
              <div class="input-with-suffix">
                <input
                  type="number"
                  class="form-input mono"
                  id="hoja-fees"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value="${this.calculateTotalFees()}"
                >
                <span class="input-suffix">EUR</span>
              </div>
              <span class="form-hint">Importe de los honorarios profesionales (sin IVA)</span>
            </div>
          </div>

          <!-- Workflow Progress Section -->
          <div class="hoja-workflow-section" id="workflow-section" style="display: none;">
            <div class="workflow-steps">
              <div class="workflow-step" id="step-generate">
                <div class="step-indicator step-pending">
                  <svg class="step-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <svg class="step-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <svg class="step-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <svg class="step-error" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <div class="step-content">
                  <span class="step-title">Generar PDF</span>
                  <span class="step-status" id="status-generate">Pendiente</span>
                </div>
              </div>

              <div class="workflow-step" id="step-sign">
                <div class="step-indicator step-pending">
                  <svg class="step-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                  <svg class="step-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <svg class="step-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <svg class="step-error" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <div class="step-content">
                  <span class="step-title">Firmar Digitalmente</span>
                  <span class="step-status" id="status-sign">Pendiente</span>
                </div>
              </div>

              <div class="workflow-step" id="step-send">
                <div class="step-indicator step-pending">
                  <svg class="step-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <svg class="step-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <svg class="step-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <svg class="step-error" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <div class="step-content">
                  <span class="step-title">Enviar por Email</span>
                  <span class="step-status" id="status-send">Pendiente</span>
                </div>
              </div>
            </div>

            <!-- Email Input (shown after signing) -->
            <div class="email-section" id="email-section" style="display: none;">
              <div class="form-group">
                <label class="form-label">Email del Cliente *</label>
                <input
                  type="email"
                  class="form-input"
                  id="hoja-email"
                  placeholder="cliente@ejemplo.com"
                  value="${this.caseData.clientEmail || ""}"
                >
              </div>
            </div>

            <!-- Document Preview -->
            <div class="document-preview" id="document-preview" style="display: none;">
              <div class="preview-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div class="preview-info">
                  <span class="preview-filename" id="preview-filename">hoja_encargo.pdf</span>
                  <span class="preview-status" id="preview-status">Generado</span>
                </div>
                <button class="btn btn-outline btn-sm" id="btn-download">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel">Cancelar</button>
          <button class="btn btn-primary" id="btn-action">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Generar Documento
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close modal
    this.modal.querySelector("#modal-close").addEventListener("click", () => this.close());
    this.modal.querySelector("#btn-cancel").addEventListener("click", () => this.close());

    // Close on backdrop click
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Main action button
    this.modal.querySelector("#btn-action").addEventListener("click", () => this.handleAction());

    // Download button
    this.modal.querySelector("#btn-download")?.addEventListener("click", () => this.downloadDocument());
  }

  /**
   * Handle the main action button click
   */
  async handleAction() {
    const btn = this.modal.querySelector("#btn-action");

    if (this.workflow.generate.status === "pending") {
      await this.generateDocument();
    } else if (this.workflow.sign.status === "pending" && this.workflow.generate.status === "completed") {
      await this.signDocument();
    } else if (this.workflow.send.status === "pending" && this.workflow.sign.status === "completed") {
      await this.sendDocument();
    }
  }

  /**
   * Generate the Hoja de Encargo PDF
   */
  async generateDocument() {
    const services = this.modal.querySelector("#hoja-services").value.trim();
    const fees = parseFloat(this.modal.querySelector("#hoja-fees").value);

    // Validation
    if (!services) {
      showToast("Los servicios son obligatorios", "error");
      this.modal.querySelector("#hoja-services").focus();
      return;
    }

    if (!fees || fees <= 0) {
      showToast("Los honorarios deben ser un número positivo", "error");
      this.modal.querySelector("#hoja-fees").focus();
      return;
    }

    // Update UI
    this.updateStep("generate", "loading", "Generando...");
    this.showWorkflowSection();
    this.disableActionButton();

    try {
      const result = await api.generateHojaEncargo(this.caseData.id, services, fees);

      if (result.success) {
        this.workflow.generate.status = "completed";
        this.workflow.generate.data = result.data;
        this.currentDocument = result.data;

        this.updateStep("generate", "completed", "Completado");
        this.showDocumentPreview(result.data);
        this.updateActionButton("Firmar Documento", "sign");
        showToast("Documento generado correctamente", "success");
      }
    } catch (error) {
      this.workflow.generate.status = "error";
      this.updateStep("generate", "error", error.message);
      showToast(`Error: ${error.message}`, "error");
      this.updateActionButton("Reintentar", "generate");
    }
  }

  /**
   * Sign the document digitally
   */
  async signDocument() {
    if (!this.currentDocument) {
      showToast("No hay documento para firmar", "error");
      return;
    }

    this.updateStep("sign", "loading", "Firmando...");
    this.disableActionButton();

    try {
      const result = await api.signHojaEncargo(this.caseData.id, this.currentDocument.documentId);

      if (result.success) {
        this.workflow.sign.status = "completed";
        this.workflow.sign.data = result.data;
        this.currentDocument = { ...this.currentDocument, ...result.data, signed: true };

        this.updateStep("sign", "completed", "Firmado");
        this.updatePreviewStatus("Firmado");
        this.showEmailSection();
        this.updateActionButton("Enviar por Email", "send");
        showToast("Documento firmado correctamente", "success");
      }
    } catch (error) {
      this.workflow.sign.status = "error";
      this.updateStep("sign", "error", error.message);
      showToast(`Error al firmar: ${error.message}`, "error");

      // Allow skipping signature if certificate not configured
      if (error.message.includes("certificado") || error.message.includes("certificate")) {
        this.showEmailSection();
        this.updateActionButton("Enviar sin Firma", "send");
        this.updateStep("sign", "skipped", "Omitido (sin certificado)");
      } else {
        this.updateActionButton("Reintentar Firma", "sign");
      }
    }
  }

  /**
   * Send the document via email
   */
  async sendDocument() {
    const email = this.modal.querySelector("#hoja-email").value.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showToast("Introduce un email válido", "error");
      this.modal.querySelector("#hoja-email").focus();
      return;
    }

    this.updateStep("send", "loading", "Enviando...");
    this.disableActionButton();

    try {
      const result = await api.sendHojaEncargo(
        this.caseData.id,
        this.currentDocument.documentId,
        email
      );

      if (result.success) {
        this.workflow.send.status = "completed";
        this.workflow.send.data = result.data;

        this.updateStep("send", "completed", "Enviado");
        showToast("Documento enviado correctamente", "success");

        // Show completion state
        this.modal.querySelector("#btn-action").style.display = "none";
        this.modal.querySelector("#btn-cancel").textContent = "Cerrar";
      }
    } catch (error) {
      this.workflow.send.status = "error";
      this.updateStep("send", "error", error.message);
      showToast(`Error al enviar: ${error.message}`, "error");
      this.updateActionButton("Reintentar Envío", "send");
    }
  }

  /**
   * Download the current document
   */
  downloadDocument() {
    if (!this.currentDocument || !this.currentDocument.documentId) {
      showToast("No hay documento para descargar", "error");
      return;
    }

    const downloadUrl = api.getDocumentDownloadUrl(this.currentDocument.documentId);
    window.open(downloadUrl, "_blank");
  }

  // UI Helper Methods

  /**
   * Calculate total fees from baseFee + provision
   */
  calculateTotalFees() {
    const baseFee = parseFloat(this.caseData.baseFee) || 0;
    const provision = parseFloat(this.caseData.provision) || 0;
    const total = baseFee + provision;
    return total > 0 ? total.toFixed(2) : "";
  }

  showWorkflowSection() {
    this.modal.querySelector("#form-section").style.display = "none";
    this.modal.querySelector("#workflow-section").style.display = "block";
  }

  showEmailSection() {
    this.modal.querySelector("#email-section").style.display = "block";
  }

  showDocumentPreview(data) {
    const preview = this.modal.querySelector("#document-preview");
    preview.style.display = "block";

    if (data.filename) {
      this.modal.querySelector("#preview-filename").textContent = data.filename;
    }
  }

  updatePreviewStatus(status) {
    this.modal.querySelector("#preview-status").textContent = status;
  }

  updateStep(step, status, message) {
    const stepEl = this.modal.querySelector(`#step-${step}`);
    const statusEl = this.modal.querySelector(`#status-${step}`);
    const indicator = stepEl.querySelector(".step-indicator");

    // Remove all status classes
    indicator.className = "step-indicator";

    // Add new status class
    indicator.classList.add(`step-${status}`);

    // Update status text
    statusEl.textContent = message;
  }

  updateActionButton(text, icon) {
    const btn = this.modal.querySelector("#btn-action");
    btn.disabled = false;

    let iconSvg = "";
    switch (icon) {
      case "sign":
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>`;
        break;
      case "send":
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13"/>
          <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>`;
        break;
      default:
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>`;
    }

    btn.innerHTML = `${iconSvg} ${text}`;
  }

  disableActionButton() {
    const btn = this.modal.querySelector("#btn-action");
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
      Procesando...
    `;
  }
}
