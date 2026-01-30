/**
 * Facturación ARAG List View
 * Shows ARAG cases ready for billing
 */

import { api } from "../api.js";
import { formatDate } from "../app.js";

export class FacturacionListView {
  constructor(container) {
    this.container = container;
    this.cases = [];
  }

  async render() {
    try {
      // Get all ARAG cases (not archived)
      const result = await api.listCases({ type: "ARAG" });
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
    const judicialCases = this.cases.filter((c) => c.state === "JUDICIAL");
    const openCases = this.cases.filter((c) => c.state === "ABIERTO");

    this.container.innerHTML = `
      <div class="module-list-view">
        <div class="header">
          <div class="header-title">
            <h1>Facturación ARAG</h1>
            <p>Gestión de minutas y suplidos para expedientes ARAG</p>
          </div>
          <div class="header-actions">
            <a href="#/cases/new?type=ARAG" class="btn btn-primary">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 1v12M1 7h12"/>
              </svg>
              Nuevo Expediente
            </a>
          </div>
        </div>

        ${
          judicialCases.length > 0
            ? `
          <div class="case-section">
            <div class="section-header">
              <div class="section-title">
                <span class="section-dot section-dot-yellow"></span>
                <h2>En Vía Judicial</h2>
                <span class="section-count">${judicialCases.length}</span>
              </div>
              <p class="section-subtitle">Listos para generar suplidos</p>
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
          openCases.length > 0
            ? `
          <div class="case-section">
            <div class="section-header">
              <div class="section-title">
                <span class="section-dot section-dot-green"></span>
                <h2>Abiertos</h2>
                <span class="section-count">${openCases.length}</span>
              </div>
              <p class="section-subtitle">Pendientes de pasar a judicial</p>
            </div>
            <div class="case-cards">
              ${openCases.map((c) => this.renderCaseCard(c, "open")).join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          this.cases.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="3" width="20" height="18" rx="2"/>
                <path d="M2 7h20M6 11h4M6 15h8"/>
              </svg>
            </div>
            <h3>No hay expedientes ARAG activos</h3>
            <p>Los expedientes ARAG aparecerán aquí cuando se creen.</p>
            <a href="#/cases/new?type=ARAG" class="btn btn-primary">Nuevo Expediente</a>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  renderCaseCard(c, type) {
    const statusClass = type === "judicial" ? "status-yellow" : "status-green";
    const statusText =
      type === "judicial"
        ? `Judicial${c.judicialDistrict ? ` • ${c.judicialDistrict}` : ""}`
        : "Abierto";

    return `
      <a href="#/invoicing/${c.id}" class="case-card case-card-arag">
        <div class="case-card-header">
          <span class="case-ref mono">${
            c.aragReference || c.internalReference
          }</span>
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
            ${
              c.internalReference
                ? `<span class="case-internal-ref">Ref: ${c.internalReference}</span>`
                : ""
            }
          </div>
        </div>
        <div class="case-card-footer">
          <span class="case-action">Facturar →</span>
        </div>
      </a>
    `;
  }
}
