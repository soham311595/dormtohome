# DormToHome Bug Fix Plan — Round 2

> **Repo:** `github.com/soham311595/dormtohome`
> **Key files:**
> - `public/app.js` — All frontend logic (1631 lines)
> - `public/index.html` — All HTML + CSS (422 lines)
> - `routes/routes.js` — Backend route queries
> - `db/database.js` — Schema + seed data

---

## Instructions for the Agent

- Each task has **exact file paths, line numbers, and code**.
- Line numbers may drift as you edit — always `grep -n "SNIPPET" FILE` to confirm.
- Complete tasks **one at a time** in the order listed.
- **Do NOT refactor unrelated code.** Only touch what each task says.

---

## Priority Key

- **P0** — Critical / broken functionality
- **P1** — High / feature broken
- **P2** — Medium / UX or visual issue
- **P3** — Low / cosmetic polish

---
---

# SECTION 1: EMOJI → PROFESSIONAL SVG ICON REPLACEMENT

---

### Task 1.1 — Create a reusable SVG icon helper `P2`

**File:** `public/app.js`

**Context:** Emojis are used throughout for departure (📍), date (📅), time (🕐), seats (💺), driver (🧑‍✈️), bus (🚌), notes (📝), lightbulb (💡), etc. We need inline SVG icons that match the site's color scheme: `var(--gray-400)` for muted icons, `var(--gold)` for accent, `var(--navy)` for primary.

**What to do:** Add this icon helper object at the TOP of `public/app.js`, right after the `const S = {` state block (around line 1-20). Insert it before any functions:

```javascript
// ─── SVG ICONS (replaces emojis for professionalism) ────────
const ICON = {
  pin: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,

  calendar: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,

  clock: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,

  seat: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><path d="M7 18v-2a4 4 0 014-4h2a4 4 0 014 4v2"/><rect x="5" y="18" width="14" height="3" rx="1"/><path d="M9 5h6v7H9z" rx="1"/></svg>`,

  driver: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>`,

  bus: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="7" cy="20" r="2"/><circle cx="17" cy="20" r="2"/></svg>`,

  note: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,

  lightbulb: (color='var(--gold)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>`,

  timer: (color='var(--gray-400)', size=13) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="${size}" height="${size}" style="flex-shrink:0"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3l2 2M19 3l-2 2M12 1v2"/></svg>`,
};
```

**Done when:** `ICON.pin()` etc. are available globally and return inline SVG strings.

---

### Task 1.2 — Replace emojis in Available Routes filter bar `P2`

**File:** `public/app.js`

**Find** the filter chips in `buildRoutesPage()` (around lines 233-237):
```javascript
      <div class="filter-chip" onclick="openFilterPanel('departure')">📍 Departure</div>
      <div class="filter-chip" onclick="openFilterPanel('arrival')">📍 Arrival</div>
      <div class="filter-chip" onclick="openFilterPanel('date')">📅 Date</div>
      <div class="filter-chip" onclick="openFilterPanel('time')">🕐 Time of Day</div>
      <div class="filter-chip" onclick="openFilterPanel('seats')">💺 Min Seats</div>
```

**Replace with:**
```javascript
      <div class="filter-chip" onclick="openFilterPanel('departure')">${ICON.pin()} Departure</div>
      <div class="filter-chip" onclick="openFilterPanel('arrival')">${ICON.pin()} Arrival</div>
      <div class="filter-chip" onclick="openFilterPanel('date')">${ICON.calendar()} Date</div>
      <div class="filter-chip" onclick="openFilterPanel('time')">${ICON.clock()} Time of Day</div>
      <div class="filter-chip" onclick="openFilterPanel('seats')">${ICON.seat()} Min Seats</div>
```

**Done when:** Filter chips show SVG icons instead of emojis, matching the gray color scheme.

---

### Task 1.3 — Replace emoji in route card driver name `P2`

**File:** `public/app.js`

**Find** in `buildRouteCard()` (around line 286):
```javascript
        <span class="route-meta-item">🧑‍✈️ ${r.driver_name}</span>
```

**Replace with:**
```javascript
        <span class="route-meta-item">${ICON.driver()} ${r.driver_name}</span>
