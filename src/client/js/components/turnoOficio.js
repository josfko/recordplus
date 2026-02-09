/**
 * Turno de Oficio Detail View
 * Court-appointed case management screen with real API integration
 */

import { api } from "../api.js";
import { formatDate, showToast } from "../app.js";
import { DocumentUploadModal } from "./documentUploadModal.js";
import { ConfirmModal } from "./confirmModal.js";

export class TurnoOficioView {
  constructor(container, caseId) {
    this.container = container;
    this.caseId = caseId;
    this.caseData = null;
    this.documents = [];
    this.emails = [];
    this.activeTab = "documents";
    this.saveTimeout = null;
  }

  async render() {
    try {
      // Load case data and history in parallel
      const [caseResponse, historyResponse] = await Promise.all([
        api.getCase(this.caseId),
        api.getCaseHistory(this.caseId).catch(() => ({ data: { documents: [], emails: [] } })),
      ]);

      this.caseData = caseResponse;
      this.documents = historyResponse.data?.documents || [];
      this.emails = historyResponse.data?.emails || [];
    } catch (error) {
      this.container.innerHTML = `
        <div class="error-state">
          <p>Error al cargar el expediente: ${error.message}</p>
          <a href="#/turno" class="btn btn-secondary">Volver</a>
        </div>
      `;
      return;
    }

    this.renderView();
    this.attachEventListeners();
  }

