/**
 * Facturación ARAG View
 * Billing screen for ARAG cases - generate invoices and travel expenses
 */

import { api } from "../api.js";
import { showToast, formatDate } from "../app.js";

export class FacturacionAragView {
  constructor(container, caseId) {
    this.container = container;
    this.caseId = caseId;
    this.caseData = null;
    this.config = null;
  }

  async render() {
    // Load case data, config, and history
    try {
      const [caseResult, configResult] = await Promise.all([
        api.getCase(this.caseId),
        api.getConfig(),
      ]);
      // API returns case directly, config has .data wrapper
      this.caseData = caseResult;
      this.config = configResult.data || configResult;

      // Load history
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

    // Only ARAG cases can use this view
    if (this.caseData.type !== "ARAG") {
      this.container.innerHTML = `
        <div class="error-state">
          <p>Este módulo solo está disponible para expedientes ARAG.</p>
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
    const baseRate = parseFloat(cfg.arag_base_fee) || 203;
    const vatRate = parseFloat(cfg.vat_rate) || 21;
    const vatAmount = (baseRate * vatRate) / 100;
    const totalAmount = baseRate + vatAmount;

    // Get mileage for district - use mapping to handle special characters
    const districtToKeyMap = {
      "Torrox": "mileage_torrox",
      "Vélez-Málaga": "mileage_velez_malaga",
      "Torremolinos": "mileage_torremolinos",
      "Fuengirola": "mileage_fuengirola",
      "Marbella": "mileage_marbella",
      "Estepona": "mileage_estepona",
      "Antequera": "mileage_antequera",
    };
    const districtKey = districtToKeyMap[c.judicialDistrict] || "";
    const mileageAmount = districtKey ? (parseFloat(cfg[districtKey]) || 0) : 0;

    // Status display
    const statusInfo = this.getStatusInfo(c.state);

    this.container.innerHTML = `
      <div class="facturacion-arag">
        <!-- Header -->
        <div class="facturacion-header">
          <div class="facturacion-header-top">
            <nav class="breadcrumb">
              <a href="#/">Dashboard</a>
              <span class="separator">›</span>
              <a href="#/cases">Expedientes</a>
              <span class="separator">›</span>
              <span class="current">ARAG</span>
              <span class="separator">›</span>
              <span class="current">${
                c.aragReference || c.internalReference
              }</span>
            </nav>
          </div>
          
          <div class="facturacion-header-main">
            <div class="facturacion-client-info">
              <div class="client-avatar client-avatar-indigo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="client-details">
                <div class="client-name-row">
                  <h1>${c.clientName}</h1>
                  <span class="badge badge-judicial">${statusInfo.label}</span>
                </div>
                <div class="client-refs">
                  <span class="ref-item">
                    <span class="ref-dot ref-dot-indigo"></span>
                    <span class="ref-label">ARAG:</span>
                    <span class="ref-value">${c.aragReference || "-"}</span>
                  </span>
                  <span class="ref-divider"></span>
                  <span class="ref-item">
                    <span class="ref-label">Ref:</span>
                    <span class="ref-value">${c.internalReference}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div class="facturacion-actions">
              <a href="#/cases/${c.id}" class="btn btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Volver a Ficha
              </a>
              <button class="btn btn-danger-outline" id="btn-close-case">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                Archivar
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="facturacion-content">
          <!-- Left Column: Case Data -->
          <div class="facturacion-sidebar">
            <!-- Case Data Card -->
            <div class="card card-glass">
              <h3 class="card-section-title">Datos del Expediente</h3>
              
              <div class="form-group">
                <label class="form-label">Fecha de Entrada</label>
                <div class="input-readonly">
                  <span class="mono">${this.formatDateInput(c.entryDate)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Estado Procesal</label>
                ${c.state === "ARCHIVADO"
                  ? `<div class="status-display status-${statusInfo.color}">
                      <span class="status-dot"></span>
                      <span>${statusInfo.text}</span>
                    </div>`
                  : `<div class="select-wrapper select-wrapper-status select-wrapper-${statusInfo.color}">
                      <select class="form-select form-select-status" id="estado-procesal">
                        <option value="ABIERTO" ${c.state === "ABIERTO" ? "selected" : ""}>Abierto</option>
                        <option value="JUDICIAL" ${c.state === "JUDICIAL" ? "selected" : ""}>Judicial</option>
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>`
                }
                ${
                  c.judicialDate
                    ? `<p class="form-hint">Pasado a judicial el ${formatDate(
                        c.judicialDate,
                      )}</p>`
                    : ""
                }
              </div>

              <div class="divider"></div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="observations" placeholder="Añadir notas internas...">${
                  c.observations || ""
                }</textarea>
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
                <h3 class="card-section-title card-section-title-danger">Archivar Expediente</h3>
              </div>
              <p class="card-description-danger">
                Requerido para archivar. El estado pasará a "Archivado" permanentemente.
              </p>
              <div class="archive-form">
                <input type="date" class="form-input form-input-danger" id="closure-date" value="${
                  new Date().toISOString().split("T")[0]
                }">
                <button class="btn btn-danger-icon" id="btn-archive">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Center Column: Invoicing -->
          <div class="facturacion-main">
            <!-- Minuta ARAG Card -->
            <div class="card card-glass card-indigo">
              <div class="card-header-indigo">
                <div class="card-header-left">
                  <div class="icon-box icon-box-indigo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <span class="card-title">Minuta ARAG Fija</span>
                </div>
                <span class="badge badge-auto">Automático</span>
              </div>
              
              <div class="minuta-content">
                <div class="minuta-breakdown">
                  <div class="minuta-row">
                    <span class="minuta-label">Honorarios Base</span>
                    <span class="minuta-value mono">${this.formatCurrency(
                      baseRate,
                    )}</span>
                  </div>
                  <div class="minuta-row">
                    <span class="minuta-label">IVA (${vatRate}%)</span>
                    <span class="minuta-value mono">${this.formatCurrency(
                      vatAmount,
                    )}</span>
                  </div>
                  <div class="divider"></div>
                  <div class="minuta-row minuta-total">
                    <span class="minuta-label-total">Total a Facturar</span>
                    <span class="minuta-value-total mono">${this.formatCurrency(
                      totalAmount,
                    )}</span>
                  </div>
                </div>
                
                <div class="minuta-info">
                  <div class="minuta-features">
                    <div class="feature-item">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Plantilla PDF v2.4</span>
                    </div>
                    <div class="feature-item">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Firma Digital Auto</span>
                    </div>
                    <div class="feature-item">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <span>Envío a<br>${
                        cfg.arag_email ||
                        "facturacionsiniestros@arag.es"
                      }</span>
                    </div>
                  </div>
                  <button class="btn btn-primary btn-generate" id="btn-generate-minuta">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 2L11 13"/>
                      <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    Generar y Enviar
                  </button>
                </div>
              </div>
            </div>

            <!-- Suplidos Card -->
            <div class="card card-glass">
              <div class="card-header-simple">
                <div class="card-header-left">
                  <div class="icon-box icon-box-gray">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                    </svg>
                  </div>
                  <span class="card-title">Suplidos por Desplazamiento</span>
                </div>
                <span class="card-subtitle">Módulo Judicial</span>
              </div>
              
              <div class="suplidos-content">
                <div class="suplidos-form">
                  <div class="form-group form-group-wide">
                    <label class="form-label form-label-upper">Partido Judicial (Destino)</label>
                    <div class="select-wrapper">
                      <select class="form-select" id="suplido-district">
                        <option value="">Seleccionar destino...</option>
                        <option value="torrox" ${
                          c.judicialDistrict === "Torrox" ? "selected" : ""
                        }>Torrox</option>
                        <option value="velez-malaga" ${
                          c.judicialDistrict === "Vélez-Málaga"
                            ? "selected"
                            : ""
                        }>Vélez-Málaga</option>
                        <option value="torremolinos" ${
                          c.judicialDistrict === "Torremolinos"
                            ? "selected"
                            : ""
                        }>Torremolinos</option>
                        <option value="fuengirola" ${
                          c.judicialDistrict === "Fuengirola" ? "selected" : ""
                        }>Fuengirola</option>
                        <option value="marbella" ${
                          c.judicialDistrict === "Marbella" ? "selected" : ""
                        }>Marbella</option>
                        <option value="estepona" ${
                          c.judicialDistrict === "Estepona" ? "selected" : ""
                        }>Estepona</option>
                        <option value="antequera" ${
                          c.judicialDistrict === "Antequera" ? "selected" : ""
                        }>Antequera</option>
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>
                  <div class="form-group form-group-narrow">
                    <label class="form-label form-label-right">Importe Calc.</label>
                    <div class="amount-display">
                      <span class="mono" id="suplido-amount">${this.formatCurrency(
                        mileageAmount,
                      )}</span>
                    </div>
                  </div>
                </div>
                
                <div class="suplidos-footer">
                  <label class="checkbox-label">
                    <input type="checkbox" id="include-signature" checked>
                    <span class="checkbox-custom"></span>
                    <span>Incluir Firma Digital</span>
                  </label>
                  <button class="btn btn-white" id="btn-generate-suplido" ${
                    c.state !== "JUDICIAL" ? "disabled" : ""
                  }>
                    Generar Suplido
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: History -->
          <div class="facturacion-history">
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
        // API returns snake_case and uppercase document_type
        const docType = (doc.document_type || "").toUpperCase();
        const isMinuta = docType === "MINUTA";
        const isSuplido = docType === "SUPLIDO";

        // Extract filename from file_path
        const filename = doc.file_path
          ? doc.file_path.split("/").pop()
          : `${docType.toLowerCase()}.pdf`;

        events.push({
          date: doc.created_at,
          title: isMinuta
            ? "Minuta Generada"
            : isSuplido
              ? "Suplido Generado"
              : "Documento Generado",
          type: "document",
          color: doc.signed ? "green" : "indigo",
          documents: [
            {
              id: doc.id,
              name: filename,
              type: "file",
              link: true,
              signed: doc.signed,
            },
          ],
        });
      });
    }