```

**Done when:** Route cards show a person-icon SVG next to the driver name.

---

### Task 1.4 — Replace emojis in route detail modal `P2`

**File:** `public/app.js`

**Find** in `openRouteDetail()` (around lines 428-431):
```javascript
        <span class="badge badge-gold">⏱ ${r.duration}</span>
        <span class="badge badge-blue">🧑‍✈️ ${r.driver_name}</span>
        <span class="badge badge-green">💺 ${r.available_seats}/${r.total_seats}</span>
```

**Replace with:**
```javascript
        <span class="badge badge-gold">${ICON.timer('var(--gold)')} ${r.duration}</span>
        <span class="badge badge-blue">${ICON.driver('var(--navy)')} ${r.driver_name}</span>
        <span class="badge badge-green">${ICON.seat('var(--success)')} ${r.available_seats}/${r.total_seats}</span>
```

**Also find** the notes line (around line 442):
```javascript
      ${r.notes ? `<div ...>📝 ${r.notes}</div>` : ''}
```

**Replace `📝` with `${ICON.note()}`.**

**Done when:** Route detail modal uses SVG icons for duration, driver, seats, and notes.

---

### Task 1.5 — Replace emojis on My Tickets page `P2`

**File:** `public/app.js`

**Find** in the ticket card template (around line 627, inside `buildTicketsPage()` or `buildTicketCard()` if you extracted it earlier):
```javascript
        <div style="display:flex;gap:14px;font-size:.78rem;color:var(--gray-400)"><span>📅 ${b.departure_date}</span><span>💺 Seat ${b.seat_number}</span><span>🧑‍✈️ ${b.driver_name}</span></div>
```

**Replace with:**
```javascript
        <div style="display:flex;gap:14px;font-size:.78rem;color:var(--gray-400)"><span style="display:inline-flex;align-items:center;gap:4px">${ICON.calendar()} ${b.departure_date}</span><span style="display:inline-flex;align-items:center;gap:4px">${ICON.seat()} Seat ${b.seat_number}</span><span style="display:inline-flex;align-items:center;gap:4px">${ICON.driver()} ${b.driver_name}</span></div>
```

**Also find** the booking ID emoji on the ticket detail (around line 666):
```javascript
      🚌 <strong>Booking ID:</strong> ${id.substring(0,8).toUpperCase()}
```

**Replace `🚌` with `${ICON.bus('var(--gold)')}`.**

**Done when:** Ticket cards and ticket detail modal use SVG icons for date, seat, driver, bus.

---

### Task 1.6 — Replace emojis on the review page + route request card `P2`

**File:** `public/app.js`

**Find** on the route request review step (around line 1448):
```javascript
      <div class="text-sm text-muted">📅 ${S.reqData.requested_date || 'Flexible'} · 🕐 ${S.reqData.requested_time || 'Flexible'}</div>
```

**Replace with:**
```javascript
      <div class="text-sm text-muted" style="display:flex;align-items:center;gap:4px">${ICON.calendar()} ${S.reqData.requested_date || 'Flexible'} · ${ICON.clock()} ${S.reqData.requested_time || 'Flexible'}</div>
```

**Done when:** Request review page uses SVG icons.

---

### Task 1.7 — Replace all remaining emojis site-wide `P2`

**File:** `public/app.js`

Do a search for any remaining emoji characters. Run:
```bash
grep -n "📍\|📅\|🕐\|💺\|🧑‍✈️\|🚌\|📝\|💡\|✅\|ℹ️" public/app.js
```

For each remaining hit:
- `📍` → `${ICON.pin()}`
- `📅` → `${ICON.calendar()}`
- `🕐` → `${ICON.clock()}`
- `💺` → `${ICON.seat()}`
- `🧑‍✈️` → `${ICON.driver()}`
- `🚌` → `${ICON.bus()}`
- `📝` → `${ICON.note()}`
- `💡` → `${ICON.lightbulb()}`
- `✅` → `<span style="color:var(--success);font-weight:700">✓</span>`
- `ℹ️` → `<span style="color:var(--navy);font-weight:700">i</span>`

Key locations to check:
- Line 254: `💡 Can't find your route?` — replace `💡` with `${ICON.lightbulb()}`
- Line 429: `🧑‍✈️` in route detail — if not already fixed in Task 1.4
- Line 988-989: Driver route cards — `📅` and `🕐` in `renderDriverRoutes`
- Line 1345, 1347, 1358, 1360: Driver notification templates — `📍` and `🚌`
- Line 1495: Notification icons — `✅`, `🚌`, `ℹ️`

