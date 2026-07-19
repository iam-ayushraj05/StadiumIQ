/**
 * Sustainability Module — StadiumIQ
 * Eco Intelligence: carbon tracking, waste management, AI recommendations
 */

import { api } from './api.js';

export function initSustainability() {
  renderEcoKPIs();
  renderCarbonChart();
  renderEcoRecommendations();
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────
async function renderEcoKPIs() {
  const container = document.querySelector('.eco-kpis');
  if (!container) return;

  container.innerHTML = '<div class="loading-placeholder">🌱 Loading eco data...</div>';

  try {
    const data = await api.getEcoMetrics();
    const m = data.metrics;
    renderKPICards(m);
  } catch {
    renderKPICards(getFallbackMetrics());
  }
}

function renderKPICards(m) {
  const container = document.querySelector('.eco-kpis');
  if (!container) return;

  const kpis = [
    {
      icon: '⚡', label: 'Energy Consumed',
      value: `${((m?.energy?.consumed || 18500) / 1000).toFixed(1)} MWh`,
      sub: `${m?.energy?.renewablePercent || 23}% renewable`,
      trend: 'up', color: '#ffd93d'
    },
    {
      icon: '🌫️', label: 'Carbon Footprint',
      value: `${m?.carbon?.total || 87} tCO₂`,
      sub: `${Math.abs(m?.carbon?.vsTarget || -12)}% below target`,
      trend: 'down-good', color: '#06d6a0'
    },
    {
      icon: '♻️', label: 'Recycling Rate',
      value: `${m?.waste?.recycleRate || 64}%`,
      sub: `${((m?.waste?.recycledKg || 3100) / 1000).toFixed(1)}t recycled`,
      trend: 'up', color: '#06d6a0'
    },
    {
      icon: '💧', label: 'Water Recycled',
      value: `${Math.round((m?.water?.recycled || 85000) / 1000)}kL`,
      sub: `${m?.water?.recycleRate || 30}% of total usage`,
      trend: 'stable', color: '#4cc9f0'
    },
    {
      icon: '🚌', label: 'Cars Avoided',
      value: `${(m?.transport?.carsAvoided || 8400).toLocaleString()}`,
      sub: `~${m?.transport?.co2Avoided || 31}t CO₂ saved`,
      trend: 'up', color: '#4361ee'
    },
    {
      icon: '🌿', label: 'Plant-Based Meals',
      value: `${Math.round((m?.food?.plantBasedMeals || 18000) / 1000)}k`,
      sub: `${Math.round(((m?.food?.plantBasedMeals || 18000) / (m?.food?.totalMealsServed || 52000)) * 100)}% of meals served`,
      trend: 'up', color: '#2dc653'
    }
  ];

  container.innerHTML = '';
  kpis.forEach(kpi => {
    const card = document.createElement('div');
    card.className = 'eco-kpi-card';
    card.setAttribute('role', 'listitem');

    const trendIcons = { up: '📈', 'down-good': '📉', stable: '➡️' };
    const trendIcon = trendIcons[kpi.trend] || '➡️';

    card.innerHTML = `
      <div class="kpi-icon" style="color:${escapeHtml(kpi.color)}" aria-hidden="true">${escapeHtml(kpi.icon)}</div>
      <div class="kpi-value">${escapeHtml(kpi.value)}</div>
      <div class="kpi-label">${escapeHtml(kpi.label)}</div>
      <div class="kpi-sub">${escapeHtml(kpi.sub)} ${trendIcon}</div>
    `;
    container.appendChild(card);
  });
}

function getFallbackMetrics() {
  return {
    energy: { consumed: 18500, renewablePercent: 23 },
    carbon: { total: 87, vsTarget: -12 },
    waste: { recycleRate: 64, recycledKg: 3100 },
    water: { recycled: 85000, recycleRate: 30 },
    transport: { carsAvoided: 8400, co2Avoided: 31 },
    food: { plantBasedMeals: 18000, totalMealsServed: 52000 }
  };
}

// ─── Carbon Chart ─────────────────────────────────────────────────────────────
async function renderCarbonChart() {
  const container = document.getElementById('ecoChart');
  if (!container) return;

  container.innerHTML = '<div class="loading-placeholder">📊 Loading chart...</div>';

  let chartData;
  try {
    const data = await api.getCarbonTimeline();
    chartData = data.timeline;
  } catch {
    chartData = getFallbackChartData();
  }

  renderBarChart(container, chartData);
}

function renderBarChart(container, data) {
  container.innerHTML = '';

  const maxCarbon = Math.max(...data.map(d => d.carbon));

  const chart = document.createElement('div');
  chart.className = 'bar-chart';

  data.forEach(item => {
    const barWrap = document.createElement('div');
    barWrap.className = 'chart-bar-wrap';

    const bar = document.createElement('div');
    const pct = Math.max(Math.round((item.carbon / maxCarbon) * 100), 5); // Ensure at least 5% height
    bar.className = 'chart-bar';
    bar.style.height = '0%'; // Start at 0% for animation
    bar.dataset.height = `${pct}%`; // Store target height
    
    // Tooltip wrapper
    const tooltip = document.createElement('span');
    tooltip.className = 'chart-tooltip';
    tooltip.textContent = `${item.carbon} kg CO₂`;
    bar.appendChild(tooltip);

    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;color:var(--color-text-secondary);text-align:center;white-space:nowrap;margin-top:2px;';
    label.textContent = item.hour.replace(':00', 'h');

    barWrap.appendChild(bar);
    barWrap.appendChild(label);
    chart.appendChild(barWrap);
  });

  // Y-axis label
  const yLabel = document.createElement('div');
  yLabel.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);text-align:center;margin-top:8px;';
  yLabel.textContent = 'Carbon Emissions (kg CO₂ per hour)';

  container.appendChild(chart);
  container.appendChild(yLabel);

  // Trigger animation after mount
  requestAnimationFrame(() => {
    setTimeout(() => {
      container.querySelectorAll('.chart-bar').forEach(b => {
        b.style.height = b.dataset.height;
      });
    }, 50);
  });
}

