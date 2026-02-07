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
    this.allCases = [];
    this.currentFilter = "ABIERTO"; // 'ABIERTO', 'JUDICIAL', 'ARCHIVADO', 'all'
    this.searchQuery = "";
  }

  async render() {
    try {
      const result = await api.listCases({ type: "TURNO_OFICIO" }, 1, 100);
      this.allCases = result.cases || [];
      this.applyFilters();
    } catch (error) {
      this.container.innerHTML = `
        <div class="error-state">
          <p>Error al cargar expedientes: ${error.message}</p>
        </div>
      `;
      return;
    }

    this.renderView();
    this.attachEventListeners();
  }

  applyFilters() {
    let filtered = [...this.allCases];

    // Apply state filter
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((c) => c.state === this.currentFilter);
    }

    // Apply search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.clientName && c.clientName.toLowerCase().includes(query)) ||
          (c.internalReference && c.internalReference.toLowerCase().includes(query)) ||
          (c.designation && c.designation.toLowerCase().includes(query))
      );
    }

    this.cases = filtered;
  }

  renderView() {
    const openCases = this.cases.filter((c) => c.state === "ABIERTO");
    const finalizedCases = this.cases.filter((c) => c.state === "JUDICIAL");
    const archivedCases = this.cases.filter((c) => c.state === "ARCHIVADO");

    // Counts for filter badges
    const allOpen = this.allCases.filter((c) => c.state === "ABIERTO").length;
    const allFinalized = this.allCases.filter((c) => c.state === "JUDICIAL").length;
    const allArchived = this.allCases.filter((c) => c.state === "ARCHIVADO").length;

    this.container.innerHTML = `
      <div class="module-list-view">
        <div class="header">
          <div class="header-title">
            <h1>Turno de Oficio</h1>
            <p>Gestión de expedientes de turno de oficio</p>
          </div>
          <div class="header-actions">
            <a href="#/cases/new?type=TURNO_OFICIO" class="btn btn-primary btn-amber">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 1v12M1 7h12"/>
              </svg>
              Nuevo Expediente
            </a>
          </div>
        </div>

        <!-- Filters and Search -->
        <div class="list-controls">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === "ABIERTO" ? "active" : ""}" data-filter="ABIERTO">
              Abiertos
              <span class="filter-count">${allOpen}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === "JUDICIAL" ? "active" : ""}" data-filter="JUDICIAL">
              Finalizados
              <span class="filter-count">${allFinalized}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === "ARCHIVADO" ? "active" : ""}" data-filter="ARCHIVADO">
              Archivados
              <span class="filter-count">${allArchived}</span>
            </button>
            <button class="filter-tab ${this.currentFilter === "all" ? "active" : ""}" data-filter="all">
              Todos
              <span class="filter-count">${this.allCases.length}</span>
            </button>
          </div>
          <div class="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              id="search-input"
              placeholder="Buscar por nombre, referencia o designación..."
              value="${this.searchQuery}"
            />
            ${this.searchQuery ? `
              <button class="search-clear" id="search-clear" aria-label="Limpiar búsqueda">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Results -->
        <div class="list-results">
          ${this.searchQuery ? `
            <p class="results-count">${this.cases.length} resultado${this.cases.length !== 1 ? "s" : ""} encontrado${this.cases.length !== 1 ? "s" : ""}</p>
          ` : ""}

          ${openCases.length > 0 && (this.currentFilter === "ABIERTO" || this.currentFilter === "all") ? `
            <div class="case-section">
              <div class="section-header">
                <div class="section-title">
                  <span class="section-dot section-dot-amber"></span>
                  <h2>Abiertos</h2>
                  <span class="section-count">${openCases.length}</span>
                </div>
                <p class="section-subtitle">Pendientes de gestión</p>
              </div>
              <div class="case-cards">
                ${openCases.map((c) => this.renderCaseCard(c, "open")).join("")}
              </div>
            </div>
          ` : ""}

          ${finalizedCases.length > 0 && (this.currentFilter === "JUDICIAL" || this.currentFilter === "all") ? `
            <div class="case-section">
              <div class="section-header">
                <div class="section-title">
                  <span class="section-dot section-dot-blue"></span>
                  <h2>Finalizados</h2>
                  <span class="section-count">${finalizedCases.length}</span>
                </div>
                <p class="section-subtitle">Pendientes de archivo</p>
              </div>
              <div class="case-cards">
                ${finalizedCases.map((c) => this.renderCaseCard(c, "finalized")).join("")}
              </div>
            </div>
          ` : ""}

          ${archivedCases.length > 0 && (this.currentFilter === "ARCHIVADO" || this.currentFilter === "all") ? `
            <div class="case-section">
              <div class="section-header">
                <div class="section-title">
                  <span class="section-dot section-dot-gray"></span>
                  <h2>Archivados</h2>
                  <span class="section-count">${archivedCases.length}</span>
                </div>
                <p class="section-subtitle">Expedientes cerrados</p>
              </div>
              <div class="case-cards">
                ${archivedCases.map((c) => this.renderCaseCard(c, "archived")).join("")}
              </div>
            </div>
          ` : ""}

          ${this.cases.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon empty-icon-amber">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              ${this.searchQuery ? `
                <h3>No se encontraron expedientes</h3>
                <p>Intenta con otros términos de búsqueda.</p>
                <button class="btn btn-secondary" id="btn-clear-search">Limpiar búsqueda</button>
              ` : `
                <h3>No hay expedientes de Turno de Oficio ${this.getFilterLabel()}</h3>
                <p>Los expedientes aparecerán aquí cuando se creen.</p>
                <a href="#/cases/new?type=TURNO_OFICIO" class="btn btn-primary btn-amber">Nuevo Expediente</a>
              `}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  getFilterLabel() {
    const labels = {
      ABIERTO: "abiertos",
      JUDICIAL: "finalizados",
      ARCHIVADO: "archivados",
      all: "",
    };
    return labels[this.currentFilter] || "";
  }

  renderCaseCard(c, type) {
    const statusConfig = {
      open: { class: "status-amber", text: "Abierto" },
      finalized: { class: "status-blue", text: "Finalizado" },
      archived: { class: "status-gray", text: "Archivado" },
    };

    const status = statusConfig[type] || statusConfig.open;

    return `
      <a href="#/turno/${c.id}" class="case-card case-card-turno ${type === "archived" ? "case-card-archived" : ""}">
        <div class="case-card-header">
          <span class="case-ref mono">${c.internalReference || `TO-${c.id}`}</span>
          <span class="case-status ${status.class}">${status.text}</span>
        </div>
        <div class="case-card-body">
          <h3 class="case-client">${c.clientName}</h3>
          ${c.designation ? `
            <p class="case-designation">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              ${c.designation}
            </p>
          ` : ""}
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

  attachEventListeners() {
    // Filter tabs
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.currentFilter = tab.dataset.filter;
        this.applyFilters();
        this.renderView();
        this.attachEventListeners();
      });
    });

    // Search input
    const searchInput = document.getElementById("search-input");
    let searchTimeout;
    searchInput?.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim();
        this.applyFilters();
        this.renderView();
        this.attachEventListeners();
        // Restore focus to search input
        document.getElementById("search-input")?.focus();
      }, 300);
    });

    // Clear search button
    document.getElementById("search-clear")?.addEventListener("click", () => {
      this.searchQuery = "";
      this.applyFilters();
      this.renderView();
      this.attachEventListeners();
    });

    // Clear search button in empty state
    document.getElementById("btn-clear-search")?.addEventListener("click", () => {
      this.searchQuery = "";
      this.applyFilters();
      this.renderView();
      this.attachEventListeners();
    });
  }
}
