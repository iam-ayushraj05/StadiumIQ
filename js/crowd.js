/**
 * Crowd Intelligence Module — StadiumIQ
 * Real-time crowd density visualization, alerts, and AI recommendations
 */

import { api } from './api.js';
import { showToast, formatPercent } from './utils.js';

let crowdRefreshInterval = null;
let currentView = 'heatmap';

export function initCrowd() {
  renderStadiumMap();
  renderAlerts();
  setupMapControls();
  startLiveRefresh();
  loadAIRecommendations();
}

// ─── Stadium Map ──────────────────────────────────────────────────────────────
async function renderStadiumMap() {
  try {
    const data = await api.getCrowdZones();
    renderHeatmapView(data.zones);
    updateCrowdStats(data.summary);
  } catch {
    renderFallbackMap();
  }
}

function renderHeatmapView(zones) {
  const mapInner = document.getElementById('mapInner');
  if (!mapInner) return;

  mapInner.innerHTML = '';

  const densityColors = {
    low: '#06d6a0',
    medium: '#ffd93d',
    high: '#ff9f1c',
    critical: '#e63946'
  };

  // Layout zones in a grid-like stadium shape
  const zoneLayout = [
    { id: 'seating-north', top: 5, left: 25, width: 50, height: 18 },
    { id: 'seating-south', top: 77, left: 25, width: 50, height: 18 },
    { id: 'seating-east', top: 25, left: 77, width: 18, height: 50 },
    { id: 'seating-west', top: 25, left: 5, width: 18, height: 50 },
    { id: 'food-court-a', top: 28, left: 25, width: 20, height: 14 },
    { id: 'food-court-b', top: 28, left: 55, width: 20, height: 14 },
    { id: 'concourse-l1', top: 44, left: 25, width: 50, height: 12 },
    { id: 'merchandise', top: 58, left: 30, width: 40, height: 10 },
    { id: 'main-entrance', top: 92, left: 35, width: 30, height: 7 }
  ];

  // Pitch (center)
  const pitchEl = document.createElement('div');
  pitchEl.className = 'map-pitch';
  pitchEl.style.cssText = 'position:absolute;top:25%;left:25%;width:50%;height:50%;border-radius:8px;background:linear-gradient(135deg,#1a5c2a,#2d8a3e);border:2px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;z-index:1;';
  pitchEl.innerHTML = '<span style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;">⚽ PITCH</span>';
  mapInner.appendChild(pitchEl);

  // Render zone blobs
  zoneLayout.forEach(layout => {
    const zone = zones.find(z => z.id === layout.id);
    if (!zone) return;

    const el = document.createElement('div');
    el.className = `map-zone density-${zone.density}`;
    el.style.cssText = `
      position: absolute;
      top: ${layout.top}%;
      left: ${layout.left}%;
      width: ${layout.width}%;
      height: ${layout.height}%;
      background: ${densityColors[zone.density]}${zone.density === 'critical' ? '99' : '66'};
      border: 1px solid ${densityColors[zone.density]};
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 2;
    `;

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:9px;color:#fff;font-weight:600;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.8);padding:0 2px;';
    nameEl.textContent = zone.name.replace('Concourse Level ', 'L').replace('Seating — ', '');

    const pctEl = document.createElement('div');
    pctEl.style.cssText = 'font-size:11px;color:#fff;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,0.8);';
    pctEl.textContent = `${zone.fillPercentage}%`;

    el.appendChild(nameEl);
    el.appendChild(pctEl);

    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${zone.name}: ${zone.fillPercentage}% full, ${zone.density} density`);
    el.title = `${zone.name}\n${zone.currentOccupancy.toLocaleString()} / ${zone.baseCapacity.toLocaleString()} people\nDensity: ${zone.density}`;

    if (zone.density === 'critical') {
      el.style.animation = 'pulse-critical 1.5s infinite';
    }

    mapInner.appendChild(el);
  });
}

function updateCrowdStats(summary) {
  if (!summary) return;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('totalCapacity', (summary.totalCapacity || 72220).toLocaleString());
  setEl('currentAttendance', (summary.currentAttendance || 68450).toLocaleString());
  setEl('occupancyRate', `${summary.occupancyRate || 94.8}%`);
  setEl('crowdFlow', '+1,200/hr');
  const badge = document.getElementById('alertCount');
  if (badge) {
    badge.textContent = summary.alertCount || 3;
    badge.setAttribute('aria-label', `${summary.alertCount || 3} active alerts`);
  }
}

function renderFallbackMap() {
  const mapInner = document.getElementById('mapInner');
  if (!mapInner) return;
  mapInner.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.5);">📡 Connecting to live feed...</div>';
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
async function renderAlerts() {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;

  try {
    const data = await api.getCrowdAlerts();
    alertsList.innerHTML = '';

    const alerts = data.alerts || getFallbackAlerts();
    alerts.forEach(alert => {
      const el = document.createElement('div');
      el.className = `alert-item alert-${alert.severity}`;
      el.setAttribute('role', 'listitem');

      const timeAgo = getTimeAgo(alert.timestamp);

      el.innerHTML = `
        <div class="alert-content">
          <div class="alert-message">${escapeHtml(alert.message)}</div>
          <div class="alert-meta">
            <span class="alert-zone">${escapeHtml(alert.zone)}</span>
            <span class="alert-time">${escapeHtml(timeAgo)}</span>
          </div>
          <div class="alert-recommendation">${escapeHtml(alert.recommendation)}</div>
        </div>
      `;
      alertsList.appendChild(el);
    });

  } catch {
    renderFallbackAlerts();
  }
}

function getFallbackAlerts() {
  return [
    { severity: 'critical', zone: 'Food Court A', message: '🚨 CRITICAL: Food Court A at 96% capacity.', recommendation: 'Redirect fans to Food Court B.', timestamp: new Date().toISOString() },
    { severity: 'warning', zone: 'Gate C', message: '⚠️ WARNING: Gate C bottleneck forming.', recommendation: 'Open auxiliary gate lanes.', timestamp: new Date(Date.now() - 180000).toISOString() },
    { severity: 'info', zone: 'Gate B', message: '🔧 INFO: Gate B south scanner offline.', recommendation: 'Manual verification in progress.', timestamp: new Date(Date.now() - 600000).toISOString() }
  ];
}

function renderFallbackAlerts() {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;
  alertsList.innerHTML = '';
  getFallbackAlerts().forEach(a => {
    const el = document.createElement('div');
    el.className = `alert-item alert-${a.severity}`;
    el.setAttribute('role', 'listitem');
    el.innerHTML = `<div class="alert-content"><div class="alert-message">${escapeHtml(a.message)}</div><div class="alert-recommendation">${escapeHtml(a.recommendation)}</div></div>`;
    alertsList.appendChild(el);
  });
}

// ─── Map Controls ─────────────────────────────────────────────────────────────
function setupMapControls() {
  const views = ['viewHeatmap', 'viewFlow', 'viewZones'];
  views.forEach(id => {
    document.getElementById(id)?.addEventListener('click', function () {
      views.forEach(v => {
        const btn = document.getElementById(v);
        btn?.classList.remove('active');
        btn?.setAttribute('aria-pressed', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-pressed', 'true');
      currentView = id.replace('view', '').toLowerCase();
      renderStadiumMap();
    });
  });
}

// ─── AI Recommendations ───────────────────────────────────────────────────────
async function loadAIRecommendations() {
  const container = document.getElementById('aiRecommendations');
  if (!container) return;

  container.innerHTML = '<div class="loading-placeholder">🤖 Analyzing crowd data...</div>';

  try {
    const zonesData = await api.getCrowdZones();
    const data = await api.analyzeCrowd(zonesData.summary);
    const recs = data.recommendations || getFallbackRecs();

    container.innerHTML = '';
    recs.forEach(rec => {
      const el = document.createElement('div');
      el.className = `rec-item priority-${rec.priority || 'medium'}`;
      el.innerHTML = `
        <span class="rec-emoji" aria-hidden="true">${escapeHtml(rec.emoji || '💡')}</span>
        <div class="rec-body">
          <div class="rec-title">${escapeHtml(rec.title)}</div>
          <div class="rec-desc">${escapeHtml(rec.description)}</div>
        </div>
        <span class="rec-priority badge-${rec.priority || 'medium'}">${escapeHtml(rec.priority || 'medium')}</span>
      `;
      container.appendChild(el);
    });
  } catch {
    container.innerHTML = '';
    getFallbackRecs().forEach(rec => {
      const el = document.createElement('div');
      el.className = 'rec-item priority-medium';
      el.innerHTML = `<span class="rec-emoji" aria-hidden="true">${escapeHtml(rec.emoji)}</span><div class="rec-body"><div class="rec-title">${escapeHtml(rec.title)}</div><div class="rec-desc">${escapeHtml(rec.description)}</div></div>`;
      container.appendChild(el);
    });
  }
}

function getFallbackRecs() {
  return [
    { emoji: '🚦', title: 'Redirect Gate C Traffic', description: 'Open auxiliary gates to reduce 20% bottleneck. Estimated relief in 8 minutes.', priority: 'high' },
    { emoji: '🍔', title: 'Deploy Pop-up Food Stalls', description: 'Add 4 mobile vendors at Sections 112-115 to ease Food Court A pressure.', priority: 'medium' },
    { emoji: '🚌', title: 'Increase Shuttle Frequency', description: 'Add 3 shuttle buses on North Route. Current wait time 12 min → target 6 min.', priority: 'medium' },
    { emoji: '📢', title: 'Fan Announcement', description: 'Broadcast alternate food locations via stadium PA and mobile app push notification.', priority: 'low' }
  ];
}

// ─── Live Refresh ─────────────────────────────────────────────────────────────
function startLiveRefresh() {
  crowdRefreshInterval = setInterval(() => {
    renderStadiumMap();
    renderAlerts();
  }, 30000); // every 30 seconds
}

export function destroyCrowd() {
  if (crowdRefreshInterval) clearInterval(crowdRefreshInterval);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
