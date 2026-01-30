/**
 * Particulares List View
 * Shows PARTICULAR cases for engagement letter management
 * Task 8.1: Filtering, search, and pagination
 */

import { api } from "../api.js";
import { formatDate, showToast } from "../app.js";
import { router } from "../router.js";

export class ParticularesListView {
  constructor(container) {
    this.container = container;
    this.cases = [];
    this.total = 0;
    this.page = 1;
    this.pageSize = 20;
    this.filters = {
      type: "PARTICULAR",
      state: null, // null = all states, or ABIERTO, JUDICIAL, ARCHIVADO
      search: "",
    };
  }

  async render() {
    try {
      await this.loadCases();
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Particulares list error:", error);
      showToast("Error al cargar expedientes", "error");
      this.container.innerHTML = `
        <div class="error-state">
          <p>Error al cargar expedientes: ${error.message}</p>
        </div>
      `;
    }
  }

  async loadCases() {
    const data = await api.listCases(this.filters, this.page, this.pageSize);
    this.cases = data.cases || [];
    this.total = data.total || 0;
  }

  template() {
    return `
      <div class="module-list-view">
        <div class="header">
          <div class="header-title">
            <h1>Particulares</h1>
            <p>Gestión de Hojas de Encargo para clientes particulares</p>
          </div>
          <div class="header-actions">
            <a href="#/cases/new?type=PARTICULAR" class="btn btn-primary btn-green">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 1v12M1 7h12"/>
              </svg>
              Nuevo Expediente
            </a>
          </div>
        </div>

        <div class="filters-row">
          <div class="filter-tabs">
            <button class="filter-tab filter-tab-green ${
              !this.filters.state ? "active" : ""
            }" data-filter="">Todos</button>
            <button class="filter-tab filter-tab-green ${
              this.filters.state === "ABIERTO" ? "active" : ""
            }" data-filter="ABIERTO">Abiertos</button>
            <button class="filter-tab filter-tab-green ${
              this.filters.state === "JUDICIAL" ? "active" : ""
            }" data-filter="JUDICIAL">Judicial</button>
            <button class="filter-tab filter-tab-green ${
              this.filters.state === "ARCHIVADO" ? "active" : ""
            }" data-filter="ARCHIVADO">Archivados</button>
          </div>
          <div class="search-input">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="6" cy="6" r="4.5"/>
              <path d="M9.5 9.5L13 13"/>
            </svg>
            <input type="text" placeholder="Buscar por referencia o cliente..." id="search-input" value="${this.filters.search}">
          </div>
        </div>

        ${
          this.cases.length > 0
            ? this.renderCaseList()
            : this.renderEmptyState()
        }
      </div>
    `;
  }

  renderCaseList() {
    return `
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Fecha Entrada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="cases-tbody">
            ${this.renderRows()}
          </tbody>
        </table>
        <div class="table-footer">
          <span class="table-info">Mostrando ${this.cases.length} de ${this.total} expedientes</span>
          <div class="pagination">
            <button class="btn btn-secondary ${
              this.page <= 1 ? "disabled" : ""
            }" id="prev-page" ${this.page <= 1 ? "disabled" : ""}>Anterior</button>
            <button class="btn btn-secondary ${
              this.cases.length < this.pageSize ? "disabled" : ""
            }" id="next-page" ${
      this.cases.length < this.pageSize ? "disabled" : ""
    }>Siguiente</button>
          </div>
        </div>
      </div>
    `;
  }

