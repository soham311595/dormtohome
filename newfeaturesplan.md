# DormToHome — QR Tickets & Live Location Implementation

Two features, five files touched. Every change is labeled **ADD** (new code) or **MODIFY** (replace existing).

---

## CDN scripts to add — `public/index.html`

Find the `</head>` tag and paste these **before** it:

```html
<!-- QR Code generation (passenger ticket) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

<!-- QR Code scanning (driver check-in) -->
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

<!-- Leaflet map (live location) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

---

## DB migration — `db/database.js`

### MODIFY: bookings table schema

Find the `CREATE TABLE IF NOT EXISTS bookings` block and add the `ticket_token` column:

```js
// In your CREATE TABLE bookings statement, add this column:
ticket_token TEXT UNIQUE,
checked_in INTEGER DEFAULT 0,
checked_in_at TEXT
```

Full example of what the bookings table should look like:
```sql
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  route_id INTEGER NOT NULL,
  seat_number INTEGER,
  status TEXT DEFAULT 'pending',
  ticket_token TEXT UNIQUE,        -- ADD THIS
  checked_in INTEGER DEFAULT 0,    -- ADD THIS
  checked_in_at TEXT,              -- ADD THIS
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (route_id) REFERENCES routes(id)
);
```

### ADD: UUID helper at the top of database.js

```js
// Add near the top of database.js, after requires
function generateToken() {
  return 'tk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}
module.exports.generateToken = generateToken;
```

---

## New check-in endpoint — `routes/api.js`

### MODIFY: booking creation — inject token when booking is created

Find where you `INSERT INTO bookings` and add the token generation:

```js
const { generateToken } = require('../db/database');

// Inside your booking creation handler, before the INSERT:
const ticketToken = generateToken();

// Then add ticket_token to your INSERT:
// INSERT INTO bookings (user_id, route_id, seat_number, status, ticket_token)
// VALUES (?, ?, ?, 'confirmed', ?)
// params: [userId, routeId, seatNumber, ticketToken]
```

### ADD: GET ticket token endpoint

```js
// GET /api/bookings/:id/ticket — returns ticket token for QR generation
router.get('/bookings/:id/ticket', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const booking = db.prepare(`
    SELECT b.id, b.ticket_token, b.seat_number, b.status, b.checked_in,
           r.origin, r.destination, r.departure_time,
           u.first_name, u.last_name
    FROM bookings b
    JOIN routes r ON b.route_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ? AND b.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});
```

### ADD: Driver check-in endpoint

```js
// POST /api/bookings/checkin — driver scans QR, validates token, marks checked in
router.post('/bookings/checkin', authMiddleware, (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access only' });
  }

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const db = req.app.get('db');

  const booking = db.prepare(`
    SELECT b.id, b.checked_in, b.seat_number, b.route_id,
           u.first_name, u.last_name,
           r.origin, r.destination
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN routes r ON b.route_id = r.id
    WHERE b.ticket_token = ? AND b.status = 'confirmed'
  `).get(token);

  if (!booking) return res.status(404).json({ error: 'Invalid or expired ticket' });
  if (booking.checked_in) return res.status(409).json({ error: 'Already checked in', booking });

  db.prepare(`
    UPDATE bookings
    SET checked_in = 1, checked_in_at = datetime('now')
    WHERE ticket_token = ?
  `).run(token);

  res.json({
    success: true,
    passenger: `${booking.first_name} ${booking.last_name}`,
    seat: booking.seat_number,
    route: `${booking.origin} → ${booking.destination}`
  });
});
```

---

## Socket.io location events — `server.js`

### ADD: inside your `io.on('connection', ...)` block

Find `io.on('connection', (socket) => {` and add these handlers inside it:

```js
// ── Live location: driver broadcasts position ──────────────────────
socket.on('location:start', ({ routeId }) => {
  socket.join(`route:${routeId}`);
  // tell everyone in the route room a driver came online
  socket.to(`route:${routeId}`).emit('driver:online', { routeId });
});

socket.on('location:update', ({ routeId, lat, lng, speed, heading }) => {
  // relay to all passengers/guardians watching this route
  socket.to(`route:${routeId}`).emit('location:broadcast', {
    lat, lng,
    speed: speed || null,
    heading: heading || null,
    timestamp: Date.now()
  });
});

socket.on('location:stop', ({ routeId }) => {
  socket.to(`route:${routeId}`).emit('driver:offline', { routeId });
  socket.leave(`route:${routeId}`);
});

// ── Passengers join a route room to receive location ──────────────
socket.on('route:watch', ({ routeId }) => {
  socket.join(`route:${routeId}`);
});

socket.on('route:unwatch', ({ routeId }) => {
  socket.leave(`route:${routeId}`);
});
```

---

## Frontend — `public/app.js`

### FEATURE 1: QR Ticket — passenger side

Find your ticket modal rendering function (likely called something like `showTicket`, `renderTicket`, or triggered by clicking a ticket in "My Tickets"). **Add** this after you populate the modal's HTML:

```js
// ── QR Ticket rendering ────────────────────────────────────────────
async function renderTicketQR(bookingId) {
  // Fetch full ticket data including token
  const token = localStorage.getItem('authToken'); // or however you store JWT
  const res = await fetch(`/api/bookings/${bookingId}/ticket`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) return;

  // Find or create the QR container in the modal
  let qrContainer = document.getElementById('ticket-qr-canvas');
  if (!qrContainer) {
    qrContainer = document.createElement('div');
    qrContainer.id = 'ticket-qr-canvas';
    qrContainer.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      padding: 16px; background: white; border-radius: 12px; margin: 16px 0;
    `;
    // Insert it inside your ticket modal — adjust selector to match your modal
    const ticketModal = document.getElementById('ticket-modal') ||
                        document.querySelector('.ticket-modal-body');
    if (ticketModal) ticketModal.appendChild(qrContainer);
  }

  qrContainer.innerHTML = '';

  // Generate QR code using qrcodejs
  new QRCode(qrContainer, {
    text: data.ticket_token,
    width: 200,
    height: 200,
    colorDark: '#1a1a2e',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  // Add ticket info below QR
  const info = document.createElement('div');
  info.style.cssText = 'text-align: center; margin-top: 12px; font-size: 13px; color: #444;';
  info.innerHTML = `
    <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">
      ${data.origin} → ${data.destination}
    </div>
    <div>Seat ${data.seat_number} · ${new Date(data.departure_time).toLocaleString()}</div>
    <div style="margin-top: 8px; font-family: monospace; font-size: 11px; color: #888;">
      ${data.ticket_token}
    </div>
    ${data.checked_in
      ? '<div style="color: #22c55e; font-weight: 600; margin-top: 8px;">✓ Checked In</div>'
      : '<div style="color: #f59e0b; margin-top: 8px;">Show this to your driver</div>'
    }
  `;
  qrContainer.appendChild(info);
}
```

**Call it** wherever you open/show the ticket modal. E.g.:
```js
// When a passenger taps a ticket:
renderTicketQR(booking.id);
```

---

### FEATURE 1: QR Check-In — driver side

Find the driver's **Check-In** screen rendering code. Add this function and call it when the driver opens that tab:

```js
// ── Driver QR Check-In ─────────────────────────────────────────────
let html5QrScanner = null;

function initCheckinScanner() {
  const scannerSection = document.getElementById('checkin-scanner-section');
  if (!scannerSection) return; // guard: only run on driver check-in screen

  // Build the UI if not already built
  if (!document.getElementById('qr-reader')) {
    scannerSection.innerHTML = `
      <div style="max-width: 420px; margin: 0 auto;">
        <h3 style="margin-bottom: 12px;">Scan Passenger Ticket</h3>

        <!-- Camera scanner -->
        <div id="qr-reader" style="width: 100%; border-radius: 12px; overflow: hidden;"></div>

        <div style="margin: 16px 0; text-align: center; color: #888; font-size: 13px;">
          — or enter code manually —
        </div>

        <!-- Manual fallback -->
        <div style="display: flex; gap: 8px;">
          <input
            id="manual-token-input"
            type="text"
            placeholder="Paste ticket code (tk_...)"
            style="flex: 1; padding: 10px 14px; border: 1.5px solid #ddd;
                   border-radius: 8px; font-size: 14px; font-family: monospace;"
          />
          <button
            id="manual-checkin-btn"
            style="padding: 10px 18px; background: #1a1a2e; color: white;
                   border: none; border-radius: 8px; cursor: pointer; font-size: 14px;"
          >
            Check In
          </button>
        </div>

        <!-- Result banner -->
        <div id="checkin-result" style="margin-top: 16px; display: none;
             padding: 14px 16px; border-radius: 10px; font-size: 15px;"></div>
      </div>
    `;
  }

  // Start camera scanner
  if (!html5QrScanner) {
    html5QrScanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true
    });

    html5QrScanner.render(
      (decodedText) => processCheckin(decodedText), // success
      (error) => {} // ignore scan errors (fires constantly while searching)
    );
  }

  // Manual fallback handler
  document.getElementById('manual-checkin-btn').addEventListener('click', () => {
    const val = document.getElementById('manual-token-input').value.trim();
    if (val) processCheckin(val);
  });
  document.getElementById('manual-token-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (val) processCheckin(val);
    }
  });
}

