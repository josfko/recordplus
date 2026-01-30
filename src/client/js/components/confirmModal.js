/**
 * Confirm Modal
 * Elegant confirmation dialog with customizable actions
 */

export class ConfirmModal {
  constructor(options = {}) {
    this.title = options.title || "Confirmar";
    this.message = options.message || "¿Está seguro?";
    this.confirmText = options.confirmText || "Confirmar";
    this.cancelText = options.cancelText || "Cancelar";
    this.type = options.type || "warning"; // 'warning', 'danger', 'info'
    this.icon = options.icon || null;
    this.onConfirm = options.onConfirm || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.modal = null;
  }

  show() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = this.template();
    document.body.appendChild(modal);

    this.modal = modal;
    this.bindEvents();

    // Trigger CSS transition
    requestAnimationFrame(() => {
      this.modal.classList.add("modal-visible");
      // Focus on cancel button for safety
      setTimeout(() => {
        this.modal.querySelector("[data-action='cancel']")?.focus();
      }, 100);
    });
  }

  template() {
    const iconSvg = this.getIcon();
    const typeClass = `confirm-modal-${this.type}`;

    return `
      <div class="modal confirm-modal ${typeClass}">
        <div class="confirm-modal-content">
          <div class="confirm-modal-icon">
            ${iconSvg}
          </div>
          <div class="confirm-modal-text">
            <h3 class="confirm-modal-title">${this.title}</h3>
            <p class="confirm-modal-message">${this.message}</p>
          </div>
        </div>
        <div class="confirm-modal-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">
            ${this.cancelText}
          </button>
          <button type="button" class="btn btn-${this.type === 'danger' ? 'danger' : 'primary'}" data-action="confirm">
            ${this.confirmText}
          </button>
        </div>
      </div>
    `;
  }

  getIcon() {
    if (this.icon) return this.icon;

    switch (this.type) {
      case "danger":
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        `;
      case "warning":
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        `;
      default:
        return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        `;
    }
  }

  bindEvents() {
    // Button actions
    this.modal.addEventListener("click", async (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "cancel") {
        this.close();
        this.onCancel();
      } else if (action === "confirm") {
        // Disable buttons and show loading state
        const confirmBtn = this.modal.querySelector("[data-action='confirm']");
        const cancelBtn = this.modal.querySelector("[data-action='cancel']");
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.innerHTML = `
          <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
          </svg>
          Procesando...
        `;

        try {
          await this.onConfirm();
          this.close();
        } catch (error) {
          // Re-enable buttons on error
          confirmBtn.disabled = false;
          cancelBtn.disabled = false;
          confirmBtn.textContent = this.confirmText;
        }
      }
    });

    // Close on escape key
    this.handleEscape = (e) => {
      if (e.key === "Escape") {
        this.close();
        this.onCancel();
      }
    };
    document.addEventListener("keydown", this.handleEscape);

    // Close on backdrop click
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
        this.onCancel();
      }
    });
  }

  close() {
    document.removeEventListener("keydown", this.handleEscape);
    if (this.modal) {
      this.modal.classList.remove("modal-visible");
      // Wait for transition before removing
      setTimeout(() => {
        this.modal.remove();
        this.modal = null;
      }, 200);
    }
  }
}
