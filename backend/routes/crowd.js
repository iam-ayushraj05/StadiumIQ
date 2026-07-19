/**
 * Crowd Intelligence Route — Real-time crowd simulation data
 * Simulates IoT sensor feeds for FIFA World Cup 2026 stadium crowd management
 */

import { Router } from 'express';

const router = Router();

// ─── Stadium Zone Definitions ────────────────────────────────────────────────
const STADIUM_ZONES = [
  { id: 'main-entrance', name: 'Main Entrance', type: 'entrance', baseCapacity: 2000 },
  { id: 'gate-a', name: 'Gate A — North', type: 'gate', baseCapacity: 1500 },
  { id: 'gate-b', name: 'Gate B — South', type: 'gate', baseCapacity: 1500 },
  { id: 'gate-c', name: 'Gate C — East', type: 'gate', baseCapacity: 1200 },
  { id: 'gate-d', name: 'Gate D — West', type: 'gate', baseCapacity: 1200 },
  { id: 'concourse-l1', name: 'Concourse Level 1', type: 'concourse', baseCapacity: 8000 },
  { id: 'concourse-l2', name: 'Concourse Level 2', type: 'concourse', baseCapacity: 6000 },
  { id: 'concourse-l3', name: 'Concourse Level 3', type: 'concourse', baseCapacity: 4000 },
  { id: 'food-court-a', name: 'Food Court A', type: 'amenity', baseCapacity: 3000 },
  { id: 'food-court-b', name: 'Food Court B', type: 'amenity', baseCapacity: 2500 },
  { id: 'merchandise', name: 'Merchandise Hub', type: 'amenity', baseCapacity: 1800 },
  { id: 'seating-north', name: 'Seating — North', type: 'seating', baseCapacity: 18000 },
  { id: 'seating-south', name: 'Seating — South', type: 'seating', baseCapacity: 18000 },
  { id: 'seating-east', name: 'Seating — East', type: 'seating', baseCapacity: 16000 },
  { id: 'seating-west', name: 'Seating — West', type: 'seating', baseCapacity: 16000 },
  { id: 'vip-lounge', name: 'VIP Lounge', type: 'vip', baseCapacity: 500 },
  { id: 'media-center', name: 'Media Center', type: 'media', baseCapacity: 300 },
  { id: 'first-aid', name: 'First Aid Zone', type: 'safety', baseCapacity: 100 },
  { id: 'parking-north', name: 'Parking — North', type: 'parking', baseCapacity: 5000 },
  { id: 'parking-south', name: 'Parking — South', type: 'parking', baseCapacity: 4500 }
];

// ─── Simulate Real-time Density ──────────────────────────────────────────────
function simulateDensity(zone) {
  const hour = new Date().getHours();
  let baseFill;

  // Time-based crowd patterns (game day simulation)
  if (hour >= 16 && hour <= 18) {
    baseFill = zone.type === 'entrance' || zone.type === 'gate' ? 0.85 : 0.70;
  } else if (hour >= 19 && hour <= 21) {
    baseFill = zone.type === 'seating' ? 0.96 : 0.60;
  } else if (hour >= 22 || hour <= 8) {
    baseFill = 0.1;
  } else {
    baseFill = 0.45;
  }

  // Add realistic noise
  const noise = (Math.random() - 0.5) * 0.15;
  const fill = Math.max(0.05, Math.min(1.0, baseFill + noise));
  const current = Math.round(fill * zone.baseCapacity);

  let density;
  if (fill < 0.5) density = 'low';
  else if (fill < 0.75) density = 'medium';
  else if (fill < 0.9) density = 'high';
  else density = 'critical';

  return {
    ...zone,
    currentOccupancy: current,
    fillPercentage: Math.round(fill * 100),
    density,
    trend: Math.random() > 0.5 ? 'increasing' : 'stable',
    alertThreshold: fill > 0.85,
    lastUpdated: new Date().toISOString()
  };
}