function getFallbackChartData() {
  return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(h => ({
    hour: `${h}:00`,
    carbon: Math.round(3 + Math.random() * 8 + (h > 14 && h < 21 ? 15 : 0))
  }));
}

// ─── AI Eco Recommendations ───────────────────────────────────────────────────
async function renderEcoRecommendations() {
  const container = document.getElementById('ecoRecommendations');
  if (!container) return;

  container.innerHTML = '<div class="loading-placeholder">🤖 AI analyzing sustainability data...</div>';

  try {
    const metricsData = await api.getEcoMetrics();
    const data = await api.getSustainabilityReport(metricsData.metrics);
    const recs = data.recommendations || getFallbackEcoRecs();
    renderEcoRecs(recs);
  } catch {
    renderEcoRecs(getFallbackEcoRecs());
  }
}

function renderEcoRecs(recs) {
  const container = document.getElementById('ecoRecommendations');
  if (!container) return;

  container.innerHTML = '';
  recs.forEach(rec => {
    const el = document.createElement('div');
    el.className = 'eco-rec-item';
    el.setAttribute('role', 'listitem');

    el.innerHTML = `
      <div class="eco-rec-icon" aria-hidden="true">${escapeHtml(rec.emoji || '🌱')}</div>
      <div class="eco-rec-body">
        <div class="eco-rec-title">${escapeHtml(rec.title || '')}</div>
        ${rec.impact ? `<div class="eco-rec-impact">💚 ${escapeHtml(rec.impact)}</div>` : ''}
        ${rec.action ? `<div class="eco-rec-action">→ ${escapeHtml(rec.action)}</div>` : ''}
      </div>
      ${rec.category ? `<span class="eco-badge eco-${escapeHtml(rec.category)}">${escapeHtml(rec.category)}</span>` : ''}
    `;
    container.appendChild(el);
  });
}

function getFallbackEcoRecs() {
  return [
    { emoji: '⚡', title: 'Switch to LED Lighting Zone C', impact: 'Save 2.1 MWh today', action: 'Contact facilities at ext. 4102', category: 'energy' },
    { emoji: '♻️', title: 'Increase Recycling Bin Coverage', impact: 'Reduce landfill by 18%', action: 'Deploy 40 more sorting stations in concourses', category: 'waste' },
    { emoji: '💧', title: 'Enable Greywater Recycling System', impact: 'Save 45,000 litres', action: 'Activate backup water recovery system B-7', category: 'water' },
    { emoji: '🚌', title: 'Push Shuttle Notifications to Fans', impact: 'Avoid 890kg CO₂ from private cars', action: 'Send targeted push notification via StadiumIQ app', category: 'transport' }
  ];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}
