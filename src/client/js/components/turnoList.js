/**
 * Turno de Oficio List View
 * Shows TURNO_OFICIO cases for court-appointed case management
 */

import { api } from "../api.js";
import { formatDate } from "../app.js";

export class TurnoListView {
  constructor(container) {
    this.container = container;
    this.cases = [];
  }

  async render() {
    try {
      const result = await api.listCases({ type: "TURNO_OFICIO" });
      this.cases = (result.cases || []).filter((c) => c.state !== "ARCHIVADO");
    } catch (error) {
      this.container.innerHTML = `
        <div class="error-state">
          <p>Error al cargar expedientes: ${error.message}</p>
        </div>
      `;
      return;
    }

    this.renderView();
  }

  renderView() {
    const openCases = this.cases.filter((c) => c.state === "ABIERTO");
    const judicialCases = this.cases.filter((c) => c.state === "JUDICIAL");

    this.container.innerHTML = `
      <div class="module-list-view">
        <div class="header">
          <div class="header-title">
            <h1>Turno de Oficio</h1>
            <p>Gestión de expedientes de turno de oficio</p>
          </div>
        </div>

        ${
          openCases.length > 0
            ? `
          <div class="case-section">
            <div class="section-header">
              <div class="section-title">
                <span class="section-dot section-dot-amber"></span>
                <h2>Expedientes Abiertos</h2>
                <span class="section-count">${openCases.length}</span>
              </div>
              <p class="section-subtitle">Pendientes de gestión</p>
            </div>
            <div class="case-cards">
              ${openCases.map((c) => this.renderCaseCard(c, "open")).join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          judicialCases.length > 0
            ? `
          <div class="case-section">
            <div class="section-header">
              <div class="section-title">
                <span class="section-dot section-dot-red"></span>
                <h2>En Vía Judicial</h2>
                <span class="section-count">${judicialCases.length}</span>
              </div>
              <p class="section-subtitle">En proceso judicial</p>
            </div>
            <div class="case-cards">
              ${judicialCases
                .map((c) => this.renderCaseCard(c, "judicial"))
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          this.cases.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-icon empty-icon-amber">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3>No hay expedientes de Turno de Oficio activos</h3>
            <p>Los expedientes de turno de oficio aparecerán aquí cuando se creen.</p>
            <a href="#/cases/new" class="btn btn-primary btn-amber">Nuevo Expediente</a>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  renderCaseCard(c, type) {
    const statusClass = type === "judicial" ? "status-red" : "status-amber";
    const statusText = type === "judicial" ? "Judicial" : "Abierto";

    return `
      <a href="#/turno/${c.id}" class="case-card case-card-turno">
        <div class="case-card-header">
          <span class="case-ref mono">${c.internalReference}</span>
          <span class="case-status ${statusClass}">${statusText}</span>
        </div>
        <div class="case-card-body">
          <h3 class="case-client">${c.clientName}</h3>
          <div class="case-meta">
            <span class="case-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDate(c.entryDate)}
            </span>
          </div>
        </div>
        <div class="case-card-footer case-card-footer-amber">
          <span class="case-action">Gestionar →</span>
        </div>
      </a>
    `;
  }
}
