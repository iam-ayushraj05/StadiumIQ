/**
 * Navigation Route — Smart indoor navigation for stadium
 * AI-powered pathfinding with accessibility and crowd-avoidance
 */

import { Router } from 'express';

const router = Router();

// ─── Location Database ───────────────────────────────────────────────────────
const LOCATIONS = {
  'entrance-a': { name: 'Main Entrance A', floor: 0, x: 50, y: 90, type: 'entrance', accessible: true },
  'entrance-b': { name: 'Entrance B (West)', floor: 0, x: 10, y: 50, type: 'entrance', accessible: true },
  'parking-1': { name: 'Parking Lot 1', floor: 0, x: 50, y: 100, type: 'parking', accessible: true },
  'metro': { name: 'Metro Station Exit', floor: 0, x: 30, y: 95, type: 'transport', accessible: true },
  'accessibility-drop': { name: 'Accessibility Drop-off', floor: 0, x: 70, y: 90, type: 'entrance', accessible: true },
  'seat-114': { name: 'Section 114, Row F', floor: 2, x: 65, y: 40, type: 'seating', accessible: false },
  'food-court': { name: 'Food Court Level 2', floor: 2, x: 50, y: 65, type: 'amenity', accessible: true },
  'restroom-accessible': { name: 'Accessible Restroom', floor: 1, x: 45, y: 60, type: 'restroom', accessible: true },
  'first-aid': { name: 'First Aid Station', floor: 1, x: 55, y: 55, type: 'medical', accessible: true },
  'fan-zone': { name: 'Fan Experience Zone', floor: 0, x: 50, y: 20, type: 'amenity', accessible: true },
  'media-center': { name: 'Media Center', floor: 3, x: 80, y: 30, type: 'media', accessible: true }
};

// ─── Simulate AI Pathfinding ─────────────────────────────────────────────────
function calculateRoute(fromId, toId, preferences) {
  const from = LOCATIONS[fromId];
  const to = LOCATIONS[toId];

  if (!from || !to) return null;

  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const floorDiff = Math.abs(to.floor - from.floor);

  let baseDistance = Math.sqrt(dx * dx + dy * dy) * 12; // meters
  let baseTime = Math.round(baseDistance / 80); // avg 80m/min walking speed

  if (preferences?.accessibleRoute) baseTime = Math.round(baseTime * 1.3);
  if (preferences?.avoidCrowds) { baseTime += 2; baseDistance += 150; }
  if (preferences?.shortestPath) { baseTime = Math.round(baseTime * 0.85); baseDistance *= 0.9; }
  if (floorDiff > 0) { baseTime += floorDiff * 2; baseDistance += floorDiff * 80; }

  const congestionLevels = ['Low', 'Medium', 'High'];
  const congestion = congestionLevels[Math.floor(Math.random() * 2)];

  return {
    from: from.name,
    to: to.name,
    fromFloor: from.floor,
    toFloor: to.floor,
    estimatedTime: `${Math.max(1, baseTime)} min`,
    distance: `${Math.round(baseDistance)} m`,
    accessibility: preferences?.accessibleRoute || to.accessible,
    congestion,
    floorsToTraverse: floorDiff,
    waypoints: generateWaypoints(from, to, floorDiff, preferences)
  };
}

function generateWaypoints(from, to, floorDiff, preferences) {
  const waypoints = [];

  if (from.floor === 0 && to.floor > 0) {
    const conveyance = preferences?.accessibleRoute ? 'elevator' : 'escalator';
    waypoints.push({
      type: conveyance,
      name: `Take ${conveyance} to Level ${to.floor}`,
      icon: preferences?.accessibleRoute ? '🛗' : '⬆️'
    });
  }

  if (floorDiff === 0) {
    waypoints.push({ type: 'corridor', name: 'Follow main corridor', icon: '🚶' });
  }

  waypoints.push({ type: 'landmark', name: 'Pass the merchandise store on your left', icon: '🛍️' });
  waypoints.push({ type: 'landmark', name: 'Follow blue floor arrows', icon: '🔵' });

  return waypoints;
}

// ─── GET /api/navigation/locations ──────────────────────────────────────────
router.get('/locations', (_req, res) => {
  const locations = Object.entries(LOCATIONS).map(([id, data]) => ({
    id,
    ...data
  }));
  return res.json({ locations, timestamp: new Date().toISOString() });
});

// ─── GET /api/navigation/floors ─────────────────────────────────────────────
router.get('/floors', (_req, res) => {
  return res.json({
    floors: [
      { level: 0, name: 'Ground Level', facilities: ['Main Entrances', 'Parking', 'Accessibility Drop-off', 'Fan Zone', 'Security Checkpoints'] },
      { level: 1, name: 'Level 1 — Concourse', facilities: ['Food Court A', 'First Aid', 'Restrooms', 'ATMs', 'Information Desk'] },
      { level: 2, name: 'Level 2 — Lower Bowl', facilities: ['Sections 101–130', 'Food Court B', 'VIP Access', 'Merchandise'] },
      { level: 3, name: 'Level 3 — Upper Bowl', facilities: ['Sections 200–240', 'Media Center', 'Premium Lounge', 'Family Section'] }
    ]
  });
});

// ─── POST /api/navigation/route ──────────────────────────────────────────────
router.post('/route', (req, res) => {
  const { from, to, preferences = {} } = req.body;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to location IDs are required.' });
  }

  if (from === to) {
    return res.status(400).json({ error: 'Origin and destination must be different.' });
  }

  const route = calculateRoute(from, to, preferences);

  if (!route) {
    return res.status(404).json({ error: 'Unable to calculate route for given locations.' });
  }

  return res.json({ route, timestamp: new Date().toISOString() });
});

// ─── GET /api/navigation/accessibility ──────────────────────────────────────
router.get('/accessibility', (_req, res) => {
  return res.json({
    features: [
      { id: 'elevators', name: 'Elevators', count: 12, locations: ['Near Gate A', 'Near Gate C', 'Main Lobby', 'Media Center'] },
      { id: 'ramps', name: 'Wheelchair Ramps', count: 24, locations: ['All main entrances and concourse levels'] },
      { id: 'accessible-seating', name: 'Accessible Seating Sections', count: 8, sections: ['102A', '115A', '128A', '204A', '216A'] },
      { id: 'sensory-rooms', name: 'Sensory-Friendly Zones', count: 3, locations: ['Section 102, Level 1 North, Level 2 South'] },
      { id: 'drop-off', name: 'Accessibility Drop-off Points', count: 4, locations: ['North, South, East, West entrances'] },
      { id: 'sign-language', name: 'Sign Language Assistance', available: true, contact: 'Kiosk near Main Entrance or text ACCESS to 72664' }
    ],
    emergencyExits: [
      { id: 'em-1', location: 'Near Gate A — North', distance: '180m from center field', accessible: true },
      { id: 'em-2', location: 'Near Gate B — South', distance: '195m from center field', accessible: true },
      { id: 'em-3', location: 'Level 2 East Side', distance: 'Via stairwell 2E or elevator', accessible: true },
      { id: 'em-4', location: 'Level 3 West Side', distance: 'Via stairwell 3W', accessible: false }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
