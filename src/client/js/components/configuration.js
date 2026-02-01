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
              <input type="number" name="arag_base_fee" id="arag-fee" value="${c.arag_base_fee || 203}" step="0.01" min="0"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">IVA (%)</label>
              <input type="number" name="vat_rate" id="vat-rate" value="${c.vat_rate || 21}" step="0.1" min="0" max="100"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Email Facturación</label>
              <input type="email" name="arag_email" id="arag-email" value="${c.arag_email || "facturacionsiniestros@arag.es"}"
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
                <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">${d.label} (€)</label>
                <input type="number" name="${d.key}" value="${c[d.key] || 0}" step="0.01" min="0"
                  style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <!-- SMTP Configuration -->
        <div class="data-table-container" style="padding: 24px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 14px; font-weight: 500; color: var(--text-primary-alt); margin: 0;">Configuración SMTP</h3>
            <button type="button" id="btn-test-smtp" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Probar Conexión
            </button>
          </div>
          
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Servidor SMTP</label>
              <input type="text" name="smtp_host" id="smtp-host" value="${c.smtp_host || ""}" placeholder="smtp.example.com"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Puerto</label>
              <input type="number" name="smtp_port" id="smtp-port" value="${c.smtp_port || 587}" min="1" max="65535"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Seguridad</label>
              <select name="smtp_secure" id="smtp-secure"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
                <option value="false" ${c.smtp_secure !== "true" ? "selected" : ""}>STARTTLS (587)</option>
                <option value="true" ${c.smtp_secure === "true" ? "selected" : ""}>SSL/TLS (465)</option>
              </select>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Usuario SMTP</label>
              <input type="text" name="smtp_user" id="smtp-user" value="${c.smtp_user || ""}" placeholder="usuario@example.com"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Contraseña SMTP</label>
              <div style="position: relative;">
                <input type="password" name="smtp_password" id="smtp-password" value="${c.smtp_password || ""}" placeholder="••••••••"
                  style="width: 100%; padding: 10px 12px; padding-right: 40px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
                <button type="button" class="toggle-password" data-target="smtp-password" 
                  style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-dimmed);">
                  <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg class="eye-off-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Dirección de Envío (From)</label>
            <input type="email" name="smtp_from" id="smtp-from" value="${c.smtp_from || ""}" placeholder="despacho@example.com"
              style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
          </div>
          
          <div id="smtp-status" style="margin-top: 12px; display: none;">
            <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px; font-size: 13px;">
              <span class="status-icon"></span>
              <span class="status-text"></span>
            </div>
          </div>
        </div>

        <!-- Certificate Configuration -->
        <div class="data-table-container" style="padding: 24px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 14px; font-weight: 500; color: var(--text-primary-alt); margin: 0;">Certificado Digital ACA (Firma)</h3>
            <button type="button" id="btn-test-cert" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Probar Certificado
            </button>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Ruta del Certificado (.p12/.pfx)</label>
              <input type="text" name="certificate_path" id="cert-path" value="${c.certificate_path || ""}" placeholder="/home/appuser/data/certificates/firma.p12"
                style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Contraseña del Certificado</label>
              <div style="position: relative;">
                <input type="password" name="certificate_password" id="cert-password" value="${c.certificate_password || ""}" placeholder="••••••••"
                  style="width: 100%; padding: 10px 12px; padding-right: 40px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
                <button type="button" class="toggle-password" data-target="cert-password"
                  style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-dimmed);">
                  <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg class="eye-off-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div id="cert-status" style="margin-top: 12px; display: none;">
            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 12px; border-radius: 8px; font-size: 13px;">
              <span class="status-icon" style="flex-shrink: 0; margin-top: 2px;"></span>
              <div class="status-content">
                <span class="status-text"></span>
                <div class="cert-details" style="display: none; margin-top: 8px; font-size: 12px; color: var(--text-secondary);"></div>
              </div>
            </div>
          </div>

          <p style="font-size: 11px; color: var(--text-dimmed); margin-top: 8px;">
            Certificado ACA (Autoridad de Certificación de la Abogacía) para firma digital de documentos PDF.
            Sin certificado configurado, se usa firma visual.
          </p>
        </div>

        <!-- Documents Path -->
        <div class="data-table-container" style="padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 500; color: var(--text-primary-alt); margin-bottom: 16px;">Almacenamiento de Documentos</h3>
          
          <div>
            <label style="font-size: 12px; color: var(--text-dimmed); display: block; margin-bottom: 4px;">Ruta de Documentos</label>
            <input type="text" name="documents_path" id="docs-path" value="${c.documents_path || "data/documents"}" placeholder="data/documents"
              style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); font-family: var(--font-sans); font-size: 14px;">
          </div>
          <p style="font-size: 11px; color: var(--text-dimmed); margin-top: 8px;">
            Directorio donde se almacenan los PDFs generados (minutas y suplidos).
          </p>
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

    // Password visibility toggles
    this.container.querySelectorAll(".toggle-password").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const input = this.container.querySelector(`#${targetId}`);
        const eyeIcon = btn.querySelector(".eye-icon");
        const eyeOffIcon = btn.querySelector(".eye-off-icon");

        if (input.type === "password") {
          input.type = "text";
          eyeIcon.style.display = "none";
          eyeOffIcon.style.display = "block";
        } else {
          input.type = "password";
          eyeIcon.style.display = "block";
          eyeOffIcon.style.display = "none";
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = {};

      for (const [key, value] of formData.entries()) {
        // Convert numeric fields
        if (
          key.includes("fee") ||
          key.includes("rate") ||
          key.includes("mileage") ||
          key === "smtp_port"
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

    // Test SMTP connection
    const testBtn = this.container.querySelector("#btn-test-smtp");
    testBtn?.addEventListener("click", async () => {
      const statusDiv = this.container.querySelector("#smtp-status");
      const statusIcon = statusDiv.querySelector(".status-icon");
      const statusText = statusDiv.querySelector(".status-text");

      // Get current form values for testing (so user doesn't need to save first)
      const smtpConfig = {
        smtp_host: this.container.querySelector("#smtp-host").value,
        smtp_port: this.container.querySelector("#smtp-port").value,
        smtp_secure: this.container.querySelector("#smtp-secure").value,
        smtp_user: this.container.querySelector("#smtp-user").value,
        smtp_password: this.container.querySelector("#smtp-password").value,
        smtp_from: this.container.querySelector("#smtp-from").value,
      };

      // Show loading state
      statusDiv.style.display = "block";
      statusDiv.querySelector("div").style.background = "var(--bg-input)";
      statusIcon.innerHTML = `
        <svg class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      `;
      statusText.textContent = "Probando conexión...";
      statusText.style.color = "var(--text-secondary)";

      try {
        const result = await api.testEmail(smtpConfig);

        if (result.success) {
          statusDiv.querySelector("div").style.background =
            "rgba(34, 197, 94, 0.1)";
          statusIcon.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          statusText.textContent = "Conexión SMTP exitosa";
          statusText.style.color = "#22c55e";
        } else {
          throw new Error(result.error || "Error de conexión");
        }
      } catch (error) {
        statusDiv.querySelector("div").style.background =
          "rgba(239, 68, 68, 0.1)";
        statusIcon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        `;
        statusText.textContent = `Error: ${error.message}`;
        statusText.style.color = "#ef4444";
      }
    });

    // Test Certificate
    const testCertBtn = this.container.querySelector("#btn-test-cert");
    testCertBtn?.addEventListener("click", async () => {
      const statusDiv = this.container.querySelector("#cert-status");
      const statusIcon = statusDiv.querySelector(".status-icon");
      const statusText = statusDiv.querySelector(".status-text");
      const certDetails = statusDiv.querySelector(".cert-details");

      const certPath = this.container.querySelector("#cert-path").value.trim();
      const certPassword = this.container.querySelector("#cert-password").value;

      if (!certPath) {
        statusDiv.style.display = "block";
        statusDiv.querySelector("div").style.background = "rgba(239, 68, 68, 0.1)";
        statusIcon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        `;
        statusText.textContent = "Introduzca la ruta del certificado";
        statusText.style.color = "#ef4444";
        certDetails.style.display = "none";
        return;
      }

      // Show loading state
      statusDiv.style.display = "block";
      statusDiv.querySelector("div").style.background = "var(--bg-input)";
      statusIcon.innerHTML = `
        <svg class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      `;
      statusText.textContent = "Verificando certificado...";
      statusText.style.color = "var(--text-secondary)";
      certDetails.style.display = "none";

      try {
        const result = await api.testCertificate(certPath, certPassword);

        if (result.valid) {
          const isExpiringSoon = result.daysUntilExpiration <= 30;
          const bgColor = isExpiringSoon ? "rgba(234, 179, 8, 0.1)" : "rgba(34, 197, 94, 0.1)";
          const iconColor = isExpiringSoon ? "#eab308" : "#22c55e";

          statusDiv.querySelector("div").style.background = bgColor;
          statusIcon.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          `;

          if (isExpiringSoon) {
            statusText.textContent = `Certificado válido (caduca en ${result.daysUntilExpiration} días)`;
            statusText.style.color = "#eab308";
          } else {
            statusText.textContent = "Certificado válido";
            statusText.style.color = "#22c55e";
          }

          // Format dates
          const validFrom = new Date(result.validFrom).toLocaleDateString("es-ES");
          const validTo = new Date(result.validTo).toLocaleDateString("es-ES");

          certDetails.innerHTML = `
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;">
              <span style="color: var(--text-dimmed);">Titular:</span>
              <span style="font-weight: 500;">${result.cn || "—"}</span>
              <span style="color: var(--text-dimmed);">Organización:</span>
              <span>${result.organization || "—"}</span>
              <span style="color: var(--text-dimmed);">Emisor:</span>
              <span>${result.issuer || "—"}</span>
              <span style="color: var(--text-dimmed);">Válido desde:</span>
              <span>${validFrom}</span>
              <span style="color: var(--text-dimmed);">Válido hasta:</span>
              <span style="${result.isExpired ? "color: #ef4444;" : ""}">${validTo}</span>
            </div>
          `;
          certDetails.style.display = "block";
        } else {
          throw new Error(result.error || "Certificado inválido");
        }
      } catch (error) {
        statusDiv.querySelector("div").style.background = "rgba(239, 68, 68, 0.1)";
        statusIcon.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        `;
        statusText.textContent = error.message || "Error al verificar el certificado";
        statusText.style.color = "#ef4444";
        certDetails.style.display = "none";
      }
    });
  }
}

export default ConfigurationView;
