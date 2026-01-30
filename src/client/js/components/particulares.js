/**
 * Particulares View
 * Engagement letter (Hoja de Encargo) screen for PARTICULAR cases
 */

import { api } from "../api.js";
import { showToast, formatDate } from "../app.js";
import { HojaEncargoModal } from "./hojaEncargoModal.js";

export class ParticularesView {
  constructor(container, caseId) {
    this.container = container;
    this.caseId = caseId;
    this.caseData = null;
    this.config = null;
    this.history = { documents: [], emails: [] };
  }

  async render() {
    // Load case data and config
    try {
      const [caseResult, configResult] = await Promise.all([
        api.getCase(this.caseId),
        api.getConfig(),
      ]);
      this.caseData = caseResult;
      this.config = configResult.data || configResult;

      // Load document history
      try {
        const historyResult = await api.getCaseHistory(this.caseId);
        this.history = historyResult.data || { documents: [], emails: [] };
      } catch (e) {
        this.history = { documents: [], emails: [] };
      }
    } catch (error) {
      this.container.innerHTML = `
        <div class="error-state">
          <p>Error al cargar el expediente: ${error.message}</p>
          <a href="#/cases" class="btn btn-secondary">Volver a Expedientes</a>
        </div>
      `;
      return;
    }

    // Only PARTICULAR cases can use this view
    if (this.caseData.type !== "PARTICULAR") {
      this.container.innerHTML = `
        <div class="error-state">
          <p>Este módulo solo está disponible para expedientes Particulares.</p>
          <a href="#/cases/${this.caseId}" class="btn btn-secondary">Volver al Expediente</a>
        </div>
      `;
      return;
    }

    this.renderView();
    this.attachEventListeners();
  }