**For the notification icons** (line 1495), replace:
```javascript
${n.type === 'success' ? '✅' : n.type === 'alert' ? '🚌' : 'ℹ️'}
```
with:
```javascript
${n.type === 'success' ? ICON.bus('var(--success)', 16) : n.type === 'alert' ? ICON.bus('var(--gold)', 16) : ICON.note('var(--navy)', 16)}
```

**IMPORTANT:** Do NOT replace the `→` arrow character — it is not an emoji, it's a professional text symbol. Also do NOT replace `✓` or `✕` used for check-in statuses or toast icons — these are already professional symbols.

**Done when:** Running `grep -n "📍\|📅\|🕐\|💺\|🧑‍✈️\|🚌\|📝\|💡\|✅\|ℹ️" public/app.js` returns zero results.

---
---

# SECTION 2: MY TICKETS TAB BUG

---

### Task 2.1 — Fix Active vs Former ticket sorting `P0`

**File:** `public/app.js`

**Problem:** The ticket tabs don't properly separate active from past bookings. When switching between them, tickets appear in the wrong tab or disappear. The root cause is that `buildTicketsPage()` (around line 609) renders ALL bookings with no date filtering, and the tab `<div>` elements have no click handlers — or if they were added previously, the filtering logic compares dates incorrectly.

**Full replacement of the tickets system.** Find `buildTicketsPage()` (around line 609) and replace everything from `function buildTicketsPage` through its closing brace. Also find `renderTickets()` and update it.

**Step 1: Replace `renderTickets()`** (around line 602):
```javascript
async function renderTickets() {
  try {
    const bookings = await api('GET', '/bookings/mine');
    S.allBookings = bookings;
    document.getElementById('p-content').innerHTML = buildTicketsPage(bookings, 'active');
  } catch (e) { toast(e.message, 'error'); }
}
```

**Step 2: Replace `buildTicketsPage()`** (around line 609):
```javascript
function buildTicketsPage(bookings, activeTab) {
  if (!bookings.length) return `<div class="page-header"><div><div class="page-title">My Tickets</div></div></div>${emptyState('No tickets yet — book a route!')}`;

  // Split bookings: today and future → active. Past → inactive.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = bookings.filter(b => {
    const depDate = new Date(b.departure_date + 'T23:59:59');
    return depDate >= today;
  });
  const inactive = bookings.filter(b => {
    const depDate = new Date(b.departure_date + 'T23:59:59');
    return depDate < today;
  });

  const showing = activeTab === 'active' ? active : inactive;

  return `
  <div class="page-header"><div><div class="page-title">My Tickets</div><div class="page-sub">Tap a ticket to view QR code</div></div></div>
  <div class="tabs">
    <div class="tab ${activeTab === 'active' ? 'active' : ''}" onclick="showTicketTab('active')">Active Tickets</div>
    <div class="tab ${activeTab === 'inactive' ? 'active' : ''}" onclick="showTicketTab('inactive')">Inactive Tickets</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px" id="tickets-list">
    ${showing.length ? showing.map(b => buildTicketCard(b)).join('') : emptyState(
      activeTab === 'active'
        ? 'No active tickets — book a route!'
        : 'No inactive tickets. Your completed trips will appear here.'
    )}
  </div>`;
}

function showTicketTab(tab) {
  if (!S.allBookings) return;
  document.getElementById('p-content').innerHTML = buildTicketsPage(S.allBookings, tab);
}
```

**Step 3: Extract ticket card template** into its own function if not already done. Find the `bookings.map(b => ...)` template that used to be inside `buildTicketsPage`. If `buildTicketCard` doesn't exist yet, add it right before `buildTicketsPage`:
```javascript
function buildTicketCard(b) {
  return `<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:14px;overflow:hidden;display:grid;grid-template-columns:1fr 90px;cursor:pointer;transition:var(--transition)" onclick="openTicket('${b.id}','${b.route_number}','${b.from_city}','${b.to_city}','${b.departure_date}','${b.departure_time}','${b.seat_number}','${b.driver_name}')" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--gray-200)'">
    <div style="padding:18px 22px">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span class="route-num">${b.route_number}</span>
        <span class="badge ${b.checkin_status === 'checked' ? 'badge-green' : 'badge-gold'}">${b.checkin_status === 'checked' ? '✓ Checked In' : 'Pending'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div><div style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--navy)">${b.from_city}</div><div class="text-xs text-muted">${b.departure_time}</div></div>
        <div style="color:var(--gold);font-size:1.2rem;flex:1;text-align:center">→</div>
        <div style="text-align:right"><div style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--navy)">${b.to_city}</div><div class="text-xs text-muted">${b.arrival_time}</div></div>
      </div>
      <div style="display:flex;gap:14px;font-size:.78rem;color:var(--gray-400)"><span style="display:inline-flex;align-items:center;gap:4px">${ICON.calendar()} ${b.departure_date}</span><span style="display:inline-flex;align-items:center;gap:4px">${ICON.seat()} Seat ${b.seat_number}</span><span style="display:inline-flex;align-items:center;gap:4px">${ICON.driver()} ${b.driver_name}</span></div>
    </div>
    <div style="background:var(--navy);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;gap:8px">
      <div style="font-size:.6rem;color:rgba(255,255,255,.5);letter-spacing:.08em">SCAN</div>
      ${miniQR()}
      <div style="font-size:.58rem;color:rgba(255,255,255,.4)">${b.route_number}</div>
    </div>
  </div>`;
}
```

