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
