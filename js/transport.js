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

  grid.textContent = '';
  const loading = document.createElement('div');
  loading.className = 'loading-placeholder';
  loading.textContent = '🚌 Loading transport options...';
  grid.appendChild(loading);

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
  grid.textContent = '';

  options.forEach(option => {
    const card = document.createElement('div');
    card.className = 'transport-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `${option.name} transport option`);

    const loadPct = option.capacity ? Math.round((option.currentLoad / option.capacity) * 100) : null;
    const loadClass = loadPct > 85 ? 'load-high' : loadPct > 60 ? 'load-med' : 'load-low';

    const icon = document.createElement('div');
    icon.className = 'transport-icon';
    icon.style.color = option.color || '#4361ee';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = option.icon;

    const info = document.createElement('div');
    info.className = 'transport-info';

    const name = document.createElement('div');
    name.className = 'transport-name';
    name.textContent = option.name;

    const route = document.createElement('div');
    route.className = 'transport-route';
    route.textContent = option.route;

    info.appendChild(name);
    info.appendChild(route);

    if (option.frequency) {
      const freq = document.createElement('div');
      freq.className = 'transport-frequency';
      freq.textContent = `Every ${option.frequency}`;
      info.appendChild(freq);
    }

    if (option.nextDeparture) {
      const next = document.createElement('div');
      next.className = 'transport-next';
      next.textContent = 'Next: ';
      const strong = document.createElement('strong');
      strong.textContent = option.nextDeparture;
      next.appendChild(strong);
      info.appendChild(next);
    }

    if (option.waitTime) {
      const next = document.createElement('div');
      next.className = 'transport-next';
      next.textContent = 'Wait: ';
      const strong = document.createElement('strong');
      strong.textContent = `~${option.waitTime}`;
      next.appendChild(strong);
      info.appendChild(next);
    }

    if (option.availableSpaces !== undefined) {
      const next = document.createElement('div');
      next.className = 'transport-next';
      next.textContent = 'Available: ';
      const strong = document.createElement('strong');
      strong.textContent = String(option.availableSpaces);
      next.appendChild(strong);
      next.appendChild(document.createTextNode(' spaces'));
      info.appendChild(next);
    }

    if (option.availableBikes !== undefined) {
      const next = document.createElement('div');
      next.className = 'transport-next';
      next.textContent = 'Bikes: ';
      const strong = document.createElement('strong');
      strong.textContent = String(option.availableBikes);
      next.appendChild(strong);
      next.appendChild(document.createTextNode(' available'));
      info.appendChild(next);
    }

    card.appendChild(icon);
    card.appendChild(info);

    if (loadPct !== null) {
      const loadDiv = document.createElement('div');
      loadDiv.className = `transport-load ${loadClass}`;
      loadDiv.setAttribute('role', 'meter');
      loadDiv.setAttribute('aria-valuenow', loadPct);
      loadDiv.setAttribute('aria-valuemin', '0');
      loadDiv.setAttribute('aria-valuemax', '100');
      loadDiv.setAttribute('aria-label', `${option.name} capacity ${loadPct}%`);

      const loadBar = document.createElement('div');
      loadBar.className = 'load-bar';
      loadBar.style.width = `${loadPct}%`;

      const loadLabel = document.createElement('span');
      loadLabel.className = 'load-label';
      loadLabel.textContent = `${loadPct}% full`;

      loadDiv.appendChild(loadBar);
      loadDiv.appendChild(loadLabel);
      card.appendChild(loadDiv);
    }

    if (option.accessibility) {
      const access = document.createElement('div');
      access.className = 'transport-access';
      access.setAttribute('title', 'Accessible');
      access.setAttribute('aria-label', 'Wheelchair accessible');
      access.textContent = '♿';
      card.appendChild(access);
    }

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

  resultEl.textContent = '';
  const loading = document.createElement('div');
  loading.className = 'route-loading';
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner-sm';
  loading.appendChild(spinner);
  loading.appendChild(document.createTextNode(' 🤖 AI calculating travel time...'));
  resultEl.appendChild(loading);

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
    resultEl.textContent = '';
    const unavailDiv = document.createElement('div');
    unavailDiv.className = 'prediction-unavailable';
    
    const p1 = document.createElement('p');
    p1.textContent = `⚠️ ${data.message || 'Service not available for this route.'}`;
    unavailDiv.appendChild(p1);

    if (data.alternatives) {
      const p2 = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Alternatives: ';
      p2.appendChild(strong);
      const text = data.alternatives.map(a => `${a.mode} (~${a.estimatedMinutes} min)`).join(' | ');
      p2.appendChild(document.createTextNode(text));
      unavailDiv.appendChild(p2);
    }
    resultEl.appendChild(unavailDiv);
    return;
  }

  const container = document.createElement('div');
  container.className = 'prediction-card';

  const predMain = document.createElement('div');
  predMain.className = 'prediction-main';

  const predTime = document.createElement('div');
  predTime.className = 'prediction-time';
  predTime.setAttribute('aria-label', `Estimated travel time ${data.estimatedMinutes} minutes`);
  const numSpan = document.createElement('span');
  numSpan.className = 'pred-num';
  numSpan.textContent = data.estimatedMinutes;
  const unitSpan = document.createElement('span');
  unitSpan.className = 'pred-unit';
  unitSpan.textContent = 'min';
  predTime.appendChild(numSpan);
  predTime.appendChild(unitSpan);

  const predDetails = document.createElement('div');
  predDetails.className = 'prediction-details';
  const destDiv = document.createElement('div');
  destDiv.className = 'pred-destination';
  destDiv.textContent = `📍 To ${data.destination}`;
  const congDiv = document.createElement('div');
  congDiv.className = 'pred-congestion';
  congDiv.appendChild(document.createTextNode('Traffic: '));
  const congBadge = document.createElement('span');
  const congLevel = data.congestionLevel || 'Unknown';
  congBadge.className = `congestion-badge congestion-${congLevel.toLowerCase()}`;
  congBadge.textContent = congLevel;
  congDiv.appendChild(congBadge);

  predDetails.appendChild(destDiv);
  predDetails.appendChild(congDiv);

  if (data.congestionDelay > 0) {
    const delayDiv = document.createElement('div');
    delayDiv.className = 'pred-delay';
    delayDiv.textContent = `+${data.congestionDelay} min delay`;
    predDetails.appendChild(delayDiv);
  }

  predMain.appendChild(predTime);
  predMain.appendChild(predDetails);
  container.appendChild(predMain);

  const infoRow = document.createElement('div');
  infoRow.className = 'prediction-info-row';

  const addInfoItem = (label, val) => {
    const item = document.createElement('div');
    item.className = 'pred-info-item';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = val;
    item.appendChild(span);
    item.appendChild(strong);
    infoRow.appendChild(item);
  };

  if (data.cost) addInfoItem('💰 Cost', data.cost);
  if (data.eco) addInfoItem('🌱 Eco', data.eco);
  if (data.departNow) addInfoItem('🕐 Depart', data.departNow);
  if (data.arrivalTime) addInfoItem('🏁 Arrive', data.arrivalTime);

  container.appendChild(infoRow);

  if (data.tips) {
    const tipDiv = document.createElement('div');
    tipDiv.className = 'pred-tip';
    tipDiv.textContent = `💡 ${data.tips}`;
    container.appendChild(tipDiv);
  }

  if (data.alternatives && data.alternatives.length > 0) {
    const altsDiv = document.createElement('div');
    altsDiv.className = 'pred-alternatives';
    const strong = document.createElement('strong');
    strong.textContent = 'Faster options:';
    altsDiv.appendChild(strong);
    data.alternatives.forEach(a => {
      const altSpan = document.createElement('span');
      altSpan.className = 'alt-option';
      altSpan.textContent = `${a.mode}: ${a.estimatedMinutes}min`;
      altsDiv.appendChild(altSpan);
    });
    container.appendChild(altsDiv);
  }

  resultEl.textContent = '';
  resultEl.appendChild(container);
}