**Why this fix works:**
- Date comparison uses `T23:59:59` so that today's departure date counts as "active" (including today).
- The `showTicketTab()` function fully re-renders from `S.allBookings` using the correct tab, avoiding the stale-state bug where toggling tabs corrupted the displayed list.
- Each tab gets its own empty-state message.

**Done when:**
- Active Tickets shows only bookings with departure date today or later.
- Inactive Tickets shows only bookings with departure date before today.
- Switching back and forth never causes tickets to disappear.
- Tab says "Inactive Tickets" (not "Former Tickets").

---
---

# SECTION 3: ROUTE REQUEST FILTERS

---

### Task 3.1 — Add "Clear Filters" button to route requests tab `P1`

**File:** `public/app.js`

**Problem:** The route requests tab (around lines 242-256) has filter chips but no way to clear them.

**Find** the route requests tab section in `buildRoutesPage()` (around line 243-256). Locate the filter bar:
```javascript
      <div class="filter-bar" style="flex:1;margin-bottom:0">
        <span class="filter-label">Sort:</span>
        <div class="filter-chip active">Most Supported</div>
        <div class="filter-chip" onclick="openFilterPanel('departure')">Departure</div>
        <div class="filter-chip" onclick="openFilterPanel('arrival')">Arrival</div>
        <div class="filter-chip" onclick="openFilterPanel('date')">Date</div>
      </div>
```

**Replace with** (add clear button + time of day filter + use ICON helpers):
```javascript
      <div class="filter-bar" style="flex:1;margin-bottom:0">
        <span class="filter-label">Filter:</span>
        <div class="filter-chip" onclick="openFilterPanel('departure')">${ICON.pin()} Departure</div>
        <div class="filter-chip" onclick="openFilterPanel('arrival')">${ICON.pin()} Arrival</div>
        <div class="filter-chip" onclick="openFilterPanel('date')">${ICON.calendar()} Date</div>
        <div class="filter-chip" onclick="openFilterPanel('time')">${ICON.clock()} Time of Day</div>
        <div class="filter-chip" id="clear-req-filters-btn" style="display:none;background:var(--error);color:white;border-color:var(--error)" onclick="clearRequestFilters()">✕ Clear</div>
      </div>
```

**Add `clearRequestFilters()` function** (near `clearAllFilters` if it exists, or after `closeFilterPanel()`):
```javascript
function clearRequestFilters() {
  savedFilters = { departure: '', arrival: '', dateFrom: '', dateTo: '', time: [], seats: '' };
  const btn = document.getElementById('clear-req-filters-btn');
  if (btn) btn.style.display = 'none';
  const reqList = document.getElementById('req-list');
  if (reqList && S.requests) {
    reqList.innerHTML = S.requests.map(buildReqCard).join('') || emptyState('No requests yet');
  }
  toast('Filters cleared', 'success');
}
```

Also, in the `applyRequestFilters()` function (or wherever request filters are applied after Task 2.5 from the previous round), add this at the end to show the clear button:
```javascript
  const clearBtn = document.getElementById('clear-req-filters-btn');
  if (clearBtn) clearBtn.style.display = '';
```

**Done when:** A "Clear" button appears after applying filters on the requests tab, and clicking it resets the list.

---

### Task 3.2 — Fix filter stacking (support multiple cities per filter) `P0`

**File:** `public/app.js`

