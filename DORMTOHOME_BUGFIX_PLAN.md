# DormToHome Bug Fix Plan

> **Repo:** `github.com/soham311595/dormtohome`
> **Stack:** Node/Express backend, PostgreSQL (Supabase), Vanilla JS frontend
> **Key files:**
> - `public/app.js` — ALL frontend logic (1631 lines)
> - `public/index.html` — Full UI markup
> - `routes/auth.js` — Login/register endpoints
> - `routes/api.js` — Bookings, requests, messages, guardians, notifications
> - `routes/routes.js` — Bus route CRUD + filtering
> - `server.js` — Express + Socket.io entry point
> - `db/database.js` — PostgreSQL schema + seed data

---

## Instructions for the Agent

- Each task references **exact file paths and line numbers**. Line numbers may shift as you make edits — always verify by searching for the code snippet shown.
- Complete tasks **one at a time** in the order listed.
- After editing a section, search for nearby code to make sure nothing broke.
- **Do NOT refactor unrelated code.**
- When a task says "find line X", use `grep -n "SNIPPET" FILE` to confirm the current line number before editing.

---

## Priority Key

- **P0** — Critical / core broken
- **P1** — High / feature broken
- **P2** — Medium / UX issue
- **P3** — Low / cosmetic

---
---

# SECTION 1: SIGN UP & AUTHENTICATION

---

### Task 1.1 — Validate guardian email + phone on sign-up (frontend) `P1`

**Files:** `public/app.js`

**Problem:** The `doRegister()` function (around line 120) reads guardian email/phone but never validates format before posting to the API.

**Find this code** (around line 120):
```javascript
async function doRegister() {
```

**What to do:** Add validation helper functions ABOVE `doRegister()`, then add validation checks INSIDE `doRegister()` before the API call.

**Add these helpers** (insert them above `doRegister`):
```javascript
function isValidEmail(email) {
  if (!email || email.trim() === '') return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone || phone.trim() === '') return true; // optional field
  const digits = phone.replace(/[\s\-\(\)\+\.]/g, '');
  return (digits.length === 10 && /^\d{10}$/.test(digits)) ||
         (digits.length === 11 && /^1\d{10}$/.test(digits));
}
```

**Then inside `doRegister()`**, find where it reads the form values (around lines 132-135):
```javascript
      guardian_name: document.getElementById('reg-g-name')?.value,
      guardian_email: document.getElementById('reg-g-email')?.value,
      guardian_phone: document.getElementById('reg-g-phone')?.value,
```

**Add these validation checks BEFORE the `api('POST', '/auth/register', ...)` call:**
```javascript
    // Validate passenger email
    const email = document.getElementById('reg-email')?.value;
    if (!isValidEmail(email)) { toast('Please enter a valid email address', 'error'); return; }

    // Validate passenger phone
    const phone = document.getElementById('reg-phone')?.value;
    if (!isValidPhone(phone)) { toast('Please enter a valid 10-digit phone number', 'error'); return; }

    // Validate guardian fields if provided
    const gEmail = document.getElementById('reg-g-email')?.value;
    const gPhone = document.getElementById('reg-g-phone')?.value;
    if (gEmail && !isValidEmail(gEmail)) { toast('Guardian email is not valid', 'error'); return; }
    if (gPhone && !isValidPhone(gPhone)) { toast('Guardian phone number is not valid', 'error'); return; }
```

**Done when:** Entering "abc" as a guardian email or "xyz" as a phone shows a toast error and blocks submission.

---

### Task 1.2 — Validate email on login (frontend) `P2`

**File:** `public/app.js`

**Problem:** The `doLogin()` function (around line 93) doesn't validate email format.

**Find this code:**
```javascript
async function doLogin() {
```

**Add at the top of the function, before any API call:**
```javascript
  const email = document.getElementById('login-email')?.value;
  if (!isValidEmail(email)) { toast('Please enter a valid email address', 'error'); return; }
```

Note: `isValidEmail` was already added in Task 1.1. Make sure Task 1.1 is done first.

**Done when:** Typing "blah" and clicking Sign In shows an error toast.

---

### Task 1.3 — Add server-side validation for email/phone on register `P1`

**File:** `routes/auth.js`

**Problem:** The `POST /register` handler (line 14) accepts any string for email, phone, guardian_email, guardian_phone.

**Find this code** (around line 18-19):
```javascript
    if (!first_name || !last_name || !email || !password || !role)
      return res.status(400).json({ error: 'Missing required fields' });
```

**Add these checks right after that block:**
```javascript
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim()))
      return res.status(400).json({ error: 'Invalid email format' });

    // Validate phone if provided
    if (phone && phone.trim()) {
      const digits = phone.replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^1?\d{10}$/.test(digits))
        return res.status(400).json({ error: 'Invalid phone number — must be 10 digits' });
    }

    // Validate guardian fields if provided
    if (guardian_email && guardian_email.trim() && !emailRegex.test(guardian_email.trim()))
      return res.status(400).json({ error: 'Invalid guardian email format' });
    if (guardian_phone && guardian_phone.trim()) {
      const gDigits = guardian_phone.replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^1?\d{10}$/.test(gDigits))
        return res.status(400).json({ error: 'Invalid guardian phone number' });
    }
```

**Done when:** Sending a POST to `/api/auth/register` with `email: "notreal"` returns a 400 error.

---

### Task 1.4 — Rate-limit account creation `P1`

**File:** `server.js`

**Step 1:** Install the package:
```bash
npm install express-rate-limit
```

**Step 2:** In `server.js`, find around line 20-21:
```javascript
app.use(cors());
app.use(express.json());
```