async function processCheckin(token) {
  const authToken = localStorage.getItem('authToken');
  const resultEl = document.getElementById('checkin-result');

  resultEl.style.display = 'block';
  resultEl.style.background = '#f3f4f6';
  resultEl.style.color = '#374151';
  resultEl.textContent = 'Verifying...';

  try {
    const res = await fetch('/api/bookings/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ token })
    });
    const data = await res.json();

    if (res.ok) {
      resultEl.style.background = '#dcfce7';
      resultEl.style.color = '#166534';
      resultEl.innerHTML = `
        <strong>✓ Checked In</strong><br>
        ${data.passenger} · Seat ${data.seat}<br>
        <span style="font-size: 13px; opacity: 0.8;">${data.route}</span>
      `;
      // Clear manual input
      const input = document.getElementById('manual-token-input');
      if (input) input.value = '';
    } else if (res.status === 409) {
      resultEl.style.background = '#fef9c3';
      resultEl.style.color = '#854d0e';
      resultEl.innerHTML = `<strong>⚠ Already checked in</strong><br>${data.booking?.passenger || ''}`;
    } else {
      resultEl.style.background = '#fee2e2';
      resultEl.style.color = '#991b1b';
      resultEl.textContent = `✗ ${data.error || 'Invalid ticket'}`;
    }
  } catch (err) {
    resultEl.style.background = '#fee2e2';
    resultEl.style.color = '#991b1b';
    resultEl.textContent = '✗ Network error, try again';
  }

  // Auto-clear result after 5 seconds
  setTimeout(() => {
    if (resultEl) resultEl.style.display = 'none';
  }, 5000);
}

