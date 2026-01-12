/**
 * Case Form Component
 * Task 8.4 - Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.6
 */

import { api } from "../api.js";
import { router } from "../router.js";
import { showToast } from "../app.js";

export class CaseFormView {
  constructor(container, caseId = null) {
    this.container = container;
    this.caseId = caseId;
    this.caseData = null;
    this.isEdit = !!caseId;
  }

  async render() {
    try {
      if (this.isEdit) {
        this.caseData = await api.getCase(this.caseId);
      }
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Case form error:", error);
      showToast("Error al cargar el formulario", "error");
    }
  }

  template() {
    const c = this.caseData || {};
    const today = new Date().toISOString().split("T")[0];
    const title = this.isEdit ? "Editar Expediente" : "Nuevo Expediente";

    return `
      <div class="header">
        <div class="header-title">
          <nav class="breadcrumb" style="font-size: 12px; color: var(--text-dimmed); margin-bottom: 8px;">
            <a href="#/" style="color: var(--text-dimmed); text-decoration: none;">Dashboard</a>
            <span style="margin: 0 8px;">›</span>
            <a href="#/cases" style="color: var(--text-dimmed); text-decoration: none;">Expedientes</a>
            <span style="margin: 0 8px;">›</span>
            <span style="color: var(--text-muted);">${title}</span>
          </nav>
          <h1>${title}</h1>
        </div>
      </div>

      <div class="data-table-container" style="padding: 24px; max-width: 600px;">
        <form id="case-form">
          <!-- Case Type -->
          <div style="margin-bottom: 20px;">
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 8px;">Tipo de Expediente *</label>
            <div class="filter-tabs" style="width: fit-content;">
              <button type="button" class="filter-tab type-tab ${
                !c.type || c.type === "ARAG" ? "active" : ""
              }" data-type="ARAG" ${this.isEdit ? "disabled" : ""}>ARAG</button>
              <button type="button" class="filter-tab type-tab ${
                c.type === "PARTICULAR" ? "active" : ""
              }" data-type="PARTICULAR" ${
      this.isEdit ? "disabled" : ""
    }>Particular</button>
              <button type="button" class="filter-tab type-tab ${
                c.type === "TURNO_OFICIO" ? "active" : ""
              }" data-type="TURNO_OFICIO" ${
      this.isEdit ? "disabled" : ""
    }>Turno Oficio</button>
            </div>
            <input type="hidden" name="type" id="case-type" value="${
              c.type || "ARAG"
            }">
          </div>

          <!-- Client Name -->
          <div style="margin-bottom: 20px;">
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Nombre del Cliente *</label>
            <input type="text" name="clientName" id="client-name" value="${
              c.clientName || ""
            }" required
              style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;"
              placeholder="Nombre completo del cliente">
          </div>

          <!-- ARAG Reference (ARAG only) -->
          <div id="arag-field" style="margin-bottom: 20px; ${
            c.type && c.type !== "ARAG" ? "display: none;" : ""
          }">
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Referencia ARAG * <span style="font-size: 10px; color: var(--text-placeholder);">(DJ00xxxxxx)</span></label>
            <input type="text" name="aragReference" id="arag-reference" value="${
              c.aragReference || ""
            }"
              style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-mono); font-size: 14px;"
              placeholder="DJ00123456" pattern="DJ00[0-9]{6}" maxlength="10">
            <p id="arag-error" style="font-size: 11px; color: var(--status-error); margin-top: 4px; display: none;">Formato inválido. Debe ser DJ00 seguido de 6 dígitos.</p>
          </div>

          <!-- Designation (Turno only) -->
          <div id="turno-field" style="margin-bottom: 20px; ${
            c.type !== "TURNO_OFICIO" ? "display: none;" : ""
          }">
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Número de Designación *</label>
            <input type="text" name="designation" id="designation" value="${
              c.designation || ""
            }"
              style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;"
              placeholder="8821/23">
          </div>

          <!-- Entry Date -->
          <div style="margin-bottom: 24px;">
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Fecha de Entrada</label>
            <input type="date" name="entryDate" id="entry-date" value="${
              c.entryDate || today
            }"
              style="width: 200px; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 12px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary">${
              this.isEdit ? "Guardar Cambios" : "Crear Expediente"
            }</button>
          </div>
        </form>
      </div>
    `;
  }

  bindEvents() {
    const form = this.container.querySelector("#case-form");
    const typeInput = this.container.querySelector("#case-type");
    const aragField = this.container.querySelector("#arag-field");
    const turnoField = this.container.querySelector("#turno-field");
    const aragInput = this.container.querySelector("#arag-reference");
    const aragError = this.container.querySelector("#arag-error");

    // Type selection
    this.container.querySelectorAll(".type-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (this.isEdit) return;

        this.container
          .querySelectorAll(".type-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        typeInput.value = tab.dataset.type;

        // Show/hide type-specific fields
        aragField.style.display =
          tab.dataset.type === "ARAG" ? "block" : "none";
        turnoField.style.display =
          tab.dataset.type === "TURNO_OFICIO" ? "block" : "none";
      });
    });

    // ARAG reference validation
    aragInput?.addEventListener("input", (e) => {
      const value = e.target.value.toUpperCase();
      e.target.value = value;

      if (value && !/^DJ00\d{6}$/.test(value)) {
        aragError.style.display = "block";
        aragInput.style.borderColor = "var(--status-error)";
      } else {
        aragError.style.display = "none";
        aragInput.style.borderColor = "var(--border-default)";
      }
    });

    // Cancel button
    this.container
      .querySelector("#btn-cancel")
      .addEventListener("click", () => {
        router.navigate("/cases");
      });

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const type = typeInput.value;
      const clientName = this.container
        .querySelector("#client-name")
        .value.trim();
      const entryDate = this.container.querySelector("#entry-date").value;

      // Validation
      if (!clientName) {
        showToast("El nombre del cliente es obligatorio", "error");
        return;
      }

      const data = { type, clientName, entryDate };

      if (type === "ARAG") {
        const aragReference = aragInput.value.trim();
        if (!aragReference || !/^DJ00\d{6}$/.test(aragReference)) {
          showToast(
            "La referencia ARAG es obligatoria y debe tener formato DJ00xxxxxx",
            "error"
          );
          return;
        }
        data.aragReference = aragReference;
      }

      if (type === "TURNO_OFICIO") {
        const designation = this.container
          .querySelector("#designation")
          .value.trim();
        if (!designation) {
          showToast("El número de designación es obligatorio", "error");
          return;
        }
        data.designation = designation;
      }

      try {
        if (this.isEdit) {
          await api.updateCase(this.caseId, data);
          showToast("Expediente actualizado", "success");
          router.navigate(`/cases/${this.caseId}`);
        } else {
          const newCase = await api.createCase(data);
          showToast("Expediente creado correctamente", "success");
          router.navigate(`/cases/${newCase.id}`);
        }
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }
}

export default CaseFormView;
