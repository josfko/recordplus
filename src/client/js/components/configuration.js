/**
 * Configuration Component
 * Task 8.6 - Requirements: 12.1-12.9
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

export class ConfigurationView {
  constructor(container) {
    this.container = container;
    this.config = null;
  }

  async render() {
    try {
      this.config = await api.getConfig();
      this.container.innerHTML = this.template();
      this.bindEvents();
    } catch (error) {
      console.error("Configuration error:", error);
      showToast("Error al cargar la configuración", "error");
    }
  }

  template() {
    const c = this.config || {};
    const districts = [
      { key: "mileage_torrox", label: "Torrox" },
      { key: "mileage_velez_malaga", label: "Vélez-Málaga" },
      { key: "mileage_torremolinos", label: "Torremolinos" },
      { key: "mileage_fuengirola", label: "Fuengirola" },
      { key: "mileage_marbella", label: "Marbella" },
      { key: "mileage_estepona", label: "Estepona" },
      { key: "mileage_antequera", label: "Antequera" },
    ];

    return `
      <div class="header">
        <div class="header-title">
          <h1>Configuración</h1>
          <p>Parámetros del sistema y tarifas.</p>
        </div>
      </div>

      <form id="config-form" style="max-width: 800px;">
        <!-- ARAG Settings -->
        <div class="data-table-container" style="padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 500; color: var(--text-primary-alt); margin-bottom: 16px;">Configuración ARAG</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Tarifa Base (€)</label>
              <input type="number" name="arag_base_fee" id="arag-fee" value="${
                c.arag_base_fee || 203
              }" step="0.01" min="0"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">IVA (%)</label>
              <input type="number" name="vat_rate" id="vat-rate" value="${
                c.vat_rate || 21
              }" step="0.1" min="0" max="100"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Email Facturación</label>
              <input type="email" name="arag_email" id="arag-email" value="${
                c.arag_email || "facturacionsiniestros@arag.es"
              }"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
          </div>
        </div>

        <!-- Mileage Table -->
        <div class="data-table-container" style="padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 500; color: var(--text-primary-alt); margin-bottom: 16px;">Tabla de Kilometraje por Partido Judicial</h3>
          
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
            ${districts
              .map(
                (d) => `
              <div>
                <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">${
                  d.label
                } (€)</label>
                <input type="number" name="${d.key}" value="${
                  c[d.key] || 0
                }" step="0.01" min="0"
                  style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Save Button -->
        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary">Guardar Configuración</button>
        </div>
      </form>
    `;
  }

  bindEvents() {
    const form = this.container.querySelector("#config-form");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = {};

      for (const [key, value] of formData.entries()) {
        // Convert numeric fields
        if (
          key.includes("fee") ||
          key.includes("rate") ||
          key.includes("mileage")
        ) {
          data[key] = parseFloat(value) || 0;
        } else {
          data[key] = value;
        }
      }

      try {
        await api.updateConfig(data);
        showToast("Configuración guardada correctamente", "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }
}

export default ConfigurationView;
