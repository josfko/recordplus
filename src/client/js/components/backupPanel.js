/**
 * Backup Panel Component
 * Manages database backups: view, create, download, delete
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

export class BackupPanelView {
  constructor(container) {
    this.container = container;
    this.status = null;
    this.backups = [];
    this.isCreating = false;
    this.csvStatus = null;
    this.isExportingCsv = false;
  }

  async render() {
    try {
      // Load data in parallel
      const [statusRes, backupsRes, csvStatusRes] = await Promise.all([
        api.getBackupStatus(),
        api.listBackups(),
        api.getCsvExportStatus().catch(() => ({ data: null })),
      ]);
      this.status = statusRes.data;
      this.backups = backupsRes.data;
      this.csvStatus = csvStatusRes.data;

      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Backup panel error:", error);
      this.container.innerHTML = this.errorTemplate(error.message);
    }
  }

  template() {
    const lastBackup = this.status?.lastBackup;
    const lastBackupText = lastBackup
      ? this.formatRelativeTime(lastBackup.createdAt)
      : "Nunca";
    const lastBackupDate = lastBackup
      ? this.formatDate(lastBackup.createdAt)
      : "-";

    return `
      <div class="backup-panel">
        <!-- Stats Cards -->
        <div class="backup-stats">
          <div class="backup-stat-card">
            <div class="backup-stat-icon backup-stat-icon--time">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="backup-stat-content">
              <span class="backup-stat-label">Ultima copia</span>
              <span class="backup-stat-value">${lastBackupText}</span>
              <span class="backup-stat-detail">${lastBackupDate}</span>
            </div>
          </div>

          <div class="backup-stat-card">
            <div class="backup-stat-icon backup-stat-icon--storage">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <div class="backup-stat-content">
              <span class="backup-stat-label">Almacenamiento</span>
              <span class="backup-stat-value">${this.status?.totalSizeFormatted || "0 B"}</span>
              <span class="backup-stat-detail">${this.status?.totalBackups || 0} copias</span>
            </div>
          </div>

          <div class="backup-stat-card">
            <div class="backup-stat-icon backup-stat-icon--sync">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 16h5v5"/>
              </svg>
            </div>
            <div class="backup-stat-content">
              <span class="backup-stat-label">Sincronizacion</span>
              <span class="backup-stat-value backup-stat-value--dimmed">No configurada</span>
              <span class="backup-stat-detail">Descarga manual</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="backup-actions">
          <button id="create-backup-btn" class="btn btn-primary" ${this.isCreating ? "disabled" : ""}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            ${this.isCreating ? "Creando..." : "Crear Copia Ahora"}
          </button>
        </div>

        <!-- Backups List -->
        <div class="backup-list-container data-table-container">
          <div class="backup-list-header">
            <h3>Historial de Copias</h3>
            <span class="backup-count">${this.backups.length} archivo${this.backups.length !== 1 ? "s" : ""}</span>
          </div>
          ${this.backups.length > 0 ? this.renderBackupTable() : this.renderEmptyState()}
        </div>

        ${this.renderCsvExportSection()}
      </div>
    `;
  }

  renderBackupTable() {
    return `
      <table class="data-table backup-table">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Fecha</th>
            <th>Tamano</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.backups
            .map(
              (backup) => `
            <tr data-filename="${backup.filename}">
              <td>
                <span class="backup-filename">${backup.filename}</span>
              </td>
              <td>
                <span class="backup-date">${this.formatDate(backup.createdAt)}</span>
              </td>
              <td>
                <span class="backup-size">${backup.sizeFormatted}</span>
              </td>
              <td class="backup-actions-cell">
                <button class="btn-icon btn-download" data-filename="${backup.filename}" title="Descargar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button class="btn-icon btn-delete" data-filename="${backup.filename}" title="Eliminar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  renderEmptyState() {
    return `
      <div class="backup-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
        <p>No hay copias de seguridad</p>
        <span>Crea tu primera copia de seguridad</span>
      </div>
    `;
  }

  errorTemplate(message) {
    return `
      <div class="backup-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Error al cargar copias de seguridad</p>
        <span>${message}</span>
        <button class="btn btn-secondary" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }

  renderCsvExportSection() {
    const lastExport = this.csvStatus?.lastExport;
    const lastExportText = lastExport
      ? this.formatRelativeTime(lastExport)
      : "Nunca";
    const csvFiles = this.csvStatus?.csvFiles || [];
    const zipFiles = this.csvStatus?.zipFiles || [];
    const latestZip = zipFiles.length > 0 ? zipFiles[0] : null;

    return `
      <div class="csv-export-section">
        <div class="csv-export-header">
          <div>
            <h3>Exportacion CSV</h3>
            <span class="csv-export-subtitle">Archivos CSV para Excel/Numbers y sincronizacion con Syncthing</span>
          </div>
          <span class="csv-export-last-time">Ultima exportacion: ${lastExportText}</span>
        </div>

        <div class="csv-export-actions">
          <button id="generate-csv-btn" class="btn btn-primary" ${this.isExportingCsv ? "disabled" : ""}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            ${this.isExportingCsv ? "Exportando..." : "Exportar CSV"}
          </button>
          ${latestZip ? `
          <button id="download-csv-zip-btn" class="btn btn-secondary" data-filename="${latestZip.filename}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar ZIP (${latestZip.sizeFormatted})
          </button>
          ` : ""}
        </div>

        ${csvFiles.length > 0 ? this.renderCsvFileTable(csvFiles) : ""}
      </div>
    `;
  }

  renderCsvFileTable(csvFiles) {
    return `
      <div class="csv-files-list data-table-container">
        <div class="backup-list-header">
          <h4>Archivos CSV generados</h4>
          <span class="backup-count">${csvFiles.length} archivo${csvFiles.length !== 1 ? "s" : ""}</span>
        </div>
        <table class="data-table csv-table">
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Tamano</th>
              <th>Modificado</th>
            </tr>
          </thead>
          <tbody>
            ${csvFiles.map((f) => `
              <tr>
                <td><span class="backup-filename">${f.filename}</span></td>
                <td><span class="backup-size">${f.sizeFormatted}</span></td>
                <td><span class="backup-date">${this.formatDate(f.modifiedAt)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  bindEvents() {
    // Create backup button
    const createBtn = this.container.querySelector("#create-backup-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => this.createBackup());
    }

    // Download buttons
    this.container.querySelectorAll(".btn-download").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filename = e.currentTarget.dataset.filename;
        this.downloadBackup(filename);
      });
    });

    // Delete buttons
    this.container.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filename = e.currentTarget.dataset.filename;
        this.deleteBackup(filename);
      });
    });

    // CSV Export buttons
    const csvBtn = this.container.querySelector("#generate-csv-btn");
    if (csvBtn) {
      csvBtn.addEventListener("click", () => this.generateCsvExport());
    }

    const csvZipBtn = this.container.querySelector("#download-csv-zip-btn");
    if (csvZipBtn) {
      csvZipBtn.addEventListener("click", (e) => {
        const filename = e.currentTarget.dataset.filename;
        this.downloadCsvZip(filename);
      });
    }
  }

  async createBackup() {
    if (this.isCreating) return;

    this.isCreating = true;
    const btn = this.container.querySelector("#create-backup-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Creando...
      `;
    }

    try {
      const result = await api.createBackup();
      showToast("Copia de seguridad creada correctamente", "success");

      // Refresh the panel
      await this.render();
    } catch (error) {
      showToast(error.message || "Error al crear copia de seguridad", "error");
      this.isCreating = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Crear Copia Ahora
        `;
      }
    }
  }

  downloadBackup(filename) {
    const url = api.getBackupDownloadUrl(filename);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Descargando copia de seguridad...", "success");
  }

  async deleteBackup(filename) {
    if (!confirm(`¿Eliminar ${filename}?`)) return;

    try {
      await api.deleteBackup(filename);
      showToast("Copia de seguridad eliminada", "success");
      await this.render();
    } catch (error) {
      showToast(error.message || "Error al eliminar copia", "error");
    }
  }

  async generateCsvExport() {
    if (this.isExportingCsv) return;

    this.isExportingCsv = true;
    const btn = this.container.querySelector("#generate-csv-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Exportando...
      `;
    }

    try {
      await api.generateCsvExport();
      showToast("Exportacion CSV generada correctamente", "success");
      await this.render();
    } catch (error) {
      showToast(error.message || "Error al exportar CSV", "error");
      this.isExportingCsv = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Exportar CSV
        `;
      }
    }
  }

  downloadCsvZip(filename) {
    const url = api.getCsvExportDownloadUrl(filename);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Descargando archivo ZIP...", "success");
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 7) return `Hace ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
    return this.formatDate(isoString);
  }
}

export default BackupPanelView;