    // Add email history events
    if (history.emails && history.emails.length > 0) {
      history.emails.forEach((email) => {
        const isError = email.status === "ERROR";
        events.push({
          date: email.sent_at,
          title: isError ? "Error al Enviar Email" : "Email Enviado",
          type: "email",
          color: isError ? "red" : "green",
          emailDetails: {
            id: email.id,
            to: email.recipient,
            subject: email.subject,
            status: email.status,
            error: email.error_message,
          },
        });
      });
    }

    // Add state change events
    if (c.state === "JUDICIAL" && c.judicialDate) {
      events.push({
        date: c.judicialDate,
        title: `Cambio de estado a <span class="text-yellow">Judicial</span>`,
        user: "Admin",
        type: "status",
        color: "yellow",
      });
    }

    // Add case creation event
    events.push({
      date: c.entryDate,
      title: "Expediente Creado",
      user: null,
      type: "created",
      color: "gray",
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
          <span class="timeline-date mono">${this.formatTimelineDate(event.date)}</span>
          <p class="timeline-title">${event.title}</p>
          ${event.user ? `<span class="timeline-user">Usuario: ${event.user}</span>` : ""}
          ${
            event.documents
              ? `
            <div class="timeline-documents">
              ${event.documents
                .map(
                  (doc) => `
                <div class="timeline-doc ${doc.link ? "timeline-doc-clickable" : ""}" ${doc.link ? `data-doc-id="${doc.id}"` : ""}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span class="${doc.link ? "timeline-doc-link" : ""}">${doc.name}</span>
                  ${doc.signed ? '<span class="badge badge-signed">Firmado</span>' : ""}
                </div>
              `,
                )
                .join("")}
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
              <span class="timeline-email-subject">${event.emailDetails.subject}</span>
              ${
                event.emailDetails.status === "ERROR"
                  ? `
                <div class="timeline-email-error-container">
                  <span class="timeline-email-error">${event.emailDetails.error || "Error desconocido"}</span>
                  <button class="btn btn-small btn-outline retry-email-btn"
                          data-email-id="${event.emailDetails.id}"
                          data-case-id="${this.caseId}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Reintentar
                  </button>
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }
        </div>
      </div>
    `,
      )
      .join("");
  }

  getStatusInfo(state) {
    switch (state) {
      case "JUDICIAL":
        return {
          label: "Judicial",
          text: "En Vía Judicial",
          color: "yellow",
        };
      case "ARCHIVADO":
        return {
          label: "Archivado",
          text: "Archivado",
          color: "gray",
        };
      default:
        return {
          label: "Abierto",
          text: "Abierto",
          color: "green",
        };
    }
  }

  formatDateInput(dateStr) {
    if (!dateStr) return "--/--/----";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatTimelineDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Hoy, ${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
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
    return `${day} ${months[date.getMonth()]}, ${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }

  attachEventListeners() {
    // Generate Minuta
    document
      .getElementById("btn-generate-minuta")
      ?.addEventListener("click", async () => {
        const btn = document.getElementById("btn-generate-minuta");
        btn.disabled = true;
        btn.innerHTML = `
          <svg class="spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Generando...
        `;

        try {
          showToast("Generando minuta ARAG...", "info");
          const result = await api.generateMinuta(this.caseId);

          if (result.success) {
            const emailStatus = result.data.steps.find(
              (s) => s.step === "email",
            );
            if (emailStatus?.status === "completed") {
              showToast("Minuta generada y enviada correctamente", "success");
            } else if (emailStatus?.status === "skipped") {
              showToast(
                "Minuta generada. SMTP no configurado - email no enviado.",
                "warning",
              );
            } else {
              showToast("Minuta generada correctamente", "success");
            }
            // Refresh to show updated history
            await this.render();
          }
        } catch (error) {
          showToast(`Error: ${error.message}`, "error");
        } finally {
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"/>
              <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            Generar y Enviar
          `;
        }
      });

    // Generate Suplido
    document
      .getElementById("btn-generate-suplido")
      ?.addEventListener("click", async () => {
        const districtSelect = document.getElementById("suplido-district");
        const districtValue = districtSelect.value;
        if (!districtValue) {
          showToast("Selecciona un partido judicial", "error");
          return;
        }

        // Map select value to proper district name
        const districtMap = {
          torrox: "Torrox",
          "velez-malaga": "Vélez-Málaga",
          torremolinos: "Torremolinos",
          fuengirola: "Fuengirola",
          marbella: "Marbella",
          estepona: "Estepona",
          antequera: "Antequera",
        };
        const district = districtMap[districtValue] || districtValue;

        const btn = document.getElementById("btn-generate-suplido");
        btn.disabled = true;
        btn.textContent = "Generando...";

        try {
          showToast("Generando suplido...", "info");
          const result = await api.generateSuplido(this.caseId, district);

          if (result.success) {
            showToast(
              `Suplido generado: ${this.formatCurrency(result.data.amount)}`,
              "success",
            );
            // Refresh to show updated history
            await this.render();
          }
        } catch (error) {
          showToast(`Error: ${error.message}`, "error");
        } finally {
          btn.disabled = false;
          btn.textContent = "Generar Suplido";
        }
      });

    // District change - update amount
    document
      .getElementById("suplido-district")
      ?.addEventListener("change", (e) => {
        const districtValue = e.target.value;
        const districtKey = `mileage_${districtValue.replace(/-/g, "_")}`;
        const amount = parseFloat(this.config[districtKey]) || 0;
        document.getElementById("suplido-amount").textContent =
          this.formatCurrency(amount);
      });

    // Estado Procesal change - transition to judicial
    document
      .getElementById("estado-procesal")
      ?.addEventListener("change", async (e) => {
        const newState = e.target.value;

        // Only handle transition to JUDICIAL (can't go back to ABIERTO)
        if (newState === "JUDICIAL" && this.caseData.state === "ABIERTO") {
          // Ask for judicial date and district
          const judicialDate = prompt(
            "Fecha de paso a judicial (YYYY-MM-DD):",
            new Date().toISOString().split("T")[0]
          );

          if (!judicialDate) {
            // User cancelled - revert select
            e.target.value = this.caseData.state;
            return;
          }

          const districtSelect = document.getElementById("suplido-district");
          let district = districtSelect?.value;

          if (!district) {
            district = prompt(
              "Partido judicial:",
              "Vélez-Málaga"
            );
          } else {
            // Map select value to proper district name
            const districtMap = {
              "torrox": "Torrox",
              "velez-malaga": "Vélez-Málaga",
              "torremolinos": "Torremolinos",
              "fuengirola": "Fuengirola",
              "marbella": "Marbella",
              "estepona": "Estepona",
              "antequera": "Antequera",
            };
            district = districtMap[district] || district;
          }

          if (!district) {
            // User cancelled - revert select
            e.target.value = this.caseData.state;
            return;
          }

          try {
            showToast("Cambiando estado a judicial...", "info");
            await api.transitionToJudicial(this.caseId, judicialDate, district);
            showToast("Estado cambiado a Judicial", "success");
            // Refresh to show updated state
            await this.render();
          } catch (error) {
            showToast(`Error: ${error.message}`, "error");
            // Revert select on error
            e.target.value = this.caseData.state;
          }
        } else if (newState === "ABIERTO" && this.caseData.state === "JUDICIAL") {
          // Can't go back from JUDICIAL to ABIERTO
          showToast("No se puede volver de Judicial a Abierto", "error");
          e.target.value = this.caseData.state;
        }
      });

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
            "¿Estás seguro de archivar este expediente? Esta acción no se puede deshacer.",
          )
        ) {
          return;
        }

        try {
          await api.archiveCase(this.caseId, closureDate);
          showToast("Expediente archivado correctamente", "success");
          window.location.hash = `#/cases/${this.caseId}`;
        } catch (error) {
          showToast(`Error: ${error.message}`, "error");
        }
      });

    // Close case button (same as archive)
    document.getElementById("btn-close-case")?.addEventListener("click", () => {
      document.getElementById("btn-archive")?.click();
    });

    // Save observations on blur
    document
      .getElementById("observations")
      ?.addEventListener("blur", async (e) => {
        try {
          await api.updateCase(this.caseId, { observations: e.target.value });
        } catch (error) {
          console.error("Error saving observations:", error);
        }
      });

    // Document download clicks
    document.querySelectorAll(".timeline-doc-clickable").forEach((el) => {
      el.addEventListener("click", async () => {
        const docId = el.dataset.docId;
        if (!docId) return;

        try {
          showToast("Descargando documento...", "info");
          await api.downloadDocument(docId);
        } catch (error) {
          showToast(`Error al descargar: ${error.message}`, "error");
        }
      });
    });

    // Email retry button clicks
    this.attachRetryEventListeners();

    // Refresh history button
    document
      .querySelector(".facturacion-history .btn-icon")
      ?.addEventListener("click", async () => {
        try {
          const historyResult = await api.getCaseHistory(this.caseId);
          this.history = historyResult.data || { documents: [], emails: [] };

          // Re-render timeline
          const timelineContainer = document.querySelector(".timeline");
          if (timelineContainer) {
            timelineContainer.innerHTML = this.renderTimeline(this.caseData);
            // Re-attach document click listeners
            document
              .querySelectorAll(".timeline-doc-clickable")
              .forEach((el) => {
                el.addEventListener("click", async () => {
                  const docId = el.dataset.docId;
                  if (!docId) return;
                  try {
                    await api.downloadDocument(docId);
                  } catch (error) {
                    showToast(`Error al descargar: ${error.message}`, "error");
                  }
                });
              });
            // Re-attach retry button listeners
            this.attachRetryEventListeners();
          }
          showToast("Historial actualizado", "success");
        } catch (error) {
          showToast(`Error: ${error.message}`, "error");
        }
      });
  }

  /**
   * Attach event listeners to retry email buttons
   * Called after render and after history refresh
   */
  attachRetryEventListeners() {
    document.querySelectorAll(".retry-email-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const emailId = e.currentTarget.dataset.emailId;
        const caseId = e.currentTarget.dataset.caseId;

        if (!emailId || !caseId) return;

        // Disable button and show loading state
        e.currentTarget.disabled = true;
        const originalContent = e.currentTarget.innerHTML;
        e.currentTarget.innerHTML = `
          <svg class="spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Reintentando...
        `;

        try {
          showToast("Reintentando envío de email...", "info");
          await api.retryEmail(caseId, emailId);
          showToast("Email reenviado correctamente", "success");

          // Refresh history to show updated status
          const historyResult = await api.getCaseHistory(caseId);
          this.history = historyResult.data || { documents: [], emails: [] };

          const timelineContainer = document.querySelector(".timeline");
          if (timelineContainer) {
            timelineContainer.innerHTML = this.renderTimeline(this.caseData);
            this.attachRetryEventListeners();
            // Re-attach document click listeners
            document
              .querySelectorAll(".timeline-doc-clickable")
              .forEach((el) => {
                el.addEventListener("click", async () => {
                  const docId = el.dataset.docId;
                  if (!docId) return;
                  try {
                    await api.downloadDocument(docId);
                  } catch (error) {
                    showToast(`Error al descargar: ${error.message}`, "error");
                  }
                });
              });
          }
        } catch (error) {
          showToast(`Error al reenviar: ${error.message}`, "error");
          // Restore button state
          e.currentTarget.disabled = false;
          e.currentTarget.innerHTML = originalContent;
        }
      });
    });
  }
}
