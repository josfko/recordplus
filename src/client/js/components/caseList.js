/**
 * Case List Component
 * Task 8.3 - Requirements: 5.1-5.7
 */

import { api } from "../api.js";
import { router } from "../router.js";
import { formatDate, showToast } from "../app.js";

export class CaseListView {
  constructor(container) {
    this.container = container;
    this.cases = [];
    this.total = 0;
    this.page = 1;
    this.pageSize = 20;
    this.filters = {
      type: null,
      state: null,
      search: "",
    };
  }

  async render() {
    try {
      await this.loadCases();
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Case list error:", error);
      showToast("Error al cargar expedientes", "error");
    }
  }

  async loadCases() {
    const data = await api.listCases(this.filters, this.page, this.pageSize);
    this.cases = data.cases || [];
    this.total = data.total || 0;
  }

  template() {
    return `
      <div class="header">
        <div class="header-title">
          <h1>Expedientes</h1>
          <p>Gestión de todos los expedientes del despacho.</p>
        </div>
        <div class="header-actions">
          <a href="#/cases/new" class="btn btn-primary">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 1v12M1 7h12"/>
            </svg>
            Nuevo Expediente
          </a>
        </div>
      </div>

      <div class="filters-row">
        <div class="filter-tabs">
          <button class="filter-tab ${
            !this.filters.type ? "active" : ""
          }" data-filter="">Todos</button>
          <button class="filter-tab ${
            this.filters.type === "ARAG" ? "active" : ""
          }" data-filter="ARAG">ARAG</button>
          <button class="filter-tab ${
            this.filters.type === "PARTICULAR" ? "active" : ""
          }" data-filter="PARTICULAR">Particulares</button>
          <button class="filter-tab ${
            this.filters.type === "TURNO_OFICIO" ? "active" : ""
          }" data-filter="TURNO_OFICIO">Turno Oficio</button>
        </div>
        <div class="search-input">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="6" cy="6" r="4.5"/>
            <path d="M9.5 9.5L13 13"/>
          </svg>
          <input type="text" placeholder="Buscar por referencia o cliente..." id="search-input" value="${
            this.filters.search
          }">
        </div>
      </div>

      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ref. Interna</th>
              <th>Cliente / Ref. Ext</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Entrada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="cases-tbody">
            ${this.renderRows()}
          </tbody>
        </table>
        <div class="table-footer">
          <span class="table-info">Mostrando ${this.cases.length} de ${
      this.total
    } expedientes</span>
          <div class="pagination">
            <button class="btn btn-secondary ${
              this.page <= 1 ? "disabled" : ""
            }" id="prev-page" ${
      this.page <= 1 ? "disabled" : ""
    }>Anterior</button>
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
    if (this.cases.length === 0) {
      return '<tr><td colspan="6" class="empty-state">No hay expedientes</td></tr>';
    }

    return this.cases
      .map((c) => {
        const typeBadges = {
          ARAG: { class: "arag", label: "ARAG" },
          PARTICULAR: { class: "particular", label: "Particular" },
          TURNO_OFICIO: { class: "turno", label: "Turno Oficio" },
        };
        const badge = typeBadges[c.type] || { class: "turno", label: c.type };

        let secondaryInfo = "";
        if (c.type === "ARAG" && c.aragReference) {
          secondaryInfo = `<span class="cell-client-ref">${c.aragReference}</span>`;
        } else if (c.type === "TURNO_OFICIO" && c.designation) {
          secondaryInfo = `<span class="cell-client-desc">Designación: ${c.designation}</span>`;
        }

        const stateDisplay =
          c.state === "ABIERTO"
            ? "Abierto"
            : c.state === "ARCHIVADO"
            ? "Archivado"
            : `Judicial${c.judicialDistrict ? ` (${c.judicialDistrict})` : ""}`;
        const stateClass = c.state === "JUDICIAL" ? "judicial" : "";

        return `
        <tr data-case-id="${c.id}">
          <td><span class="cell-reference ${
            c.internalReference ? "" : "empty"
          }">${c.internalReference || "-"}</span></td>
          <td>
            <div class="cell-client">
              <span class="cell-client-name">${c.clientName}</span>
              ${secondaryInfo}
            </div>
          </td>
          <td><span class="badge ${
            badge.class
          }"><span class="badge-dot"></span>${badge.label}</span></td>
          <td><span class="cell-state ${stateClass}">${stateDisplay}</span></td>
          <td><span class="cell-date">${formatDate(c.entryDate)}</span></td>
          <td>
            <div class="cell-actions">
              <button class="btn-action" title="Ver" data-action="view" data-id="${
                c.id
              }">
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

  bindEvents() {
    // Filter tabs
    this.container.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", async (e) => {
        this.filters.type = e.target.dataset.filter || null;
        this.page = 1;
        await this.refresh();
      });
    });

    // Search
    const searchInput = this.container.querySelector("#search-input");
    let timeout;
    searchInput.addEventListener("input", (e) => {
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

    // Row clicks
    this.bindRowEvents();
  }

  bindRowEvents() {
    this.container.querySelectorAll("tr[data-case-id]").forEach((row) => {
      row.style.cursor = "pointer";
      row.addEventListener("click", (e) => {
        if (!e.target.closest(".btn-action")) {
          router.navigate(`/cases/${row.dataset.caseId}`);
        }
      });
    });

    this.container
      .querySelectorAll('.btn-action[data-action="view"]')
      .forEach((btn) => {
        btn.addEventListener("click", () =>
          router.navigate(`/cases/${btn.dataset.id}`)
        );
      });
  }

  async refresh() {
    await this.loadCases();
    this.container.querySelector("#cases-tbody").innerHTML = this.renderRows();
    this.container.querySelector(
      ".table-info"
    ).textContent = `Mostrando ${this.cases.length} de ${this.total} expedientes`;

    // Update filter tabs
    this.container.querySelectorAll(".filter-tab").forEach((tab) => {
      const filter = tab.dataset.filter || null;
      tab.classList.toggle("active", filter === this.filters.type);
    });

    // Update pagination
    const prevBtn = this.container.querySelector("#prev-page");
    const nextBtn = this.container.querySelector("#next-page");
    prevBtn.disabled = this.page <= 1;
    prevBtn.classList.toggle("disabled", this.page <= 1);
    nextBtn.disabled = this.cases.length < this.pageSize;
    nextBtn.classList.toggle("disabled", this.cases.length < this.pageSize);

    this.bindRowEvents();
  }
}

export default CaseListView;
