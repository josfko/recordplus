/**
 * Document Upload Modal
 * Modal component for uploading documents to Turno de Oficio cases
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

export class DocumentUploadModal {
  constructor(caseData, onComplete) {
    this.caseData = caseData;
    this.onComplete = onComplete;
    this.modal = null;
  }

  show() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = this.template();
    document.body.appendChild(modal);

    this.modal = modal;
    this.bindEvents();

    // Trigger CSS transition by adding modal-visible class after DOM insertion
    requestAnimationFrame(() => {
      this.modal.classList.add("modal-visible");
      // Focus on description input after transition starts
      setTimeout(() => {
        this.modal.querySelector("#upload-description")?.focus();
      }, 100);
    });
  }

  template() {
    return `
      <div class="modal modal-upload">
        <div class="modal-header">
          <h2>Subir Documento</h2>
          <button class="btn-close" data-action="close" aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <form id="upload-form">
            <div class="form-group">
              <label>Expediente</label>
              <input type="text" class="form-input" value="${this.caseData.internalReference || "Turno " + this.caseData.id} - ${this.caseData.clientName}" disabled>
            </div>

            <div class="form-group">
              <label for="upload-description">Descripción del documento *</label>
              <input
                type="text"
                id="upload-description"
                name="description"
                class="form-input"
                placeholder="Ej: Escrito de defensa, Notificación juzgado..."
                required
                maxlength="200"
              >
            </div>

            <div class="form-group">
              <label>Archivo PDF *</label>
              <div class="file-drop-zone" id="drop-zone">
                <input type="file" id="upload-file" name="document" accept=".pdf,application/pdf" required hidden>
                <div class="drop-zone-content">
                  <div class="drop-zone-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p class="drop-zone-text">Arrastra un archivo PDF aquí</p>
                  <p class="drop-zone-subtext">o <span class="drop-zone-link">selecciona un archivo</span></p>
                  <p class="drop-zone-limit">Máximo 10 MB</p>
                </div>
                <div class="file-selected" id="file-selected" style="display: none;">
                  <div class="file-info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="file-name" id="file-name"></span>
                  </div>
                  <button type="button" class="btn-remove-file" id="btn-remove-file" aria-label="Eliminar archivo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div id="upload-progress" class="upload-progress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
              </div>
              <span class="progress-text">Subiendo documento...</span>
            </div>

            <div id="upload-error" class="upload-error" style="display: none;"></div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="close">Cancelar</button>
          <button type="button" class="btn btn-primary btn-amber" data-action="upload" id="btn-upload">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Subir Documento
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const dropZone = this.modal.querySelector("#drop-zone");
    const fileInput = this.modal.querySelector("#upload-file");
    const fileSelected = this.modal.querySelector("#file-selected");
    const dropZoneContent = this.modal.querySelector(".drop-zone-content");
    const fileName = this.modal.querySelector("#file-name");
    const removeBtn = this.modal.querySelector("#btn-remove-file");

    // Click to select file
    dropZone.addEventListener("click", (e) => {
      if (e.target.closest("#btn-remove-file")) return;
      fileInput.click();
    });

    // File selected via input
    fileInput.addEventListener("change", () => {
      if (fileInput.files[0]) {
        this.showSelectedFile(fileInput.files[0]);
      }
    });

    // Remove file button
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearSelectedFile();
    });

    // Drag and drop
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");

      const file = e.dataTransfer.files[0];
      if (file) {
        if (file.type !== "application/pdf") {
          this.showError("Solo se permiten archivos PDF");
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          this.showError("El archivo supera el tamaño máximo de 10 MB");
          return;
        }
        // Set the file to the input
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        this.showSelectedFile(file);
      }
    });

    // Modal actions
    this.modal.addEventListener("click", async (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "close") {
        this.close();
      } else if (action === "upload") {
        await this.upload();
      }
    });

    // Close on escape key
    document.addEventListener("keydown", this.handleEscape);

    // Close on backdrop click
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  handleEscape = (e) => {
    if (e.key === "Escape") {
      this.close();
    }
  };

  showSelectedFile(file) {
    const dropZoneContent = this.modal.querySelector(".drop-zone-content");
    const fileSelected = this.modal.querySelector("#file-selected");
    const fileName = this.modal.querySelector("#file-name");
    const dropZone = this.modal.querySelector("#drop-zone");

    dropZoneContent.style.display = "none";
    fileSelected.style.display = "flex";
    fileName.textContent = file.name;
    dropZone.classList.add("has-file");
    this.hideError();
  }

  clearSelectedFile() {
    const dropZoneContent = this.modal.querySelector(".drop-zone-content");
    const fileSelected = this.modal.querySelector("#file-selected");
    const fileInput = this.modal.querySelector("#upload-file");
    const dropZone = this.modal.querySelector("#drop-zone");

    dropZoneContent.style.display = "flex";
    fileSelected.style.display = "none";
    fileInput.value = "";
    dropZone.classList.remove("has-file");
  }

  showError(message) {
    const errorDiv = this.modal.querySelector("#upload-error");
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }

  hideError() {
    const errorDiv = this.modal.querySelector("#upload-error");
    errorDiv.style.display = "none";
  }

  showProgress() {
    this.modal.querySelector("#upload-progress").style.display = "block";
    this.modal.querySelector("#btn-upload").disabled = true;
    this.modal.querySelector("#btn-upload").innerHTML = `
      <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
      </svg>
      Subiendo...
    `;
  }

  hideProgress() {
    this.modal.querySelector("#upload-progress").style.display = "none";
    this.modal.querySelector("#btn-upload").disabled = false;
    this.modal.querySelector("#btn-upload").innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Subir Documento
    `;
  }

  async upload() {
    const form = this.modal.querySelector("#upload-form");
    const fileInput = this.modal.querySelector("#upload-file");
    const description = this.modal.querySelector("#upload-description").value.trim();

    // Validate form
    if (!description) {
      this.showError("La descripción es obligatoria");
      this.modal.querySelector("#upload-description").focus();
      return;
    }

    if (!fileInput.files[0]) {
      this.showError("Seleccione un archivo PDF");
      return;
    }

    this.hideError();
    this.showProgress();

    const formData = new FormData();
    formData.append("document", fileInput.files[0]);
    formData.append("description", description);

    try {
      const result = await api.uploadTurnoDocument(this.caseData.id, formData);
      this.hideProgress();
      showToast("Documento subido correctamente", "success");
      this.close();
      if (this.onComplete) {
        this.onComplete(result.data);
      }
    } catch (error) {
      this.hideProgress();
      this.showError(error.message || "Error al subir el documento");
    }
  }

  close() {
    document.removeEventListener("keydown", this.handleEscape);
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
