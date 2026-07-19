/**
 * Transport Route — Multimodal transportation for FIFA World Cup 2026
 * AI-optimized shuttle scheduling, parking, rideshare, transit coordination
 */

import { Router } from 'express';

const router = Router();

// ─── Transport Data ──────────────────────────────────────────────────────────
const SHUTTLES = [
  {
    id: 'shuttle-downtown',
    name: 'Stadium Express — Downtown',
    route: 'NRG Stadium ↔ Downtown Houston (Discovery Green)',
    frequency: '8 min',
    nextDeparture: getNextDeparture(3),
    capacity: 60,
    currentLoad: Math.round(40 + Math.random() * 20),
    stops: ['NRG North Lot', 'Main St & Texas Ave', 'Discovery Green'],
    accessibility: true,
    type: 'shuttle',
    icon: '🚌',
    color: '#00b4d8'
  },
  {
    id: 'shuttle-medcenter',
    name: 'Med Center Connector',
    route: 'NRG Stadium ↔ Texas Medical Center',
    frequency: '12 min',
    nextDeparture: getNextDeparture(7),
    capacity: 45,
    currentLoad: Math.round(20 + Math.random() * 15),
    stops: ['NRG South Lot', 'Fannin St', 'TMC Transit Center'],
    accessibility: true,
    type: 'shuttle',
    icon: '🚌',
    color: '#06d6a0'
  },
  {
    id: 'metro-redline',
    name: 'METRORail Red Line',
    route: 'NRG Station ↔ Main St Square',
    frequency: '6 min',
    nextDeparture: getNextDeparture(2),
    capacity: 200,
    currentLoad: Math.round(150 + Math.random() * 50),
    stops: ['NRG/Kirby', 'Dryden/TMC', 'Greenbriar/Shepherd', 'Main Street Square'],
    accessibility: true,
    type: 'metro',
    icon: '🚈',
    color: '#e63946'
  },
  {
    id: 'rideshare-zone',
    name: 'Rideshare Pick-up Zone',
    route: 'Uber / Lyft designated zone — Lot F',
    frequency: 'On-demand',
    nextDeparture: 'Now',
    capacity: null,
    currentLoad: null,
    stops: ['Lot F — East Entrance', 'App navigation required'],
    accessibility: true,
    type: 'rideshare',
    icon: '🚗',
    color: '#f77f00',
    waitTime: `${Math.round(4 + Math.random() * 8)} min`
  },
  {
    id: 'parking-north',
    name: 'Parking — North Garage',
    route: 'NRG North — Covered Garage',
    frequency: null,
    nextDeparture: null,
    capacity: 3500,
    currentLoad: Math.round(3100 + Math.random() * 300),
    stops: null,
    accessibility: true,
    type: 'parking',
    icon: '🅿️',
    color: '#7b2d8b',
    availableSpaces: Math.round(200 + Math.random() * 100)
  },
  {
    id: 'bike-share',
    name: 'BCycle Bike Share',
    route: 'Nearby BCycle stations',
    frequency: 'On-demand',
    nextDeparture: 'Available now',
    capacity: 30,
    currentLoad: Math.round(8 + Math.random() * 10),
    stops: ['NRG East Gate', 'Kirby & Greenbriar', 'Main St @ Elgin'],
    accessibility: false,
    type: 'cycling',
    icon: '🚴',
    color: '#2dc653',
    availableBikes: Math.round(12 + Math.random() * 8)
  }
];

