/**
 * Transport Module — StadiumIQ
 * Multimodal transport hub with AI travel time predictions
 */

import { api } from './api.js';
import { showToast } from './utils.js';

export function initTransport() {
  renderTransportCards();
  setupPredictorForm();
}

// ─── Transport Cards ──────────────────────────────────────────────────────────
async function renderTransportCards() {
  const grid = document.querySelector('.transport-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-placeholder">🚌 Loading transport options...</div>';

  try {
    const data = await api.getTransportOptions();
    renderCards(data.options || getFallbackOptions());
  } catch {
    renderCards(getFallbackOptions());
  }
}

function renderCards(options) {
  const grid = document.querySelector('.transport-grid');
  if (!grid) return;
  grid.innerHTML = '';

  options.forEach(option => {
    const card = document.createElement('div');
    card.className = 'transport-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `${option.name} transport option`);

    const loadPct = option.capacity ? Math.round((option.currentLoad / option.capacity) * 100) : null;
    const loadClass = loadPct > 85 ? 'load-high' : loadPct > 60 ? 'load-med' : 'load-low';

    card.innerHTML = `
      <div class="transport-icon" style="color:${escapeHtml(option.color || '#4361ee')}" aria-hidden="true">${escapeHtml(option.icon)}</div>
      <div class="transport-info">
        <div class="transport-name">${escapeHtml(option.name)}</div>
        <div class="transport-route">${escapeHtml(option.route)}</div>
        ${option.frequency ? `<div class="transport-frequency">Every ${escapeHtml(option.frequency)}</div>` : ''}
        ${option.nextDeparture ? `<div class="transport-next">Next: <strong>${escapeHtml(option.nextDeparture)}</strong></div>` : ''}
        ${option.waitTime ? `<div class="transport-next">Wait: <strong>~${escapeHtml(option.waitTime)}</strong></div>` : ''}
        ${option.availableSpaces !== undefined ? `<div class="transport-next">Available: <strong>${option.availableSpaces}</strong> spaces</div>` : ''}
        ${option.availableBikes !== undefined ? `<div class="transport-next">Bikes: <strong>${option.availableBikes}</strong> available</div>` : ''}
      </div>
      ${loadPct !== null ? `
        <div class="transport-load ${loadClass}" role="meter" aria-valuenow="${loadPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${option.name} capacity ${loadPct}%">
          <div class="load-bar" style="width:${loadPct}%"></div>
          <span class="load-label">${loadPct}% full</span>
        </div>
      ` : ''}
      ${option.accessibility ? '<div class="transport-access" title="Accessible" aria-label="Wheelchair accessible">♿</div>' : ''}
    `;

    grid.appendChild(card);
  });
}

function getFallbackOptions() {
  return [
    { name: 'Stadium Express', route: 'NRG ↔ Downtown Houston', icon: '🚌', color: '#00b4d8', frequency: '8 min', nextDeparture: '6:42 PM', capacity: 60, currentLoad: 48, accessibility: true },
    { name: 'METRORail Red Line', route: 'NRG Station ↔ Main St', icon: '🚈', color: '#e63946', frequency: '6 min', nextDeparture: '6:38 PM', capacity: 200, currentLoad: 165, accessibility: true },
    { name: 'Rideshare Zone', route: 'Uber / Lyft — Lot F East', icon: '🚗', color: '#f77f00', frequency: 'On-demand', waitTime: '7 min', accessibility: true },
    { name: 'Parking — North', route: 'NRG North Covered Garage', icon: '🅿️', color: '#7b2d8b', availableSpaces: 220, capacity: 3500, currentLoad: 3280, accessibility: true },
    { name: 'BCycle Bike Share', route: 'Nearby BCycle Stations', icon: '🚴', color: '#2dc653', frequency: 'On-demand', availableBikes: 15, accessibility: false },
    { name: 'Med Center Connector', route: 'NRG ↔ Texas Medical Center', icon: '🚌', color: '#06d6a0', frequency: '12 min', nextDeparture: '6:51 PM', capacity: 45, currentLoad: 22, accessibility: true }
  ];
}

// ─── Predictor ────────────────────────────────────────────────────────────────
function setupPredictorForm() {
  const predictBtn = document.getElementById('predictBtn');
  predictBtn?.addEventListener('click', handlePredict);
}

async function handlePredict() {
  const mode = document.getElementById('transportMode')?.value;
  const destination = document.getElementById('destination')?.value;
  const resultEl = document.getElementById('predictionResult');
  if (!resultEl) return;

  resultEl.innerHTML = '<div class="route-loading"><div class="loading-spinner-sm"></div> 🤖 AI calculating travel time...</div>';

  try {
    const data = await api.predictTravel(mode, destination);
    renderPrediction(data);
  } catch {
    renderFallbackPrediction(mode, destination);
  }
}

function renderPrediction(data) {
  const resultEl = document.getElementById('predictionResult');
  if (!resultEl) return;

  if (!data.available) {
    resultEl.innerHTML = `
      <div class="prediction-unavailable">
        <p>⚠️ ${escapeHtml(data.message || 'Service not available for this route.')}</p>
        ${data.alternatives ? `<p><strong>Alternatives:</strong> ${data.alternatives.map(a => `${escapeHtml(a.mode)} (~${a.estimatedMinutes} min)`).join(' | ')}</p>` : ''}
      </div>
    `;
    return;
  }

  const container = document.createElement('div');
  container.className = 'prediction-card';

  container.innerHTML = `
    <div class="prediction-main">
      <div class="prediction-time" aria-label="Estimated travel time ${data.estimatedMinutes} minutes">
        <span class="pred-num">${data.estimatedMinutes}</span>
        <span class="pred-unit">min</span>
      </div>
      <div class="prediction-details">
        <div class="pred-destination">📍 To ${escapeHtml(data.destination)}</div>
        <div class="pred-congestion">Traffic: <span class="congestion-badge congestion-${(data.congestionLevel || '').toLowerCase()}">${escapeHtml(data.congestionLevel || 'Unknown')}</span></div>
        ${data.congestionDelay > 0 ? `<div class="pred-delay">+${data.congestionDelay} min delay</div>` : ''}
      </div>
    </div>
    <div class="prediction-info-row">
      ${data.cost ? `<div class="pred-info-item"><span>💰 Cost</span><strong>${escapeHtml(data.cost)}</strong></div>` : ''}
      ${data.eco ? `<div class="pred-info-item"><span>🌱 Eco</span><strong>${escapeHtml(data.eco)}</strong></div>` : ''}
      ${data.departNow ? `<div class="pred-info-item"><span>🕐 Depart</span><strong>${escapeHtml(data.departNow)}</strong></div>` : ''}
      ${data.arrivalTime ? `<div class="pred-info-item"><span>🏁 Arrive</span><strong>${escapeHtml(data.arrivalTime)}</strong></div>` : ''}
    </div>
    ${data.tips ? `<div class="pred-tip">💡 ${escapeHtml(data.tips)}</div>` : ''}
    ${data.alternatives && data.alternatives.length > 0 ? `
      <div class="pred-alternatives">
        <strong>Faster options:</strong>
        ${data.alternatives.map(a => `<span class="alt-option">${escapeHtml(a.mode)}: ${a.estimatedMinutes}min</span>`).join('')}
      </div>
    ` : ''}
  `;

  resultEl.innerHTML = '';
  resultEl.appendChild(container);
}

function renderFallbackPrediction(mode, dest) {
  const resultEl = document.getElementById('predictionResult');
  if (!resultEl) return;

  const times = { shuttle: 25, metro: 18, rideshare: 15, walking: 45, cycling: 30, parking: 20 };
  const time = times[mode] || 20;

  resultEl.innerHTML = `
    <div class="prediction-card">
      <div class="prediction-main">
        <div class="prediction-time"><span class="pred-num">~${time}</span><span class="pred-unit">min</span></div>
        <div class="prediction-details">
          <div class="pred-destination">📍 ${escapeHtml(dest || 'destination')}</div>
          <div class="pred-congestion">Traffic: <span class="congestion-badge congestion-moderate">Moderate</span></div>
        </div>
      </div>
      <div class="pred-tip">💡 Start backend server to get live AI predictions.</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}