**Add right after those lines:**
```javascript
const rateLimit = require('express-rate-limit');
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many accounts created. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Step 3:** Find line 27:
```javascript
app.use('/api/auth', require('./routes/auth'));
```

**Replace with:**
```javascript
const authRouter = require('./routes/auth');
// Apply rate limit only to the register endpoint
app.post('/api/auth/register', signupLimiter);
app.use('/api/auth', authRouter);
```

**Done when:** Creating 6+ accounts in 15 minutes from the same IP returns a 429 error.

---
---

# SECTION 2: AVAILABLE ROUTES FILTERS

---

### Task 2.1 — Remove premium seat rows `P2`

**File:** `public/app.js`

**Problem:** `buildSeatModal()` (around line 463) marks rows 1-2 as premium. The bug report says to remove premium rows entirely.

**Find this code** (around line 466-483):
```javascript
  const ROWS = ['1','2','3','4','5','6','7','8','9','10','11'];
  ROWS.forEach(row => {
    html += '<div class="seat-row">';
    ['A','B'].forEach(col => {
      const sid = row + col;
      const isTaken = taken.includes(sid);
      const isPrem = row === '1' || row === '2';
      html += `<div class="seat${isTaken?' taken':''}${isPrem?' premium':''}" ...
```

**Replace the ROWS line and remove premium logic:**
```javascript
  const ROWS = ['3','4','5','6','7','8','9','10','11'];
  ROWS.forEach(row => {
    html += '<div class="seat-row">';
    ['A','B'].forEach(col => {
      const sid = row + col;
      const isTaken = taken.includes(sid);
      html += `<div class="seat${isTaken?' taken':''}" id="seat-${sid}" onclick="${isTaken ? '' : `selectSeat('${sid}')`}">${sid}</div>`;
    });
    html += '<div class="seat-aisle"></div>';
    ['C','D'].forEach(col => {
      const sid = row + col;
      const isTaken = taken.includes(sid);
      html += `<div class="seat${isTaken?' taken':''}" id="seat-${sid}" onclick="${isTaken ? '' : `selectSeat('${sid}')`}">${sid}</div>`;
    });
    html += '</div>';
  });
```

**Also find the legend line** (around line 489):
```javascript
    <div style="display:flex;align-items:center;gap:6px;font-size:.75rem;color:var(--gray-600)"><div style="width:14px;height:14px;border-radius:4px;background:white;border:2px solid var(--gold-light)"></div>Premium (rows 1-2)</div>
```

**Delete that entire line.**

**Done when:** Seat selection shows rows 3-11 only. No premium legend.

---

### Task 2.2 — Remove "For You" button `P2`

**File:** `public/app.js`

**Problem:** `buildRoutesPage()` (line 224) renders a non-functional "For You" button.

**Find this line** (around line 224):
```javascript
    <button class="for-you-btn" onclick="showHelp('foryou')">★ For You<div class="fyi-q" onclick="event.stopPropagation();showHelp('foryou')">?</div></button>
```

**Delete that entire line.**

**Done when:** The "★ For You" button no longer appears on the Available Routes page.

---

### Task 2.3 — Fix filter state persistence `P0`

**File:** `public/app.js`

**Problem:** `openFilterPanel()` (line 339) rebuilds the filter panel HTML from scratch every time, so previous selections are lost. `applyFilterPanel()` (line 379) reads from DOM elements that were just destroyed when the panel closed. There is also no way to clear applied filters.

**This is a multi-step fix.**

**Step 1: Add a persistent filter state object.** Find around line 336:
```javascript
let activeFilter = null;
```

**Replace with:**
```javascript
let activeFilter = null;
let savedFilters = {
  departure: '',
  arrival: '',
  dateFrom: '',
  dateTo: '',
  time: [],
  seats: '',
};
```

**Step 2: Rewrite `applyFilterPanel()`** (around line 379). Find the entire function and replace:
```javascript
async function applyFilterPanel() {
  // Save current filter values BEFORE closing the panel
  if (activeFilter === 'departure') {
    const chips = document.querySelectorAll('#fp-selected .filter-chip.active');
    savedFilters.departure = chips.length ? chips[0].dataset.city?.split(',')[0]?.trim() : '';
  }
  if (activeFilter === 'arrival') {
    const chips = document.querySelectorAll('#fp-selected .filter-chip.active');
    savedFilters.arrival = chips.length ? chips[0].dataset.city?.split(',')[0]?.trim() : '';
  }
  if (activeFilter === 'date') {
    savedFilters.dateFrom = document.getElementById('fp-date-from')?.value || '';
    savedFilters.dateTo = document.getElementById('fp-date-to')?.value || '';
  }
  if (activeFilter === 'time') {
    savedFilters.time = [];
    document.querySelectorAll('#fp-body .active').forEach(el => {
      savedFilters.time.push(el.textContent.trim());
    });
  }
  if (activeFilter === 'seats') {
    savedFilters.seats = document.getElementById('fp-seats')?.value || '';
  }

  closeFilterPanel();

  // Build query from ALL saved filters
  const params = new URLSearchParams();
  if (savedFilters.departure) params.set('from', savedFilters.departure);
  if (savedFilters.arrival) params.set('to', savedFilters.arrival);
  if (savedFilters.dateFrom) params.set('date_from', savedFilters.dateFrom);
  if (savedFilters.dateTo) params.set('date_to', savedFilters.dateTo);
  if (savedFilters.seats) params.set('min_seats', savedFilters.seats);

  try {
    let routes = await api('GET', `/routes?${params.toString()}`, null, false);

    // Client-side time-of-day filter
    if (savedFilters.time.length > 0) {
      routes = routes.filter(r => {
        if (!r.departure_time) return false;
        const hour = parseInt(r.departure_time.split(':')[0]);
        return savedFilters.time.some(t => {
          if (t.includes('5–7 AM'))  return hour >= 5 && hour < 7;
          if (t.includes('7–9 AM'))  return hour >= 7 && hour < 9;
          if (t.includes('9–11 AM')) return hour >= 9 && hour < 11;
          if (t.includes('11 AM–1 PM')) return hour >= 11 && hour < 13;
          if (t.includes('1–3 PM'))  return hour >= 13 && hour < 15;
          if (t.includes('3–5 PM'))  return hour >= 15 && hour < 17;
          if (t.includes('5–7 PM'))  return hour >= 17 && hour < 19;
          if (t.includes('7–9 PM'))  return hour >= 19 && hour < 21;
          return false;
        });
      });
    }

    const list = document.getElementById('routes-list');
    if (list) list.innerHTML = routes.map(buildRouteCard).join('') || emptyState('No routes match your filter');
    toast('Filter applied', 'success');

    // Show/update clear button
    updateClearFilterBtn();
  } catch (e) { toast(e.message, 'error'); }
}

function updateClearFilterBtn() {
  let existing = document.getElementById('clear-filters-btn');
  const hasFilters = savedFilters.departure || savedFilters.arrival || savedFilters.dateFrom ||
                     savedFilters.dateTo || savedFilters.time.length || savedFilters.seats;
  if (hasFilters && !existing) {
    const bar = document.querySelector('#tab-available .filter-bar');
    if (bar) {
      const btn = document.createElement('div');
      btn.id = 'clear-filters-btn';
      btn.className = 'filter-chip';
      btn.style.cssText = 'background:var(--error);color:white;border-color:var(--error);cursor:pointer';
      btn.textContent = '✕ Clear All';
      btn.onclick = clearAllFilters;
      bar.appendChild(btn);
    }
  } else if (!hasFilters && existing) {
    existing.remove();
  }
}

async function clearAllFilters() {
  savedFilters = { departure:'', arrival:'', dateFrom:'', dateTo:'', time:[], seats:'' };
  const btn = document.getElementById('clear-filters-btn');
  if (btn) btn.remove();
  try {
    const routes = await api('GET', '/routes', null, false);
    const list = document.getElementById('routes-list');
    if (list) list.innerHTML = routes.map(buildRouteCard).join('') || emptyState('No routes found');
    toast('Filters cleared', 'success');
  } catch (e) { toast(e.message, 'error'); }
}
```

**Step 3: Update `openFilterPanel()`** to restore saved values. Find the function (around line 339) and replace its body. Keep the function signature:
```javascript
function openFilterPanel(type) {
  activeFilter = type;
  const titles = { departure: 'Filter by Departure City', arrival: 'Filter by Arrival City', date: 'Filter by Date Range', time: 'Filter by Departure Time of Day', seats: 'Minimum Seats' };
  document.getElementById('fp-title').textContent = titles[type];
  let html = '';
  if (type === 'departure' || type === 'arrival') {
    const savedCity = type === 'departure' ? savedFilters.departure : savedFilters.arrival;
    html = `<input style="width:100%;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px;font-size:.9rem;outline:none;color:var(--navy-dark)" placeholder="Search city..." oninput="fpCitySearch(this,'fp-cities')">
    <div id="fp-cities" style="border:1px solid var(--gray-200);border-radius:8px;margin-top:6px;max-height:200px;overflow-y:auto"></div>
    <div id="fp-selected" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      ${savedCity ? `<div class="filter-chip active" data-city="${savedCity}">${savedCity} <span onclick="this.parentElement.remove()" style="cursor:pointer;margin-left:4px">✕</span></div>` : ''}
    </div>`;
  } else if (type === 'date') {
    html = `<p style="font-size:.8rem;color:var(--gray-400);margin-bottom:10px">Shows routes departing within this date range.</p>
    <div class="two-col"><div><div class="form-label" style="color:var(--navy);font-size:.75rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px">From</div><input type="date" style="width:100%;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;padding:10px;font-size:.9rem;color:var(--navy-dark)" id="fp-date-from" value="${savedFilters.dateFrom}"></div>
    <div><div class="form-label" style="color:var(--navy);font-size:.75rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px">To</div><input type="date" style="width:100%;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;padding:10px;font-size:.9rem;color:var(--navy-dark)" id="fp-date-to" value="${savedFilters.dateTo}"></div></div>`;
  } else if (type === 'time') {
    html = `<p style="font-size:.82rem;color:var(--gray-400);margin-bottom:10px">Filter by departure time of day:</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${TIMES.map(t => {
      const isActive = savedFilters.time.includes(t);
      return `<div style="padding:8px 6px;text-align:center;border:1px solid ${isActive ? 'var(--gold)' : 'var(--gray-200)'};border-radius:8px;font-size:.78rem;cursor:pointer;transition:var(--transition);background:${isActive ? 'var(--gold)' : ''};color:${isActive ? 'var(--navy-dark)' : ''}" class="${isActive ? 'active' : ''}" onclick="this.classList.toggle('active');this.style.background=this.classList.contains('active')?'var(--gold)':'';this.style.color=this.classList.contains('active')?'var(--navy-dark)':'';this.style.borderColor=this.classList.contains('active')?'var(--gold)':'var(--gray-200)';">${t}</div>`;
    }).join('')}</div>`;
  } else if (type === 'seats') {
    html = `<input type="number" min="1" max="44" placeholder="e.g. 4" style="width:100%;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px;font-size:.9rem;color:var(--navy-dark)" id="fp-seats" value="${savedFilters.seats}">`;
  }
  document.getElementById('fp-body').innerHTML = html;
  document.getElementById('filter-panel-overlay').style.display = 'block';
}
```

**Done when:**
- Select departure = Dallas → close panel → reopen → Dallas still shown.
- Time of Day selections persist across open/close.
- "Clear All" button appears when filters are active and resets everything.

---

### Task 2.4 — Fix date filter backend to support date ranges `P0`

**File:** `routes/routes.js`

**Problem:** Line 31 does `departure_date = $date` (exact match). It should support a date range.

**Find this code** (around line 26-33):
```javascript
    const { from, to, date, min_seats, route_number } = req.query;
    let sql = `SELECT * FROM routes WHERE status != 'cancelled'`;
    const params = [];
    let i = 1;
    if (from)         { sql += ` AND LOWER(from_city) LIKE $${i++}`;   params.push(`%${from.toLowerCase()}%`); }
    if (to)           { sql += ` AND LOWER(to_city) LIKE $${i++}`;     params.push(`%${to.toLowerCase()}%`);   }
    if (date)         { sql += ` AND departure_date = $${i++}`;         params.push(date);                      }
```

**Replace with:**
```javascript
    const { from, to, date, date_from, date_to, min_seats, route_number } = req.query;
    let sql = `SELECT * FROM routes WHERE status != 'cancelled'`;
    const params = [];
    let i = 1;
    if (from)         { sql += ` AND LOWER(from_city) LIKE $${i++}`;   params.push(`%${from.toLowerCase()}%`); }
    if (to)           { sql += ` AND LOWER(to_city) LIKE $${i++}`;     params.push(`%${to.toLowerCase()}%`);   }
    if (date)         { sql += ` AND departure_date = $${i++}`;         params.push(date);                      }
    if (date_from)    { sql += ` AND departure_date >= $${i++}`;        params.push(date_from);                  }
    if (date_to)      { sql += ` AND departure_date <= $${i++}`;        params.push(date_to);                    }
```

**Done when:** Setting date range April 10–15 returns all routes departing within that range.

---

### Task 2.5 — Fix route request filters `P0`

**File:** `public/app.js`

**Problem:** The route requests tab (lines 244-249) uses `openFilterPanel()` which calls `applyFilterPanel()`, but that function only re-fetches and re-renders the **routes list** (`#routes-list`), NOT the requests list (`#req-list`). So route request filters have zero effect.

**Fix:** Modify `applyFilterPanel()` to detect which tab is active and filter accordingly.

**Find the beginning of `applyFilterPanel()`** (which you rewrote in Task 2.3). At the top, after saving filter values, add a tab detection check:

**Find this line inside `applyFilterPanel()`:**
```javascript
  closeFilterPanel();
```

**Add right after it:**
```javascript
  // Check which tab is active — if requests tab, filter requests instead
  const reqTabActive = document.getElementById('tab-requested')?.classList.contains('active');
  if (reqTabActive) {
    applyRequestFilters();
    return;
  }
```

**Then add this new function** right after `clearAllFilters()`:
```javascript
function applyRequestFilters() {
  const reqList = document.getElementById('req-list');
  if (!reqList || !S.requests) return;

  let filtered = S.requests;

  if (savedFilters.departure) {
    filtered = filtered.filter(r => r.from_city.toLowerCase().includes(savedFilters.departure.toLowerCase()));
  }
  if (savedFilters.arrival) {
    filtered = filtered.filter(r => r.to_city.toLowerCase().includes(savedFilters.arrival.toLowerCase()));
  }
  if (savedFilters.dateFrom) {
    filtered = filtered.filter(r => r.requested_date >= savedFilters.dateFrom);
  }
  if (savedFilters.dateTo) {
    filtered = filtered.filter(r => r.requested_date <= savedFilters.dateTo);
  }

  reqList.innerHTML = filtered.map(buildReqCard).join('') || emptyState('No requests match your filter');
  toast('Filter applied', 'success');
  updateClearFilterBtn();
}
```

**Done when:** Filtering by departure city on the "Route Requests" tab actually narrows the request list.

---

### Task 2.6 — Fix Time of Day button turning invisible `P1`

**File:** `public/app.js`

**Problem:** The Time of Day filter chip in `buildRoutesPage()` (line 236) doesn't have special styling, but the generic `.filter-chip` onclick toggle may set colors to white. The issue is in `openFilterPanel()` for the `time` type — the inline `onclick` on the time slot divs sets `this.style.color` and `this.style.background` but on the filter chips themselves there's a possible CSS issue where active state has white text on white background.

**This was already fixed in Task 2.3** by rewriting `openFilterPanel()` with proper styling for the time slots. Verify the fix by clicking the "🕐 Time of Day" chip, closing the panel, and confirming the chip remains visible. If it still turns invisible, the issue is in CSS. Search `index.html` for `.filter-chip` styles:

```bash
grep -n "filter-chip" public/index.html
```

Look for a rule like `.filter-chip:active` or `.filter-chip:focus` that sets `color: white` or `background: white`. Fix it to use the proper colors:
```css
.filter-chip:active, .filter-chip:focus {
  background: var(--gold);
  color: var(--navy-dark);
  border-color: var(--gold);
}
```

**Done when:** Clicking Time of Day filter chip and clicking away keeps the button visible.

---
---

# SECTION 3: ROUTE REQUESTS

---

### Task 3.1 — Add year to route request dates `P3`

**File:** `public/app.js`

**Problem:** `buildReqCard()` (line 307) shows `r.requested_date` raw — no year formatting.

**Find this line:**
```javascript
      <div class="text-sm text-muted">${r.requested_date || 'Flexible'} · ${r.requested_time || 'Any time'}</div>
```

**Replace with:**
```javascript
      <div class="text-sm text-muted">${r.requested_date ? new Date(r.requested_date + 'T00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'Flexible'} · ${r.requested_time || 'Any time'}</div>
```

**Done when:** Route request cards show dates like "Mar 15, 2026" instead of "2026-03-15".

---

### Task 3.2 — Fix "search city" placeholder contrast `P2`

**File:** `public/app.js`

**Problem:** In `showRequestStep()`, the departure input (line 1424) and arrival input (line 1429) have `placeholder="Search city..."` but the placeholder color is too close to the background.

**Find these lines** (around 1424 and 1429):
```javascript
style="color:var(--navy-dark);background:var(--gray-100)" id="req-from" placeholder="Search city..."
```

**In `public/index.html`, add a CSS rule.** Find the `<style>` tag and add:
```css
#req-from::placeholder, #req-to::placeholder {
  color: #6b7280;
  opacity: 1;
}
```

OR, simpler — in `app.js`, change the placeholder text color inline. This won't work for `::placeholder` via inline styles, so the CSS approach above is better.

**Done when:** The "Search city..." text is clearly readable on the gray background.

---

### Task 3.3 — Fix bidirectional time auto-estimation `P1`

**File:** `public/app.js`

**Problem:** `updateReqArrival()` (line 1466) updates arrival when departure changes, but there's no reverse function. Also the footnote text (line 1442) is wrong.

**Find `updateReqArrival()`** (around line 1466):
```javascript
function updateReqArrival() {
  const dep = document.getElementById('req-dep')?.value;
  if (!dep) return;
  const [h, m] = dep.split(':').map(Number);
  const arr = new Date(2000, 0, 1, h + 3, m + 30);
  const el = document.getElementById('req-arr');
  if (el) el.value = `${String(arr.getHours()).padStart(2, '0')}:${String(arr.getMinutes()).padStart(2, '0')}`;
}
```

**Add this function right after it:**
```javascript
function updateReqDeparture() {
  const arr = document.getElementById('req-arr')?.value;
  if (!arr) return;
  const [h, m] = arr.split(':').map(Number);
  const dep = new Date(2000, 0, 1, h - 3, m - 30);
  const el = document.getElementById('req-dep');
  if (el) el.value = `${String(dep.getHours()).padStart(2, '0')}:${String(dep.getMinutes()).padStart(2, '0')}`;
}
```

**Then find the arrival input in `showRequestStep()` step 4** (around line 1440):
```javascript
      <div class="form-group"><label class="form-label" style="color:var(--navy)">Est. Arrival</label><input class="form-input" type="time" style="color:var(--navy-dark);background:var(--gray-100)" id="req-arr" value="11:30"></div>
```

**Replace with** (add oninput handler):
```javascript
      <div class="form-group"><label class="form-label" style="color:var(--navy)">Est. Arrival</label><input class="form-input" type="time" style="color:var(--navy-dark);background:var(--gray-100)" id="req-arr" value="11:30" oninput="updateReqDeparture()"></div>
```

**Also find line 1442:**
```javascript
    <div class="text-xs text-muted">* Arrival auto-estimated from route distance</div>
```

**Replace with:**
```javascript
    <div class="text-xs text-muted">* Arrival and Departure auto-estimated from route distance</div>
```

**Done when:** Changing arrival updates departure. Changing departure still updates arrival. Footnote text is updated.

---

### Task 3.4 — Show times on Review page `P2`

**File:** `public/app.js`

**Problem:** The review step (step 5, around line 1445-1451) only shows `🕐 ${S.reqData.requested_time || 'Flexible'}` — doesn't show departure and arrival separately or time of day.

**First, capture arrival time in `reqNext()`.** Find around line 1461:
```javascript
  if (S.reqStep === 4) S.reqData.requested_time = document.getElementById('req-dep')?.value;
```

**Replace with:**
```javascript
  if (S.reqStep === 4) {
    S.reqData.requested_time = document.getElementById('req-dep')?.value;
    S.reqData.arrival_time = document.getElementById('req-arr')?.value;
  }
```

**Then find the review step** (around line 1445-1448):
```javascript
  else if (S.reqStep === 5) html += `<div class="section-title">Review Your Request</div>
    <div style="background:var(--gray-100);border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--navy);margin-bottom:10px">${S.reqData.from_city || '?'} → ${S.reqData.to_city || '?'}</div>
      <div class="text-sm text-muted">📅 ${S.reqData.requested_date || 'Flexible'} · 🕐 ${S.reqData.requested_time || 'Flexible'}</div>
    </div>
```

**Replace with:**
```javascript
  else if (S.reqStep === 5) {
    const depTime = S.reqData.requested_time || 'Flexible';
    const arrTime = S.reqData.arrival_time || 'Flexible';
    function timeOfDay(t) {
      if (!t || t === 'Flexible') return '';
      const h = parseInt(t.split(':')[0]);
      if (h >= 5 && h < 12) return 'Morning';
      if (h >= 12 && h < 17) return 'Afternoon';
      if (h >= 17 && h < 21) return 'Evening';
      return 'Night';
    }
    html += `<div class="section-title">Review Your Request</div>
    <div style="background:var(--gray-100);border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--navy);margin-bottom:10px">${S.reqData.from_city || '?'} → ${S.reqData.to_city || '?'}</div>
      <div class="text-sm text-muted" style="margin-bottom:8px">📅 ${S.reqData.requested_date || 'Flexible'}</div>
      <div style="display:flex;gap:20px">
        <div><div class="text-xs text-muted">DEPARTURE</div><div style="font-weight:600;color:var(--navy)">${depTime}${timeOfDay(depTime) ? ' ('+timeOfDay(depTime)+')' : ''}</div></div>
        <div><div class="text-xs text-muted">ARRIVAL</div><div style="font-weight:600;color:var(--navy)">${arrTime}${timeOfDay(arrTime) ? ' ('+timeOfDay(arrTime)+')' : ''}</div></div>
      </div>
    </div>`;
  }
```

Don't forget to also keep the back/submit buttons that follow. Find:
```javascript
    <div style="display:flex;gap:10px"><button class="btn btn-sm" style="background:var(--gray-100);color:var(--navy)" onclick="reqBack()">← Edit</button>
    <button class="btn btn-gold btn-full btn-lg" id="post-req-btn" onclick="postRequest()">Post Request</button></div>`;
```

Make sure that still follows the review block (before the closing `html += '</div>'`).

**Done when:** The review page shows departure time, arrival time, and time of day labels for each.

---

### Task 3.5 — Prevent self-supporting a route request `P1`

**Files:** `routes/api.js` (backend) + `public/app.js` (frontend)

**Problem:** When a user creates a request, `POST /requests` (api.js line 78-89) sets `supporter_count=1` but does NOT insert into `route_request_supports`. So when that user clicks "Support" on their own request, the backend check on line 93 (`SELECT 1 FROM route_request_supports WHERE ...`) finds nothing and lets it through.

**Backend fix in `routes/api.js`.** Find around line 84-87:
```javascript
    await run(
      `INSERT INTO route_requests (id,requester_id,from_city,to_city,requested_date,requested_time,supporter_count,status) VALUES ($1,$2,$3,$4,$5,$6,1,'open')`,
      [id, req.user.id, from_city, to_city, requested_date||'', requested_time||'']
    );
```

**Add right after that INSERT:**
```javascript
    // Record creator as a supporter so they can't support again
    await run('INSERT INTO route_request_supports VALUES ($1,$2)', [id, req.user.id]);
```

**Frontend fix in `public/app.js`.** Find `buildReqCard()` (around line 303). The "Support Route" button (line 313) should be disabled if the current user created the request.

**Find line 313:**
```javascript
    <button class="btn btn-outline-gold btn-sm" id="rbtn-${r.id}" onclick="supportRequest('${r.id}')">Support Route</button>
```

**Replace with:**
```javascript
    ${S.user && r.requester_id === S.user.id
      ? `<button class="btn btn-sm" style="background:var(--gray-200);color:var(--gray-500);cursor:default" disabled>Your Request</button>`
      : `<button class="btn btn-outline-gold btn-sm" id="rbtn-${r.id}" onclick="supportRequest('${r.id}')">Support Route</button>`}
```

**Done when:** The creator sees "Your Request" (disabled) instead of "Support Route" on their own request.

---

### Task 3.6 — Add Cancel button to every request wizard step `P2`

**File:** `public/app.js`

**Problem:** Steps 1-4 of `showRequestStep()` have Back/Next but no Cancel.

**For each step (1 through 4)**, find the button row and add a Cancel button. The pattern is the same for each step.

**Step 1** (around line 1426) — find:
```javascript
    <button class="btn btn-gold mt-16" style="margin-top:16px" onclick="reqNext()">Next →</button>`;
```

**Replace with:**
```javascript
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-sm" style="background:var(--gray-100);color:var(--error)" onclick="cancelRequest()">Cancel</button><button class="btn btn-gold" onclick="reqNext()">Next →</button></div>`;
```

**Steps 2-4** already have a `<div style="display:flex;gap:10px;margin-top:16px">` wrapper. For each, add the Cancel button at the start. Find lines like:
```javascript
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-sm" style="background:var(--gray-100);color:var(--navy)" onclick="reqBack()">← Back</button><button class="btn btn-gold" onclick="reqNext()">Next →</button></div>`;
```

**Replace with:**
```javascript
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-sm" style="background:var(--gray-100);color:var(--error)" onclick="cancelRequest()">Cancel</button><button class="btn btn-sm" style="background:var(--gray-100);color:var(--navy)" onclick="reqBack()">← Back</button><button class="btn btn-gold" onclick="reqNext()">Next →</button></div>`;
```

**Step 5 (review)** — also add Cancel before "← Edit":
```javascript
    <div style="display:flex;gap:10px"><button class="btn btn-sm" style="background:var(--gray-100);color:var(--error)" onclick="cancelRequest()">Cancel</button><button class="btn btn-sm" style="background:var(--gray-100);color:var(--navy)" onclick="reqBack()">← Edit</button>
```

**Add the `cancelRequest()` function** (after `reqBack()`):
```javascript
function cancelRequest() {
  if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
    S.reqStep = 1;
    S.reqData = {};
    pTab('routes');
  }
}
```

**Done when:** Every step has a red "Cancel" button. Clicking it confirms, then returns to the routes page.

---

### Task 3.7 — Show departure/arrival times on each request card `P2`

**File:** `public/app.js`

**Problem:** `buildReqCard()` (line 303) doesn't show times clearly.

**Find this line** (around line 307):
```javascript
      <div class="text-sm text-muted">${r.requested_date || 'Flexible'} · ${r.requested_time || 'Any time'}</div>
```

**Replace with** (reuse the year formatting from Task 3.1):
```javascript
      <div class="text-sm text-muted">${r.requested_date ? new Date(r.requested_date + 'T00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'Flexible'}</div>
      <div class="text-xs text-muted" style="margin-top:2px">🕐 Departs: ${r.requested_time || 'Any'}</div>
```

**Done when:** Each route request card shows date with year and departure time.

---
---

# SECTION 4: MY TICKETS

---

### Task 4.1 — Fix "Past" tab + rename tabs `P1`

**File:** `public/app.js`

**Problem:** `buildTicketsPage()` (line 613) renders the "Past" tab as a plain `<div>` with no `onclick` handler. The tab names also need to change to "Active Tickets" and "Former Tickets".

**Find this line** (around line 613):
```javascript
  <div class="tabs"><div class="tab active">Upcoming</div><div class="tab">Past</div></div>
```

**Replace with:**
```javascript
  <div class="tabs"><div class="tab active" onclick="switchTicketTab('upcoming')">Active Tickets</div><div class="tab" onclick="switchTicketTab('past')">Former Tickets</div></div>
```

**Then find the bookings rendering** (around line 614-634) — the `<div style="display:flex;flex-direction:column;gap:12px">` block that maps all bookings. Wrap it with an ID:

Replace the opening div:
```javascript
  <div style="display:flex;flex-direction:column;gap:12px">
```
with:
```javascript
  <div style="display:flex;flex-direction:column;gap:12px" id="tickets-list">
```

**Add this function** (after `buildTicketsPage()`):
```javascript
function switchTicketTab(tab) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const list = document.getElementById('tickets-list');
  if (!list) return;
  const bookings = S.allBookings || [];
  const now = new Date();
  let filtered;
  if (tab === 'past') {
    filtered = bookings.filter(b => new Date(b.departure_date) < now);
    if (!filtered.length) {
      list.innerHTML = emptyState('No former tickets. Your completed trips will appear here.');
      return;
    }
  } else {
    filtered = bookings.filter(b => new Date(b.departure_date) >= now);
    if (!filtered.length) {
      list.innerHTML = emptyState('No active tickets — book a route!');
      return;
    }
  }
  list.innerHTML = filtered.map(b => buildTicketCard(b)).join('');
}
```

**Also, save bookings to state.** Find `renderTickets()` (around line 602):
```javascript
async function renderTickets() {
  try {
    const bookings = await api('GET', '/bookings/mine');
    document.getElementById('p-content').innerHTML = buildTicketsPage(bookings);
  } catch (e) { toast(e.message, 'error'); }
}
```

**Replace with:**
```javascript
async function renderTickets() {
  try {
    const bookings = await api('GET', '/bookings/mine');
    S.allBookings = bookings;
    document.getElementById('p-content').innerHTML = buildTicketsPage(bookings);
  } catch (e) { toast(e.message, 'error'); }
}
```

**You'll also need to extract the ticket card HTML into its own function** for reuse. Find the `bookings.map(b => ...)` template inside `buildTicketsPage()` (lines 615-634). Extract it:

Add this function right before `buildTicketsPage()`:
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
      <div style="display:flex;gap:14px;font-size:.78rem;color:var(--gray-400)"><span>📅 ${b.departure_date}</span><span>💺 Seat ${b.seat_number}</span><span>🧑‍✈️ ${b.driver_name}</span></div>
    </div>
    <div style="background:var(--navy);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;gap:8px">
      <div style="font-size:.6rem;color:rgba(255,255,255,.5);letter-spacing:.08em">SCAN</div>
      ${miniQR()}
      <div style="font-size:.58rem;color:rgba(255,255,255,.4)">${b.route_number}</div>
    </div>
  </div>`;
}
```

Then in `buildTicketsPage()`, replace `${bookings.map(b => ... big template ...).join('')}` with `${bookings.map(b => buildTicketCard(b)).join('')}`.

**Done when:** Clicking "Former Tickets" switches the view (or shows empty state). Tabs read "Active Tickets" / "Former Tickets".

---

### Task 4.2 — Fix QR Codes `P0`

**File:** `public/app.js`

**Problem:** `miniQR()` (line 638) and the QR in `openTicket()` (line 652) generate RANDOM pixel patterns. They are not real QR codes.

**Step 1:** Install a QR code library. Add to `public/index.html` before the closing `</body>` tag:
```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
```

**Step 2:** Replace `miniQR()` with a function that generates a real QR. Find around line 638:
```javascript
function miniQR() {
  const cells = Array.from({ length: 49 }, (_, i) => [0,1,2,...].includes(i) ? 1 : Math.random() > 0.5 ? 1 : 0);
  return `<div style="display:grid;...`;
}
```

**Replace with:**
```javascript
function miniQR(bookingId) {
  // Returns a canvas placeholder — actual QR rendered after DOM insert
  return `<canvas id="qr-mini-${bookingId || 'x'}" width="60" height="60" style="border-radius:5px"></canvas>`;
}
```

**Step 3:** In `buildTicketCard()` (which you created in Task 4.1), change the `${miniQR()}` call to pass the booking ID:
```javascript
${miniQR(b.id)}
```

**Step 4:** Render QR codes after the ticket list is inserted into the DOM. In `renderTickets()`, add a post-render step:
```javascript
async function renderTickets() {
  try {
    const bookings = await api('GET', '/bookings/mine');
    S.allBookings = bookings;
    document.getElementById('p-content').innerHTML = buildTicketsPage(bookings);
    // Render real QR codes
    bookings.forEach(b => {
      const canvas = document.getElementById(`qr-mini-${b.id}`);
      if (canvas && typeof QRCode !== 'undefined') {
        QRCode.toCanvas(canvas, `dormtohome:ticket:${b.id}`, { width: 60, margin: 1, color: { dark: '#0B1D3A', light: '#FFFFFF' } });
      }
    });
  } catch (e) { toast(e.message, 'error'); }
}
```

**Step 5:** Fix the large QR in `openTicket()`. Find around line 650-658 (the big random grid):
```javascript
    <div style="background:white;padding:16px;border-radius:12px">
        <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:2px;width:144px;height:144px">
          ${Array.from({length:81},(_,i) => {
```

**Replace that entire block with:**
```javascript
    <div style="background:white;padding:16px;border-radius:12px;display:flex;align-items:center;justify-content:center">
        <canvas id="qr-ticket-large" width="144" height="144"></canvas>
    </div>
```

**Then at the END of `openTicket()`**, after `openModal('modal-ticket');`, add:
```javascript
  setTimeout(() => {
    const canvas = document.getElementById('qr-ticket-large');
    if (canvas && typeof QRCode !== 'undefined') {
      QRCode.toCanvas(canvas, `dormtohome:ticket:${id}`, { width: 144, margin: 1, color: { dark: '#0B1D3A', light: '#FFFFFF' } });
    }
  }, 100);
```

**Done when:** Ticket QR codes are real, scannable QR codes encoding the booking ID.

---
---

# SECTION 5: CORE FEATURES

---

### Task 5.1 — Messages, Payments, Notifications status check `P0`

**File:** `public/app.js`

**What to check:** These features have backend endpoints that already exist:
- Messages: `GET/POST /api/messages/:routeId` (api.js lines 104-125) — **backend exists and works**
- Notifications: `GET /api/notifications` (api.js lines 129-141) — **backend exists and works**
- Payments: **No backend endpoint exists**

**For Messages:** The chat system uses Socket.io. Check if the socket connection is working. The issue may be that messages only work when you have an active booking on a route. If the user has no bookings, the messages page will be empty. This is by design. Verify the `renderPassengerMessages()` function works when the user has bookings.

**For Payments:** There is no payment processing system. Add a placeholder. Find `pTab()` (around line 166-178). There is no `payments` tab handler. If there's a payments link in the UI, make sure it shows a "coming soon" message. Search index.html for "payment" to find the nav item.

**For Notifications:** These already work via `openNotifs()` (around line 1490). Verify they load when clicking the notification bell.

**Done when:** Messages work for users with bookings. Payments shows a clear "coming soon" state. Notifications load.

---
---

# SECTION 6: ACCOUNT SETTINGS

---

### Task 6.1 — Remove passenger checkpoint notification checkbox `P1`

**File:** `public/app.js`

**Problem:** `buildAccountPage()` (line 807) lists "Checkpoint updates" as a notification toggle for passengers. Only guardians should get this.

**Find this line** (around line 807):
```javascript
        ${[['Arrival alerts (15 min)','notif-arrival'],['Checkpoint updates','notif-cp'],['New route alerts','notif-routes'],['Chat messages','notif-chat']].map(([label,id])=>`
```

**Replace with** (remove the checkpoint entry):
```javascript
        ${[['Arrival alerts (15 min)','notif-arrival'],['New route alerts','notif-routes'],['Chat messages','notif-chat']].map(([label,id])=>`
```

**Done when:** The passenger account settings page no longer shows "Checkpoint updates" toggle.

---

### Task 6.2 — Validate phone number changes in account settings `P1`

**File:** `public/app.js`

**Problem:** `saveProfile()` (around line 862) sends phone to the backend with no validation.

**Find `saveProfile()`:**
```javascript
async function saveProfile() {
  try {
    await api('PUT', '/auth/me', {
      first_name: document.getElementById('acc-first').value,
      last_name: document.getElementById('acc-last').value,
      phone: document.getElementById('acc-phone').value,
    });
    toast('Profile saved', 'success');
  } catch (e) { toast(e.message, 'error'); }
}
```

**Replace with:**
```javascript
async function saveProfile() {
  const phone = document.getElementById('acc-phone').value;
  if (phone && !isValidPhone(phone)) {
    toast('Please enter a valid 10-digit phone number', 'error');
    return;
  }
  try {
    await api('PUT', '/auth/me', {
      first_name: document.getElementById('acc-first').value,
      last_name: document.getElementById('acc-last').value,
      phone: phone,
    });
    toast('Profile saved', 'success');
  } catch (e) { toast(e.message, 'error'); }
}
```

Note: `isValidPhone` was added in Task 1.1.

**Done when:** Entering "abc" as phone and saving shows an error toast.

---

### Task 6.3 — Add guardian editing capability `P1`

**File:** `public/app.js`

**Problem:** `buildGuardianCard()` (line 845) only has a "Remove" button. No way to edit name/email/phone. Also the checkpoint label says "Checkpoints" instead of "Send Checkpoint Notifications".

**Find `buildGuardianCard()`** (around line 845-859). Replace the entire function:
```javascript
function buildGuardianCard(g) {
  const contactInfo = [g.email, g.phone].filter(Boolean).join(' · ');
  return `<div class="guardian-card" id="gc-${g.id}">
    <div style="width:36px;height:36px;border-radius:50%;background:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="var(--gold-light)" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg></div>
    <div style="flex:1">
      <div style="font-weight:500;font-size:.9rem;color:var(--navy)">${g.name}</div>
      <div class="text-xs text-muted">${contactInfo}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
        <div class="checkbox ${g.checkpoint_notifs ? 'checked' : ''}" onclick="toggleGuardianNotif('${g.id}',this)"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,6 5,9 10,3"/></svg></div>
        <span class="text-xs text-muted">Send Checkpoint Notifications</span>
        <button class="help-icon" onclick="showHelp('checkpoint')">?</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      <button class="btn btn-outline-gold btn-sm" onclick="editGuardian('${g.id}','${g.name}','${g.email || ''}','${g.phone || ''}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteGuardian('${g.id}','${g.name}')">Remove</button>
    </div>
  </div>`;
}
```

**Add these new functions** (after `toggleGuardianNotif`):
```javascript
function editGuardian(id, name, email, phone) {
  const card = document.getElementById(`gc-${id}`);
  if (!card) return;
  card.innerHTML = `
    <div style="width:100%;background:var(--gray-100);border-radius:10px;padding:14px">
      <div class="form-group"><label class="form-label" style="color:var(--navy)">Name</label><input class="form-input" style="color:var(--navy-dark);background:white" id="ge-name-${id}" value="${name}"></div>
      <div class="two-col" style="margin-top:8px">
        <div class="form-group"><label class="form-label" style="color:var(--navy)">Email</label><input class="form-input" style="color:var(--navy-dark);background:white" id="ge-email-${id}" value="${email}" type="email"></div>
        <div class="form-group"><label class="form-label" style="color:var(--navy)">Phone</label><input class="form-input" style="color:var(--navy-dark);background:white" id="ge-phone-${id}" value="${phone}"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-gold btn-sm" onclick="saveGuardianEdit('${id}')">Save</button>
        <button class="btn btn-sm" style="background:var(--gray-200);color:var(--gray-600)" onclick="renderPassengerAccount()">Cancel</button>
      </div>
    </div>`;
}

async function saveGuardianEdit(id) {
  const name = document.getElementById(`ge-name-${id}`).value;
  const email = document.getElementById(`ge-email-${id}`).value;
  const phone = document.getElementById(`ge-phone-${id}`).value;

  if (email && !isValidEmail(email)) { toast('Invalid guardian email', 'error'); return; }
  if (phone && !isValidPhone(phone)) { toast('Invalid guardian phone number', 'error'); return; }
  if (!name.trim()) { toast('Guardian name is required', 'error'); return; }

  try {
    await api('PATCH', `/guardians/${id}`, { name, email, phone });
    toast('Guardian updated', 'success');
    renderPassengerAccount(); // Re-render the whole page to show updated data
  } catch (e) { toast(e.message, 'error'); }
}
```

Note: The backend `PATCH /guardians/:id` endpoint already exists (api.js line 168-180), so no backend changes needed.

**Done when:** Each guardian has an "Edit" button. Clicking it shows inline edit fields. Save validates and persists. Label says "Send Checkpoint Notifications".

---

### Task 6.4 — Validate email/phone when adding a new guardian `P1`

**File:** `public/app.js`

**Problem:** `saveGuardian()` (around line 875) sends data without validation.

**Find `saveGuardian()`:**
```javascript
async function saveGuardian() {
  try {
    const g = await api('POST', '/guardians', {
```

**Add validation at the top:**
```javascript
async function saveGuardian() {
  const name = document.getElementById('g-add-name').value;
  const email = document.getElementById('g-add-email').value;
  const phone = document.getElementById('g-add-phone').value;

  if (!name.trim()) { toast('Guardian name is required', 'error'); return; }
  if (email && !isValidEmail(email)) { toast('Invalid guardian email', 'error'); return; }
  if (phone && !isValidPhone(phone)) { toast('Invalid guardian phone number', 'error'); return; }

  try {
    const g = await api('POST', '/guardians', {
      name: name,
      email: email,
      phone: phone,
      checkpoint_notifs: document.getElementById('g-add-cp').classList.contains('checked'),
    });
```

Also add server-side validation. In `routes/api.js`, find `router.post('/guardians', ...)` (line 151-158). Add after `const { name, email, phone, checkpoint_notifs } = req.body;`:
```javascript
    if (!name || !name.trim()) return res.status(400).json({ error: 'Guardian name is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && email.trim() && !emailRegex.test(email.trim()))
      return res.status(400).json({ error: 'Invalid guardian email format' });
    if (phone && phone.trim()) {
      const digits = phone.replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^1?\d{10}$/.test(digits))
        return res.status(400).json({ error: 'Invalid guardian phone number' });
    }
```

**Done when:** Adding a guardian with email "abc" shows an error. Server also rejects it.

---

### Task 6.5 — Confirmation dialog for removing a guardian `P2`

**File:** `public/app.js`

**Problem:** `deleteGuardian()` (line 889) immediately deletes with no confirmation.

In Task 6.3 we already changed the button to call `confirmDeleteGuardian()` instead of `deleteGuardian()`. Now add that function:

```javascript
function confirmDeleteGuardian(id, name) {
  if (confirm(`Are you sure you want to remove ${name} as your guardian? They will no longer receive checkpoint notifications.`)) {
    deleteGuardian(id);
  }
}
```

**Done when:** Clicking Remove shows a browser confirm dialog. Only proceeds on "OK".

---

### Task 6.6 — Add payment method placeholder `P2`

**File:** `public/app.js`

**Problem:** No payment method section in account settings.

**Find `buildAccountPage()`** (around line 789). Inside the right column, after the guardian card section (after `</div>` closing the guardian card around line 840), add:

Find the closing `</div>` of the guardian card section:
```javascript
      </div>
    </div>
  </div>`;
}
```

**Before the last `</div></div>`, add:**
```javascript
      <div class="card">
        <div class="section-title">Payment Methods</div>
        <div style="text-align:center;padding:20px;color:var(--gray-400)">
          <div style="font-size:2rem;margin-bottom:8px">💳</div>
          <div class="text-sm text-muted">Payment method setup coming soon.</div>
          <div class="text-xs text-muted" style="margin-top:4px">You'll be able to securely add and manage payment methods here.</div>
        </div>
      </div>
```

**Done when:** A "Payment Methods" section appears in account settings with a "coming soon" message.

---
---

# EXECUTION ORDER

**Round 1 — P0 (Critical):**
1. Task 2.3 — Filter state persistence
2. Task 2.4 — Date filter backend range support
3. Task 2.5 — Route request filters
4. Task 4.2 — QR codes
5. Task 5.1 — Messages/Payments/Notifications check

**Round 2 — P1 (High):**
6. Task 1.1 — Sign-up validation (frontend)
7. Task 1.3 — Sign-up validation (backend)
8. Task 1.4 — Rate limiting
9. Task 2.6 — Time of Day button visibility
10. Task 3.3 — Bidirectional time estimation
11. Task 3.5 — Prevent self-support
12. Task 4.1 — Past tab + rename
13. Task 6.1 — Remove passenger checkpoint checkbox
14. Task 6.2 — Phone validation in settings
15. Task 6.3 — Guardian editing
16. Task 6.4 — New guardian validation

**Round 3 — P2 (Medium):**
17. Task 1.2 — Login email validation
18. Task 2.1 — Remove premium rows
19. Task 2.2 — Remove "For You" button
20. Task 3.2 — Placeholder contrast
21. Task 3.4 — Times on review page
22. Task 3.6 — Cancel button on wizard
23. Task 3.7 — Times on request cards
24. Task 6.5 — Guardian removal confirmation
25. Task 6.6 — Payment method placeholder

**Round 4 — P3 (Low):**
26. Task 3.1 — Year on request dates

---

# NOTES FOR THE AGENT

- **All frontend code is in one file:** `public/app.js`. There is no build step — edits are live.
- **All HTML is in one file:** `public/index.html`. CSS is embedded in `<style>` tags there.
- **Validation helpers** (`isValidEmail`, `isValidPhone`) are added in Task 1.1. Every later task that uses them depends on Task 1.1 being done first.
- **Line numbers will drift** as you edit. Always `grep -n "SEARCH_TEXT" public/app.js` to find the current line before editing.
- **Do not rename functions** unless the task says to. Other code may call them.
- **Test after each task.** Run `npm start` and verify in browser.
- **Commit after each round** with a message like: `fix: P0 critical bugs — filters, QR codes, date range`