// Call this when driver navigates to Check-In tab
// e.g. in your tab-switch handler: if (tab === 'checkin') initCheckinScanner();
```

**Important:** When the driver navigates *away* from the Check-In tab, stop the scanner to free the camera:
```js
function stopCheckinScanner() {
  if (html5QrScanner) {
    html5QrScanner.clear().catch(() => {});
    html5QrScanner = null;
  }
}
```

---

### FEATURE 2: Live Location — driver side (broadcasts position)

Find the driver's **Live** tab rendering. Add this:

```js
// ── Driver live location broadcast ────────────────────────────────
let locationWatchId = null;
let isLiveBroadcasting = false;

function startLocationBroadcast(routeId) {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported on this device.');
    return;
  }

  socket.emit('location:start', { routeId });
  isLiveBroadcasting = true;
  updateLiveBtnState(true);

  locationWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      socket.emit('location:update', {
        routeId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading
      });
    },
    (err) => {
      console.warn('Geolocation error:', err.message);
      // Show non-blocking warning in the UI
      const warn = document.getElementById('location-warning');
      if (warn) {
        warn.textContent = 'Location error: ' + err.message;
        warn.style.display = 'block';
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  );
}

function stopLocationBroadcast(routeId) {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  if (isLiveBroadcasting) {
    socket.emit('location:stop', { routeId });
    isLiveBroadcasting = false;
  }
  updateLiveBtnState(false);
}

function updateLiveBtnState(active) {
  const btn = document.getElementById('toggle-live-btn');
  if (!btn) return;
  btn.textContent = active ? '⏹ Stop Broadcasting' : '▶ Go Live';
  btn.style.background = active ? '#ef4444' : '#22c55e';
}

function initDriverLiveTab(routeId) {
  const liveSection = document.getElementById('driver-live-section');
  if (!liveSection) return;

  liveSection.innerHTML = `
    <div style="max-width: 480px; margin: 0 auto; text-align: center;">
      <h3 style="margin-bottom: 8px;">Live Tracking</h3>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
        Share your real-time location with passengers on this route.
      </p>
      <button
        id="toggle-live-btn"
        style="padding: 14px 32px; font-size: 16px; font-weight: 600;
               background: #22c55e; color: white; border: none;
               border-radius: 10px; cursor: pointer; transition: background 0.2s;"
      >
        ▶ Go Live
      </button>
      <div id="location-warning"
           style="display: none; margin-top: 12px; padding: 10px;
                  background: #fef9c3; border-radius: 8px; font-size: 13px; color: #854d0e;">
      </div>
      <div id="live-status"
           style="margin-top: 16px; font-size: 13px; color: #6b7280;">
        Not broadcasting
      </div>
    </div>
  `;

  document.getElementById('toggle-live-btn').addEventListener('click', () => {
    if (isLiveBroadcasting) {
      stopLocationBroadcast(routeId);
      document.getElementById('live-status').textContent = 'Not broadcasting';
    } else {
      startLocationBroadcast(routeId);
      document.getElementById('live-status').textContent = 'Broadcasting your location…';
    }
  });
}
```

---

### FEATURE 2: Live Location — passenger side (receives + map)

Find the passenger's **Active Trips** tab. Add this:

```js
// ── Passenger live map ─────────────────────────────────────────────
let passengerMap = null;
let driverMarker = null;
let activeWatchRouteId = null;

