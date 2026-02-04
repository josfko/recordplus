/**
 * Admin Panel Component
 * Task 8.7 - Requirements: 14.1-14.8
 * Extended with backup management
 */

import { api } from "../api.js";
import { showToast } from "../app.js";
import { BackupPanelView } from "./backupPanel.js";

export class AdminPanelView {
  constructor(container) {
    this.container = container;
    this.tables = [];
    this.currentTable = null;
    this.tableData = null;
    this.queryResult = null;
    this.activeTab = "database"; // 'database' or 'backups'
    this.backupPanel = null;
  }

  async render() {
    try {
      this.tables = await api.listTables();
      this.container.innerHTML = this.template();
      this.bindEvents();

      // If backups tab is active, render the backup panel
      if (this.activeTab === "backups") {
        await this.renderBackupPanel();
      }
    } catch (error) {
      console.error("Admin panel error:", error);
      showToast("Error al cargar el panel de administracion", "error");
    }
  }

  template() {
    return `
      <div class="header">
        <div class="header-title">
          <h1>Panel de Administracion</h1>
          <p>Gestion de base de datos y copias de seguridad.</p>
        </div>
        <div class="header-actions">
          <span class="badge turno">Solo SELECT</span>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="admin-tabs">
        <button class="admin-tab ${this.activeTab === "database" ? "active" : ""}" data-tab="database">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          Base de Datos
        </button>
        <button class="admin-tab ${this.activeTab === "backups" ? "active" : ""}" data-tab="backups">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Copias de Seguridad
        </button>
      </div>

      <!-- Tab Content -->
      <div class="admin-tab-content">
        ${this.activeTab === "database" ? this.databaseTabContent() : '<div id="backup-panel-container"></div>'}
      </div>
    `;
  }

  databaseTabContent() {
    return `
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
    // Tab switching
    this.container.querySelectorAll(".admin-tab").forEach((tab) => {
      tab.addEventListener("click", async () => {
        const newTab = tab.dataset.tab;
        if (newTab !== this.activeTab) {
          this.activeTab = newTab;
          await this.render();
        }
      });
    });

    // Only bind database events if database tab is active
    if (this.activeTab === "database") {
      this.bindDatabaseEvents();
    }
  }

  bindDatabaseEvents() {
    // Table selection
    this.container.querySelectorAll(".table-item").forEach((item) => {
      item.addEventListener("click", () => this.loadTable(item.dataset.table));
    });

    // Query execution
    const runBtn = this.container.querySelector("#run-query");
    if (runBtn) {
      runBtn.addEventListener("click", () => {
        const sql = this.container.querySelector("#query-editor").value;
        this.executeQuery(sql);
      });
    }

    // Ctrl+Enter to run query
    const editor = this.container.querySelector("#query-editor");
    if (editor) {
      editor.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          const sql = e.target.value;
          this.executeQuery(sql);
        }
      });
    }
  }

  async renderBackupPanel() {
    const panelContainer = this.container.querySelector("#backup-panel-container");
    if (panelContainer) {
      this.backupPanel = new BackupPanelView(panelContainer);
      await this.backupPanel.render();
    }
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

      statusEl.textContent = `OK ${result.rowCount} filas en ${duration}ms`;
      statusEl.style.color = "var(--status-success-text)";

      this.container.querySelector("#results-title").textContent =
        "Resultado de Query";
      this.container.querySelector(
        "#results-info"
      ).textContent = `${result.rowCount} filas`;

      this.renderResults(result.rows);
    } catch (error) {
      statusEl.textContent = `Error: ${error.message}`;
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
