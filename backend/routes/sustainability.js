/**
 * Sustainability Route — Eco Intelligence for FIFA World Cup 2026
 * Real-time environmental KPIs, carbon tracking, waste management AI
 */

import { Router } from 'express';

const router = Router();

// ─── Simulate Live Eco Metrics ───────────────────────────────────────────────
function getEcoMetrics() {
  const baseEnergy = 18500; // kWh
  const baseSolar = 4200;   // kWh generated

  return {
    energy: {
      consumed: Math.round(baseEnergy + (Math.random() - 0.5) * 1000),
      renewable: Math.round(baseSolar + (Math.random() - 0.5) * 200),
      unit: 'kWh',
      renewablePercent: Math.round((baseSolar / baseEnergy) * 100)
    },
    carbon: {
      total: Math.round(85 + Math.random() * 10),
      perFan: parseFloat((1.2 + Math.random() * 0.3).toFixed(2)),
      unit: 'tCO₂',
      vsTarget: -12, // 12% below target
      breakdown: {
        transport: 48,
        energy: 22,
        waste: 10,
        food: 15,
        other: 5
      }
    },
    waste: {
      totalKg: Math.round(4800 + Math.random() * 400),
      recycledKg: Math.round(3100 + Math.random() * 200),
      compostedKg: Math.round(800 + Math.random() * 100),
      landfillKg: Math.round(600 + Math.random() * 100),
      recycleRate: Math.round(64 + Math.random() * 8),
      unit: 'kg'
    },
    water: {
      consumed: Math.round(285000 + Math.random() * 20000),
      recycled: Math.round(85000 + Math.random() * 5000),
      unit: 'L',
      recycleRate: Math.round(29 + Math.random() * 5)
    },
    transport: {
      totalFans: Math.round(68000 + Math.random() * 500),
      byPublicTransit: 55,
      byShuttle: 18,
      byPrivateCar: 22,
      byWalkingCycling: 5,
      carsAvoided: Math.round(8400 + Math.random() * 200),
      co2Avoided: Math.round(31 + Math.random() * 3),
      unit: 'tCO₂'
    },
    food: {
      totalMealsServed: Math.round(52000 + Math.random() * 3000),
      plantBasedMeals: Math.round(18000 + Math.random() * 1000),
      localSourcingPercent: 68,
      foodWasteKg: Math.round(280 + Math.random() * 40),
      composted: 82
    }
  };
}

// ─── GET /api/sustainability/metrics ────────────────────────────────────────
router.get('/metrics', (_req, res) => {
  return res.json({
    metrics: getEcoMetrics(),
    stadium: 'NRG Stadium — Houston',
    event: 'FIFA World Cup 2026',
    matchDay: true,
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/sustainability/carbon-timeline ─────────────────────────────────
router.get('/carbon-timeline', (_req, res) => {
  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = 8 + i;
    return {
      hour: `${h}:00`,
      carbon: Math.round(3 + Math.random() * 8 + (h > 14 && h < 21 ? 10 : 0)),
      energy: Math.round(800 + Math.random() * 400 + (h > 14 && h < 21 ? 600 : 0)),
      fans: h >= 15 ? Math.round(5000 * (h - 14)) : Math.round(1000 + Math.random() * 500)
    };
  });

  return res.json({ timeline: hours, unit: { carbon: 'kg CO₂', energy: 'kWh' }, timestamp: new Date().toISOString() });
});

// ─── GET /api/sustainability/goals ───────────────────────────────────────────
router.get('/goals', (_req, res) => {
  return res.json({
    tournament: {
      title: 'FIFA World Cup 2026 — Net Zero Commitment',
      targets: [
        { category: 'Carbon Neutral', target: '100% offset', current: '87% achieved', status: 'on-track' },
        { category: 'Renewable Energy', target: '75% renewable', current: '42% achieved', status: 'needs-attention' },
        { category: 'Zero Waste to Landfill', target: '< 5% landfill', current: '12% landfill', status: 'needs-attention' },
        { category: 'Sustainable Transport', target: '70% non-car', current: '78% non-car', status: 'exceeded' },
        { category: 'Local Food Sourcing', target: '60% local', current: '68% local', status: 'exceeded' },
        { category: 'Water Conservation', target: '30% recycled', current: '29% recycled', status: 'on-track' }
      ]
    },
    venue: {
      name: 'NRG Stadium',
      certification: 'LEED Platinum',
      solarPanels: 4200,
      solarCapacity: '2.1 MW',
      evChargers: 120,
      rainwaterHarvesting: true
    },
    timestamp: new Date().toISOString()
  });
});

// ─── GET /api/sustainability/waste-zones ────────────────────────────────────
router.get('/waste-zones', (_req, res) => {
  const zones = ['Main Entrance', 'Concourse L1', 'Concourse L2', 'Food Court A', 'Food Court B', 'Seating Bowl', 'Parking Areas'];
  return res.json({
    zones: zones.map((name, i) => ({
      id: `zone-${i}`,
      name,
      bins: {
        general: { capacity: 100, fillLevel: Math.round(40 + Math.random() * 55) },
        recycling: { capacity: 100, fillLevel: Math.round(50 + Math.random() * 45) },
        compost: { capacity: 100, fillLevel: Math.round(30 + Math.random() * 60) }
      },
      needsCollection: Math.random() > 0.6
    })),
    timestamp: new Date().toISOString()
  });
});

export default router;
