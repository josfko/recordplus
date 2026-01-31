/**
 * Case Detail Component
 * Task 8.5 - Requirements: 6.1-6.7, 10.1-10.6, 11.1-11.5, 13.1-13.5
 */

import { api } from "../api.js";
import { router } from "../router.js";
import { formatDate, showToast } from "../app.js";

export class CaseDetailView {
  constructor(container, caseId) {
    this.container = container;
    this.caseId = caseId;
    this.caseData = null;
  }

  async render() {
    try {
      this.caseData = await api.getCase(this.caseId);
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Case detail error:", error);
      if (error.status === 404) {
        this.container.innerHTML = `
          <div class="empty-state">
            <h2>Expediente no encontrado</h2>
            <p>El expediente solicitado no existe.</p>
            <a href="#/cases" class="btn btn-secondary">Volver a expedientes</a>
          </div>
        `;
      } else {
        showToast("Error al cargar el expediente", "error");
      }
    }
  }

  template() {
    const c = this.caseData;
    const typeBadges = {
      ARAG: { class: "arag", label: "ARAG" },
      PARTICULAR: { class: "particular", label: "Particular" },
      TURNO_OFICIO: { class: "turno", label: "Turno Oficio" },
    };
    const badge = typeBadges[c.type] || { class: "turno", label: c.type };

    const stateDisplay =
      c.state === "ABIERTO"
        ? "Abierto"
        : c.state === "ARCHIVADO"
        ? "Archivado"
        : `Judicial${c.judicialDistrict ? ` (${c.judicialDistrict})` : ""}`;

    return `
      <div class="header">
        <div class="header-title">
          <nav class="breadcrumb" style="font-size: 12px; color: var(--text-dimmed); margin-bottom: 8px;">
            <a href="#/" style="color: var(--text-dimmed); text-decoration: none;">Dashboard</a>
            <span style="margin: 0 8px;">›</span>
            <a href="#/cases" style="color: var(--text-dimmed); text-decoration: none;">Expedientes</a>
            <span style="margin: 0 8px;">›</span>
            <span style="color: var(--text-muted);">${
              c.internalReference || c.clientName
            }</span>
          </nav>
          <h1>${c.clientName}</h1>
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
            <span class="badge ${badge.class}"><span class="badge-dot"></span>${
      badge.label
    }</span>
            <span style="color: var(--text-dimmed); font-size: 12px;">Estado: ${stateDisplay}</span>
          </div>
        </div>
        <div class="header-actions">
          ${this.renderActionButtons()}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        <!-- Main Info -->
        <div class="data-table-container" style="padding: 24px;">
          <h3 style="font-size: 14px; font-weight: 500; color: var(--text-primary-alt); margin-bottom: 16px;">Información del Expediente</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Referencia Interna</label>
              <p style="font-family: var(--font-mono); font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${
                c.internalReference || "-"
              }</p>
            </div>
            ${
              c.type === "ARAG"
                ? `
            <div>
              <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Referencia ARAG</label>
              <p style="font-family: var(--font-mono); font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${
                c.aragReference || "-"
              }</p>
            </div>
            `
                : ""
            }
            ${
              c.type === "TURNO_OFICIO"
                ? `
            <div>
              <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Designación</label>
              <p style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${
                c.designation || "-"
              }</p>
            </div>
            `
                : ""
            }
            <div>
              <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Fecha de Entrada</label>
              <p style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${formatDate(
                c.entryDate
              )}</p>
            </div>
            ${
              c.judicialDate
                ? `
            <div>
              <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Fecha Judicial</label>
              <p style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${formatDate(
                c.judicialDate
              )}</p>
            </div>
            `
                : ""
            }
            ${
              c.closureDate
                ? `
            <div>
              <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Fecha de Cierre</label>
              <p style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${formatDate(
                c.closureDate
              )}</p>
            </div>
            `
                : ""
            }
          </div>

          <div style="margin-top: 24px;">
            <label style="font-size: 10px; text-transform: uppercase; color: var(--text-dimmed); letter-spacing: 0.5px;">Observaciones</label>
            <textarea id="observations" style="width: 100%; min-height: 120px; margin-top: 8px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-secondary); font-family: var(--font-sans); font-size: 14px; resize: vertical;" placeholder="Añadir observaciones...">${
              c.observations || ""
            }</textarea>
          </div>
        </div>

        <!-- Sidebar -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Documents -->
          <div class="data-table-container" style="padding: 16px;">
            <h3 style="font-size: 12px; font-weight: 500; color: var(--text-primary-alt); margin-bottom: 12px;">Documentos</h3>
            <p style="font-size: 12px; color: var(--text-dimmed);">No hay documentos generados</p>
          </div>

          <!-- Emails -->
          <div class="data-table-container" style="padding: 16px;">
            <h3 style="font-size: 12px; font-weight: 500; color: var(--text-primary-alt); margin-bottom: 12px;">Correos Enviados</h3>
            <p style="font-size: 12px; color: var(--text-dimmed);">No hay correos enviados</p>
          </div>
        </div>
      </div>
    `;
  }

  renderActionButtons() {
    const c = this.caseData;
    let buttons = "";

    if (c.state !== "ARCHIVADO") {
      // ARAG specific actions
      if (c.type === "ARAG") {
        buttons += `<a href="#/invoicing/${c.id}" class="btn btn-secondary btn-action-billing">Facturación</a>`;
        buttons += `<button class="btn btn-secondary btn-action-document" id="btn-minuta">Generar Minuta</button>`;
        if (c.state === "ABIERTO") {
          buttons += `<button class="btn btn-secondary btn-action-transition" id="btn-judicial">Pasar a Judicial</button>`;
        }
        if (c.state === "JUDICIAL") {
          buttons += `<button class="btn btn-secondary btn-action-document" id="btn-suplido">Generar Suplido</button>`;
        }
      }

      // PARTICULAR specific actions
      if (c.type === "PARTICULAR") {
        buttons += `<a href="#/particulares/${c.id}" class="btn btn-secondary btn-action-document">Hoja de Encargo</a>`;
      }

      // TURNO_OFICIO specific actions
      if (c.type === "TURNO_OFICIO") {
        buttons += `<a href="#/turno/${c.id}" class="btn btn-secondary btn-action-billing">Gestionar Expediente</a>`;
      }

      // Archive button for all types
      buttons += `<button class="btn btn-secondary btn-action-archive" id="btn-archive">Archivar</button>`;
    }

    return buttons;
  }

  bindEvents() {
    // Auto-save observations
    const textarea = this.container.querySelector("#observations");
    let saveTimeout;
    textarea?.addEventListener("input", () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        try {
          await api.updateCase(this.caseId, { observations: textarea.value });
          showToast("Observaciones guardadas", "success");
        } catch (error) {
          showToast("Error al guardar", "error");
        }
      }, 1000);
    });

    // Action buttons
    this.container
      .querySelector("#btn-judicial")
      ?.addEventListener("click", () => this.showJudicialModal());
    this.container
      .querySelector("#btn-archive")
      ?.addEventListener("click", () => this.showArchiveModal());
    this.container
      .querySelector("#btn-minuta")
      ?.addEventListener("click", () =>
        showToast("Generación de minutas próximamente", "info")
      );
    this.container
      .querySelector("#btn-suplido")
      ?.addEventListener("click", () =>
        showToast("Generación de suplidos próximamente", "info")
      );
  }

  showJudicialModal() {
    const today = new Date().toISOString().split("T")[0];
    const districts = [
      "Torrox",
      "Vélez-Málaga",
      "Torremolinos",
      "Fuengirola",
      "Marbella",
      "Estepona",
      "Antequera",
    ];

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal" style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 24px; max-width: 400px; width: 90%;">
        <h3 style="font-size: 16px; font-weight: 500; color: var(--text-primary); margin-bottom: 16px;">Pasar a Judicial</h3>
        <div style="margin-bottom: 16px;">
          <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Fecha</label>
          <input type="date" id="judicial-date" value="${today}" style="width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans);">
        </div>
        <div style="margin-bottom: 24px;">
          <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Partido Judicial</label>
          <select id="judicial-district" style="width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans);">
            ${districts
              .map((d) => `<option value="${d}">${d}</option>`)
              .join("")}
          </select>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-confirm">Confirmar</button>
        </div>
      </div>
    `;
    modal.style.cssText =
      "position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
    document.body.appendChild(modal);

    modal
      .querySelector("#modal-cancel")
      .addEventListener("click", () => modal.remove());
    modal
      .querySelector("#modal-confirm")
      .addEventListener("click", async () => {
        const date = modal.querySelector("#judicial-date").value;
        const district = modal.querySelector("#judicial-district").value;
        try {
          await api.transitionToJudicial(this.caseId, date, district);
          showToast("Expediente pasado a judicial", "success");
          modal.remove();
          await this.render();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
  }

  showArchiveModal() {
    const today = new Date().toISOString().split("T")[0];

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal" style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 24px; max-width: 400px; width: 90%;">
        <h3 style="font-size: 16px; font-weight: 500; color: var(--text-primary); margin-bottom: 16px;">Archivar Expediente</h3>
        <div style="margin-bottom: 24px;">
          <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Fecha de Cierre</label>
          <input type="date" id="closure-date" value="${today}" style="width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans);">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-confirm">Archivar</button>
        </div>
      </div>
    `;
    modal.style.cssText =
      "position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
    document.body.appendChild(modal);

    modal
      .querySelector("#modal-cancel")
      .addEventListener("click", () => modal.remove());
    modal
      .querySelector("#modal-confirm")
      .addEventListener("click", async () => {
        const date = modal.querySelector("#closure-date").value;
        try {
          await api.archiveCase(this.caseId, date);
          showToast("Expediente archivado", "success");
          modal.remove();
          await this.render();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
  }
}

export default CaseDetailView;