function renderFallbackPrediction(mode, dest) {
  const resultEl = document.getElementById('predictionResult');
  if (!resultEl) return;

  const times = { shuttle: 25, metro: 18, rideshare: 15, walking: 45, cycling: 30, parking: 20 };
  const time = times[mode] || 20;

  const fallbackCard = document.createElement('div');
  fallbackCard.className = 'prediction-card';

  const predMain = document.createElement('div');
  predMain.className = 'prediction-main';

  const predTime = document.createElement('div');
  predTime.className = 'prediction-time';
  const numSpan = document.createElement('span');
  numSpan.className = 'pred-num';
  numSpan.textContent = `~${time}`;
  const unitSpan = document.createElement('span');
  unitSpan.className = 'pred-unit';
  unitSpan.textContent = 'min';
  predTime.appendChild(numSpan);
  predTime.appendChild(unitSpan);

  const predDetails = document.createElement('div');
  predDetails.className = 'prediction-details';
  const destDiv = document.createElement('div');
  destDiv.className = 'pred-destination';
  destDiv.textContent = `📍 ${dest || 'destination'}`;
  const congDiv = document.createElement('div');
  congDiv.className = 'pred-congestion';
  congDiv.appendChild(document.createTextNode('Traffic: '));
  const congBadge = document.createElement('span');
  congBadge.className = 'congestion-badge congestion-moderate';
  congBadge.textContent = 'Moderate';
  congDiv.appendChild(congBadge);

  predDetails.appendChild(destDiv);
  predDetails.appendChild(congDiv);

  predMain.appendChild(predTime);
  predMain.appendChild(predDetails);
  fallbackCard.appendChild(predMain);

  const tipDiv = document.createElement('div');
  tipDiv.className = 'pred-tip';
  tipDiv.textContent = '💡 Start backend server to get live AI predictions.';
  fallbackCard.appendChild(tipDiv);

  resultEl.textContent = '';
  resultEl.appendChild(fallbackCard);
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