  renderView() {
    const c = this.caseData;
    const isArchived = c.state === "ARCHIVADO";
    const isFinalized = c.state === "JUDICIAL"; // JUDICIAL = Finalizado for Turno de Oficio

    this.container.innerHTML = `
      <div class="turno-oficio-view">
        <!-- Header -->
        <div class="turno-header-section">
          <nav class="turno-breadcrumb">
            <a href="#/cases" class="turno-breadcrumb-link">Expedientes</a>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <a href="#/turno" class="turno-breadcrumb-link turno-breadcrumb-amber">Turno de Oficio</a>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span class="turno-breadcrumb-current">${c.internalReference || `TO-${c.id}`}</span>
          </nav>

          <div class="turno-header-main">
            <div class="turno-header-left">
              <div class="turno-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="turno-header-info">
                <div class="turno-title-row">
                  <h1 class="turno-client-name">${c.clientName}</h1>
                  <span class="turno-status-badge ${this.getStateBadgeClass(c.state)}">${this.getStateLabel(c.state)}</span>
                </div>
                <div class="turno-meta-row">
                  <div class="turno-ref-group">
                    <span class="turno-ref-dot"></span>
                    <span class="turno-ref-label">Ref:</span>
                    <span class="turno-ref-value">${c.internalReference || `TO-${c.id}`}</span>
                  </div>
                  ${c.designation ? `
                    <span class="turno-meta-divider"></span>
                    <span class="turno-meta-type">Designación: ${c.designation}</span>
                  ` : ""}
                </div>
              </div>
            </div>
            <div class="turno-header-actions">
              ${!isArchived && !isFinalized ? `
                <button class="btn btn-secondary" id="btn-finalize">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Finalizar
                </button>
              ` : ""}
              ${isFinalized && !isArchived ? `
                <button class="btn btn-secondary" id="btn-reopen">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                  Reabrir
                </button>
              ` : ""}
              <button class="turno-print-btn" id="btn-print">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Imprimir
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="turno-content">
          <!-- Left Column - Case Data -->
          <div class="turno-sidebar">
            <!-- Datos del Justiciable -->
            <div class="glass-card">
              <h3 class="card-section-title">Datos del Justiciable</h3>
              <div class="form-fields">
                <div class="form-field">
                  <label>Referencia Interna</label>
                  <div class="input-with-icon">
                    <input type="text" class="form-input mono" value="${c.internalReference || `TO-${c.id}`}" readonly />
                    <button class="input-icon-btn" id="btn-copy-ref" title="Copiar">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="form-field">
                  <label>Nombre Completo</label>
                  <input type="text" class="form-input" value="${c.clientName}" readonly />
                </div>
                <div class="form-field">
                  <label>Fecha de Entrada</label>
                  <input type="text" class="form-input mono" value="${this.formatDateInput(c.entryDate)}" readonly />
                </div>

                <!-- Designación de Turno -->
                <div class="designation-box">
                  <div class="designation-header">
                    <span class="designation-label">Designación de Turno</span>
                    <span class="designation-required">Obligatorio</span>
                  </div>
                  <div class="designation-value">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="designation-text">${c.designation || "No especificada"}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Estado del Expediente -->
            <div class="glass-card">
              <h3 class="card-section-title">Estado del Expediente</h3>
              ${isArchived ? `
                <div class="archive-info">
                  <div class="archive-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 8v13H3V8"/>
                      <path d="M1 3h22v5H1z"/>
                      <path d="M10 12h4"/>
                    </svg>
                    Archivado
                  </div>
                  <p class="archive-date">Fecha de cierre: ${this.formatDateInput(c.closureDate)}</p>
                </div>
              ` : `
                <div class="archive-section">
                  <label class="checkbox-row">
                    <input type="checkbox" id="archive-checkbox" />
                    <span>Archivar Expediente</span>
                  </label>
                  <div class="archive-date-section" id="archive-date-section" style="display: none;">
                    <label>Fecha de Cierre (Requerida)</label>
                    <input type="date" class="form-input" id="close-date" value="${new Date().toISOString().split("T")[0]}" />
                  </div>
                  <button class="btn btn-archive" id="btn-confirm-archive" style="display: none;">
                    Confirmar Archivo
                  </button>
                </div>
              `}
            </div>
          </div>

          <!-- Center Column - Notes & Documents -->
          <div class="turno-main">
            <!-- Observaciones y Notas -->
            <div class="glass-card">
              <div class="card-header-row">
                <div class="card-header-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>Observaciones y Notas</span>
                </div>
                <span class="autosave-label" id="autosave-status">Auto-guardado activo</span>
              </div>
              <textarea
                class="notes-textarea"
                id="case-notes"
                placeholder="Escriba aquí los detalles relevantes del procedimiento, juzgado asignado, número de autos, etc..."
              >${c.observations || ""}</textarea>
            </div>

            <!-- Documents Section -->
            <div class="glass-card documents-card">
              <div class="tabs-header">
                <button class="tab-btn ${this.activeTab === "documents" ? "active" : ""}" data-tab="documents">
                  Histórico Documentos
                  ${this.documents.length > 0 ? `<span class="tab-count">${this.documents.length}</span>` : ""}
                </button>
                <button class="tab-btn ${this.activeTab === "emails" ? "active" : ""}" data-tab="emails">
                  Histórico Envíos
                  ${this.emails.length > 0 ? `<span class="tab-count">${this.emails.length}</span>` : ""}
                </button>
              </div>

              <div class="tab-content" id="tab-content">
                ${this.activeTab === "documents" ? this.renderDocuments() : this.renderEmails()}
              </div>

              ${!isArchived ? `
                <div class="upload-section">
                  <button class="btn-upload-dashed" id="btn-upload">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Subir Documento
                  </button>
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Right Column - Timeline -->
          <div class="turno-timeline">
            <div class="glass-card">
              <div class="timeline-header">
                <h3 class="card-section-title">Historial</h3>
              </div>
              <div class="timeline-content">
                ${this.renderTimeline()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDocuments() {
    const isArchived = this.caseData.state === "ARCHIVADO";

    if (this.documents.length === 0) {
      return `
        <div class="document-list-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No hay documentos subidos</p>
        </div>
      `;
    }

    return this.documents
      .map(
        (doc) => `
      <div class="document-row" data-doc-id="${doc.id}">
        <div class="document-info">
          <div class="document-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="document-details">
            <span class="document-name">${this.getDocumentName(doc)}</span>
            <span class="document-date">Subido el ${this.formatDateInput(doc.generated_at)}</span>
          </div>
        </div>
        <div class="document-actions">
          <a href="${api.getDocumentDownloadUrl(doc.id)}" class="btn-icon btn-icon-download" title="Descargar" target="_blank">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
          ${!isArchived && doc.document_type === "MANUAL_UPLOAD" ? `
            <button class="btn-icon btn-icon-delete" data-action="delete-doc" data-doc-id="${doc.id}" data-doc-name="${this.getDocumentName(doc)}" title="Eliminar documento">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          ` : ""}
        </div>
      </div>
    `
      )
      .join("");
  }

  renderEmails() {
    if (this.emails.length === 0) {
      return `
        <div class="document-list-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <p>No hay envíos registrados</p>
        </div>
      `;
    }

    return this.emails
      .map(
        (email) => `
      <div class="document-row">
        <div class="document-info">
          <div class="document-icon ${email.status === "ERROR" ? "icon-error" : "icon-success"}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div class="document-details">
            <span class="document-name">${email.subject || "Sin asunto"}</span>
            <span class="document-date">
              ${email.status === "SENT" ? "Enviado a" : "Error enviando a"} ${email.recipient} - ${this.formatDateInput(email.sent_at)}
            </span>
          </div>
        </div>
        <span class="email-status ${email.status === "SENT" ? "status-success" : "status-error"}">
          ${email.status === "SENT" ? "Enviado" : "Error"}
        </span>
      </div>
    `
      )
      .join("");
  }

  renderTimeline() {
    const events = [];
    const c = this.caseData;

    // Entry event
    events.push({
      date: this.formatDateInput(c.entryDate),
      title: "Entrada del Expediente",
      status: "completed",
    });

    // Documents uploaded
    this.documents.forEach((doc) => {
      events.push({
        date: this.formatDateInput(doc.generated_at),
        title: `Documento: ${this.getDocumentName(doc)}`,
        status: "completed",
      });
    });

    // Finalized?
    if (c.state === "JUDICIAL") {
      events.push({
        date: "",
        title: "Expediente Finalizado",
        status: "completed",
      });
    }

    // Archived?
    if (c.state === "ARCHIVADO") {
      events.push({
        date: this.formatDateInput(c.closureDate),
        title: "Expediente Archivado",
        status: "completed",
      });
    } else if (c.state === "ABIERTO") {
      events.push({
        title: "Pendiente de Finalización",
        status: "pending",
      });
    } else if (c.state === "JUDICIAL") {
      events.push({
        title: "Pendiente de Archivo",
        status: "pending",
      });
    }

    return `
      <div class="timeline-track">
        ${events
          .map(
            (event) => `
          <div class="timeline-item">
            <div class="timeline-dot ${
              event.status === "completed" ? "dot-amber" : "dot-pending"
            }"></div>
            <div class="timeline-item-content">
              ${event.date ? `<span class="timeline-date mono">${event.date}</span>` : ""}
              <span class="timeline-title ${event.status === "pending" ? "timeline-title-muted" : ""}">${event.title}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  getDocumentName(doc) {
    if (doc.file_path) {
      const parts = doc.file_path.split("/");
      return parts[parts.length - 1];
    }
    return doc.document_type === "MANUAL_UPLOAD" ? "Documento Subido" : doc.document_type;
  }

  formatDateInput(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getStateLabel(state) {
    const labels = {
      ABIERTO: "Abierto",
      JUDICIAL: "Finalizado", // For Turno de Oficio, JUDICIAL means Finalizado
      ARCHIVADO: "Archivado",
    };
    return labels[state] || state;
  }

  getStateBadgeClass(state) {
    const classes = {
      ABIERTO: "status-abierto",
      JUDICIAL: "status-finalizado",
      ARCHIVADO: "status-archivado",
    };
    return classes[state] || "";
  }

  attachEventListeners() {
    // Copy reference button
    document.getElementById("btn-copy-ref")?.addEventListener("click", async () => {
      const ref = this.caseData.internalReference || `TO-${this.caseData.id}`;
      try {
        await navigator.clipboard.writeText(ref);
        showToast("Referencia copiada", "success");
      } catch (e) {
        showToast("Error al copiar", "error");
      }
    });

    // Finalize button
    document.getElementById("btn-finalize")?.addEventListener("click", async () => {
      try {
        await api.finalizeTurnoCase(this.caseId);
        showToast("Expediente marcado como finalizado", "success");
        this.render(); // Refresh view
      } catch (error) {
        showToast("Error: " + error.message, "error");
      }
    });

    // Reopen button
    document.getElementById("btn-reopen")?.addEventListener("click", async () => {
      try {
        await api.reopenTurnoCase(this.caseId);
        showToast("Expediente reabierto", "success");
        this.render(); // Refresh view
      } catch (error) {
        showToast("Error: " + error.message, "error");
      }
    });

    // Archive checkbox
    const archiveCheckbox = document.getElementById("archive-checkbox");
    const archiveDateSection = document.getElementById("archive-date-section");
    const confirmBtn = document.getElementById("btn-confirm-archive");

    archiveCheckbox?.addEventListener("change", () => {
      if (archiveCheckbox.checked) {
        archiveDateSection.style.display = "block";
        confirmBtn.style.display = "block";
      } else {
        archiveDateSection.style.display = "none";
        confirmBtn.style.display = "none";
      }
    });

    // Confirm archive
    confirmBtn?.addEventListener("click", async () => {
      const closeDate = document.getElementById("close-date")?.value;
      if (!closeDate) {
        showToast("Debe indicar la fecha de cierre", "error");
        return;
      }
      try {
        await api.archiveCase(this.caseId, closeDate);
        showToast("Expediente archivado correctamente", "success");
        window.location.hash = "#/turno";
      } catch (error) {
        showToast("Error al archivar: " + error.message, "error");
      }
    });

    // Notes auto-save
    const notesTextarea = document.getElementById("case-notes");
    const autosaveStatus = document.getElementById("autosave-status");

    notesTextarea?.addEventListener("input", () => {
      clearTimeout(this.saveTimeout);
      autosaveStatus.textContent = "Guardando...";
      autosaveStatus.classList.add("saving");

      this.saveTimeout = setTimeout(async () => {
        try {
          await api.updateCase(this.caseId, { observations: notesTextarea.value });
          autosaveStatus.textContent = "Guardado";
          autosaveStatus.classList.remove("saving");
          setTimeout(() => {
            autosaveStatus.textContent = "Auto-guardado activo";
          }, 2000);
        } catch (error) {
          console.error("Error saving notes:", error);
          autosaveStatus.textContent = "Error al guardar";
          autosaveStatus.classList.add("error");
        }
      }, 1000);
    });

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeTab = btn.dataset.tab;

        const tabContent = document.getElementById("tab-content");
        if (tabContent) {
          tabContent.innerHTML = this.activeTab === "documents" ? this.renderDocuments() : this.renderEmails();
        }
      });
    });

