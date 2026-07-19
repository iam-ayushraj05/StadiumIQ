/**
 * Operations Module — StadiumIQ
 * Tournament operations, real-time incident tracking, and volunteer task dispatching
 */

import { api } from './api.js';
import { showToast, renderMarkdownToElement } from './utils.js';

let activeDraftText = '';
const dispatchedHistory = [];

export function initOperations() {
  renderIncidents();
  setupEventListeners();
  renderDispatchHistory();
}

// ─── Setup Event Listeners ──────────────────────────────────────────────────
function setupEventListeners() {
  const simulateBtn = document.getElementById('simulateIncidentBtn');
  const clearBtn = document.getElementById('clearIncidentsBtn');
  const draftBtn = document.getElementById('draftDispatchBtn');
  const sendBtn = document.getElementById('sendDispatchBtn');
  const editBtn = document.getElementById('editDraftBtn');

  simulateBtn?.addEventListener('click', handleSimulateIncident);
  clearBtn?.addEventListener('click', handleClearResolved);
  draftBtn?.addEventListener('click', handleDraftInstructions);
  sendBtn?.addEventListener('click', handleSendDispatch);
  editBtn?.addEventListener('click', handleEditDraft);
}

// ─── Incident Management ────────────────────────────────────────────────────
async function renderIncidents() {
  const list = document.getElementById('incidentsList');
  if (!list) return;

  list.textContent = '';
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-placeholder';
  loadingDiv.textContent = '🚨 Fetching active incident logs...';
  list.appendChild(loadingDiv);

  try {
    const data = await api.getIncidents();
    const sorted = sortIncidents(data.incidents);
    renderIncidentList(list, sorted);
  } catch (err) {
    console.error('[Operations] Failed to load incidents', err);
    list.textContent = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'loading-placeholder error';
    errDiv.textContent = '❌ Error loading logs. Running in Demo Mode.';
    list.appendChild(errDiv);
    renderIncidentList(list, getFallbackIncidents());
  }
}

