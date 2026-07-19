/**
 * Operations Route — Venue Staff & Organizer Intelligence
 * Staff dashboards, incident management, resource allocation
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ─── In-memory Incident Store (demo) ────────────────────────────────────────
const incidents = [
  {
    id: uuidv4(), type: 'medical', severity: 'moderate',
    location: 'Section 115, Row J, Seat 8', status: 'active',
    description: 'Fan reported feeling unwell. First aid dispatched.',
    assignedTo: 'Medic Unit 3', reportedAt: new Date(Date.now() - 420000).toISOString()
  },
  {
    id: uuidv4(), type: 'security', severity: 'low',
    location: 'Gate B — South Turnstile', status: 'resolved',
    description: 'Ticket scanner malfunction. Manual verification in progress.',
    assignedTo: 'Gate Manager', reportedAt: new Date(Date.now() - 900000).toISOString()
  },
  {
    id: uuidv4(), type: 'crowd', severity: 'high',
    location: 'Food Court A', status: 'active',
    description: 'Critical density detected. AI recommends closing service window 4.',
    assignedTo: 'Crowd Management Team', reportedAt: new Date(Date.now() - 180000).toISOString()
  }
];

// ─── Staff Assignments ───────────────────────────────────────────────────────
const staffData = {
  total: 3400,
  byRole: [
    { role: 'Security', count: 850, onDuty: 820, zones: ['All Gates', 'Concourses', 'Parking'] },
    { role: 'Medical Staff', count: 120, onDuty: 118, zones: ['6 First Aid Stations', 'Seating Aisles'] },
    { role: 'Ushers / Guest Services', count: 680, onDuty: 672, zones: ['Seating Sections', 'Concourses'] },
    { role: 'Volunteers', count: 1200, onDuty: 1180, zones: ['All Areas', 'Fan Zones', 'Transport Hubs'] },
    { role: 'Cleaning Crew', count: 300, onDuty: 295, zones: ['All Levels', 'Restrooms', 'Concourses'] },
    { role: 'Transport Coordinators', count: 150, onDuty: 148, zones: ['Parking Lots', 'Shuttle Zones', 'Metro'] },
    { role: 'Media / Broadcast', count: 100, onDuty: 98, zones: ['Press Box', 'Media Center', 'Pitchside'] }
  ]
};

// ─── GET /api/operations/dashboard ───────────────────────────────────────────
router.get('/dashboard', (_req, res) => {
  const activeIncidents = incidents.filter(i => i.status === 'active').length;

  return res.json({
    stadium: 'NRG Stadium — Houston',
    matchDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    matchTime: '19:00 CT',
    matchDetails: { home: 'USA', away: 'Brazil', competition: 'FIFA World Cup 2026 — Group Stage' },
    operationalStatus: 'normal',
    kpis: {
      attendance: { current: 68450, capacity: 72220, occupancy: 94.8 },
      staffOnDuty: 3331,
      totalStaff: 3400,
      activeIncidents,
      resolvedToday: 12,
      avgResponseTime: '3.2 min',
      fanSatisfactionScore: 4.7
    },
    alerts: {
      critical: incidents.filter(i => i.severity === 'high' && i.status === 'active').length,
      moderate: incidents.filter(i => i.severity === 'moderate' && i.status === 'active').length,
      info: 2
    },
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/operations/incidents ───────────────────────────────────────────
router.get('/incidents', (_req, res) => {
  return res.json({
    incidents,
    summary: {
      total: incidents.length,
      active: incidents.filter(i => i.status === 'active').length,
      resolved: incidents.filter(i => i.status === 'resolved').length
    },
    timestamp: new Date().toISOString()
  });
});

// ─── POST /api/operations/incidents ──────────────────────────────────────────
router.post('/incidents', (req, res) => {
  const { type, severity, location, description, assignedTo } = req.body;

  if (!type || !severity || !location || !description) {
    return res.status(400).json({ error: 'type, severity, location, and description are required.' });
  }

  const allowedTypes = ['medical', 'security', 'crowd'];
  const allowedSeverities = ['low', 'moderate', 'high', 'critical'];

  if (!allowedTypes.includes(type) || !allowedSeverities.includes(severity)) {
    return res.status(400).json({ error: 'Invalid incident type or severity.' });
  }

  const cleanLocation = sanitizeInput(location);
  const cleanDescription = sanitizeInput(description);
  const cleanAssignedTo = sanitizeInput(assignedTo || 'Unassigned');

  const incident = {
    id: uuidv4(),
    type,
    severity,
    location: cleanLocation,
    status: 'active',
    description: cleanDescription,
    assignedTo: cleanAssignedTo,
    reportedAt: new Date().toISOString()
  };

  incidents.unshift(incident);

  return res.status(201).json({ incident, message: 'Incident created and teams notified.', timestamp: new Date().toISOString() });
});

// ─── PUT /api/operations/incidents/:id ───────────────────────────────────────
router.put('/incidents/:id', (req, res) => {
  const { id } = req.params;
  const { status, assignedTo } = req.body;

  const idx = incidents.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Incident not found.' });

  const allowedStatuses = ['active', 'resolved'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  if (status) incidents[idx].status = status;
  if (assignedTo) incidents[idx].assignedTo = sanitizeInput(assignedTo);
  incidents[idx].updatedAt = new Date().toISOString();

  return res.json({ incident: incidents[idx], timestamp: new Date().toISOString() });
});

// ─── GET /api/operations/staff ───────────────────────────────────────────────
router.get('/staff', (_req, res) => {
  return res.json({ ...staffData, timestamp: new Date().toISOString() });
});

// ─── GET /api/operations/schedule ────────────────────────────────────────────
router.get('/schedule', (_req, res) => {
  const now = new Date();
  return res.json({
    events: [
      { time: '14:00', event: 'Gates Open', priority: 'high', status: 'completed' },
      { time: '16:00', event: 'Fan Zone Activation', priority: 'medium', status: 'completed' },
      { time: '17:30', event: 'Team Warmup on Pitch', priority: 'medium', status: 'completed' },
      { time: '18:00', event: 'Pre-match Entertainment', priority: 'low', status: 'active' },
      { time: '18:30', event: 'National Anthems & Ceremony', priority: 'high', status: 'upcoming' },
      { time: '19:00', event: 'Kick Off — USA vs Brazil', priority: 'critical', status: 'upcoming' },
      { time: '19:45', event: 'Half Time', priority: 'high', status: 'upcoming' },
      { time: '20:30', event: 'Second Half', priority: 'critical', status: 'upcoming' },
      { time: '21:15', event: 'Full Time — Exit Operations Begin', priority: 'high', status: 'upcoming' },
      { time: '21:30', event: 'Post-match Fan Management', priority: 'critical', status: 'upcoming' }
    ],
    currentTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    timestamp: now.toISOString()
  });
});

export default router;