  renderView() {
    const c = this.caseData;
    const cfg = this.config;

    // Calculate invoice amounts
    const baseFee = parseFloat(c.baseFee) || 1500;
    const provision = parseFloat(c.provision) || 500;
    const vatRate = parseFloat(cfg.particular_vat_rate) || 21;
    const subtotal = baseFee + provision;
    const vatAmount = (subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    // Status display
    const statusInfo = this.getStatusInfo(c.state);

    this.container.innerHTML = `
      <div class="particulares-view">
        <!-- Header -->
        <div class="particulares-header">
          <div class="particulares-header-top">
            <nav class="breadcrumb">
              <a href="#/cases">Expedientes</a>
              <span class="separator">›</span>
              <span class="current text-green">Particular</span>
              <span class="separator">›</span>
              <span class="current">${c.internalReference}</span>
            </nav>
          </div>
          
          <div class="particulares-header-main">
            <div class="particulares-client-info">
              <div class="client-avatar client-avatar-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="client-details">
                <div class="client-name-row">
                  <h1>${c.clientName}</h1>
                  <span class="badge badge-blue">${statusInfo.label}</span>
                </div>
                <div class="client-refs">
                  <span class="ref-item">
                    <span class="ref-dot ref-dot-green"></span>
                    <span class="ref-label">Ref:</span>
                    <span class="ref-value">${c.internalReference}</span>
                  </span>
                  <span class="ref-divider"></span>
                  <span class="ref-item">
                    <span class="ref-label">Particular</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div class="particulares-actions">
              <a href="#/cases/${c.id}/edit" class="btn btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar Ficha
              </a>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="particulares-content">
          <!-- Left Column: Client Data -->
          <div class="particulares-sidebar">
            <!-- Client Data Card -->
            <div class="card card-glass">
              <h3 class="card-section-title">Datos del Cliente</h3>
              
              <div class="form-group">
                <label class="form-label">Referencia Interna (Auto)</label>
                <div class="input-readonly input-readonly-dark">
                  <span class="mono">${c.internalReference}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Nombre Completo</label>
                <div class="input-display">
                  <span>${c.clientName}</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Entrada</label>
                <div class="input-display">
                  <span class="mono">${this.formatDateInput(c.entryDate)}</span>
                </div>
              </div>

              <div class="divider"></div>

              <div class="form-group">
                <label class="form-label">Email de Contacto</label>
                <div class="input-display">
                  <span>${c.clientEmail || "-"}</span>
                </div>
              </div>
            </div>

            <!-- Archive Card -->
            <div class="card card-glass card-danger">
              <div class="card-danger-overlay"></div>
              <div class="card-header-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h3 class="card-section-title card-section-title-danger">Finalizar Expediente</h3>
              </div>
              <p class="card-description-danger">
                Requiere fecha de cierre. El estado cambiará automáticamente a "Archivado".
              </p>
              <div class="archive-form">
                <div class="form-group">
                  <label class="form-label form-label-danger">Fecha de Cierre</label>
                  <input type="date" class="form-input form-input-danger" id="closure-date" value="${
                    new Date().toISOString().split("T")[0]
                  }">
                </div>
                <button class="btn btn-danger-full" id="btn-archive">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Marcar como Finalizado
                </button>
              </div>
            </div>
          </div>

          <!-- Center Column: Hoja de Encargo -->
          <div class="particulares-main">
            <div class="card card-glass card-green">
              <!-- Card Header -->
              <div class="card-header-green">
                <div class="card-header-left">
                  <div class="icon-box icon-box-green">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div class="card-header-text">
                    <span class="card-title">Hoja de Encargo</span>
                    <span class="card-subtitle-green">Generación Automática • Plantilla v2</span>
                  </div>
                </div>
                <button class="btn-icon" title="Expandir">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              
              <!-- Card Content -->
              <div class="hoja-encargo-content">
                <div class="form-group">
                  <label class="form-label">Servicios Contratados</label>
                  <textarea class="form-textarea form-textarea-large" id="services" placeholder="Descripción de los servicios contratados...">${
                    c.services ||
                    "Reclamación extrajudicial y judicial por incumplimiento de contrato de obra. Incluye redacción de burofax y demanda."
                  }</textarea>
                </div>

                <div class="form-row">
                  <div class="form-group form-group-half">
                    <label class="form-label">Honorarios Base</label>
                    <div class="input-currency">
                      <span class="currency-symbol">€</span>
                      <input type="number" class="form-input form-input-currency" id="base-fee" value="${baseFee.toFixed(
                        2
                      )}" step="0.01">
                    </div>
                  </div>
                  <div class="form-group form-group-half">
                    <label class="form-label">Provisión de Fondos</label>
                    <div class="input-currency">
                      <span class="currency-symbol">€</span>
                      <input type="number" class="form-input form-input-currency" id="provision" value="${provision.toFixed(
                        2
                      )}" step="0.01">
                    </div>
                  </div>
                </div>

                <!-- Totals Box -->
                <div class="totals-box">
                  <div class="totals-left">
                    <div class="total-row">
                      <span class="total-label">IVA (${vatRate}%):</span>
                      <span class="total-value" id="vat-amount">${this.formatCurrency(
                        vatAmount
                      )}</span>
                    </div>
                    <div class="total-row">
                      <span class="total-label">Total Estimado:</span>
                      <span class="total-value" id="subtotal-amount">${this.formatCurrency(
                        totalAmount
                      )}</span>
                    </div>
                  </div>
                  <div class="totals-right">
                    <span class="total-label-green">Total Hoja Encargo</span>
                    <span class="total-amount-large" id="total-amount">${this.formatCurrency(
                      totalAmount
                    )}</span>
                  </div>
                </div>

                <div class="divider-gradient"></div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                  <button class="btn btn-action" id="btn-export-pdf">
                    <div class="btn-action-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </div>
                    <span>Exportar PDF</span>
                  </button>
                  <button class="btn btn-action" id="btn-sign">
                    <div class="btn-action-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                        <path d="M2 2l7.586 7.586"/>
                        <circle cx="11" cy="11" r="2"/>
                      </svg>
                    </div>
                    <span>Firma Digital</span>
                  </button>
                  <button class="btn btn-action-primary" id="btn-send">
                    <div class="btn-action-icon-primary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13"/>
                        <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                    </div>
                    <span>Enviar a Cliente</span>
                  </button>
                </div>
              </div>

              <!-- Card Footer -->
              <div class="card-footer-green">
                <div class="status-indicator">
                  <span class="status-dot status-dot-green"></span>
                  <span>Listo para enviar</span>
                </div>
                <span class="template-name mono">PLANTILLA_PARTICULAR_V2.PDF</span>
              </div>
            </div>
          </div>

          <!-- Right Column: History -->
          <div class="particulares-history">
            <div class="card card-glass">
              <div class="card-header-simple">
                <h3 class="card-section-title">Historial</h3>
                <button class="btn-icon" title="Actualizar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
              </div>
              
              <div class="timeline">
                ${this.renderTimeline(c)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTimeline(c) {
    const events = [];
    const history = this.history || { documents: [], emails: [] };

    // Add document history events
    if (history.documents && history.documents.length > 0) {
      history.documents.forEach((doc) => {
        events.push({
          date: doc.createdAt,
          title: doc.signed ? "Hoja de Encargo Firmada" : "Hoja de Encargo Generada",
          type: "document",
          color: doc.signed ? "green" : "indigo",
          documents: [{
            id: doc.id,
            name: doc.filename,
            signed: doc.signed,
          }],
        });
      });
    }

    // Add email history events
    if (history.emails && history.emails.length > 0) {
      history.emails.forEach((email) => {
        const isError = email.status === "ERROR";
        events.push({
          date: email.sentAt,
          title: isError ? "Error al Enviar Email" : "Hoja de Encargo Enviada",
          type: "email",
          color: isError ? "red" : "green",
          emailDetails: {
            to: email.toAddress,
            subject: email.subject,
            status: email.status,
            error: email.errorMessage,
          },
        });
      });
    }

    // Case creation
    events.push({
      date: c.entryDate,
      title: `Alta de Expediente <span class="text-green">${c.internalReference}</span>`,
      user: null,
      type: "created",
      color: "indigo",
      tags: ["Particular"],
    });

    // Sort events by date descending (most recent first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (events.length === 0) {
      return '<p class="timeline-empty">No hay eventos registrados</p>';
    }

    return events
      .map(
        (event) => `
      <div class="timeline-item">
        <div class="timeline-dot timeline-dot-${event.color}"></div>
        <div class="timeline-content">
          <span class="timeline-date mono">${this.formatTimelineDate(
            event.date
          )}</span>
          <p class="timeline-title">${event.title}</p>
          ${
            event.user ? `<span class="timeline-user">${event.user}</span>` : ""
          }
          ${
            event.tags
              ? `
            <div class="timeline-tags">
              ${event.tags
                .map((tag) => `<span class="timeline-tag">${tag}</span>`)
                .join("")}
            </div>
          `
              : ""
          }
          ${
            event.documents
              ? `
            <div class="timeline-documents">
              ${event.documents.map((doc) => `
                <div class="timeline-doc timeline-doc-clickable" data-doc-id="${doc.id}">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span class="timeline-doc-link">${doc.name}</span>
                  ${doc.signed ? '<span class="badge badge-signed">Firmado</span>' : ""}
                </div>
              `).join("")}
            </div>
          `
              : ""
          }
          ${
            event.emailDetails
              ? `
            <div class="timeline-email">
              <div class="timeline-email-row">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span class="timeline-email-to">${event.emailDetails.to}</span>
              </div>
              ${event.emailDetails.status === "ERROR" ? `
                <span class="timeline-email-error">${event.emailDetails.error || "Error desconocido"}</span>
              ` : ""}
            </div>
          `
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");
  }

  getStatusInfo(state) {
    switch (state) {
      case "JUDICIAL":
        return { label: "Judicial", color: "yellow" };
      case "ARCHIVADO":
        return { label: "Archivado", color: "gray" };
      default:
        return { label: "Activo", color: "blue" };
    }
  }

  formatDateInput(dateStr) {
    if (!dateStr) return "--/--/----";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  formatTimelineDate(dateStr) {
    if (!dateStr) return "Pendiente";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    }

    const day = date.getDate();
    const months = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${day} ${months[date.getMonth()]}, ${hours}:${mins}`;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }

  updateTotals() {
    const baseFee = parseFloat(document.getElementById("base-fee").value) || 0;
    const provision =
      parseFloat(document.getElementById("provision").value) || 0;
    const vatRate = parseFloat(this.config.particular_vat_rate) || 21;

    const subtotal = baseFee + provision;
    const vatAmount = (subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    document.getElementById("vat-amount").textContent =
      this.formatCurrency(vatAmount);
    document.getElementById("subtotal-amount").textContent =
      this.formatCurrency(totalAmount);
    document.getElementById("total-amount").textContent =
      this.formatCurrency(totalAmount);
  }

  attachEventListeners() {
    // Update totals on input change
    document
      .getElementById("base-fee")
      ?.addEventListener("input", () => this.updateTotals());
    document
      .getElementById("provision")
      ?.addEventListener("input", () => this.updateTotals());

    // Open Hoja de Encargo modal (Export PDF, Sign, Send buttons)
    const openModal = () => {
      if (this.caseData.state === "ARCHIVADO") {
        showToast("No se pueden generar documentos en expedientes archivados", "error");
        return;
      }
      const modal = new HojaEncargoModal(this.caseData, this.config, async () => {
        // Refresh the view when modal closes
        await this.render();
      });
      modal.open();
    };

    document.getElementById("btn-export-pdf")?.addEventListener("click", openModal);
    document.getElementById("btn-sign")?.addEventListener("click", openModal);
    document.getElementById("btn-send")?.addEventListener("click", openModal);

    // Archive case
    document
      .getElementById("btn-archive")
      ?.addEventListener("click", async () => {
        const closureDate = document.getElementById("closure-date").value;
        if (!closureDate) {
          showToast("Selecciona una fecha de cierre", "error");
          return;
        }

        if (
          !confirm(
            "¿Estás seguro de finalizar este expediente? Esta acción no se puede deshacer."
          )
        ) {
          return;
        }

        try {
          await api.archiveCase(this.caseId, closureDate);
          showToast("Expediente finalizado correctamente", "success");
          window.location.hash = `#/cases/${this.caseId}`;
        } catch (error) {
          showToast(`Error: ${error.message}`, "error");
        }
      });