**Problem:** `applyFilterPanel()` only reads `chips[0]` (line 383) — the first selected city. If a user selects College Station AND Houston as departures, only one is used. The backend also only supports a single `from` value.

**This requires changes in three places.**

**Step 1: Update `savedFilters` to store arrays.** Find the `savedFilters` declaration (which you added in Round 1, Task 2.3) and change departure/arrival to arrays:
```javascript
let savedFilters = {
  departures: [],   // Changed from departure: '' to array
  arrivals: [],     // Changed from arrival: '' to array
  dateFrom: '',
  dateTo: '',
  time: [],
  seats: '',
};
```

**Step 2: Update `applyFilterPanel()` to read ALL chips, not just the first.** Find where it saves departure/arrival filters (the section that reads `#fp-selected .filter-chip.active`):

Replace the departure/arrival saving logic:
```javascript
  if (activeFilter === 'departure') {
    const chips = document.querySelectorAll('#fp-selected .filter-chip.active');
    savedFilters.departures = Array.from(chips).map(c => c.dataset.city?.split(',')[0]?.trim()).filter(Boolean);
  }
  if (activeFilter === 'arrival') {
    const chips = document.querySelectorAll('#fp-selected .filter-chip.active');
    savedFilters.arrivals = Array.from(chips).map(c => c.dataset.city?.split(',')[0]?.trim()).filter(Boolean);
  }
```

**Step 3: Update the filtering logic.** When building the query params for the routes API (or filtering client-side), handle multiple cities:

```javascript
  // For the routes API call — send the first city to the backend, then filter more on the client:
  const params = new URLSearchParams();
  // Don't send from/to to backend when multiple — we'll filter client-side
  if (savedFilters.departures.length === 1) params.set('from', savedFilters.departures[0]);
  if (savedFilters.arrivals.length === 1) params.set('to', savedFilters.arrivals[0]);
  if (savedFilters.dateFrom) params.set('date_from', savedFilters.dateFrom);
  if (savedFilters.dateTo) params.set('date_to', savedFilters.dateTo);
  if (savedFilters.seats) params.set('min_seats', savedFilters.seats);

  try {
    let routes = await api('GET', `/routes?${params.toString()}`, null, false);

    // Client-side multi-city filtering
    if (savedFilters.departures.length > 1) {
      routes = routes.filter(r => savedFilters.departures.some(
        city => r.from_city.toLowerCase().includes(city.toLowerCase())
      ));
    }
    if (savedFilters.arrivals.length > 1) {
      routes = routes.filter(r => savedFilters.arrivals.some(
        city => r.to_city.toLowerCase().includes(city.toLowerCase())
      ));
    }
    // ... rest of filtering (time, etc.) ...
```

**Step 4: Do the same for request filters.** In `applyRequestFilters()`, change:
```javascript
function applyRequestFilters() {
  const reqList = document.getElementById('req-list');
  if (!reqList || !S.requests) return;

  let filtered = S.requests;

  if (savedFilters.departures.length) {
    filtered = filtered.filter(r =>
      savedFilters.departures.some(city => r.from_city.toLowerCase().includes(city.toLowerCase()))
    );
  }
  if (savedFilters.arrivals.length) {
    filtered = filtered.filter(r =>
      savedFilters.arrivals.some(city => r.to_city.toLowerCase().includes(city.toLowerCase()))
    );
  }
  if (savedFilters.dateFrom) {
    filtered = filtered.filter(r => r.requested_date >= savedFilters.dateFrom);
  }
  if (savedFilters.dateTo) {
    filtered = filtered.filter(r => r.requested_date <= savedFilters.dateTo);
  }
  if (savedFilters.time.length) {
    filtered = filtered.filter(r => {
      if (!r.requested_time) return false;
      const hour = parseInt(r.requested_time.split(':')[0]);
      return savedFilters.time.some(t => matchTimeRange(t, hour));
    });
  }

  reqList.innerHTML = filtered.map(buildReqCard).join('') || emptyState('No requests match your filter');
  toast('Filter applied', 'success');
  const clearBtn = document.getElementById('clear-req-filters-btn');
  if (clearBtn) clearBtn.style.display = '';
}

function matchTimeRange(label, hour) {
  if (label.includes('5–7 AM'))  return hour >= 5 && hour < 7;
  if (label.includes('7–9 AM'))  return hour >= 7 && hour < 9;
  if (label.includes('9–11 AM')) return hour >= 9 && hour < 11;
  if (label.includes('11 AM–1 PM')) return hour >= 11 && hour < 13;
  if (label.includes('1–3 PM'))  return hour >= 13 && hour < 15;
  if (label.includes('3–5 PM'))  return hour >= 15 && hour < 17;
  if (label.includes('5–7 PM'))  return hour >= 17 && hour < 19;
  if (label.includes('7–9 PM'))  return hour >= 19 && hour < 21;
  return false;
}
```

