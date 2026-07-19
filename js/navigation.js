/**
 * Navigation Module — StadiumIQ
 * AI-powered indoor navigation with accessibility routing
 */

import { api } from './api.js';
import { showToast } from './utils.js';

let currentFloor = 0;

export function initNavigation() {
  renderFloorPlan(currentFloor);
  setupFloorButtons();
  setupRouteForm();
}

// ─── Floor Plan ───────────────────────────────────────────────────────────────
function renderFloorPlan(floor) {
  const canvas = document.getElementById('mapCanvas');
  if (!canvas) return;

  canvas.innerHTML = '';
  canvas.style.cssText = 'position:relative;width:100%;height:100%;background:#0d1117;border-radius:12px;overflow:hidden;';

  const floors = {
    0: {
      label: 'Ground Level',
      rooms: [
        { name: 'Main Entrance', x: 35, y: 85, w: 30, h: 10, color: '#4361ee', icon: '🚪' },
        { name: 'Gate A', x: 35, y: 3, w: 25, h: 8, color: '#4361ee', icon: '🚪' },
        { name: 'Gate B', x: 3, y: 40, w: 8, h: 20, color: '#4361ee', icon: '🚪' },
        { name: 'Gate C', x: 89, y: 40, w: 8, h: 20, color: '#4361ee', icon: '🚪' },
        { name: 'Security', x: 35, y: 75, w: 30, h: 8, color: '#e63946', icon: '🔒' },
        { name: 'Ticket Scan', x: 20, y: 60, w: 15, h: 8, color: '#f77f00', icon: '🎫' },
        { name: 'Ticket Scan', x: 65, y: 60, w: 15, h: 8, color: '#f77f00', icon: '🎫' },
        { name: 'Parking North', x: 30, y: 0, w: 40, h: 3, color: '#7b2d8b', icon: '🅿️' },
        { name: 'Fan Zone', x: 15, y: 15, w: 70, h: 20, color: '#06d6a0', icon: '⚽' },
        { name: 'Accessibility Drop-off', x: 65, y: 85, w: 20, h: 10, color: '#4cc9f0', icon: '♿' }
      ]
    },
    1: {
      label: 'Level 1 — Concourse',
      rooms: [
        { name: 'Food Court A', x: 5, y: 30, w: 35, h: 25, color: '#f77f00', icon: '🍔' },
        { name: 'Food Court B', x: 60, y: 30, w: 35, h: 25, color: '#f77f00', icon: '🍔' },
        { name: 'First Aid', x: 42, y: 10, w: 16, h: 15, color: '#e63946', icon: '🏥' },
        { name: 'ATMs', x: 20, y: 65, w: 15, h: 10, color: '#7b2d8b', icon: '💳' },
        { name: 'Info Desk', x: 42, y: 65, w: 16, h: 10, color: '#4361ee', icon: 'ℹ️' },
        { name: 'Restrooms', x: 65, y: 65, w: 15, h: 10, color: '#4cc9f0', icon: '🚻' },
        { name: 'Concourse Ring', x: 5, y: 5, w: 90, h: 90, color: 'transparent', border: '#ffffff22', icon: '' }
      ]
    },
    2: {
      label: 'Level 2 — Lower Bowl',
      rooms: [
        { name: 'Secs 101–115', x: 5, y: 5, w: 40, h: 35, color: '#4361ee', icon: '🏟️' },
        { name: 'Secs 116–130', x: 55, y: 5, w: 40, h: 35, color: '#4361ee', icon: '🏟️' },
        { name: 'Food Court B', x: 30, y: 45, w: 40, h: 18, color: '#f77f00', icon: '🍔' },
        { name: 'VIP Lounge', x: 5, y: 45, w: 22, h: 45, color: '#ffd93d', icon: '⭐' },
        { name: 'Merchandise', x: 73, y: 45, w: 22, h: 45, color: '#7b2d8b', icon: '👕' },
        { name: 'Restrooms', x: 30, y: 72, w: 40, h: 15, color: '#4cc9f0', icon: '🚻' }
      ]
    },
    3: {
      label: 'Level 3 — Upper Bowl',
      rooms: [
        { name: 'Secs 200–220', x: 5, y: 5, w: 90, h: 40, color: '#4361ee', icon: '🏟️' },
        { name: 'Media Center', x: 5, y: 50, w: 35, h: 35, color: '#e63946', icon: '📺' },
        { name: 'Premium Lounge', x: 45, y: 50, w: 50, h: 35, color: '#ffd93d', icon: '🥂' }
      ]
    }
  };

  const layout = floors[floor] || floors[0];

  // Add floor label
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:8px;right:12px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:600;z-index:10;';
  label.textContent = layout.label;
  canvas.appendChild(label);

  // Render rooms
  layout.rooms.forEach(room => {
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      left: ${room.x}%;
      top: ${room.y}%;
      width: ${room.w}%;
      height: ${room.h}%;
      background: ${room.color !== 'transparent' ? room.color + '33' : 'transparent'};
      border: 1px solid ${room.border || (room.color + '88')};
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2px;
      overflow: hidden;
      transition: background 0.2s;
      cursor: default;
    `;

    if (room.icon) {
      const iconEl = document.createElement('div');
      iconEl.style.cssText = 'font-size:14px;line-height:1;';
      iconEl.textContent = room.icon;
      iconEl.setAttribute('aria-hidden', 'true');
      el.appendChild(iconEl);
    }

    if (room.name) {
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:8px;color:rgba(255,255,255,0.85);text-align:center;font-weight:600;word-break:break-word;margin-top:2px;';
      nameEl.textContent = room.name;
      el.appendChild(nameEl);
    }

    el.setAttribute('title', room.name || '');
    canvas.appendChild(el);
  });
}

function setupFloorButtons() {
  document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.floor-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-pressed', 'true');
      currentFloor = parseInt(this.dataset.floor, 10);
      renderFloorPlan(currentFloor);
    });
  });
}

// ─── Route Form ───────────────────────────────────────────────────────────────
function setupRouteForm() {
  const getRouteBtn = document.getElementById('getRouteBtn');
  getRouteBtn?.addEventListener('click', handleGetRoute);
}

async function handleGetRoute() {
  const from = document.getElementById('navFrom')?.value;
  const to = document.getElementById('navTo')?.value;
  const accessible = document.getElementById('accessibleRoute')?.checked;
  const avoidCrowds = document.getElementById('avoidCrowds')?.checked;
  const shortest = document.getElementById('shortestPath')?.checked;

  const resultEl = document.getElementById('routeResult');
  if (!resultEl) return;

  resultEl.innerHTML = '<div class="route-loading"><div class="loading-spinner-sm"></div> AI calculating optimal route...</div>';

  const preferences = { accessibleRoute: accessible, avoidCrowds, shortestPath: shortest };

  try {
    // Get AI description
    const aiData = await api.getRouteDescription(from, to, preferences);

    // Get route from navigation backend
    const routeData = await api.getRoute(from, to, preferences);
    const route = routeData.route || {};

    renderRouteResult(aiData, route, preferences);
  } catch (err) {
    // Use AI data as fallback
    try {
      const aiData = await api.getRouteDescription(from, to, preferences);
      renderRouteResult(aiData, {}, preferences);
    } catch {
      resultEl.innerHTML = `<div class="route-error">⚠️ Unable to calculate route. ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderRouteResult(aiData, route, preferences) {
  const resultEl = document.getElementById('routeResult');
  if (!resultEl) return;

  const steps = aiData.steps || [];
  const time = aiData.estimatedTime || route.estimatedTime || '7 min';
  const dist = aiData.distance || route.distance || '420m';
  const congestion = route.congestion || 'Low';

  const container = document.createElement('div');
  container.className = 'route-card';

  // Header
  const header = document.createElement('div');
  header.className = 'route-header';
  header.innerHTML = `
    <div class="route-meta">
      <span class="route-time">⏱ ${escapeHtml(time)}</span>
      <span class="route-dist">📍 ${escapeHtml(dist)}</span>
      <span class="route-crowd crowd-${congestion.toLowerCase()}">👥 ${escapeHtml(congestion)} congestion</span>
      ${preferences?.accessibleRoute ? '<span class="route-accessible">♿ Accessible</span>' : ''}
    </div>
  `;
  container.appendChild(header);

  // Steps
  if (steps.length > 0) {
    const stepsEl = document.createElement('ol');
    stepsEl.className = 'route-steps';
    stepsEl.setAttribute('aria-label', 'Navigation steps');

    steps.forEach(step => {
      const li = document.createElement('li');
      li.className = 'route-step';
      li.innerHTML = `
        <div class="step-number">${escapeHtml(String(step.step || ''))}</div>
        <div class="step-content">
          <div class="step-instruction">${escapeHtml(step.instruction || '')}</div>
          <div class="step-landmark">📍 ${escapeHtml(step.landmark || '')}</div>
          ${step.distance ? `<div class="step-distance">${escapeHtml(step.distance)}</div>` : ''}
        </div>
      `;
      stepsEl.appendChild(li);
    });
    container.appendChild(stepsEl);
  }

  // AR button (demo)
  const arBtn = document.createElement('button');
  arBtn.className = 'btn btn-secondary ar-btn';
  arBtn.innerHTML = '📱 Launch AR Navigation (Demo)';
  arBtn.setAttribute('aria-label', 'Launch augmented reality navigation (demo mode)');
  arBtn.addEventListener('click', () => showToast('AR Navigation coming soon! Feature in development.', 'info'));
  container.appendChild(arBtn);

  resultEl.innerHTML = '';
  resultEl.appendChild(container);
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