  renderRows() {
    return this.cases
      .map((c) => {
        const stateLabels = {
          ABIERTO: { label: "Abierto", class: "status-blue" },
          JUDICIAL: { label: "Judicial", class: "status-orange" },
          ARCHIVADO: { label: "Archivado", class: "status-gray" },
        };
        const state = stateLabels[c.state] || {
          label: c.state,
          class: "status-gray",
        };

        const canGenerateDoc = c.state !== "ARCHIVADO";

        return `
          <tr data-case-id="${c.id}">
            <td><span class="cell-reference mono">${c.internalReference || "-"}</span></td>
            <td>
              <div class="cell-client">
                <span class="cell-client-name">${c.clientName}</span>
                ${c.clientEmail ? `<span class="cell-client-email">${c.clientEmail}</span>` : ""}
              </div>
            </td>
            <td><span class="case-status ${state.class}">${state.label}</span></td>
            <td><span class="cell-date">${formatDate(c.entryDate)}</span></td>
            <td>
              <div class="cell-actions">
                ${
                  canGenerateDoc
                    ? `
                  <button class="btn-action btn-action-green" title="Hoja de Encargo" data-action="hoja" data-id="${c.id}">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M13 2H6l-3 3v9a1 1 0 001 1h9a1 1 0 001-1V3a1 1 0 00-1-1z"/>
                      <path d="M6 2v3H3M9 8v4M7 10h4"/>
                    </svg>
                  </button>
                `
                    : ""
                }
                <button class="btn-action" title="Ver expediente" data-action="view" data-id="${c.id}">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M6 12l4-4-4-4"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  renderEmptyState() {
    const searchActive = this.filters.search || this.filters.state;
    return `
      <div class="empty-state">
        <div class="empty-icon empty-icon-green">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            ${
              searchActive
                ? `
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            `
                : `
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
            `
            }
          </svg>
        </div>
        <h3>${searchActive ? "No se encontraron expedientes" : "No hay expedientes Particulares"}</h3>
        <p>${
          searchActive
            ? "Prueba con otros términos de búsqueda o filtros."
            : "Los expedientes de clientes particulares aparecerán aquí."
        }</p>
        ${
          !searchActive
            ? `<a href="#/cases/new?type=PARTICULAR" class="btn btn-primary btn-green">Nuevo Expediente</a>`
            : ""
        }
      </div>
    `;
  }

  bindEvents() {
    // Filter tabs
    this.container.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", async (e) => {
        this.filters.state = e.target.dataset.filter || null;
        this.page = 1;
        await this.refresh();
      });
    });

    // Search
    const searchInput = this.container.querySelector("#search-input");
    let timeout;
    searchInput?.addEventListener("input", (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        this.filters.search = e.target.value;
        this.page = 1;
        await this.refresh();
      }, 300);
    });

    // Pagination
    this.container
      .querySelector("#prev-page")
      ?.addEventListener("click", async () => {
        if (this.page > 1) {
          this.page--;
          await this.refresh();
        }
      });

    this.container
      .querySelector("#next-page")
      ?.addEventListener("click", async () => {
        if (this.cases.length >= this.pageSize) {
          this.page++;
          await this.refresh();
        }
      });

    // Row and action clicks
    this.bindRowEvents();
  }

  bindRowEvents() {
    // Row clicks navigate to detail
    this.container.querySelectorAll("tr[data-case-id]").forEach((row) => {
      row.style.cursor = "pointer";
      row.addEventListener("click", (e) => {
        if (!e.target.closest(".btn-action")) {
          router.navigate(`/particulares/${row.dataset.caseId}`);
        }
      });
    });

    // View button
    this.container
      .querySelectorAll('.btn-action[data-action="view"]')
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          router.navigate(`/particulares/${btn.dataset.id}`);
        });
      });

    // Hoja de Encargo button
    this.container
      .querySelectorAll('.btn-action[data-action="hoja"]')
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          router.navigate(`/particulares/${btn.dataset.id}`);
        });
      });
  }

  async refresh() {
    await this.loadCases();

    // Update tbody
    const tbody = this.container.querySelector("#cases-tbody");
    if (tbody) {
      tbody.innerHTML = this.renderRows();
    } else {
      // Re-render full content if structure changed (e.g., empty state)
      const moduleView = this.container.querySelector(".module-list-view");
      if (moduleView) {
        // Remove existing content after filters
        const existingContent = moduleView.querySelector(
          ".data-table-container, .empty-state"
        );
        if (existingContent) {
          existingContent.remove();
        }
        // Add new content
        const temp = document.createElement("div");
        temp.innerHTML =
          this.cases.length > 0
            ? this.renderCaseList()
            : this.renderEmptyState();
        moduleView.appendChild(temp.firstElementChild);
      }
    }

    // Update table info
    const tableInfo = this.container.querySelector(".table-info");
    if (tableInfo) {
      tableInfo.textContent = `Mostrando ${this.cases.length} de ${this.total} expedientes`;
    }

    // Update filter tabs
    this.container.querySelectorAll(".filter-tab").forEach((tab) => {
      const filter = tab.dataset.filter || null;
      tab.classList.toggle("active", filter === this.filters.state);
    });

    // Update pagination
    const prevBtn = this.container.querySelector("#prev-page");
    const nextBtn = this.container.querySelector("#next-page");
    if (prevBtn) {
      prevBtn.disabled = this.page <= 1;
      prevBtn.classList.toggle("disabled", this.page <= 1);
    }
    if (nextBtn) {
      nextBtn.disabled = this.cases.length < this.pageSize;
      nextBtn.classList.toggle("disabled", this.cases.length < this.pageSize);
    }

    this.bindRowEvents();
  }
}
