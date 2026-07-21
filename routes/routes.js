const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { all, get, run } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { sendEmail, guardianCheckpointHTML } = require('../utils/email');

const ROUTE_CITIES = [
  { name: 'Abilene', lat: 32.449, lon: -99.732 },
  { name: 'Alvin', lat: 29.424, lon: -95.244 },
  { name: 'Amarillo', lat: 35.222, lon: -101.831 },
  { name: 'Allen', lat: 33.103, lon: -96.670 },
  { name: 'Alvarado', lat: 32.407, lon: -97.212 },
  { name: 'Angleton', lat: 29.166, lon: -95.431 },
  { name: 'Anna', lat: 33.350, lon: -96.547 },
  { name: 'Arlington', lat: 32.736, lon: -97.108 },
  { name: 'Athens', lat: 32.204, lon: -95.856 },
  { name: 'Austin', lat: 30.267, lon: -97.743 },
  { name: 'Bay City', lat: 29.983, lon: -95.969 },
  { name: 'Baytown', lat: 29.751, lon: -94.977 },
  { name: 'Beaumont', lat: 30.086, lon: -94.102 },
  { name: 'Bee Cave', lat: 30.309, lon: -97.941 },
  { name: 'Beeville', lat: 28.401, lon: -97.749 },
  { name: 'Bedford', lat: 32.844, lon: -97.143 },
  { name: 'Benbrook', lat: 32.679, lon: -97.464 },
  { name: 'Brenham', lat: 30.167, lon: -96.397 },
  { name: 'Brownsville', lat: 25.902, lon: -97.497 },
  { name: 'Brownwood', lat: 31.709, lon: -98.991 },
  { name: 'Bryan', lat: 30.674, lon: -96.370 },
  { name: 'Buda', lat: 30.085, lon: -97.841 },
  { name: 'Burleson', lat: 32.542, lon: -97.321 },
  { name: 'Carrollton', lat: 32.976, lon: -96.890 },
  { name: 'Cedar Hill', lat: 32.589, lon: -96.956 },
  { name: 'Cedar Park', lat: 30.505, lon: -97.820 },
  { name: 'Celina', lat: 33.318, lon: -96.787 },
  { name: 'College Station', lat: 30.628, lon: -96.334 },
  { name: 'Conroe', lat: 30.312, lon: -95.456 },
  { name: 'Coppell', lat: 32.955, lon: -97.015 },
  { name: 'Corpus Christi', lat: 27.801, lon: -97.396 },
  { name: 'Corsicana', lat: 32.096, lon: -96.468 },
  { name: 'Crowley', lat: 32.579, lon: -97.362 },
  { name: 'Cypress', lat: 29.969, lon: -95.697 },
  { name: 'Dallas', lat: 32.776, lon: -96.797 },
  { name: 'DeSoto', lat: 32.589, lon: -96.857 },
  { name: 'Del Rio', lat: 29.363, lon: -100.896 },
  { name: 'Denton', lat: 33.215, lon: -97.133 },
  { name: 'Denison', lat: 33.756, lon: -96.537 },
  { name: 'Dripping Springs', lat: 30.190, lon: -98.087 },
  { name: 'Duncanville', lat: 32.651, lon: -96.909 },
  { name: 'El Paso', lat: 31.762, lon: -106.485 },
  { name: 'Elgin', lat: 30.350, lon: -97.372 },
  { name: 'Euless', lat: 32.837, lon: -97.082 },
  { name: 'Flower Mound', lat: 33.015, lon: -97.097 },
  { name: 'Forney', lat: 32.747, lon: -96.476 },
  { name: 'Fort Worth', lat: 32.755, lon: -97.333 },
  { name: 'Frisco', lat: 33.150, lon: -96.823 },
  { name: 'Fulshear', lat: 29.694, lon: -95.896 },
  { name: 'Galveston', lat: 29.301, lon: -94.798 },
  { name: 'Garland', lat: 32.913, lon: -96.639 },
  { name: 'Gatesville', lat: 31.435, lon: -97.743 },
  { name: 'Georgetown', lat: 30.633, lon: -97.677 },
  { name: 'Grand Prairie', lat: 32.746, lon: -97.003 },
  { name: 'Grapevine', lat: 32.934, lon: -97.078 },
  { name: 'Haltom City', lat: 32.793, lon: -97.214 },
  { name: 'Hempstead', lat: 30.097, lon: -96.078 },
  { name: 'Houston', lat: 29.760, lon: -95.370 },
  { name: 'Humble', lat: 29.999, lon: -95.262 },
  { name: 'Huntsville', lat: 30.724, lon: -95.551 },
  { name: 'Hurst', lat: 32.823, lon: -97.171 },
  { name: 'Hutto', lat: 30.543, lon: -97.544 },
  { name: 'Irving', lat: 32.814, lon: -96.949 },
  { name: 'Jacksonville', lat: 31.964, lon: -95.271 },
  { name: 'Joshua', lat: 32.461, lon: -97.388 },
  { name: 'Junction', lat: 30.494, lon: -99.772 },
  { name: 'Katy', lat: 29.786, lon: -95.824 },
  { name: 'Keller', lat: 32.935, lon: -97.251 },
  { name: 'Killeen', lat: 31.117, lon: -97.728 },
  { name: 'Kingsville', lat: 27.516, lon: -97.856 },
  { name: 'Kyle', lat: 29.989, lon: -97.877 },
  { name: 'La Porte', lat: 29.666, lon: -95.016 },
  { name: 'Lakeway', lat: 30.363, lon: -97.980 },
  { name: 'Lancaster', lat: 32.592, lon: -96.797 },
  { name: 'Laredo', lat: 27.504, lon: -99.508 },
  { name: 'Leander', lat: 30.560, lon: -97.854 },
  { name: 'Lewisville', lat: 33.046, lon: -96.994 },
  { name: 'Liberty', lat: 30.155, lon: -94.800 },
  { name: 'Livingston', lat: 30.711, lon: -94.933 },
  { name: 'Lockhart', lat: 29.885, lon: -97.670 },
  { name: 'Longview', lat: 32.501, lon: -94.742 },
  { name: 'Lubbock', lat: 33.578, lon: -101.856 },
  { name: 'Lufkin', lat: 31.338, lon: -94.651 },
  { name: 'Magnolia', lat: 30.210, lon: -95.735 },
  { name: 'Mansfield', lat: 32.563, lon: -97.141 },
  { name: 'Marshall', lat: 32.545, lon: -94.368 },
  { name: 'McKinney', lat: 33.197, lon: -96.640 },
  { name: 'Mesquite', lat: 32.767, lon: -96.599 },
  { name: 'Midlothian', lat: 32.482, lon: -96.994 },
  { name: 'Mineral Wells', lat: 32.808, lon: -98.113 },
  { name: 'Missouri City', lat: 29.615, lon: -95.538 },
  { name: 'Mount Pleasant', lat: 33.157, lon: -94.967 },
  { name: 'Nacogdoches', lat: 31.606, lon: -94.656 },
  { name: 'Navasota', lat: 30.388, lon: -96.088 },
  { name: 'New Braunfels', lat: 29.703, lon: -98.124 },
  { name: 'North Richland Hills', lat: 32.834, lon: -97.229 },
  { name: 'Odessa', lat: 31.846, lon: -102.368 },
  { name: 'Palestine', lat: 31.762, lon: -95.631 },
  { name: 'Palacios', lat: 28.708, lon: -96.217 },
  { name: 'Paris', lat: 33.661, lon: -95.556 },
  { name: 'Pasadena', lat: 29.731, lon: -95.151 },
  { name: 'Pearland', lat: 29.564, lon: -95.286 },
  { name: 'Pflugerville', lat: 30.439, lon: -97.620 },
  { name: 'Plano', lat: 33.020, lon: -96.699 },
  { name: 'Port Lavaca', lat: 28.615, lon: -96.626 },
  { name: 'Prairie View', lat: 30.097, lon: -96.010 },
  { name: 'Princeton', lat: 33.180, lon: -96.500 },
  { name: 'Prosper', lat: 33.236, lon: -96.802 },
  { name: 'Richardson', lat: 32.948, lon: -96.729 },
  { name: 'Richmond', lat: 29.582, lon: -95.760 },
  { name: 'Rockwall', lat: 32.931, lon: -96.459 },
  { name: 'Rosenberg', lat: 29.557, lon: -95.809 },
  { name: 'Round Rock', lat: 30.508, lon: -97.679 },
  { name: 'Rowlett', lat: 32.903, lon: -96.564 },
  { name: 'San Angelo', lat: 31.464, lon: -100.437 },
  { name: 'San Antonio', lat: 29.425, lon: -98.494 },
  { name: 'San Marcos', lat: 29.883, lon: -97.940 },
  { name: 'Seguin', lat: 29.569, lon: -97.968 },
  { name: 'Sherman', lat: 33.636, lon: -96.609 },
  { name: 'Socorro', lat: 31.655, lon: -106.278 },
  { name: 'Southlake', lat: 32.941, lon: -97.134 },
  { name: 'Spring', lat: 30.080, lon: -95.416 },
  { name: 'Stafford', lat: 29.615, lon: -95.557 },
  { name: 'Stephenville', lat: 32.221, lon: -98.202 },
  { name: 'Sugar Land', lat: 29.619, lon: -95.635 },
  { name: 'Sulphur Springs', lat: 33.138, lon: -95.601 },
  { name: 'Sunnyvale', lat: 32.757, lon: -96.561 },
  { name: 'Temple', lat: 31.098, lon: -97.343 },
  { name: 'Terrell', lat: 32.736, lon: -96.267 },
  { name: 'Texarkana', lat: 33.442, lon: -94.048 },
  { name: 'The Woodlands', lat: 30.158, lon: -95.470 },
  { name: 'Tomball', lat: 30.097, lon: -95.616 },
  { name: 'Tyler', lat: 32.351, lon: -95.301 },
  { name: 'Uvalde', lat: 29.215, lon: -99.787 },
  { name: 'Victoria', lat: 28.805, lon: -96.986 },
  { name: 'Waco', lat: 31.549, lon: -97.147 },
  { name: 'Waller', lat: 30.027, lon: -95.927 },
  { name: 'Weatherford', lat: 32.759, lon: -97.801 },
  { name: 'Wharton', lat: 29.312, lon: -96.103 },
  { name: 'White Settlement', lat: 32.759, lon: -97.448 },
  { name: 'Wichita Falls', lat: 33.914, lon: -98.493 },
];