function getNextDeparture(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ─── Travel Time Predictions ─────────────────────────────────────────────────
const DESTINATIONS = {
  downtown: { name: 'Downtown Houston', distances: { shuttle: 25, metro: 18, rideshare: 15, walking: 90, cycling: 35, parking: 20 } },
  airport: { name: 'IAH Airport', distances: { shuttle: 65, metro: null, rideshare: 45, walking: null, cycling: null, parking: 50 } },
  'hotel-district': { name: 'Hotel District', distances: { shuttle: 20, metro: 22, rideshare: 12, walking: 60, cycling: 28, parking: 16 } },
  convention: { name: 'Convention Center', distances: { shuttle: 30, metro: 25, rideshare: 20, walking: null, cycling: 45, parking: 25 } },
  'fan-fest': { name: 'Fan Fest Site', distances: { shuttle: 15, metro: null, rideshare: 10, walking: null, cycling: null, parking: 12 } }
};

// ─── GET /api/transport/options ──────────────────────────────────────────────
router.get('/options', (_req, res) => {
  // Refresh dynamic values
  const options = SHUTTLES.map(s => ({
    ...s,
    nextDeparture: s.nextDeparture === 'Now' || s.nextDeparture === 'Available now'
      ? s.nextDeparture
      : getNextDeparture(Math.round(2 + Math.random() * 10)),
    currentLoad: s.currentLoad !== null ? Math.min(s.capacity, Math.max(0, s.currentLoad + Math.round((Math.random() - 0.5) * 5))) : null
  }));

  return res.json({ options, timestamp: new Date().toISOString() });
});

// ─── POST /api/transport/predict ─────────────────────────────────────────────
router.post('/predict', (req, res) => {
  const { mode, destination } = req.body;

  if (!mode || !destination) {
    return res.status(400).json({ error: 'mode and destination are required.' });
  }

  const dest = DESTINATIONS[destination];
  if (!dest) {
    return res.status(404).json({ error: 'Unknown destination.' });
  }

  const baseTime = dest.distances[mode];

  if (!baseTime) {
    return res.json({
      mode, destination: dest.name,
      available: false,
      message: `${mode} is not available to ${dest.name}`,
      alternatives: Object.entries(dest.distances)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => ({ mode: k, estimatedMinutes: v }))
    });
  }

  // Add game-day congestion factor
  const congestionMultiplier = 1 + (Math.random() * 0.3);
  const adjustedTime = Math.round(baseTime * congestionMultiplier);
  const congestionLevel = congestionMultiplier > 1.2 ? 'High' : congestionMultiplier > 1.1 ? 'Moderate' : 'Low';

  const modeInfo = {
    shuttle: { cost: 'Free', eco: 'Low Carbon', tips: 'Show your match ticket for free rides' },
    metro: { cost: '$2.50', eco: 'Lowest Carbon', tips: 'Tap your contactless card at the turnstile' },
    rideshare: { cost: '$15-30', eco: 'Moderate Carbon', tips: 'Use the designated Lot F pick-up zone' },
    walking: { cost: 'Free', eco: 'Zero Carbon', tips: 'Comfortable shoes recommended. Follow green-lit path markers' },
    cycling: { cost: '$3.50 (BCycle)', eco: 'Zero Carbon', tips: 'Helmet provided at station. Lock at destination rack' },
    parking: { cost: '$45-65', eco: 'High Carbon', tips: 'Pre-book online to guarantee your spot' }
  };

  return res.json({
    mode,
    destination: dest.name,
    available: true,
    estimatedMinutes: adjustedTime,
    baseMinutes: baseTime,
    congestionLevel,
    congestionDelay: adjustedTime - baseTime,
    ...modeInfo[mode],
    departNow: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    arrivalTime: (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() + adjustedTime);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    })(),
    alternatives: Object.entries(dest.distances)
      .filter(([k, v]) => v !== null && k !== mode)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2)
      .map(([k, v]) => ({ mode: k, estimatedMinutes: Math.round(v * (1 + Math.random() * 0.2)) })),
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/transport/parking ──────────────────────────────────────────────
router.get('/parking', (_req, res) => {
  return res.json({
    lots: [
      { id: 'north', name: 'North Garage', total: 3500, available: Math.round(150 + Math.random() * 100), type: 'covered', ev: true, accessible: true, cost: '$45' },
      { id: 'south', name: 'South Lot', total: 4200, available: Math.round(80 + Math.random() * 50), type: 'surface', ev: false, accessible: true, cost: '$35' },
      { id: 'east', name: 'East Overflow', total: 2000, available: Math.round(600 + Math.random() * 200), type: 'surface', ev: false, accessible: false, cost: '$25' },
      { id: 'vip', name: 'VIP / Permit Only', total: 800, available: Math.round(50 + Math.random() * 30), type: 'covered', ev: true, accessible: true, cost: 'Permit' }
    ],
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/transport/status ───────────────────────────────────────────────
router.get('/status', (_req, res) => {
  return res.json({
    overall: 'operational',
    incidents: [
      { type: 'delay', service: 'METRORail Red Line', detail: 'Minor delay — 3 min late. Normal service resumed.', severity: 'low' }
    ],
    crowdExitEstimate: '45-60 min post-match',
    recommendedDeparture: 'Leave 15 min before full-time for best exit times',
    timestamp: new Date().toISOString()
  });
});

export default router;