**Step 5: Update `openFilterPanel()` to restore multiple saved cities.** In the departure/arrival section, change the pre-fill to loop over the array:
```javascript
  if (type === 'departure' || type === 'arrival') {
    const savedCities = type === 'departure' ? savedFilters.departures : savedFilters.arrivals;
    const chipsHtml = savedCities.map(c =>
      `<div class="filter-chip active" data-city="${c}">${c} <span onclick="this.parentElement.remove()" style="cursor:pointer;margin-left:4px">✕</span></div>`
    ).join('');
    html = `<input style="width:100%;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px;font-size:.9rem;outline:none;color:var(--navy-dark)" placeholder="Search city..." oninput="fpCitySearch(this,'fp-cities')">
    <div id="fp-cities" style="border:1px solid var(--gray-200);border-radius:8px;margin-top:6px;max-height:200px;overflow-y:auto"></div>
    <div id="fp-selected" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${chipsHtml}</div>`;
  }
```

**Step 6: Update `clearAllFilters()` and `clearRequestFilters()` to reset arrays:**
```javascript
savedFilters = { departures: [], arrivals: [], dateFrom: '', dateTo: '', time: [], seats: '' };
```

**Done when:** Selecting "College Station" AND "Houston" as departure shows routes from BOTH cities (OR logic). Same works for route requests.

---

### Task 3.3 — Add Time of Day filter for route requests `P1`

**This was partially addressed in Task 3.1** by adding the Time of Day chip to the request filters bar. The filter panel already handles time selection (it was built in the previous round). The key is making sure `applyRequestFilters()` includes the time filtering logic from Task 3.2 above (the `savedFilters.time` check).

**Verify** that the `openFilterPanel('time')` handler works correctly when the requests tab is active. Since `applyFilterPanel()` now detects the active tab and calls `applyRequestFilters()`, this should work automatically.

**Done when:** Selecting a time range on the route requests tab filters requests by their `requested_time`.

---
---

# SECTION 4: ACTIVE ROUTES

---

### Task 4.1 — Show departure/arrival stops on routes with no intermediate stops `P0`

**File:** `public/app.js`

**Problem:** Only DTH-201 has intermediate stops seeded in the database. Routes DTH-202 through DTH-205 have zero stops, so `stops.length` is 0 and the stops section is hidden entirely. At minimum, every route should show its departure and arrival as "stops" when clicked.

**Find** in `openRouteDetail()` (around lines 434-441):
```javascript
      ${stops.length ? `
      <div class="section-title">Route Stops</div>
      <div class="stops-list">
        <div class="stop-item"><div class="stop-dot done">✓</div><div style="flex:1"><div style="font-weight:500;font-size:.9rem;color:var(--navy)">${r.from_city}</div><div class="text-xs text-muted">${r.departure_time}</div></div></div>
        ${stops.map(s=>`...`).join('')}
        <div class="stop-item"><div class="stop-dot" style="border-color:var(--gold)"></div><div style="flex:1"><div style="font-weight:500;font-size:.9rem;color:var(--navy)">${r.to_city}</div><div class="text-xs text-muted">${r.arrival_time}</div></div></div>
      </div>` : ''}
```

**Replace with** (ALWAYS show departure and arrival, conditionally show intermediate stops):
```javascript
      <div class="section-title">Route Stops</div>
      <div class="stops-list">
        <div class="stop-item"><div class="stop-dot done">✓</div><div style="flex:1"><div style="font-weight:500;font-size:.9rem;color:var(--navy)">${r.from_city}</div><div class="text-xs text-muted">Departure · ${r.departure_time}</div></div></div>
        ${stops.length ? stops.map(s=>`<div class="stop-item"><div class="stop-dot ${s.type==='checkpoint'?'':''}" style="${s.type==='checkpoint'?'border-color:var(--gold-light);font-size:.55rem;font-weight:700;color:var(--gold)':''}"><span>${s.type==='checkpoint'?'CP':''}</span></div>
        <div style="flex:1"><div style="font-weight:500;font-size:.9rem;color:var(--navy)">${s.city}</div><div class="text-xs text-muted">${s.type==='checkpoint'?'Guardian checkpoint':'Bus stop'}${s.scheduled_time?' · '+s.scheduled_time:''}</div></div></div>`).join('') : ''}
        <div class="stop-item"><div class="stop-dot" style="border-color:var(--gold)"></div><div style="flex:1"><div style="font-weight:500;font-size:.9rem;color:var(--navy)">${r.to_city}</div><div class="text-xs text-muted">Arrival · ${r.arrival_time}</div></div></div>
      </div>
```

