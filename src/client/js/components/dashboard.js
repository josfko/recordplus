/**
 * Dashboard Component
 * Task 8.2 - Requirements: 9.1-9.6
 */

import { api } from "../api.js";
import { router } from "../router.js";
import { formatDate, showToast } from "../app.js";
import { notificationCenter } from "./notificationCenter.js";

export class DashboardView {
  constructor(container) {
    this.container = container;
    this.metrics = null;
    this.recentCases = [];
    this.currentFilter = "all";
    this.searchQuery = "";
  }

  async render() {
    try {
      // Fetch data in parallel
      const [metricsData, casesData] = await Promise.all([
        api.getDashboard(),
        api.listCases({}, 1, 4),
      ]);

      this.metrics = metricsData;
      this.recentCases = casesData.cases || [];
      this.totalCases = casesData.total || 0;

      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Dashboard error:", error);
      showToast("Error al cargar el dashboard", "error");
      this.container.innerHTML = `
        <div class="empty-state">
          <p>Error al cargar el dashboard</p>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  template() {
    const { entriesThisMonth, archivedThisMonth, pending } = this.metrics;
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const currentMonth = monthNames[this.metrics.month - 1];
    const currentYear = this.metrics.year;

    return `
      <!-- Header -->
      <div class="header">
        <div class="header-title">
          <h1>Dashboard</h1>
          <p>Resumen mensual y gestión rápida.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-icon" title="Notificaciones" id="notifications-bell">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M13.5 6.75a4.5 4.5 0 1 0-9 0c0 5.25-2.25 6.75-2.25 6.75h13.5s-2.25-1.5-2.25-6.75"/>
              <path d="M10.3 15a1.5 1.5 0 0 1-2.6 0"/>
            </svg>
            <span class="notification-dot" style="display:none"></span>
          </button>
          <a href="#/cases/new" class="btn btn-primary">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 1v12M1 7h12"/>
            </svg>
            Nuevo Expediente
          </a>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card entries">
          <div class="metric-glow"></div>
          <div class="metric-card-header">
            <div class="metric-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 4h12v12H4z"/>
                <path d="M8 8h4M8 12h4"/>
              </svg>
            </div>
            <span class="metric-badge success">+12% vs año anterior</span>
          </div>
          <div class="metric-label">Entradas del Mes</div>
          <div class="metric-value">${entriesThisMonth.total}</div>
        </div>

        <div class="metric-card archived">
          <div class="metric-glow"></div>
          <div class="metric-card-header">
            <div class="metric-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 6h14v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>
                <path d="M3 6l2-4h10l2 4"/>
                <path d="M8 10h4"/>
              </svg>
            </div>
            <span class="metric-badge neutral">${currentMonth} ${currentYear}</span>
          </div>
          <div class="metric-label">Archivados del Mes</div>
          <div class="metric-value">${archivedThisMonth.total}</div>
        </div>

        <div class="metric-card pending">
          <div class="metric-glow"></div>
          <div class="metric-card-header">
            <div class="metric-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="10" cy="10" r="7"/>
                <path d="M10 6v4l2 2"/>
              </svg>
            </div>
            <span class="metric-badge neutral">Ratio Cierre</span>
          </div>
          <div class="metric-label">Pendientes</div>
          <div class="metric-value">${pending.total}</div>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="filters-row">
        <div class="filter-tabs">
          <button class="filter-tab ${
            this.currentFilter === "all" ? "active" : ""
          }" data-filter="all">Todos</button>
          <button class="filter-tab ${
            this.currentFilter === "ARAG" ? "active" : ""
          }" data-filter="ARAG">ARAG</button>
          <button class="filter-tab ${
            this.currentFilter === "PARTICULAR" ? "active" : ""
          }" data-filter="PARTICULAR">Particulares</button>
          <button class="filter-tab ${
            this.currentFilter === "TURNO_OFICIO" ? "active" : ""
          }" data-filter="TURNO_OFICIO">Turno Oficio</button>
        </div>
        <div class="search-input">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="6" cy="6" r="4.5"/>
            <path d="M9.5 9.5L13 13"/>
          </svg>
          <input type="text" placeholder="Buscar por referencia o cliente..." id="search-input" value="${
            this.searchQuery
          }">
        </div>
      </div>

      <!-- Cases Table -->
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ref. Interna</th>
              <th>Cliente / Ref. Ext</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Entrada</th>
              <th>Docs</th>
            </tr>
          </thead>
          <tbody id="cases-tbody">
            ${this.renderCasesRows()}
          </tbody>
        </table>
        <div class="table-footer">
          <span class="table-info">Mostrando ${this.recentCases.length} de ${
      this.totalCases
    } expedientes</span>
          <div class="pagination">
            <button class="btn btn-secondary disabled" disabled>Anterior</button>
            <a href="#/cases" class="btn btn-secondary">Ver todos</a>
          </div>
        </div>
      </div>
    `;
  }

  renderCasesRows() {
    if (this.recentCases.length === 0) {
      return `
        <tr>
          <td colspan="6" class="empty-state">No hay expedientes</td>
        </tr>
      `;
    }

    return this.recentCases.map((c) => this.renderCaseRow(c)).join("");
  }

  renderCaseRow(caseData) {
    const {
      id,
      type,
      clientName,
      internalReference,
      aragReference,
      designation,
      state,
      entryDate,
      judicialDistrict,
    } = caseData;

    // Reference display
    const refDisplay = internalReference || "-";
    const refClass = internalReference ? "" : "empty";

    // Secondary info (external ref or designation)
    let secondaryInfo = "";
    if (type === "ARAG" && aragReference) {
      secondaryInfo = `<span class="cell-client-ref">${aragReference}</span>`;
    } else if (type === "TURNO_OFICIO" && designation) {
      secondaryInfo = `<span class="cell-client-desc">Designación: ${designation}</span>`;
    } else if (type === "PARTICULAR") {
      secondaryInfo = `<span class="cell-client-desc">Reclamación cantidad</span>`;
    }

    // Type badge
    const typeBadges = {
      ARAG: { class: "arag", label: "ARAG" },
      PARTICULAR: { class: "particular", label: "Particular" },
      TURNO_OFICIO: { class: "turno", label: "Turno Oficio" },
    };
    const badge = typeBadges[type] || { class: "turno", label: type };

    // State display
    let stateDisplay =
      state === "ABIERTO"
        ? "Abierto"
        : state === "ARCHIVADO"
        ? "Archivado"
        : `Judicial${judicialDistrict ? ` (${judicialDistrict})` : ""}`;
    const stateClass = state === "JUDICIAL" ? "judicial" : "";

    // Document status indicator
    const docStatus = this.renderDocStatus(caseData);

    return `
      <tr data-case-id="${id}">
        <td><span class="cell-reference ${refClass}">${refDisplay}</span></td>
        <td>
          <div class="cell-client">
            <span class="cell-client-name">${clientName}</span>
            ${secondaryInfo}
          </div>
        </td>
        <td>
          <span class="badge ${badge.class}">
            <span class="badge-dot"></span>
            ${badge.label}
          </span>
        </td>
        <td><span class="cell-state ${stateClass}">${stateDisplay}</span></td>
        <td><span class="cell-date">${formatDate(entryDate)}</span></td>
        <td>
          <div class="cell-doc-status">
            ${docStatus}
          </div>
        </td>
      </tr>
    `;
  }

  renderDocStatus(caseData) {
    const { type, minutaCount = 0, suplidoCount = 0, hojaCount = 0 } = caseData;
    if (type === "ARAG") {
      const minutaDone = minutaCount > 0;
      const suplidoDone = suplidoCount > 0;
      return `
        <span class="doc-pill ${minutaDone ? "doc-pill-arag" : "doc-pill-pending"}" title="${minutaDone ? "Minuta generada" : "Minuta pendiente"}">Minuta</span>
        ${suplidoDone ? '<span class="doc-pill doc-pill-arag" title="Suplido generado">Suplido</span>' : ""}
      `;
    }
    if (type === "PARTICULAR") {
      const hojaDone = hojaCount > 0;
      return `<span class="doc-pill ${hojaDone ? "doc-pill-particular" : "doc-pill-pending"}" title="${hojaDone ? "Hoja de Encargo generada" : "Hoja de Encargo pendiente"}">HdE</span>`;
    }
    return '<span class="doc-pill-empty">—</span>';
  }

  bindEvents() {
    // Notification bell
    const bellBtn = this.container.querySelector("#notifications-bell");
    if (bellBtn) {
      bellBtn.addEventListener("click", () => {
        notificationCenter.toggle(bellBtn);
      });
      // Fetch notification count and update badge
      notificationCenter.fetchCount().then(() => {
        notificationCenter.updateBadge(bellBtn);
      });
    }

    // Filter tabs
    this.container.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.currentFilter = e.target.dataset.filter;
        this.applyFilters();
      });
    });

    // Search input
    const searchInput = this.container.querySelector("#search-input");
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.applyFilters();
      }, 300);
    });

    // Row click to view
    this.container.querySelectorAll("tr[data-case-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.caseId;
        router.navigate(`/cases/${id}`);
      });
      row.style.cursor = "pointer";
    });
  }

  async applyFilters() {
    try {
      const filters = {};
      if (this.currentFilter !== "all") {
        filters.type = this.currentFilter;
      }
      if (this.searchQuery) {
        filters.search = this.searchQuery;
      }

      const casesData = await api.listCases(filters, 1, 4);
      this.recentCases = casesData.cases || [];
      this.totalCases = casesData.total || 0;

      // Update table
      const tbody = this.container.querySelector("#cases-tbody");
      tbody.innerHTML = this.renderCasesRows();

      // Update info
      const tableInfo = this.container.querySelector(".table-info");
      tableInfo.textContent = `Mostrando ${this.recentCases.length} de ${this.totalCases} expedientes`;

      // Update filter tabs
      this.container.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.classList.toggle(
          "active",
          tab.dataset.filter === this.currentFilter
        );
      });

      // Rebind row events
      this.bindRowEvents();
    } catch (error) {
      console.error("Filter error:", error);
      showToast("Error al filtrar expedientes", "error");
    }
  }

  bindRowEvents() {
    this.container.querySelectorAll("tr[data-case-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.caseId;
        router.navigate(`/cases/${id}`);
      });
      row.style.cursor = "pointer";
    });
  }
}

export default DashboardView;