    // Upload button
    document.getElementById("btn-upload")?.addEventListener("click", () => {
      const modal = new DocumentUploadModal(this.caseData, () => {
        this.render(); // Refresh after upload
      });
      modal.show();
    });

    // Print button
    document.getElementById("btn-print")?.addEventListener("click", () => {
      window.print();
    });

    // Document delete buttons
    document.querySelectorAll("[data-action='delete-doc']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const docId = btn.dataset.docId;
        const docName = btn.dataset.docName;
        this.showDeleteConfirmation(docId, docName);
      });
    });
  }

  showDeleteConfirmation(docId, docName) {
    const modal = new ConfirmModal({
      title: "Eliminar Documento",
      message: `¿Está seguro de que desea eliminar "${docName}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        await this.deleteDocument(docId);
      },
    });
    modal.show();
  }

  async deleteDocument(docId) {
    try {
      await api.deleteTurnoDocument(this.caseId, docId);
      showToast("Documento eliminado correctamente", "success");

      // Animate the row removal
      const row = document.querySelector(`.document-row[data-doc-id="${docId}"]`);
      if (row) {
        row.classList.add("document-row-removing");
        setTimeout(() => {
          // Remove from local array and re-render
          this.documents = this.documents.filter(d => d.id !== parseInt(docId));
          const tabContent = document.getElementById("tab-content");
          if (tabContent && this.activeTab === "documents") {
            tabContent.innerHTML = this.renderDocuments();
            this.attachDocumentDeleteListeners();
          }
          // Update document count in tab
          this.updateDocumentCount();
        }, 300);
      }
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
      throw error; // Re-throw to keep modal open
    }
  }

  attachDocumentDeleteListeners() {
    document.querySelectorAll("[data-action='delete-doc']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const docId = btn.dataset.docId;
        const docName = btn.dataset.docName;
        this.showDeleteConfirmation(docId, docName);
      });
    });
  }

  updateDocumentCount() {
    const tabBtn = document.querySelector("[data-tab='documents']");
    if (tabBtn) {
      const countSpan = tabBtn.querySelector(".tab-count");
      if (this.documents.length > 0) {
        if (countSpan) {
          countSpan.textContent = this.documents.length;
        } else {
          tabBtn.insertAdjacentHTML("beforeend", `<span class="tab-count">${this.documents.length}</span>`);
        }
      } else if (countSpan) {
        countSpan.remove();
      }
    }
  }
}
