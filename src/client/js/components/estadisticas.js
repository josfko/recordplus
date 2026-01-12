/**
 * Estadísticas View
 * Financial analytics dashboard
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

export class EstadisticasView {
  constructor(container) {
    this.container = container;
    this.stats = null;
    this.chartView = "facturacion";
  }

  async render() {
    // For now, use mock data - later can be connected to API
    this.stats = this.getMockStats();
    this.renderView();
    this.attachEventListeners();
  }

  getMockStats() {
    return {
      totalBilling: 42850,
      billingChange: 12.5,
      previousBilling: 38100,
      newCases: 128,
      casesChange: 8.2,
      casesThisMonth: 12,
      avgTicketArag: 245.63,
      ticketChange: -1.4,
      pendingCollection: 3240,
      pendingOverdue: 35,
      monthlyData: [
        { month: "E", value: 2100, label: "Ene: 2.100€" },
        { month: "F", value: 2800, label: "Feb: 2.800€" },
        { month: "M", value: 1500, label: "Mar: 1.500€" },
        { month: "A", value: 3100, label: "Abr: 3.100€" },
        { month: "M", value: 4200, label: "May: 4.200€" },
        { month: "J", value: 3800, label: "Jun: 3.800€" },
        { month: "J", value: 2500, label: "Jul: 2.500€" },
        { month: "A", value: 1100, label: "Ago: 1.100€" },
        { month: "S", value: 4500, label: "Sep: 4.500€" },
        { month: "O", value: 5200, label: "Oct: 5.200€", current: true },
      ],
      distribution: [
        { name: "ARAG", percent: 62, amount: 26567, color: "#eab308" },
        { name: "Particulares", percent: 28, amount: 11998, color: "#6366f1" },
        { name: "Turno Oficio", percent: 10, amount: 4285, color: "#71717a" },
      ],
      procedures: [
        {
          name: "Reclamación de Cantidad",
          cases: 42,
          total: 12400,
          avg: 295,
          trend: 5,
        },
        {
          name: "Defensa Penal (Alcoholemias)",
          cases: 28,
          total: 8200,
          avg: 292,
          trend: 0,
        },
        {
          name: "Familia / Divorcios",
          cases: 15,
          total: 10500,
          avg: 700,
          trend: -2,
        },
      ],
    };
  }

  renderView() {
    const s = this.stats;
    const maxValue = Math.max(...s.monthlyData.map((d) => d.value));

    this.container.innerHTML = `
      <div class="stats-view">
        <!-- Header -->
        <div class="stats-header">
          <div class="stats-header-info">
            <h1 class="stats-title">Análisis Financiero</h1>
            <p class="stats-subtitle">Rendimiento anual y métricas de facturación.</p>
          </div>
          <div class="stats-header-actions">
            <button class="stats-date-picker">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Enero 2023 - Oct 2023</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <button class="stats-export-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar PDF
            </button>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="stats-kpi-grid">
          ${this.renderKpiCard(
            "Facturación Total",
            this.formatCurrency(s.totalBilling),
            s.billingChange,
            `vs ${this.formatCurrency(s.previousBilling)} periodo anterior`,
            "indigo"
          )}
          ${this.renderKpiCard(
            "Expedientes Nuevos",
            s.newCases.toString(),
            s.casesChange,
            `+${s.casesThisMonth} este mes`,
            "pink"
          )}
          ${this.renderKpiCard(
            "Ticket Medio ARAG",
            this.formatCurrency(s.avgTicketArag),
            s.ticketChange,
            "Media últimos 30 días",
            "cyan"
          )}
          ${this.renderPendingCard(s.pendingCollection, s.pendingOverdue)}
        </div>

        <!-- Charts Row -->
        <div class="stats-charts-row">
          <!-- Monthly Evolution Chart -->
          <div class="stats-chart-card stats-chart-main">
            <div class="stats-chart-header">
              <h3>Evolución Mensual</h3>
              <div class="stats-chart-tabs">
                <button class="stats-tab ${
                  this.chartView === "facturacion" ? "active" : ""
                }" data-view="facturacion">Facturación</button>
                <button class="stats-tab" data-view="expedientes">Expedientes</button>
              </div>
            </div>
            <div class="stats-bar-chart">
              ${s.monthlyData
                .map(
                  (d) => `
                <div class="stats-bar-col">
                  <div class="stats-bar-wrapper">
                    <div class="stats-bar ${
                      d.current ? "stats-bar-current" : ""
                    }" style="height: ${(d.value / maxValue) * 100}%">
                      <div class="stats-bar-tooltip">${d.label}</div>
                    </div>
                  </div>
                  <span class="stats-bar-label ${
                    d.current ? "stats-bar-label-current" : ""
                  }">${d.month}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- Income Distribution -->
          <div class="stats-chart-card stats-chart-side">
            <h3 class="stats-distribution-title">Distribución de Ingresos</h3>
            <div class="stats-distribution-list">
              ${s.distribution
                .map(
                  (d) => `
                <div class="stats-distribution-item">
                  <div class="stats-distribution-header">
                    <div class="stats-distribution-label">
                      <span class="stats-distribution-dot" style="background: ${
                        d.color
                      }"></span>
                      <span>${d.name}</span>
                    </div>
                    <span class="stats-distribution-percent mono">${
                      d.percent
                    }%</span>
                  </div>
                  <div class="stats-distribution-bar-bg">
                    <div class="stats-distribution-bar" style="width: ${
                      d.percent
                    }%; background: ${d.color}"></div>
                  </div>
                  <div class="stats-distribution-amount">${this.formatCurrency(
                    d.amount
                  )}</div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <!-- Procedures Table -->
        <div class="stats-table-card">
          <div class="stats-table-header">
            <h3>Desglose por Tipo de Procedimiento</h3>
            <button class="stats-view-all">Ver todo</button>
          </div>
          <table class="stats-table">
            <thead>
              <tr>
                <th class="text-left">Procedimiento</th>
                <th class="text-right">Expedientes</th>
                <th class="text-right">Total Facturado</th>
                <th class="text-right">Promedio</th>
                <th class="text-right">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              ${s.procedures
                .map(
                  (p) => `
                <tr>
                  <td>${p.name}</td>
                  <td class="text-right mono text-muted">${p.cases}</td>
                  <td class="text-right mono">${this.formatCurrency(
                    p.total
                  )}</td>
                  <td class="text-right mono text-muted">${p.avg} €</td>
                  <td class="text-right">
                    <span class="stats-trend ${
                      p.trend > 0
                        ? "trend-up"
                        : p.trend < 0
                        ? "trend-down"
                        : "trend-neutral"
                    }">
                      ${p.trend > 0 ? "+" : ""}${p.trend}%
                    </span>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderKpiCard(title, value, change, subtitle, glowColor) {
    const isPositive = change >= 0;
    return `
      <div class="stats-kpi-card">
        <div class="stats-kpi-glow stats-kpi-glow-${glowColor}"></div>
        <div class="stats-kpi-header">
          <span class="stats-kpi-title">${title}</span>
          <span class="stats-kpi-badge ${
            isPositive ? "badge-positive" : "badge-negative"
          }">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="${
                isPositive ? "18 15 12 9 6 15" : "6 9 12 15 18 9"
              }"/>
            </svg>
            ${Math.abs(change)}%
          </span>
        </div>
        <div class="stats-kpi-body">
          <span class="stats-kpi-value mono">${value}</span>
          <span class="stats-kpi-subtitle">${subtitle}</span>
        </div>
      </div>
    `;
  }

  renderPendingCard(amount, overduePercent) {
    return `
      <div class="stats-kpi-card">
        <div class="stats-kpi-glow stats-kpi-glow-orange"></div>
        <div class="stats-kpi-header">
          <span class="stats-kpi-title">Pendiente de Cobro</span>
        </div>
        <div class="stats-kpi-body stats-kpi-body-pending">
          <span class="stats-kpi-value mono">${this.formatCurrency(
            amount
          )}</span>
          <div class="stats-pending-bar-bg">
            <div class="stats-pending-bar" style="width: ${overduePercent}%"></div>
          </div>
          <span class="stats-kpi-subtitle">${overduePercent}% vencido > 30 días</span>
        </div>
      </div>
    `;
  }

  formatCurrency(value) {
    return (
      new Intl.NumberFormat("es-ES", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value) + " €"
    );
  }

  attachEventListeners() {
    // Chart tabs
    document.querySelectorAll(".stats-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".stats-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.chartView = tab.dataset.view;
      });
    });

    // Export button
    document
      .querySelector(".stats-export-btn")
      ?.addEventListener("click", () => {
        showToast("Exportación PDF en desarrollo", "info");
      });

    // View all button
    document.querySelector(".stats-view-all")?.addEventListener("click", () => {
      showToast("Vista completa en desarrollo", "info");
    });
  }
}