// ─── GET /api/crowd/zones ────────────────────────────────────────────────────
router.get('/zones', (_req, res) => {
  const zones = STADIUM_ZONES.map(simulateDensity);
  const totalCapacity = STADIUM_ZONES.reduce((s, z) => s + z.baseCapacity, 0);
  const totalCurrent = zones.reduce((s, z) => s + z.currentOccupancy, 0);
  const criticalZones = zones.filter(z => z.density === 'critical');

  return res.json({
    zones,
    summary: {
      totalCapacity,
      currentAttendance: Math.min(totalCurrent, totalCapacity),
      occupancyRate: Math.round((totalCurrent / totalCapacity) * 100),
      criticalZones: criticalZones.length,
      alertCount: zones.filter(z => z.alertThreshold).length
    },
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/crowd/alerts ───────────────────────────────────────────────────
router.get('/alerts', (_req, res) => {
  const alerts = [];
  const zones = STADIUM_ZONES.map(simulateDensity);

  zones.forEach(zone => {
    if (zone.density === 'critical') {
      alerts.push({
        id: `alert-${zone.id}-${Date.now()}`,
        severity: 'critical',
        zone: zone.name,
        zoneId: zone.id,
        message: `🚨 CRITICAL: ${zone.name} at ${zone.fillPercentage}% capacity. Immediate action required.`,
        recommendation: 'Redirect incoming crowd. Open overflow routes.',
        timestamp: new Date().toISOString()
      });
    } else if (zone.density === 'high' && zone.trend === 'increasing') {
      alerts.push({
        id: `alert-${zone.id}-${Date.now()}`,
        severity: 'warning',
        zone: zone.name,
        zoneId: zone.id,
        message: `⚠️ WARNING: ${zone.name} increasing rapidly (${zone.fillPercentage}%).`,
        recommendation: 'Monitor closely. Prepare contingency routing.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Always add a few static operational alerts
  alerts.push({
    id: 'alert-ops-1',
    severity: 'info',
    zone: 'Gate B',
    zoneId: 'gate-b',
    message: '🔧 Maintenance: Gate B south scanner temporarily offline.',
    recommendation: 'Redirect to Gate A or Gate C.',
    timestamp: new Date().toISOString()
  });

  return res.json({
    alerts: alerts.slice(0, 10),
    count: alerts.length,
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/crowd/heatmap ──────────────────────────────────────────────────
router.get('/heatmap', (_req, res) => {
  const gridSize = 10;
  const heatmap = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Stadium shape - higher density toward center/edges (stands)
      const distFromEdge = Math.min(row, col, gridSize - 1 - row, gridSize - 1 - col) / (gridSize / 2);
      const distFromCenter = Math.sqrt(Math.pow(row - 4.5, 2) + Math.pow(col - 4.5, 2)) / 6;
      const isField = distFromCenter < 1.5;

      const density = isField ? 0 : Math.max(0, (1 - distFromEdge * 0.5) * (0.6 + Math.random() * 0.4));

      heatmap.push({
        row, col,
        density: isField ? 0 : Math.round(density * 100),
        isField
      });
    }
  }

  return res.json({ heatmap, gridSize, timestamp: new Date().toISOString() });
});

// ─── GET /api/crowd/flow ─────────────────────────────────────────────────────
router.get('/flow', (_req, res) => {
  const flowData = [
    { from: 'Parking North', to: 'Gate A', rate: Math.round(800 + Math.random() * 400), unit: 'people/hr' },
    { from: 'Parking South', to: 'Gate D', rate: Math.round(600 + Math.random() * 300), unit: 'people/hr' },
    { from: 'Metro Station', to: 'Main Entrance', rate: Math.round(1200 + Math.random() * 500), unit: 'people/hr' },
    { from: 'Shuttle Drop-off', to: 'Gate C', rate: Math.round(450 + Math.random() * 200), unit: 'people/hr' },
    { from: 'Gate A', to: 'Concourse L1', rate: Math.round(700 + Math.random() * 300), unit: 'people/hr' },
    { from: 'Concourse L1', to: 'Food Court A', rate: Math.round(400 + Math.random() * 150), unit: 'people/hr' },
    { from: 'Concourse L1', to: 'Seating North', rate: Math.round(900 + Math.random() * 200), unit: 'people/hr' }
  ];

  return res.json({ flows: flowData, timestamp: new Date().toISOString() });
});

export default router;
