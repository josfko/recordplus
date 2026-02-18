/**
 * Notification Center Component
 * Dropdown panel for live-computed notifications
 */

import { api } from "../api.js";
import { router } from "../router.js";

const STORAGE_KEY = "notifications_last_seen";

/**
 * Severity config: icon SVG, CSS class
 */
const SEVERITY_CONFIG = {
  critical: {
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M8 5v3.5M8 10.5v.5"/>
    </svg>`,
    class: "notif-critical",
  },
  warning: {
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M8 2L1.5 13h13L8 2z"/>
      <path d="M8 7v2.5M8 11.5v.5"/>
    </svg>`,
    class: "notif-warning",
  },
  info: {
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M8 7v4M8 5v.5"/>
    </svg>`,
    class: "notif-info",
  },
};

/**
 * Map notification type to a navigation route
 */
function getNotificationRoute(notification) {
  switch (notification.type) {
    case "failed_emails": {
      const firstCase = notification.items?.[0];
      if (firstCase) {
        if (firstCase.caseType === "ARAG") return `#/invoicing/${firstCase.caseId}`;
        if (firstCase.caseType === "PARTICULAR") return `#/particulares/${firstCase.caseId}`;
        return `#/cases/${firstCase.caseId}`;
      }
      return "#/cases";
    }
    case "missing_minuta":
      return "#/invoicing";
    case "missing_suplido":
      return "#/invoicing";
    case "missing_hoja":
      return "#/particulares";
    case "stale_cases":
      return "#/cases";
    case "certificate_expiry":
      return "#/config";
    case "backup_stale":
      return "#/config";
    default:
      return "#/";
  }
}

/**
 * Render a single notification item
 */
function renderNotificationItem(notification) {
  const config = SEVERITY_CONFIG[notification.severity] || SEVERITY_CONFIG.info;
  const route = getNotificationRoute(notification);

  // Build detail lines from items
  let details = "";
  if (notification.items && notification.items.length > 0) {
    const itemLines = notification.items.map((item) => {
      if (item.reference) {
        return `<span class="notif-detail-ref">${item.reference}</span> ${item.clientName || ""}`;
      }
      if (item.daysInactive) {
        return `${item.clientName} — ${item.daysInactive}d inactivo`;
      }
      return item.clientName || "";
    });

    details = `
      <div class="notif-details">
        ${itemLines.map((line) => `<div class="notif-detail-line">${line}</div>`).join("")}
        ${notification.count > 5 ? `<div class="notif-detail-more">+${notification.count - 5} más</div>` : ""}
      </div>
    `;
  }

  return `
    <a href="${route}" class="notif-item ${config.class}" data-notif-type="${notification.type}">
      <div class="notif-icon">${config.icon}</div>
      <div class="notif-content">
        <div class="notif-message">${notification.message}</div>
        ${details}
      </div>
      <div class="notif-arrow">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4.5 2.5l3.5 3.5-3.5 3.5"/>
        </svg>
      </div>
    </a>
  `;
}

export class NotificationCenter {
  constructor() {
    this.isOpen = false;
    this.notifications = [];
    this.totalCount = 0;
    this.criticalCount = 0;
    this.loading = false;
    this.dropdownEl = null;
    this.overlayEl = null;
    this.boundCloseHandler = this.close.bind(this);
  }

  /**
   * Fetch notification count (lightweight — used for badge on load)
   * @returns {Object} { totalCount, criticalCount }
   */
  async fetchCount() {
    try {
      const data = await api.request("/dashboard/notifications");
      this.notifications = data.notifications || [];
      this.totalCount = data.totalCount || 0;
      this.criticalCount = data.criticalCount || 0;
      return { totalCount: this.totalCount, criticalCount: this.criticalCount };
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return { totalCount: 0, criticalCount: 0 };
    }
  }

