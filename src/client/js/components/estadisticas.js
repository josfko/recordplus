/**
 * Estadísticas View
 * Case activity analytics dashboard with real data
 */

import { api } from "../api.js";
import { showToast } from "../app.js";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export class EstadisticasView {
  constructor(container) {
    this.container = container;
    this.stats = null;
    this.selectedYear = new Date().getFullYear();
    this.selectedType = "ALL";
    this.loading = true;
  }

  async render() {
    this.renderLoading();
    await this.fetchAndRender();
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="stats-view">
        <div class="stats-header">
          <div class="stats-header-info">
            <h1 class="stats-title">Estadísticas</h1>
            <p class="stats-subtitle">Cargando datos...</p>
          </div>
        </div>
        <div class="stats-kpi-grid">
          ${Array(4).fill('<div class="stats-kpi-card"><div class="stats-kpi-body"><span class="stats-kpi-value mono">—</span></div></div>').join("")}
        </div>
      </div>
    `;
  }

  async fetchAndRender() {
    try {
      const params = new URLSearchParams();
      params.set("year", this.selectedYear.toString());
      if (this.selectedType !== "ALL") params.set("type", this.selectedType);
      this.stats = await api.request(`/statistics?${params}`);
      this.loading = false;
      this.renderView();
      this.attachEventListeners();
    } catch (error) {
      this.container.innerHTML = `
        <div class="stats-view">
          <div class="stats-header">
            <div class="stats-header-info">
              <h1 class="stats-title">Estadísticas</h1>
              <p class="stats-subtitle" style="color: var(--color-rose-400)">Error al cargar estadísticas: ${error.message}</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  renderView() {
    const s = this.stats;
    const monthly = s.monthly;
    const maxValue = Math.max(...monthly.map((d) => d.total), 1);

    this.container.innerHTML = `
      <div class="stats-view">
        <!-- Header -->
        <div class="stats-header">
          <div class="stats-header-info">
            <h1 class="stats-title">Estadísticas</h1>
            <p class="stats-subtitle">Análisis de expedientes y actividad del despacho.</p>
          </div>
          <div class="stats-header-actions">
            ${this.renderYearSelector(s.availableYears)}
            ${this.renderTypeFilter()}
            <div class="stats-export-group">
              <button class="stats-export-btn" data-export="excel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Excel
              </button>
              <button class="stats-export-btn" data-export="pdf">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="stats-kpi-grid">
          ${this.renderKpiCard(
            "Expedientes Nuevos",
            s.kpis.newThisMonth.count.toString(),
            s.kpis.newThisMonth.changePercent,
            `${s.kpis.newThisMonth.previousMonth} mes anterior`,
            "indigo"
          )}
          ${this.renderKpiCard(
            "Expedientes Archivados",
            s.kpis.archivedThisMonth.count.toString(),
            s.kpis.archivedThisMonth.changePercent,
            `${s.kpis.archivedThisMonth.previousMonth} mes anterior`,
            "pink"
          )}
          ${this.renderKpiCard(
            "Expedientes Pendientes",
            s.kpis.pending.count.toString(),
            null,
            "Abiertos + Judiciales",
            "cyan"
          )}
          ${this.renderKpiCard(
            "Media Mensual",
            s.kpis.monthlyAverage.count.toString(),
            null,
            `Promedio ${this.selectedYear}`,
            "orange"
          )}
        </div>

        <!-- Charts Row -->
        <div class="stats-charts-row">
          <!-- Monthly Evolution Chart (Stacked Bars) -->
          <div class="stats-chart-card stats-chart-main">
            <div class="stats-chart-header">
              <h3>Evolución Mensual</h3>
              <div class="stats-chart-legend">
                <span class="stats-legend-item"><span class="stats-legend-dot" style="background: var(--color-yellow-500)"></span>ARAG</span>
                <span class="stats-legend-item"><span class="stats-legend-dot" style="background: var(--color-indigo-500)"></span>Particulares</span>
                <span class="stats-legend-item"><span class="stats-legend-dot" style="background: var(--color-zinc-500)"></span>Turno</span>
              </div>
            </div>
            <div class="stats-bar-chart">
              ${monthly.map((d) => this.renderStackedBar(d, maxValue)).join("")}
            </div>
          </div>

          <!-- Case Distribution -->
          <div class="stats-chart-card stats-chart-side">
            <h3 class="stats-distribution-title">Distribución por Tipo</h3>
            <div class="stats-distribution-list">
              ${this.renderDistributionItem("ARAG", s.distribution.arag, "var(--color-yellow-500)")}
              ${this.renderDistributionItem("Particulares", s.distribution.particular, "var(--color-indigo-500)")}
              ${this.renderDistributionItem("Turno de Oficio", s.distribution.turno, "var(--color-zinc-500)")}
            </div>
            <div class="stats-distribution-total">
              <span>Total</span>
              <span class="mono">${s.distribution.total}</span>
            </div>
          </div>
        </div>

        <!-- Year-over-Year Comparison -->
        ${this.renderYearOverYear(s.yearOverYear)}
      </div>
    `;
  }

  renderYearSelector(availableYears) {
    const years = [...new Set([...availableYears, this.selectedYear])].sort((a, b) => b - a);
    return `
      <select class="stats-year-select" id="stats-year-select">
        ${years.map((y) => `<option value="${y}" ${y === this.selectedYear ? "selected" : ""}>${y}</option>`).join("")}
      </select>
    `;
  }

  renderTypeFilter() {
    const types = [
      { value: "ALL", label: "Todos" },
      { value: "ARAG", label: "ARAG" },
      { value: "PARTICULAR", label: "Particulares" },
      { value: "TURNO_OFICIO", label: "Turno" },
    ];
    return `
      <select class="stats-type-select" id="stats-type-select">
        ${types.map((t) => `<option value="${t.value}" ${t.value === this.selectedType ? "selected" : ""}>${t.label}</option>`).join("")}
      </select>
    `;
  }

  renderKpiCard(title, value, change, subtitle, glowColor) {
    const hasTrend = change !== null && change !== undefined;
    const isPositive = change >= 0;
    return `
      <div class="stats-kpi-card">
        <div class="stats-kpi-glow stats-kpi-glow-${glowColor}"></div>
        <div class="stats-kpi-header">
          <span class="stats-kpi-title">${title}</span>
          ${hasTrend ? `
            <span class="stats-kpi-badge ${isPositive ? "badge-positive" : "badge-negative"}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="${isPositive ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}"/>
              </svg>
              ${Math.abs(change)}%
            </span>
          ` : ""}
        </div>
        <div class="stats-kpi-body">
          <span class="stats-kpi-value mono">${value}</span>
          <span class="stats-kpi-subtitle">${subtitle}</span>
        </div>
      </div>
    `;
  }

  renderStackedBar(d, maxValue) {
    const totalHeight = maxValue > 0 ? (d.total / maxValue) * 100 : 0;
    const aragPct = d.total > 0 ? (d.arag / d.total) * 100 : 0;
    const partPct = d.total > 0 ? (d.particular / d.total) * 100 : 0;
    const turnoPct = d.total > 0 ? (d.turno / d.total) * 100 : 0;

    const tooltipParts = [];
    if (d.arag > 0) tooltipParts.push(`ARAG: ${d.arag}`);
    if (d.particular > 0) tooltipParts.push(`Part: ${d.particular}`);
    if (d.turno > 0) tooltipParts.push(`Turno: ${d.turno}`);
    const tooltipText = `${d.label}: ${d.total} exp.${tooltipParts.length ? " (" + tooltipParts.join(", ") + ")" : ""}`;

    return `
      <div class="stats-bar-col">
        <div class="stats-bar-wrapper">
          <div class="stats-bar-stacked ${d.current ? "stats-bar-stacked-current" : ""}" style="height: ${totalHeight}%">
            ${d.turno > 0 ? `<div class="stats-bar-segment stats-bar-turno" style="height: ${turnoPct}%"></div>` : ""}
            ${d.particular > 0 ? `<div class="stats-bar-segment stats-bar-particular" style="height: ${partPct}%"></div>` : ""}
            ${d.arag > 0 ? `<div class="stats-bar-segment stats-bar-arag" style="height: ${aragPct}%"></div>` : ""}
            <div class="stats-bar-tooltip">${tooltipText}</div>
          </div>
        </div>
        <span class="stats-bar-label ${d.current ? "stats-bar-label-current" : ""}">${d.label}</span>
      </div>
    `;
  }

  renderDistributionItem(name, data, color) {
    return `
      <div class="stats-distribution-item">
        <div class="stats-distribution-header">
          <div class="stats-distribution-label">
            <span class="stats-distribution-dot" style="background: ${color}"></span>
            <span>${name}</span>
          </div>
          <span class="stats-distribution-percent mono">${data.percent}%</span>
        </div>
        <div class="stats-distribution-bar-bg">
          <div class="stats-distribution-bar" style="width: ${data.percent}%; background: ${color}"></div>
        </div>
        <div class="stats-distribution-amount">${data.count} expedientes</div>
      </div>
    `;
  }

  renderYearOverYear(yoyData) {
    const years = Object.keys(yoyData).map(Number).sort();
    if (years.length <= 1) return "";

    const allValues = years.flatMap((y) => yoyData[y]);
    const maxVal = Math.max(...allValues, 1);

    const colors = {};
    const currentYear = this.selectedYear;
    colors[currentYear] = "var(--color-indigo-500)";
    const prevYears = years.filter((y) => y !== currentYear).sort((a, b) => b - a);
    const prevColors = ["var(--text-dimmed)", "var(--border-default)"];
    prevYears.forEach((y, i) => { colors[y] = prevColors[i] || prevColors[prevColors.length - 1]; });

    return `
      <div class="stats-chart-card stats-yoy-card">
        <div class="stats-chart-header">
          <h3>Comparación Interanual</h3>
          <div class="stats-chart-legend">
            ${years.sort((a, b) => b - a).map((y) => `
              <span class="stats-legend-item">
                <span class="stats-legend-dot" style="background: ${colors[y]}"></span>${y}
              </span>
            `).join("")}
          </div>
        </div>
        <div class="stats-yoy-chart">
          ${MONTH_LABELS.map((label, i) => `
            <div class="stats-yoy-col">
              <div class="stats-yoy-bars">
                ${years.sort((a, b) => b - a).map((y) => {
                  const val = yoyData[y][i];
                  const h = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return `<div class="stats-yoy-bar" style="height: ${h}%; background: ${colors[y]}" title="${y}: ${val}"></div>`;
                }).join("")}
              </div>
              <span class="stats-bar-label">${label}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Year selector
    document.getElementById("stats-year-select")?.addEventListener("change", (e) => {
      this.selectedYear = parseInt(e.target.value, 10);
      this.fetchAndRender();
    });

    // Type filter
    document.getElementById("stats-type-select")?.addEventListener("change", (e) => {
      this.selectedType = e.target.value;
      this.fetchAndRender();
    });

    // Export buttons
    document.querySelectorAll(".stats-export-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const format = btn.dataset.export;
        this.handleExport(format);
      });
    });
  }

  handleExport(format) {
    const params = new URLSearchParams();
    params.set("year", this.selectedYear.toString());
    if (this.selectedType !== "ALL") params.set("type", this.selectedType);

    const baseUrl = api.baseUrl || "/api";
    const url = `${baseUrl}/statistics/export/${format === "excel" ? "excel" : "pdf"}?${params}`;

    // Trigger download via hidden link
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`Descargando ${format.toUpperCase()}...`, "success");
  }
}