function toRad(deg) { return deg * Math.PI / 180; }

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minDistanceToRoute(lat, lon, points) {
  let min = Infinity;
  for (const p of points) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < min) min = d;
  }
  return min;
}

function suggestCitiesByLine(fromLat, fromLon, toLat, toLon, stops) {
  const waypoints = [{ lat: parseFloat(fromLat), lon: parseFloat(fromLon) }];
  if (Array.isArray(stops)) {
    for (const s of stops) {
      if (s.lat && s.lon) waypoints.push({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
    }
  }
  waypoints.push({ lat: parseFloat(toLat), lon: parseFloat(toLon) });
  return ROUTE_CITIES
    .filter(c => {
      let minDist = Infinity;
      for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i], b = waypoints[i + 1];
        const midLat = (a.lat + b.lat) / 2;
        const midLon = (a.lon + b.lon) / 2;
        const d1 = haversineKm(c.lat, c.lon, a.lat, a.lon);
        const d2 = haversineKm(c.lat, c.lon, b.lat, b.lon);
        const dMid = haversineKm(c.lat, c.lon, midLat, midLon);
        if (dMid < d1 && dMid < d2 && dMid < minDist) minDist = dMid;
        if (d1 <= 16.1 || d2 <= 16.1) minDist = 0;
      }
      return minDist <= 80;
    })
    .map(c => `${c.name}, TX`);
}

