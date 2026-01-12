/**
 * Turno de Oficio Detail View
 * Court-appointed case management screen
 */

import { api } from "../api.js";
import { formatDate, showToast } from "../app.js";

export class TurnoOficioView {
  constructor(container, caseId) {
    this.container = container;
    this.caseId = caseId;
    this.caseData = null;
    this.activeTab = "documents";
  }

  async render() {
    try {
      this.caseData = await api.getCase(this.caseId);
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
            <span class="turno-breadcrumb-current">${c.internalReference}</span>
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
                  <span class="turno-status-badge">${this.getStateLabel(
                    c.state
                  )}</span>
                </div>
                <div class="turno-meta-row">
                  <div class="turno-ref-group">
                    <span class="turno-ref-dot"></span>
                    <span class="turno-ref-label">Ref:</span>
                    <span class="turno-ref-value">${c.internalReference}</span>
                  </div>
                  <span class="turno-meta-divider"></span>
                  <span class="turno-meta-type">Turno de Oficio - Penal</span>
                </div>
              </div>
            </div>
            <button class="turno-print-btn" id="btn-print">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir Ficha
            </button>
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
                    <input type="text" class="form-input mono" value="${
                      c.internalReference
                    }" readonly />
                    <button class="input-icon-btn" title="Copiar">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="form-field">
                  <label>Nombre Completo</label>
                  <input type="text" class="form-input" value="${
                    c.clientName
                  }" readonly />
                </div>
                <div class="form-field">
                  <label>Fecha de Entrada</label>
                  <input type="text" class="form-input mono" value="${this.formatDateInput(
                    c.entryDate
                  )}" readonly />
                </div>

                <!-- Designación de Turno -->
                <div class="designation-box">
                  <div class="designation-header">
                    <span class="designation-label">Designación de<br/>Turno</span>
                    <span class="designation-required">Obligatorio</span>
                  </div>
                  <div class="designation-file">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="designation-filename">Designacion_2024_00…</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Estado del Expediente -->
            <div class="glass-card">
              <h3 class="card-section-title">Estado del Expediente</h3>
              <div class="archive-section">
                <label class="checkbox-row">
                  <input type="checkbox" id="archive-checkbox" ${
                    c.state === "ARCHIVADO" ? "checked" : ""
                  } />
                  <span>Archivar Expediente</span>
                </label>
                <div class="archive-date-section">
                  <label>Fecha de Cierre (Requerida)</label>
                  <input type="date" class="form-input" id="close-date" value="${
                    c.closeDate || ""
                  }" />
                </div>
                <button class="btn btn-archive" id="btn-confirm-archive" disabled>
                  Confirmar Archivo
                </button>
              </div>
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
                <span class="autosave-label">Auto-guardado activo</span>
              </div>
              <textarea class="notes-textarea" id="case-notes" placeholder="Escriba aquí los detalles relevantes del procedimiento, juzgado asignado, número de autos, etc...">${
                c.notes || ""
              }</textarea>
            </div>

            <!-- Documents Section -->
            <div class="glass-card documents-card">
              <div class="tabs-header">
                <button class="tab-btn ${
                  this.activeTab === "documents" ? "active" : ""
                }" data-tab="documents">
                  Histórico Documentos
                </button>
                <button class="tab-btn ${
                  this.activeTab === "sends" ? "active" : ""
                }" data-tab="sends">
                  Histórico Envíos
                </button>
              </div>

              <div class="documents-list" id="documents-list">
                ${this.renderDocuments()}
              </div>

              <div class="upload-section">
                <button class="btn-upload-dashed">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Subir Documento
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column - Timeline -->
          <div class="turno-timeline">
            <div class="glass-card">
              <div class="timeline-header">
                <h3 class="card-section-title">Flujo del Expediente</h3>
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
    // Mock documents for now
    const documents = [
      { name: "Escrito Defensa.pdf", date: "02/03/2024", type: "generated" },
      {
        name: "Notificación Juzgado.pdf",
        date: "01/03/2024",
        type: "uploaded",
      },
    ];

    return documents
      .map(
        (doc) => `
      <div class="document-row">
        <div class="document-info">
          <div class="document-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="document-details">
            <span class="document-name">${doc.name}</span>
            <span class="document-date">${
              doc.type === "generated" ? "Generado el" : "Subido el"
            } ${doc.date}</span>
          </div>
        </div>
        <button class="btn-icon" title="Descargar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    `
      )
      .join("");
  }

  renderTimeline() {
    const events = [
      {
        date: "01 Mar, 10:00",
        title: "Entrada Expediente",
        user: "Usuario: Admin",
        status: "completed",
      },
      {
        date: "01 Mar, 10:05",
        title: "Designación Adjuntada",
        status: "completed",
      },
      { title: "Pendiente de Finalización", status: "pending" },
    ];

    return `
      <div class="timeline-track">
        ${events
          .map(
            (event, index) => `
          <div class="timeline-item">
            <div class="timeline-dot ${
              event.status === "completed"
                ? "dot-amber"
                : event.status === "pending"
                ? "dot-pending"
                : "dot-gray"
            }"></div>
            <div class="timeline-item-content">
              ${
                event.date
                  ? `<span class="timeline-date mono">${event.date}</span>`
                  : ""
              }
              <span class="timeline-title ${
                event.status === "pending" ? "timeline-title-muted" : ""
              }">${event.title}</span>
              ${
                event.user
                  ? `<span class="timeline-user">${event.user}</span>`
                  : ""
              }
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  formatDateInput(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getStateLabel(state) {
    const labels = {
      ABIERTO: "Abierto",
      JUDICIAL: "Judicial",
      ARCHIVADO: "Archivado",
    };
    return labels[state] || state;
  }

  attachEventListeners() {
    // Archive checkbox
    const archiveCheckbox = document.getElementById("archive-checkbox");
    const confirmBtn = document.getElementById("btn-confirm-archive");
    const closeDate = document.getElementById("close-date");

    archiveCheckbox?.addEventListener("change", () => {
      confirmBtn.disabled = !archiveCheckbox.checked || !closeDate.value;
    });

    closeDate?.addEventListener("change", () => {
      confirmBtn.disabled = !archiveCheckbox.checked || !closeDate.value;
    });

    // Confirm archive
    confirmBtn?.addEventListener("click", async () => {
      if (!closeDate.value) {
        showToast("Debe indicar la fecha de cierre", "error");
        return;
      }
      try {
        await api.updateCase(this.caseId, {
          state: "ARCHIVADO",
          closeDate: closeDate.value,
        });
        showToast("Expediente archivado correctamente", "success");
        window.location.hash = "#/turno";
      } catch (error) {
        showToast("Error al archivar: " + error.message, "error");
      }
    });

    // Notes auto-save
    let saveTimeout;
    const notesTextarea = document.getElementById("case-notes");
    notesTextarea?.addEventListener("input", () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        try {
          await api.updateCase(this.caseId, { notes: notesTextarea.value });
        } catch (error) {
          console.error("Error saving notes:", error);
        }
      }, 1000);
    });

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeTab = btn.dataset.tab;
      });
    });

    // Print button
    document.getElementById("btn-print")?.addEventListener("click", () => {
      showToast("Función de impresión en desarrollo", "info");
    });
  }
}
