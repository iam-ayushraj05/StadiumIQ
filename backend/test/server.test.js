import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';

let server;
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
});

test('GET /health returns 200 and health info', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'StadiumIQ API');
});

test('GET /api/crowd/zones returns zones and occupancy summary', async () => {
  const res = await fetch(`${BASE_URL}/api/crowd/zones`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.zones));
  assert.ok(data.summary.totalCapacity > 0);
  assert.ok(data.summary.currentAttendance >= 0);
});

test('GET /api/crowd/alerts returns alerts list', async () => {
  const res = await fetch(`${BASE_URL}/api/crowd/alerts`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.alerts));
  assert.ok(data.count >= 0);
});

test('GET /api/navigation/locations returns venue coordinates', async () => {
  const res = await fetch(`${BASE_URL}/api/navigation/locations`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.locations));
  const entrance = data.locations.find(l => l.id === 'entrance-a');
  assert.ok(entrance);
  assert.equal(entrance.floor, 0);
});

test('POST /api/navigation/route returns calculated pathway coordinates', async () => {
  const res = await fetch(`${BASE_URL}/api/navigation/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'entrance-a',
      to: 'seat-114',
      preferences: { accessibleRoute: true }
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.route);
  assert.equal(data.route.from, 'Main Entrance A');
  assert.equal(data.route.to, 'Section 114, Row F');
});

test('POST /api/navigation/route returns 400 for identical locations', async () => {
  const res = await fetch(`${BASE_URL}/api/navigation/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'entrance-a',
      to: 'entrance-a'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error);
});

test('GET /api/operations/incidents returns logs', async () => {
  const res = await fetch(`${BASE_URL}/api/operations/incidents`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.incidents));
  assert.ok(data.summary.total >= 0);
});

test('POST /api/operations/incidents validates, sanitizes, and inserts log', async () => {
  const mockPayload = {
    type: 'medical',
    severity: 'high',
    location: 'Section 110 <script>alert(1)</script>',
    description: 'Heat exhaustion',
    assignedTo: 'Medic Team A'
  };

  const res = await fetch(`${BASE_URL}/api/operations/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload)
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.incident);
  // Verify sanitization
  assert.ok(!data.incident.location.includes('<script>'));
  assert.ok(data.incident.location.includes('&lt;script&gt;'));
});

test('POST /api/operations/incidents returns 400 for invalid severity', async () => {
  const mockPayload = {
    type: 'medical',
    severity: 'super-critical',
    location: 'Gate A',
    description: 'Debris'
  };

  const res = await fetch(`${BASE_URL}/api/operations/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload)
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid'));
});

test('POST /api/ai/chat returns 400 for long message', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'a'.repeat(501)
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('limit'));
});

test('POST /api/ai/translate returns 400 for unsupported language', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello',
      targetLanguage: 'xyz'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Unsupported'));
});

test('GET /api/operations/dashboard returns operational status', async () => {
  const res = await fetch(`${BASE_URL}/api/operations/dashboard`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.stadium);
  assert.ok(data.kpis);
});

test('GET /api/operations/staff returns staff count data', async () => {
  const res = await fetch(`${BASE_URL}/api/operations/staff`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.total);
  assert.ok(Array.isArray(data.byRole));
});

test('GET /api/operations/schedule returns list of events', async () => {
  const res = await fetch(`${BASE_URL}/api/operations/schedule`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.events));
});

test('PUT /api/operations/incidents/:id updates incident status', async () => {
  // First get an incident ID
  const getRes = await fetch(`${BASE_URL}/api/operations/incidents`);
  const getData = await getRes.json();
  const testIncident = getData.incidents[0];
  assert.ok(testIncident);

  const res = await fetch(`${BASE_URL}/api/operations/incidents/${testIncident.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.incident.status, 'resolved');
});

test('GET /api/sustainability/metrics returns environmental metrics', async () => {
  const res = await fetch(`${BASE_URL}/api/sustainability/metrics`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.metrics);
  assert.ok(data.metrics.energy);
});

test('GET /api/sustainability/carbon-timeline returns hourly emissions', async () => {
  const res = await fetch(`${BASE_URL}/api/sustainability/carbon-timeline`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.timeline));
});

test('GET /api/sustainability/goals returns tournament zero commitment targets', async () => {
  const res = await fetch(`${BASE_URL}/api/sustainability/goals`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.tournament);
  assert.ok(data.venue);
});

test('GET /api/sustainability/waste-zones returns waste collection capacity data', async () => {
  const res = await fetch(`${BASE_URL}/api/sustainability/waste-zones`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.zones));
});

test('GET /api/transport/options returns multimodal transport choices', async () => {
  const res = await fetch(`${BASE_URL}/api/transport/options`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.options));
});

test('POST /api/transport/predict returns travel duration estimates', async () => {
  const res = await fetch(`${BASE_URL}/api/transport/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'shuttle',
      destination: 'downtown'
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.mode, 'shuttle');
  assert.ok(data.available);
  assert.ok(data.estimatedMinutes > 0);
});

test('POST /api/transport/predict returns 404 for unknown destination', async () => {
  const res = await fetch(`${BASE_URL}/api/transport/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'shuttle',
      destination: 'mars'
    })
  });
  assert.equal(res.status, 404);
});

test('GET /api/transport/parking returns parking lot fill states', async () => {
  const res = await fetch(`${BASE_URL}/api/transport/parking`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.lots));
});

test('GET /api/transport/status returns overall operational status', async () => {
  const res = await fetch(`${BASE_URL}/api/transport/status`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.overall, 'operational');
});

test('POST /api/ai/chat returns mock/fallback AI reply when key is absent', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Where is parking?',
      stadium: 'nrg',
      role: 'fan',
      language: 'en'
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.response);
  assert.ok(data.agentExecution);
});

test('POST /api/ai/translate returns 500 or fallback or mock without key', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Hello',
      targetLanguage: 'es'
    })
  });
  // Since key is absent, translate route returns 500
  assert.equal(res.status, 500);
});

test('POST /api/ai/crowd-analysis returns recommendations', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/crowd-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      crowdData: { occupancy: 0.9 }
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.recommendations));
});

test('POST /api/ai/route-description returns pathway directions', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/route-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Gate A',
      to: 'Section 112',
      preferences: { accessibleRoute: true }
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.steps));
});

test('POST /api/ai/sustainability-report returns eco advice', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/sustainability-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ecoData: { energy: 100 }
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.recommendations));
});

test('GET /api/ai/models returns available models list', async () => {
  const res = await fetch(`${BASE_URL}/api/ai/models`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.available));
});