function sortIncidents(list) {
  // Active first, then high severity first
  const severityScore = { high: 3, moderate: 2, low: 1 };
  return [...list].sort((a, b) => {
    if (a.status === b.status) {
      return (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
    }
    return a.status === 'active' ? -1 : 1;
  });
}

function renderIncidentList(container, incidentsList) {
  container.textContent = '';
  if (incidentsList.length === 0) {
    const normalDiv = document.createElement('div');
    normalDiv.className = 'loading-placeholder';
    normalDiv.textContent = '✅ All systems normal. No active incidents.';
    container.appendChild(normalDiv);
    return;
  }

  incidentsList.forEach(inc => {
    const card = document.createElement('div');
    card.className = `incident-card priority-${inc.severity}`;
    card.setAttribute('role', 'listitem');

    // Build specific operational action recommendations based on incident type
    let aiRecommendation = '';
    if (inc.status === 'active') {
      if (inc.type === 'crowd') {
        aiRecommendation = `<div class="incident-ai-rec">💡 <strong>AI Recommendation:</strong> Deploy crowd control barriers at Gate C. Open gate B-3 to dissipate the pressure and redirect 10% of flow to concourse level 2.</div>`;
      } else if (inc.type === 'medical') {
        aiRecommendation = `<div class="incident-ai-rec">💡 <strong>AI Recommendation:</strong> Dispatch Medic Unit 3. Notify nearest first aid station at Section 112 to prepare stretcher. Path: Elevators 2 & 3.</div>`;
      } else {
        aiRecommendation = `<div class="incident-ai-rec">💡 <strong>AI Recommendation:</strong> Notify technical supervisor on channel 2. Shift manual verification checkers to Gate B entry line.</div>`;
      }
    }

    const formatTime = (isoString) => {
      try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        return 'Recent';
      }
    };

    const isResolved = inc.status === 'resolved';

    const header = document.createElement('div');
    header.className = 'incident-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'incident-title';
    titleSpan.textContent = `⚠️ ${inc.location} — ${inc.type.toUpperCase()}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'incident-time';
    timeSpan.textContent = formatTime(inc.reportedAt);

    header.appendChild(titleSpan);
    header.appendChild(timeSpan);

    const desc = document.createElement('div');
    desc.className = 'incident-desc';
    desc.textContent = inc.description;

    card.appendChild(header);
    card.appendChild(desc);

    if (inc.status === 'active') {
      const aiRec = document.createElement('div');
      aiRec.className = 'incident-ai-rec';
      const strong = document.createElement('strong');
      strong.textContent = 'AI Recommendation:';
      aiRec.appendChild(document.createTextNode('💡 '));
      aiRec.appendChild(strong);
      
      let recText = '';
      if (inc.type === 'crowd') {
        recText = ' Deploy crowd control barriers at Gate C. Open gate B-3 to dissipate the pressure and redirect 10% of flow to concourse level 2.';
      } else if (inc.type === 'medical') {
        recText = ' Dispatch Medic Unit 3. Notify nearest first aid station at Section 112 to prepare stretcher. Path: Elevators 2 & 3.';
      } else {
        recText = ' Notify technical supervisor on channel 2. Shift manual verification checkers to Gate B entry line.';
      }
      aiRec.appendChild(document.createTextNode(recText));
      card.appendChild(aiRec);
    }

    const footer = document.createElement('div');
    footer.className = 'incident-footer';

    const statusBadge = document.createElement('span');
    statusBadge.className = `incident-status-badge status-${inc.status}`;
    statusBadge.textContent = inc.status;
    footer.appendChild(statusBadge);

    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '8px';

    if (!isResolved) {
      const resolveBtn = document.createElement('button');
      resolveBtn.className = 'btn btn-secondary btn-sm resolve-btn';
      resolveBtn.dataset.id = inc.id;
      resolveBtn.textContent = 'Resolve';
      actionsDiv.appendChild(resolveBtn);
    }

    if (inc.status === 'active' && inc.type === 'crowd') {
      const dispatchBtn = document.createElement('button');
      dispatchBtn.className = 'btn btn-primary btn-sm dispatch-incident-btn';
      dispatchBtn.dataset.location = inc.location;
      dispatchBtn.dataset.type = 'crowd_redirect';
      dispatchBtn.textContent = 'Dispatch Volunteers';
      actionsDiv.appendChild(dispatchBtn);
    }

    footer.appendChild(actionsDiv);
    card.appendChild(footer);

    // Bind resolve event
    card.querySelector('.resolve-btn')?.addEventListener('click', async function() {
      const id = this.dataset.id;
      try {
        await api.updateIncident(id, { status: 'resolved' });
        showToast('✅ Incident marked as resolved', 'success', 3000);
        renderIncidents();
      } catch {
        // Fallback for Demo Mode
        showToast('✅ Incident resolved (Demo Mode)', 'success', 3000);
        const data = getFallbackIncidents();
        const found = data.find(i => i.id === id);
        if (found) found.status = 'resolved';
        renderIncidents();
      }
    });

    // Bind dispatch preset action
    card.querySelector('.dispatch-incident-btn')?.addEventListener('click', function() {
      const loc = this.dataset.location;
      const type = this.dataset.type;
      
      const sectorSelect = document.getElementById('dispatchSector');
      const typeSelect = document.getElementById('dispatchTaskType');
      
      if (sectorSelect) {
        // Match selection
        if (loc.includes('Gate A')) sectorSelect.value = 'Gate A';
        else if (loc.includes('Gate B')) sectorSelect.value = 'Gate B';
        else if (loc.includes('Food Court A')) sectorSelect.value = 'Food Court A';
        else sectorSelect.value = 'Gate C';
      }
      if (typeSelect) typeSelect.value = type;

      showToast('📋 Parameters copied to Volunteer Dispatcher!', 'info', 2500);
      document.querySelector('.dispatch-panel')?.scrollIntoView({ behavior: 'smooth' });
    });

    container.appendChild(card);
  });
}

// ─── Anomaly Simulation ─────────────────────────────────────────────────────
async function handleSimulateIncident() {
  const anomalies = [
    {
      type: 'crowd',
      severity: 'high',
      location: 'Gate C — East Concourse Corridor',
      description: 'Density spike at 5.2 people/m². High risk of exit bottleneck. Fans backing up near ticket booths.',
      assignedTo: 'Crowd Marshal Unit 5'
    },
    {
      type: 'medical',
      severity: 'moderate',
      location: 'Section 108, Row F',
      description: 'Minor heat exhaustion reported by volunteer. Patient conscious, seated in shade.',
      assignedTo: 'First Aid Team 2'
    },
    {
      type: 'security',
      severity: 'high',
      location: 'Gate A — Main Entry Ramp',
      description: 'Prohibited item dispute causing ticket queue backup. Volunteer assistance requested for crowd management.',
      assignedTo: 'Supervisor On-Duty'
    },
    {
      type: 'crowd',
      severity: 'medium',
      location: 'Food Court A — Service Queues',
      description: 'Severe concession queue wrap-around blocking emergency fire lanes.',
      assignedTo: 'Food Court Stewards'
    }
  ];

  const selected = anomalies[Math.floor(Math.random() * anomalies.length)];

  try {
    await api.createIncident(selected);
    showToast('🚨 Simulated operational alert active!', 'warning', 3000);
    renderIncidents();
  } catch {
    // Fallback for Demo Mode
    showToast('🚨 Simulated operational alert (Demo Mode)', 'warning', 3000);
    const mock = getFallbackIncidents();
    mock.unshift({
      id: Math.random().toString(),
      reportedAt: new Date().toISOString(),
      status: 'active',
      ...selected
    });
    renderIncidents();
  }
}

function handleClearResolved() {
  showToast('🧹 Cleaned resolved incidents from dashboard logs', 'info', 2500);
}

// ─── Volunteer Task Dispatcher ──────────────────────────────────────────────
async function handleDraftInstructions() {
  const sector = document.getElementById('dispatchSector')?.value || 'Gate C';
  const type = document.getElementById('dispatchTaskType')?.value || 'crowd_redirect';
  const preview = document.getElementById('dispatchDraftContent');
  const controls = document.querySelector('.dispatch-controls');

  if (!preview) return;

  preview.textContent = '';
  const loading = document.createElement('div');
  loading.style.display = 'flex';
  loading.style.alignItems = 'center';
  loading.style.gap = '8px';
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner-sm';
  loading.appendChild(spinner);
  loading.appendChild(document.createTextNode(' Drafting operational card with GenAI...'));
  preview.appendChild(loading);
  if (controls) controls.style.display = 'none';

  const typeLabels = {
    crowd_redirect: 'Crowd Redirection & Flow Management',
    medical_assist: 'Medical Assistance Dispatch',
    debris_cleanup: 'Eco/Debris Collection Dispatch',
    accessibility_escort: 'Accessibility Escort Assist',
    security_standby: 'Security Standby Reinforcement'
  };

  const promptMessage = `Draft professional, highly structured operational task cards for World Cup 2026 volunteers dispatched to ${sector} for a ${typeLabels[type]} task. 
Format it as a clean list of:
1. 🎯 PRIMARY OBJECTIVE
2. 📍 SPECIFIC SECTOR COORDINATES
3. 🛠️ REQUIRED EQUIPMENT & MATERIALS
4. 📋 ACTIONABLE PROCEDURES (3 steps)`;

  try {
    // Call AI route with organizer context
    const data = await api.chat(promptMessage, { role: 'organizer' });
    activeDraftText = data.response;
    renderMarkdownToElement(preview, data.response);
    if (controls) controls.style.display = 'flex';
  } catch (err) {
    console.error('[Dispatch Draft Error]', err);
    // Fallback draft card
    const fallbackText = `**🎯 PRIMARY OBJECTIVE**
Deploy to ${sector} to assist with ${typeLabels[type]} operations and maintain clear emergency exits.

**📍 SPECIFIC SECTOR COORDINATES**
${sector} Main entrance portals, escalators, and adjoining walkways.

**🛠️ REQUIRED EQUIPMENT**
- High-visibility safety vests
- Directional indicator megaphones
- Zone boundary floor cones

**📋 ACTIONABLE PROCEDURES**
1. Position volunteers at 10-meter intervals along the corridors.
2. Direct mobile traffic to utilize alternative staircases to clear concourse bottlenecks.
3. Coordinate directly with supervisors to report resolution status.`;

    activeDraftText = fallbackText;
    renderMarkdownToElement(preview, fallbackText);
    if (controls) controls.style.display = 'flex';
    showToast('💡 Draft created using local operations template.', 'info', 3000);
  }
}

function handleSendDispatch() {
  if (!activeDraftText) return;

  const sector = document.getElementById('dispatchSector')?.value || 'Gate C';
  const type = document.getElementById('dispatchTaskType')?.value || 'crowd_redirect';

  const logItem = {
    id: Math.random().toString(),
    sector,
    type,
    text: activeDraftText,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };

  dispatchedHistory.unshift(logItem);
  renderDispatchHistory();
  showToast(`📤 Instructions pushed to active volunteers in ${sector}!`, 'success', 3000);

  // Reset Draft Box
  const preview = document.getElementById('dispatchDraftContent');
  const controls = document.querySelector('.dispatch-controls');
  if (preview) {
    preview.textContent = '';
    const placeholder = document.createElement('span');
    placeholder.className = 'draft-placeholder';
    placeholder.textContent = 'Select parameters and click "Draft Dispatch Instructions" to generate instruction cards...';
    preview.appendChild(placeholder);
  }
  if (controls) controls.style.display = 'none';
  activeDraftText = '';
}

function handleEditDraft() {
  const preview = document.getElementById('dispatchDraftContent');
  if (!preview) return;

  const text = activeDraftText;
  const textarea = document.createElement('textarea');
  textarea.className = 'config-input';
  textarea.style.cssText = 'width:100%; min-height:140px; font-family:monospace; font-size:12px;';
  textarea.value = text;

  preview.textContent = '';
  preview.appendChild(textarea);

  textarea.focus();
  textarea.addEventListener('blur', () => {
    activeDraftText = textarea.value;
    renderMarkdownToElement(preview, activeDraftText);
  });
}

function renderDispatchHistory() {
  const container = document.getElementById('dispatchHistoryList');
  if (!container) return;

  if (dispatchedHistory.length === 0) {
    container.textContent = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'draft-placeholder';
    placeholder.style.fontSize = '11px';
    placeholder.style.textAlign = 'center';
    placeholder.style.padding = '10px 0';
    placeholder.textContent = 'No active dispatches pushed yet today.';
    container.appendChild(placeholder);
    return;
  }

  container.textContent = '';
  dispatchedHistory.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dispatch-history-item';

    const typeLabels = {
      crowd_redirect: 'Crowd Management',
      medical_assist: 'Medical Assist',
      debris_cleanup: 'Eco Task force',
      accessibility_escort: 'Accessibility Escort',
      security_standby: 'Security Reinforce'
    };

    const meta = document.createElement('div');
    meta.className = 'dispatch-history-meta';

    const strong = document.createElement('strong');
    strong.textContent = `📍 ${item.sector} — ${typeLabels[item.type]}`;

    const span = document.createElement('span');
    span.textContent = `Sent at ${item.timestamp}`;

    meta.appendChild(strong);
    meta.appendChild(span);

    const textDiv = document.createElement('div');
    textDiv.className = 'dispatch-history-text';
    const truncatedText = item.text.slice(0, 150) + (item.text.length > 150 ? '...' : '');
    renderMarkdownToElement(textDiv, truncatedText);

    el.appendChild(meta);
    el.appendChild(textDiv);
    container.appendChild(el);
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────
let fallbackIncidentsList = null;
function getFallbackIncidents() {
  if (!fallbackIncidentsList) {
    fallbackIncidentsList = [
      {
        id: 'mock-1', type: 'medical', severity: 'moderate',
        location: 'Section 115, Row J, Seat 8', status: 'active',
        description: 'Fan reported feeling unwell. First aid dispatched.',
        assignedTo: 'Medic Unit 3', reportedAt: new Date(Date.now() - 420000).toISOString()
      },
      {
        id: 'mock-2', type: 'security', severity: 'low',
        location: 'Gate B — South Turnstile', status: 'resolved',
        description: 'Ticket scanner malfunction. Manual verification in progress.',
        assignedTo: 'Gate Manager', reportedAt: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: 'mock-3', type: 'crowd', severity: 'high',
        location: 'Food Court A', status: 'active',
        description: 'Critical density detected. AI recommends closing service window 4.',
        assignedTo: 'Crowd Management Team', reportedAt: new Date(Date.now() - 180000).toISOString()
      }
    ];
  }
  return fallbackIncidentsList;
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

function formatMarkdownToHtml(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
