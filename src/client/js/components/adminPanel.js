/**
 * Admin Panel Component
 * Task 8.7 - Requirements: 14.1-14.8
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

export class AdminPanelView {
  constructor(container) {
    this.container = container;
    this.tables = [];
    this.currentTable = null;
    this.tableData = null;
    this.queryResult = null;
  }

  async render() {
    try {
      this.tables = await api.listTables();
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Admin panel error:", error);
      showToast("Error al cargar el panel de administración", "error");
    }
  }

  template() {
    return `
      <div class="header">
        <div class="header-title">
          <h1>Panel de Administración</h1>
          <p>Inspección de base de datos (solo lectura).</p>
        </div>
        <div class="header-actions">
          <span class="badge turno">Solo SELECT</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 200px 1fr; gap: 24px;">
        <!-- Tables Sidebar -->
        <div class="data-table-container" style="padding: 16px;">
          <h3 style="font-size: 12px; font-weight: 600; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Tablas</h3>
          <div id="tables-list">
            ${this.tables
              .map(
                (t) => `
              <button class="table-item" data-table="${t.name}" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; border-radius: 6px; color: var(--text-dimmed); font-size: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span>${t.name}</span>
                <span style="font-size: 10px; color: var(--text-placeholder);">${t.count}</span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Main Content -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Query Editor -->
          <div class="data-table-container" style="padding: 16px;">
            <h3 style="font-size: 12px; font-weight: 600; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Ejecutar Query</h3>
            <textarea id="query-editor" placeholder="SELECT * FROM cases LIMIT 10" style="width: 100%; min-height: 80px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-mono); font-size: 12px; resize: vertical;"></textarea>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <span id="query-status" style="font-size: 11px; color: var(--text-dimmed);"></span>
              <button id="run-query" class="btn btn-secondary">Ejecutar (Ctrl+Enter)</button>
            </div>
          </div>

          <!-- Results -->
          <div class="data-table-container" style="padding: 0; overflow: hidden;">
            <div style="padding: 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <h3 id="results-title" style="font-size: 12px; font-weight: 600; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px;">Resultados</h3>
              <span id="results-info" style="font-size: 11px; color: var(--text-dimmed);"></span>
            </div>
            <div id="results-container" style="overflow-x: auto;">
              <p style="padding: 24px; text-align: center; color: var(--text-dimmed); font-size: 12px;">Selecciona una tabla o ejecuta una query</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Table selection
    this.container.querySelectorAll(".table-item").forEach((item) => {
      item.addEventListener("click", () => this.loadTable(item.dataset.table));
    });

    // Query execution
    this.container.querySelector("#run-query").addEventListener("click", () => {
      const sql = this.container.querySelector("#query-editor").value;
      this.executeQuery(sql);
    });

    // Ctrl+Enter to run query
    this.container
      .querySelector("#query-editor")
      .addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          const sql = e.target.value;
          this.executeQuery(sql);
        }
      });
  }

  async loadTable(tableName) {
    try {
      // Update active state
      this.container.querySelectorAll(".table-item").forEach((item) => {
        item.style.background =
          item.dataset.table === tableName ? "var(--bg-hover)" : "transparent";
        item.style.color =
          item.dataset.table === tableName
            ? "var(--text-primary-alt)"
            : "var(--text-dimmed)";
      });

      this.currentTable = tableName;
      const data = await api.getTableContents(tableName, 50, 0);

      this.container.querySelector(
        "#results-title"
      ).textContent = `Tabla: ${tableName}`;
      this.container.querySelector(
        "#results-info"
      ).textContent = `${data.rows.length} de ${data.total} registros`;

      this.renderResults(data.rows);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async executeQuery(sql) {
    if (!sql.trim()) {
      showToast("Introduce una query SQL", "error");
      return;
    }

    const statusEl = this.container.querySelector("#query-status");
    statusEl.textContent = "Ejecutando...";
    statusEl.style.color = "var(--text-dimmed)";

    const startTime = performance.now();

    try {
      const result = await api.executeQuery(sql);
      const duration = (performance.now() - startTime).toFixed(0);

      statusEl.textContent = `✓ ${result.rowCount} filas en ${duration}ms`;
      statusEl.style.color = "var(--status-success-text)";

      this.container.querySelector("#results-title").textContent =
        "Resultado de Query";
      this.container.querySelector(
        "#results-info"
      ).textContent = `${result.rowCount} filas`;

      this.renderResults(result.rows);
    } catch (error) {
      statusEl.textContent = `✗ Error: ${error.message}`;
      statusEl.style.color = "var(--status-error)";
    }
  }

  renderResults(rows) {
    const container = this.container.querySelector("#results-container");

    if (!rows || rows.length === 0) {
      container.innerHTML =
        '<p style="padding: 24px; text-align: center; color: var(--text-dimmed); font-size: 12px;">Sin resultados</p>';
      return;
    }

    const columns = Object.keys(rows[0]);

    container.innerHTML = `
      <table class="data-table" style="font-size: 11px;">
        <thead>
          <tr>
            ${columns
              .map(
                (col) =>
                  `<th style="padding: 8px 12px; white-space: nowrap;">${col}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              ${columns
                .map((col) => {
                  let value = row[col];
                  if (value === null)
                    value =
                      '<span style="color: var(--text-placeholder);">NULL</span>';
                  else if (typeof value === "string" && value.length > 50)
                    value = value.substring(0, 50) + "...";
                  return `<td style="padding: 8px 12px; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${value}</td>`;
                })
                .join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }
}

export default AdminPanelView;