async function enrichRoute(r) {
  if (!r) return null;
  const stops  = await all('SELECT * FROM route_stops WHERE route_id=$1 ORDER BY order_index', [r.id]);
  const booked = await get('SELECT COUNT(*) as cnt FROM bookings WHERE route_id=$1', [r.id]);
  const driver = await get('SELECT first_name,last_name FROM users WHERE id=$1', [r.driver_id]);
  const bookedCount = parseInt(booked?.cnt || 0);
  return {
    ...r,
    stops,
    booked_seats: bookedCount,
    available_seats: r.total_seats - bookedCount,
    driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'TBD',
  };
}

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const { from, to, date, date_from, date_to, min_seats, route_number } = req.query;
    let sql = `SELECT * FROM routes WHERE status != 'cancelled'`;
    const params = [];
    let i = 1;
    if (from)         { sql += ` AND LOWER(from_city) LIKE $${i++}`;   params.push(`%${from.toLowerCase()}%`); }
    if (to)           { sql += ` AND LOWER(to_city) LIKE $${i++}`;     params.push(`%${to.toLowerCase()}%`);   }
    if (date)         { sql += ` AND departure_date = $${i++}`;         params.push(date);                      }
    if (date_from)    { sql += ` AND departure_date >= $${i++}`;        params.push(date_from);                  }
    if (date_to)      { sql += ` AND departure_date <= $${i++}`;        params.push(date_to);                    }
    if (route_number) { sql += ` AND route_number LIKE $${i++}`;        params.push(`%${route_number.toUpperCase()}%`); }
    sql += ' ORDER BY departure_date, departure_time';
    let routes = await all(sql, params);
    console.log(`[ROUTES] RAW SQL returned ${routes.length} row(s) | sql="${sql}" params=${JSON.stringify(params)}`);
    routes.forEach(r => console.log(`[ROUTES]   raw row: id=${r.id} num=${r.route_number} from=${r.from_city} to=${r.to_city} date=${r.departure_date} status=${r.status}`));
    routes = await Promise.all(routes.map(enrichRoute));
    if (min_seats) routes = routes.filter(r => r.available_seats >= parseInt(min_seats));
    console.log(`[ROUTES] Returning ${routes.length} route(s) to client`);
    res.json(routes);
  } catch (e) {
    console.log(`[ROUTES] ERROR: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/routes/driver/mine — MUST be before /:id
router.get('/driver/mine', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const routes = await all('SELECT * FROM routes WHERE driver_id=$1 ORDER BY departure_date DESC', [req.user.id]);
    res.json(await Promise.all(routes.map(enrichRoute)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/routes/suggest-checkpoints
router.get('/suggest-checkpoints', async (req, res) => {
  try {
    const { from_lat, from_lon, to_lat, to_lon } = req.query;
    let stops = [];
    try { stops = JSON.parse(req.query.stops || '[]'); } catch {}
    if (!from_lat || !from_lon || !to_lat || !to_lon) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    const apiKey = process.env.ORS_API_KEY;
    if (apiKey) {
      try {
        let orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${from_lon},${from_lat}&end=${to_lon},${to_lat}`;
        if (stops.length > 0) {
          const wp = stops.map(s => `${s.lon},${s.lat}`).join(';');
          orsUrl += `&coordinates=${from_lon},${from_lat};${wp};${to_lon},${to_lat}`;
          orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;
          const coords_param = `${from_lon},${from_lat};${wp};${to_lon},${to_lat}`;
          orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&coordinates=${coords_param}`;
        }
        const orsRes = await fetch(orsUrl);
        if (orsRes.ok) {
          const orsData = await orsRes.json();
          const coords = orsData?.features?.[0]?.geometry?.coordinates || [];
          if (coords.length > 0) {
            const step = Math.max(1, Math.floor(coords.length / 50));
            const routePoints = [];
            for (let i = 0; i < coords.length; i += step) {
              routePoints.push({ lat: coords[i][1], lon: coords[i][0] });
            }
            const suggestions = ROUTE_CITIES
              .filter(c => minDistanceToRoute(c.lat, c.lon, routePoints) <= 16.1)
              .map(c => `${c.name}, TX`);
            return res.json(suggestions);
          }
        }
      } catch (orsErr) {
        console.log('[SUGGEST_CHECKPOINTS] ORS error:', orsErr.message);
      }
    }
    return res.json(suggestCitiesByLine(from_lat, from_lon, to_lat, to_lon, stops));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/routes/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await get('SELECT * FROM routes WHERE id=$1 OR route_number=$2', [req.params.id, req.params.id]);
    if (!r) return res.status(404).json({ error: 'Route not found' });
    res.json(await enrichRoute(r));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/routes
router.post('/', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const { from_city, from_zip, to_city, to_zip, departure_date, departure_time,
      arrival_time, duration, total_seats, price_per_seat, package_price, notes, stops } = req.body;
    if (!from_city || !to_city || !departure_date || !departure_time || !price_per_seat)
      return res.status(400).json({ error: 'Missing required fields' });

    const existing = await get('SELECT route_number FROM routes ORDER BY created_at DESC LIMIT 1');
    let nextNum = 201;
    if (existing) {
      const last = parseInt(existing.route_number.replace('DTH-', ''));
      if (!isNaN(last)) nextNum = last + 1;
    }
    const id = uuidv4();
    await run(
      `INSERT INTO routes (id,route_number,driver_id,from_city,from_zip,to_city,to_zip,departure_date,departure_time,arrival_time,duration,total_seats,price_per_seat,package_price,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15)`,
      [id, `DTH-${nextNum}`, req.user.id, from_city, from_zip||'', to_city, to_zip||'',
       departure_date, departure_time, arrival_time||'', duration||'',
       total_seats||44, price_per_seat, package_price||null, notes||'']
    );
    if (Array.isArray(stops)) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        await run(`INSERT INTO route_stops (id,route_id,city,address,"type",order_index,scheduled_time,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'upcoming')`,
          [uuidv4(), id, s.city, s.address||null, s.type||'stop', i+1, s.time||null]);
      }
    }
    res.json(await enrichRoute(await get('SELECT * FROM routes WHERE id=$1', [id])));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/routes/:id
router.put('/:id', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const r = await get('SELECT * FROM routes WHERE id=$1', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your route' });
    const { from_city, to_city, departure_date, departure_time, arrival_time, total_seats, price_per_seat, status, notes } = req.body;
    await run(
      `UPDATE routes SET
       from_city=COALESCE($1,from_city), to_city=COALESCE($2,to_city),
       departure_date=COALESCE($3,departure_date), departure_time=COALESCE($4,departure_time),
       arrival_time=COALESCE($5,arrival_time), total_seats=COALESCE($6,total_seats),
       price_per_seat=COALESCE($7,price_per_seat), status=COALESCE($8,status), notes=COALESCE($9,notes)
       WHERE id=$10`,
      [from_city, to_city, departure_date, departure_time, arrival_time, total_seats, price_per_seat, status, notes, req.params.id]
    );
    res.json(await enrichRoute(await get('SELECT * FROM routes WHERE id=$1', [req.params.id])));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/routes/:id/stops/:stopId
router.patch('/:id/stops/:stopId', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const route = await get('SELECT driver_id FROM routes WHERE id=$1', [req.params.id]);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    if (route.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your route' });
    await run('UPDATE route_stops SET status=$1 WHERE id=$2 AND route_id=$3', [req.body.status, req.params.stopId, req.params.id]);
    res.json(await all('SELECT * FROM route_stops WHERE route_id=$1 ORDER BY order_index', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/routes/:id/manifest
router.get('/:id/manifest', authMiddleware, async (req, res) => {
  try {
    const manifest = await all(`
      SELECT b.id, b.seat_number, b.checkin_status, b.booking_type,
             u.first_name, u.last_name, u.phone
      FROM bookings b JOIN users u ON b.passenger_id=u.id
      WHERE b.route_id=$1 ORDER BY b.seat_number`, [req.params.id]);
    res.json(manifest);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/routes/simulate-checkpoint/:routeId
router.post('/simulate-checkpoint/:routeId', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const { stop_id } = req.body;
    if (!stop_id) return res.status(400).json({ error: 'stop_id is required' });

    const route = await get('SELECT * FROM routes WHERE id=$1', [req.params.routeId]);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    if (route.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your route' });

    const stop = await get('SELECT * FROM route_stops WHERE id=$1 AND route_id=$2 AND type=$3', [stop_id, req.params.routeId, 'checkpoint']);
    if (!stop) return res.status(404).json({ error: 'Checkpoint not found' });

    const passengers = await all('SELECT DISTINCT b.passenger_id FROM bookings b WHERE b.route_id=$1', [req.params.routeId]);
    let notifiedGuardians = 0;

    for (const p of passengers) {
      await run(`INSERT INTO notifications (id,user_id,title,body,"type") VALUES ($1,$2,$3,$4,$5)`,
        [uuidv4(), p.passenger_id, `Checkpoint: ${stop.city}`, `Your bus has passed through ${stop.city}.`, 'info']);

      const guardians = await all(`SELECT name, email FROM guardians WHERE passenger_id=$1 AND email IS NOT NULL AND email != '' AND checkpoint_notifs=1`, [p.passenger_id]);
      for (const g of guardians) {
        sendEmail(g.email, `Checkpoint Update — ${route.route_number}`, guardianCheckpointHTML({
          guardianName: g.name,
          routeNumber: route.route_number,
          from: route.from_city,
          to: route.to_city,
          city: stop.city,
          estimatedArrival: route.arrival_time,
        }));
        notifiedGuardians++;
      }
    }

    res.json({ success: true, notified_guardians: notifiedGuardians, checkpoint_city: stop.city });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;