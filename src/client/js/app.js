/**
 * Main Application Entry Point
 * Initializes router and registers routes
 */

import { router } from "./router.js";
import { api } from "./api.js";
import { DashboardView } from "./components/dashboard.js";
import { CaseListView } from "./components/caseList.js";
import { CaseDetailView } from "./components/caseDetail.js";
import { CaseFormView } from "./components/caseForm.js";
import { ConfigurationView } from "./components/configuration.js";
import { AdminPanelView } from "./components/adminPanel.js";
import { FacturacionAragView } from "./components/facturacionArag.js";
import { FacturacionListView } from "./components/facturacionList.js";
import { ParticularesView } from "./components/particulares.js";
import { ParticularesListView } from "./components/particularesList.js";
import { TurnoOficioView } from "./components/turnoOficio.js";
import { TurnoListView } from "./components/turnoList.js";
import { EstadisticasView } from "./components/estadisticas.js";

// Toast notification helper
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format date helper
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const options = { day: "numeric", month: "short", year: "numeric" };
  return date.toLocaleDateString("es-ES", options);
}

// Get current month/year
export function getCurrentPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  const mainContent = document.getElementById("main-content");

  // Initialize router
  router.init(mainContent);

  // Register routes
  router.register("/", async () => {
    const view = new DashboardView(mainContent);
    await view.render();
  });

  router.register("/cases", async () => {
    const view = new CaseListView(mainContent);
    await view.render();
  });

  router.register("/cases/new", async () => {
    const view = new CaseFormView(mainContent);
    await view.render();
  });

  router.register("/cases/:id", async (params) => {
    const view = new CaseDetailView(mainContent, params.id);
    await view.render();
  });

  router.register("/cases/:id/edit", async (params) => {
    const view = new CaseFormView(mainContent, params.id);
    await view.render();
  });

  router.register("/config", async () => {
    const view = new ConfigurationView(mainContent);
    await view.render();
  });

  router.register("/admin", async () => {
    const view = new AdminPanelView(mainContent);
    await view.render();
  });

  // Facturación ARAG list view
  router.register("/invoicing", async () => {
    const view = new FacturacionListView(mainContent);
    await view.render();
  });

  // Facturación ARAG for specific case
  router.register("/invoicing/:id", async (params) => {
    const view = new FacturacionAragView(mainContent, params.id);
    await view.render();
  });

  // Particulares list view
  router.register("/particulares", async () => {
    const view = new ParticularesListView(mainContent);
    await view.render();
  });

  // Particulares for specific case
  router.register("/particulares/:id", async (params) => {
    const view = new ParticularesView(mainContent, params.id);
    await view.render();
  });

  // Turno de Oficio list view
  router.register("/turno", async () => {
    const view = new TurnoListView(mainContent);
    await view.render();
  });

  // Turno de Oficio detail view
  router.register("/turno/:id", async (params) => {
    const view = new TurnoOficioView(mainContent, params.id);
    await view.render();
  });

  router.register("/stats", async () => {
    const view = new EstadisticasView(mainContent);
    await view.render();
  });

  // Handle initial route
  router.handleRoute();
});

// Export for use in components
export { router, api };