function initPassengerLiveMap(routeId) {
  activeWatchRouteId = routeId;

  const liveSection = document.getElementById('passenger-live-section');
  if (!liveSection) return;

  liveSection.innerHTML = `
    <div style="position: relative;">
      <div id="passenger-map"
           style="width: 100%; height: 340px; border-radius: 14px;
                  overflow: hidden; border: 1.5px solid #e5e7eb;">
      </div>
      <div id="map-status"
           style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
                  background: rgba(0,0,0,0.65); color: white; padding: 6px 14px;
                  border-radius: 20px; font-size: 12px; backdrop-filter: blur(4px);
                  pointer-events: none;">
        Waiting for driver location…
      </div>
    </div>
  `;

  // Initialise Leaflet map (OpenStreetMap tiles — no API key needed)
  passengerMap = L.map('passenger-map', { zoomControl: true }).setView([30.6, -96.3], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(passengerMap);

  // Custom driver marker icon
  const busIcon = L.divIcon({
    html: `<div style="
      width: 36px; height: 36px; background: #1a1a2e; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      border: 2px solid white;
    ">🚌</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: ''
  });

  driverMarker = L.marker([30.6, -96.3], { icon: busIcon })
    .addTo(passengerMap)
    .bindPopup('Driver location');
  driverMarker.setOpacity(0); // hide until first update

  // Join Socket.io room for this route
  socket.emit('route:watch', { routeId });

  // Handle incoming location updates
  socket.on('location:broadcast', ({ lat, lng, timestamp }) => {
    const pos = [lat, lng];
    driverMarker.setLatLng(pos);
    driverMarker.setOpacity(1);
    passengerMap.panTo(pos, { animate: true, duration: 0.8 });

    const statusEl = document.getElementById('map-status');
    if (statusEl) {
      const ago = Math.round((Date.now() - timestamp) / 1000);
      statusEl.textContent = `Live · Updated ${ago}s ago`;
      statusEl.style.background = 'rgba(34, 197, 94, 0.85)';
    }
  });

  socket.on('driver:online', () => {
    const statusEl = document.getElementById('map-status');
    if (statusEl) statusEl.textContent = 'Driver is live…';
  });

  socket.on('driver:offline', () => {
    const statusEl = document.getElementById('map-status');
    if (statusEl) {
      statusEl.textContent = 'Driver ended the trip';
      statusEl.style.background = 'rgba(0,0,0,0.65)';
    }
    driverMarker.setOpacity(0.4);
  });
}

function destroyPassengerMap() {
  if (activeWatchRouteId) {
    socket.emit('route:unwatch', { routeId: activeWatchRouteId });
    socket.off('location:broadcast');
    socket.off('driver:online');
    socket.off('driver:offline');
    activeWatchRouteId = null;
  }
  if (passengerMap) {
    passengerMap.remove();
    passengerMap = null;
    driverMarker = null;
  }
}

// Call when passenger views an active trip:
//   initPassengerLiveMap(booking.route_id)
// Call when passenger navigates away:
//   destroyPassengerMap()
```

---

## Hook-up checklist

These are the **exact places** in your existing `app.js` where you call the new functions:

| Where in app.js | What to call |
|---|---|
| Passenger clicks/opens a ticket | `renderTicketQR(booking.id)` |
| Driver switches to Check-In tab | `initCheckinScanner()` |
| Driver switches away from Check-In tab | `stopCheckinScanner()` |
| Driver switches to Live tab (pass active route ID) | `initDriverLiveTab(activeRouteId)` |
| Driver logs off / ends trip | `stopLocationBroadcast(activeRouteId)` |
| Passenger views an active trip | `initPassengerLiveMap(booking.route_id)` |
| Passenger navigates away from active trip | `destroyPassengerMap()` |

---

## Package to install (optional but recommended)

The `qrcode` CDN loaded in index.html handles client-side generation — **no npm install needed** for QR. However, if you ever want server-side QR generation (e.g. for PDF tickets), install:

```bash
npm install uuid
```

Then replace the `generateToken()` function in `database.js` with:
```js
const { v4: uuidv4 } = require('uuid');
function generateToken() { return uuidv4(); }
```

---

## Testing flow

1. **Log in as passenger** (alex@tamu.edu / password123) → book a seat → open My Tickets → QR should render
2. **Log in as driver** (marcus@dormtohome.com / password123) → Check-In tab → scan the QR with another device's camera OR paste the `tk_...` code → should show green success banner
3. **Driver** → Live tab → Go Live → open a second browser tab as passenger viewing an active trip → map dot should move in real time
