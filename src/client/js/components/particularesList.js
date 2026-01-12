/**
 * Particulares List View
 * Shows PARTICULAR cases for engagement letter management
 */

import { api } from "../api.js";
import { formatDate } from "../app.js";

export class ParticularesListView {
  constructor(container) {
    this.container = container;
    this.cases = [];
  }

  async render() {
    try {
      // Get all PARTICULAR cases (not archived)
      const result = await api.listCases({ type: "PARTICULAR" });
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
    this.container.innerHTML = `
      <div class="module-list-view">
        <div class="header">
          <div class="header-title">
            <h1>Particulares</h1>
            <p>Gestión de Hojas de Encargo para clientes particulares</p>
          </div>
        </div>

        ${
          this.cases.length > 0
            ? `
          <div class="case-section">
            <div class="section-header">
              <div class="section-title">
                <span class="section-dot section-dot-green"></span>
                <h2>Expedientes Activos</h2>
                <span class="section-count">${this.cases.length}</span>
              </div>
              <p class="section-subtitle">Gestionar hojas de encargo</p>
            </div>
            <div class="case-cards">
              ${this.cases.map((c) => this.renderCaseCard(c)).join("")}
            </div>
          </div>
        `
            : `
          <div class="empty-state">
            <div class="empty-icon empty-icon-green">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
              </svg>
            </div>
            <h3>No hay expedientes Particulares activos</h3>
            <p>Los expedientes de clientes particulares aparecerán aquí.</p>
            <a href="#/cases/new" class="btn btn-primary btn-green">Nuevo Expediente</a>
          </div>
        `
        }
      </div>
    `;
  }

  renderCaseCard(c) {
    return `
      <a href="#/particulares/${c.id}" class="case-card case-card-particular">
        <div class="case-card-header">
          <span class="case-ref mono">${c.internalReference}</span>
          <span class="case-status status-blue">Activo</span>
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
              c.clientEmail
                ? `
              <span class="case-email">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                ${c.clientEmail}
              </span>
            `
                : ""
            }
          </div>
        </div>
        <div class="case-card-footer case-card-footer-green">
          <span class="case-action">Hoja de Encargo →</span>
        </div>
      </a>
    `;
  }
}
