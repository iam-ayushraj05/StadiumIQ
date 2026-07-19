/**
 * StadiumIQ API Client
 * Frontend service layer to communicate with the Express backend
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : '/api';

class ApiClient {
  constructor() {
    this._apiKey = null;
  }

  setApiKey(key) { this._apiKey = key; }

  async _fetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    };
    const res = await fetch(url, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ─── AI ────────────────────────────────────────────────────────────
  async chat(message, { stadium, role, language, history, temperature } = {}) {
    return this._fetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, apiKey: this._apiKey, stadium, role, language, history, temperature })
    });
  }

  async translate(text, targetLanguage) {
    return this._fetch('/ai/translate', {
      method: 'POST',
      body: JSON.stringify({ text, targetLanguage, apiKey: this._apiKey })
    });
  }

  async analyzeCrowd(crowdData) {
    return this._fetch('/ai/crowd-analysis', {
      method: 'POST',
      body: JSON.stringify({ crowdData, apiKey: this._apiKey })
    });
  }

  async getRouteDescription(from, to, preferences) {
    return this._fetch('/ai/route-description', {
      method: 'POST',
      body: JSON.stringify({ from, to, preferences, apiKey: this._apiKey })
    });
  }

  async getSustainabilityReport(ecoData) {
    return this._fetch('/ai/sustainability-report', {
      method: 'POST',
      body: JSON.stringify({ ecoData, apiKey: this._apiKey })
    });
  }

  // ─── Crowd ─────────────────────────────────────────────────────────
  async getCrowdZones() { return this._fetch('/crowd/zones'); }
  async getCrowdAlerts() { return this._fetch('/crowd/alerts'); }
  async getCrowdHeatmap() { return this._fetch('/crowd/heatmap'); }
  async getCrowdFlow() { return this._fetch('/crowd/flow'); }

  // ─── Navigation ────────────────────────────────────────────────────
  async getNavLocations() { return this._fetch('/navigation/locations'); }
  async getNavFloors() { return this._fetch('/navigation/floors'); }
  async getRoute(from, to, preferences) {
    return this._fetch('/navigation/route', {
      method: 'POST',
      body: JSON.stringify({ from, to, preferences })
    });
  }
  async getAccessibility() { return this._fetch('/navigation/accessibility'); }

  // ─── Transport ─────────────────────────────────────────────────────
  async getTransportOptions() { return this._fetch('/transport/options'); }
  async predictTravel(mode, destination) {
    return this._fetch('/transport/predict', {
      method: 'POST',
      body: JSON.stringify({ mode, destination })
    });
  }
  async getParkingStatus() { return this._fetch('/transport/parking'); }

  // ─── Sustainability ────────────────────────────────────────────────
  async getEcoMetrics() { return this._fetch('/sustainability/metrics'); }
  async getCarbonTimeline() { return this._fetch('/sustainability/carbon-timeline'); }
  async getEcoGoals() { return this._fetch('/sustainability/goals'); }

  // ─── Operations ────────────────────────────────────────────────────
  async getOperationsDashboard() { return this._fetch('/operations/dashboard'); }
  async getIncidents() { return this._fetch('/operations/incidents'); }
  async createIncident(data) {
    return this._fetch('/operations/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  async updateIncident(id, data) {
    return this._fetch(`/operations/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  async getStaff() { return this._fetch('/operations/staff'); }
  async getSchedule() { return this._fetch('/operations/schedule'); }
}

export const api = new ApiClient();