    // Save services on blur
    document.getElementById("services")?.addEventListener("blur", async (e) => {
      try {
        await api.updateCase(this.caseId, { services: e.target.value });
      } catch (error) {
        console.error("Error saving services:", error);
      }
    });

    // Save fees on blur
    document.getElementById("base-fee")?.addEventListener("blur", async (e) => {
      try {
        await api.updateCase(this.caseId, {
          baseFee: parseFloat(e.target.value) || 0,
        });
      } catch (error) {
        console.error("Error saving base fee:", error);
      }
    });

    document
      .getElementById("provision")
      ?.addEventListener("blur", async (e) => {
        try {
          await api.updateCase(this.caseId, {
            provision: parseFloat(e.target.value) || 0,
          });
        } catch (error) {
          console.error("Error saving provision:", error);
        }
      });

    // Document download clicks
    document.querySelectorAll(".timeline-doc-clickable").forEach((el) => {
      el.addEventListener("click", () => {
        const docId = el.dataset.docId;
        if (!docId) return;
        const downloadUrl = api.getDocumentDownloadUrl(docId);
        window.open(downloadUrl, "_blank");
      });
    });

    // Refresh history button
    document
      .querySelector(".particulares-history .btn-icon")
      ?.addEventListener("click", async () => {
        try {
          const historyResult = await api.getCaseHistory(this.caseId);
          this.history = historyResult.data || { documents: [], emails: [] };

          // Re-render timeline
          const timelineContainer = document.querySelector(".timeline");
          if (timelineContainer) {
            timelineContainer.innerHTML = this.renderTimeline(this.caseData);
            // Re-attach document click listeners
            document.querySelectorAll(".timeline-doc-clickable").forEach((el) => {
              el.addEventListener("click", () => {
                const docId = el.dataset.docId;
                if (!docId) return;
                const downloadUrl = api.getDocumentDownloadUrl(docId);
                window.open(downloadUrl, "_blank");
              });
            });
          }
          showToast("Historial actualizado", "success");
        } catch (error) {
          showToast(`Error: ${error.message}`, "error");
        }
      });
  }
}