**IMPORTANT NOTE:** The original code uses `s.stop_type` but the database column is actually `"type"`. The `SELECT *` query returns this as `type` not `stop_type`. The fix above uses `s.type` which is the correct field name from PostgreSQL. If the previous round's code used `s.stop_type`, change it to `s.type`.

**Done when:** Clicking ANY route (including DTH-202 through DTH-205) shows at least the departure and arrival cities in the stops list.

---

### Task 4.2 — Fix Time of Day filter button text contrast `P1`

**File:** `public/app.js`

**Problem:** In `openFilterPanel()` for the `time` type (around line 352), the time slot buttons have no explicit text color in their unselected state. The page body has `color: var(--white)` which can inherit into the filter panel on some renderings, making light text invisible on a light background.

**Find** the time filter HTML template (around line 352). The key part is the inline style on each time button:
```javascript
style="padding:8px 6px;text-align:center;border:1px solid var(--gray-200);border-radius:8px;font-size:.78rem;cursor:pointer;transition:var(--transition)"
```

**Replace with** (add explicit `color:var(--navy-dark)` and `background:var(--white)`):
```javascript
style="padding:8px 6px;text-align:center;border:1px solid var(--gray-200);border-radius:8px;font-size:.78rem;cursor:pointer;transition:var(--transition);color:var(--navy-dark);background:var(--white)"
```

**Also fix the deactivation toggle.** Find in the same line the onclick handler:
```javascript
onclick="this.classList.toggle('active');this.style.background=this.classList.contains('active')?'var(--gold)':'';this.style.color=this.classList.contains('active')?'var(--navy-dark)':'';this.style.borderColor=this.classList.contains('active')?'var(--gold)':'';"
```

**Replace with** (set explicit colors for BOTH states):
```javascript
onclick="this.classList.toggle('active');this.style.background=this.classList.contains('active')?'var(--gold)':'var(--white)';this.style.color=this.classList.contains('active')?'var(--navy-dark)':'var(--navy-dark)';this.style.borderColor=this.classList.contains('active')?'var(--gold)':'var(--gray-200)';"
```

**Done when:** Time of day buttons always have dark readable text, both when selected (gold background) and unselected (white background).

---
---

# EXECUTION ORDER

**Round 1 — P0 (Critical):**
1. Task 2.1 — Fix ticket tab active/inactive sorting
2. Task 3.2 — Fix filter stacking (multi-city OR support)
3. Task 4.1 — Show departure/arrival on all route details

**Round 2 — P1 (High):**
4. Task 3.1 — Clear filters button for route requests
5. Task 3.3 — Time of Day filter for route requests
6. Task 4.2 — Time of day button text contrast

**Round 3 — P2 (Visual polish):**
7. Task 1.1 — Create SVG icon helper
8. Task 1.2 — Replace filter bar emojis
9. Task 1.3 — Replace route card driver emoji
10. Task 1.4 — Replace route detail modal emojis
11. Task 1.5 — Replace ticket page emojis
12. Task 1.6 — Replace request review emojis
13. Task 1.7 — Replace all remaining emojis

---

# NOTES FOR THE AGENT

- **Do Task 1.1 FIRST among emoji tasks** — all other emoji tasks depend on the `ICON` object.
- **`savedFilters` shape changed** in Task 3.2: `departure` → `departures` (array), `arrival` → `arrivals` (array). Update ALL references.
- **Column name:** The database `route_stops` table uses `"type"` as the column. PostgreSQL returns this as `type`. The frontend should use `s.type`, NOT `s.stop_type`.
- Test the ticket tab by checking that booking dates before today go to "Inactive" and dates today or later go to "Active".
- After all emoji changes, run: `grep -nP '[\x{1F300}-\x{1F9FF}]' public/app.js` to verify no emoji remain.
- **Commit after each round** with descriptive messages.