  /**
   * Check if there are unseen notifications
   */
  hasUnseen() {
    if (this.criticalCount > 0) return true;
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) return this.totalCount > 0;
    return this.notifications.some(
      (n) => n.timestamp && new Date(n.timestamp) > new Date(lastSeen)
    );
  }

  /**
   * Mark notifications as seen
   */
  markSeen() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }

  /**
   * Toggle the dropdown open/closed
   * @param {HTMLElement} anchorEl - The bell button to position relative to
   */
  async toggle(anchorEl) {
    if (this.isOpen) {
      this.close();
      return;
    }
    await this.open(anchorEl);
  }

  /**
   * Open the notification dropdown
   * @param {HTMLElement} anchorEl - The bell button
   */
  async open(anchorEl) {
    this.isOpen = true;
    this.loading = true;

    // Create overlay for click-outside-to-close
    this.overlayEl = document.createElement("div");
    this.overlayEl.className = "notif-overlay";
    this.overlayEl.addEventListener("click", this.boundCloseHandler);
    document.body.appendChild(this.overlayEl);

    // Create dropdown
    this.dropdownEl = document.createElement("div");
    this.dropdownEl.className = "notif-dropdown";
    this.dropdownEl.innerHTML = `
      <div class="notif-header">
        <span class="notif-title">Notificaciones</span>
      </div>
      <div class="notif-body">
        <div class="notif-loading">Cargando...</div>
      </div>
    `;

    // Position relative to anchor
    const rect = anchorEl.getBoundingClientRect();
    this.dropdownEl.style.top = `${rect.bottom + 8}px`;
    this.dropdownEl.style.right = `${document.documentElement.clientWidth - rect.right}px`;

    document.body.appendChild(this.dropdownEl);

    // Fetch data
    await this.fetchCount();
    this.loading = false;
    this.renderBody();
    this.markSeen();

    // Update badge after marking seen
    this.updateBadge(anchorEl);
  }

  /**
   * Close the dropdown
   */
  close() {
    if (this.dropdownEl) {
      this.dropdownEl.remove();
      this.dropdownEl = null;
    }
    if (this.overlayEl) {
      this.overlayEl.removeEventListener("click", this.boundCloseHandler);
      this.overlayEl.remove();
      this.overlayEl = null;
    }
    this.isOpen = false;
  }

  /**
   * Render the dropdown body content
   */
  renderBody() {
    if (!this.dropdownEl) return;
    const body = this.dropdownEl.querySelector(".notif-body");

    if (this.notifications.length === 0) {
      body.innerHTML = `
        <div class="notif-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="notif-empty-icon">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <span>Todo en orden</span>
        </div>
      `;
      return;
    }

    body.innerHTML = this.notifications
      .map((n) => renderNotificationItem(n))
      .join("");

    // Bind click events — close dropdown and navigate
    body.querySelectorAll(".notif-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const href = item.getAttribute("href");
        this.close();
        if (href) {
          window.location.hash = href.replace("#", "");
        }
      });
    });
  }

  /**
   * Update the badge on the bell button
   * @param {HTMLElement} bellBtn - The bell button element
   */
  updateBadge(bellBtn) {
    if (!bellBtn) return;

    const dot = bellBtn.querySelector(".notification-dot");
    const badge = bellBtn.querySelector(".notification-badge");

    if (this.totalCount > 0 && this.hasUnseen()) {
      // Show badge with count
      if (dot) dot.style.display = "none";
      if (!badge) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "notification-badge";
        badgeEl.textContent = this.totalCount > 9 ? "9+" : this.totalCount;
        bellBtn.appendChild(badgeEl);
      } else {
        badge.textContent = this.totalCount > 9 ? "9+" : this.totalCount;
        badge.style.display = "";
      }
    } else if (this.totalCount > 0 && this.criticalCount > 0) {
      // Critical items always show the dot even if "seen"
      if (dot) dot.style.display = "";
      if (badge) badge.style.display = "none";
    } else {
      // No notifications or all seen
      if (dot) dot.style.display = "none";
      if (badge) badge.style.display = "none";
    }
  }
}

// Singleton instance
export const notificationCenter = new NotificationCenter();
