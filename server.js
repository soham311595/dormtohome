require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { initDatabase, all, get, run } = require('./db/database');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, guardianCheckpointHTML, guardianCheckinHTML, guardianDriverUpdateHTML } = require('./utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'dormtohome-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dormtohome-secret-change-in-production') {
  console.warn('\n⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production!\n');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
// Static files first — before API routes and catch-all
app.use(express.static(path.join(__dirname, 'public')));

const rateLimit = require('express-rate-limit');
const isDev = process.env.NODE_ENV !== 'production';
const signupLimiter = rateLimit({
  windowMs: isDev ? 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 1000 : 50,
  skip: (req) => isDev,
  message: { error: 'Too many accounts created. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Expose JWT_SECRET to routes via app.locals
app.locals.JWT_SECRET = JWT_SECRET;

const authRouter = require('./routes/auth');
app.post('/api/auth/register', signupLimiter);
app.use('/api/auth', authRouter);
app.use('/api/routes', require('./routes/routes'));
app.use('/api', require('./routes/api'));
app.use('/api', require('./routes/payments'));
app.post('/dev/seed-test-users', async (req, res) => {
  const devToken = req.headers['x-dev-token'] || '';
  if (devToken !== (process.env.DEV_TOKEN || 'devtoken123')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('TestPass123', 10);
    const testUsers = [
      { email: 'passenger_test@test.com', first_name: 'Test', last_name: 'Passenger', phone: '5551234567', role: 'passenger' },
      { email: 'driver_test@test.com',    first_name: 'Test', last_name: 'Driver',    phone: '5557654321', role: 'driver'    },
    ];
    const results = [];
    for (const u of testUsers) {
      const existing = await get(`SELECT id FROM users WHERE email = $1`, [u.email]);
      if (existing) {
        results.push({ email: u.email, success: true, note: 'already exists' });
        continue;
      }
      const id = uuidv4();
      await run(
        `INSERT INTO users (id,first_name,last_name,email,phone,password,"role") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, u.first_name, u.last_name, u.email, u.phone, hashed, u.role]
      );
      results.push({ email: u.email, success: true });
    }
    res.json({ message: 'Test users seeded', results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── SOCKET.IO ────────────────────────────────────────────
const connectedUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  const user = socket.user;
  connectedUsers.set(socket.id, { userId: user.id, role: user.role });

  socket.on('join_route_room',  (routeId) => socket.join(`route:${routeId}`));
  socket.on('leave_route_room', (routeId) => socket.leave(`route:${routeId}`));

  socket.on('send_message', async ({ routeId, content, reply_to_id }) => {
    if (!routeId || !content) return;
    try {
      const id = uuidv4();
      await run(`INSERT INTO messages (id,route_id,sender_id,content,message_type,reply_to_id) VALUES ($1,$2,$3,$4,'text',$5)`, [id, routeId, user.id, content, reply_to_id || null]);
      const msg = await get(`SELECT m.*, u.first_name||' '||u.last_name as sender_name, u."role" as sender_role,
        rm.content as reply_content, ru.first_name||' '||ru.last_name as reply_sender_name
        FROM messages m JOIN users u ON m.sender_id=u.id
        LEFT JOIN messages rm ON m.reply_to_id = rm.id
        LEFT JOIN users ru ON rm.sender_id = ru.id
        WHERE m.id=$1`, [id]);
      io.to(`route:${routeId}`).emit('new_message', msg);
    } catch (e) { console.error('[socket] send_message:', e.message); }
  });

  socket.on('driver_location_update', async ({ latitude, longitude, routeId }) => {
    if (user.role !== 'driver') return;
    try {
      await run(`INSERT INTO driver_location (driver_id,latitude,longitude,updated_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
          ON CONFLICT (driver_id) DO UPDATE SET latitude=$2, longitude=$3, updated_at=CURRENT_TIMESTAMP`, [user.id, latitude, longitude]);
      if (routeId) io.to(`route:${routeId}`).emit('bus_location', { driverId: user.id, latitude, longitude });
    } catch (e) { console.error('[socket] location:', e.message); }
  });

  socket.on('checkin_passenger', async ({ bookingId, routeId }) => {
    if (user.role !== 'driver') return;
    try {
      const booking = await get(`SELECT b.*, u.first_name, u.last_name, u.id as uid FROM bookings b JOIN users u ON b.passenger_id=u.id WHERE b.id=$1`, [bookingId]);
      if (!booking) return;
      await run(`INSERT INTO notifications (id,user_id,title,body,"type") VALUES ($1,$2,$3,$4,$5)`, [uuidv4(), booking.uid, 'Checked In', 'You have been checked in. Have a great ride!', 'success']);
      io.to(`route:${routeId}`).emit('passenger_checked_in', { bookingId, passengerName: `${booking.first_name} ${booking.last_name}`, seat: booking.seat_number });
      for (const [sid, info] of connectedUsers.entries()) {
        if (info.userId === booking.uid) io.to(sid).emit('new_notification', { title: 'Checked In', body: 'You have been checked in!' });
      }
      // Email guardians with check-in notifications enabled
      const route = await get(`SELECT route_number, from_city, to_city, departure_time FROM routes WHERE id=$1`, [routeId]);
      if (route) {
        const guardians = await all(`SELECT name, email FROM guardians WHERE passenger_id=$1 AND email IS NOT NULL AND email != '' AND checkin_notifs=1`, [booking.uid]);
        for (const g of guardians) {
          sendEmail(g.email, `Check-in Notification — ${route.route_number}`, guardianCheckinHTML({
            guardianName: g.name,
            passengerName: `${booking.first_name} ${booking.last_name}`,
            routeNumber: route.route_number,
            from: route.from_city,
            to: route.to_city,
            time: route.departure_time,
            seatNumber: booking.seat_number
          }));
        }
      }
    } catch (e) { console.error('[socket] checkin:', e.message); }
  });

  socket.on('driver_broadcast', async ({ routeId, message }) => {
    if (user.role !== 'driver') return;
    try {
      const passengers = await all(`SELECT DISTINCT b.passenger_id, u.first_name, u.last_name FROM bookings b JOIN users u ON b.passenger_id=u.id WHERE b.route_id=$1`, [routeId]);
      const routeInfo = await get(`SELECT route_number, from_city, to_city FROM routes WHERE id=$1`, [routeId]);
      for (const p of passengers) {
        await run(`INSERT INTO notifications (id,user_id,title,body,"type") VALUES ($1,$2,$3,$4,$5)`, [uuidv4(), p.passenger_id, 'Driver Update', message, 'alert']);
        for (const [sid, info] of connectedUsers.entries()) {
          if (info.userId === p.passenger_id) io.to(sid).emit('new_notification', { title: 'Driver Update', body: message });
        }
        if (routeInfo) {
          const guardians = await all(`SELECT name, email FROM guardians WHERE passenger_id=$1 AND email IS NOT NULL AND email != ''`, [p.passenger_id]);
          for (const g of guardians) {
            sendEmail(g.email, `Driver Update — ${routeInfo.route_number}`, guardianDriverUpdateHTML({
              guardianName: g.name,
              passengerName: `${p.first_name} ${p.last_name}`,
              routeNumber: routeInfo.route_number,
              from: routeInfo.from_city,
              to: routeInfo.to_city,
              message
            }));
          }
        }
      }
      const id = uuidv4();
      await run(`INSERT INTO messages (id,route_id,sender_id,content,message_type) VALUES ($1,$2,$3,$4,'notification')`, [id, routeId, user.id, `📢 ${message}`]);
      const msg = await get(`SELECT m.*, u.first_name||' '||u.last_name as sender_name, u."role" as sender_role FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.id=$1`, [id]);
      io.to(`route:${routeId}`).emit('new_message', msg);
    } catch (e) { console.error('[socket] broadcast:', e.message); }
  });

  socket.on('stop_completed', async ({ routeId, stopId }) => {
    if (user.role !== 'driver') return;
    try {
      await run('UPDATE route_stops SET status=$1 WHERE id=$2', ['done', stopId]);
      const stops = await all('SELECT * FROM route_stops WHERE route_id=$1 ORDER BY order_index', [routeId]);
      const doneIdx = stops.findIndex(s => s.id === stopId);
      if (doneIdx >= 0 && stops[doneIdx + 1]) await run('UPDATE route_stops SET status=$1 WHERE id=$2', ['active', stops[doneIdx + 1].id]);
      io.to(`route:${routeId}`).emit('route_progress', { stops: await all('SELECT * FROM route_stops WHERE route_id=$1 ORDER BY order_index', [routeId]) });
      const stop = stops.find(s => s.id === stopId);
      if (stop?.type === 'checkpoint') {
        const passengers = await all(`SELECT DISTINCT b.passenger_id FROM bookings b WHERE b.route_id=$1`, [routeId]);
        const routeInfo = await get('SELECT route_number, from_city, to_city, arrival_time FROM routes WHERE id=$1', [routeId]);
        for (const p of passengers) {
          await run(`INSERT INTO notifications (id,user_id,title,body,"type") VALUES ($1,$2,$3,$4,$5)`, [uuidv4(), p.passenger_id, `Checkpoint: ${stop.city}`, `Your bus has passed through ${stop.city}.`, 'info']);
          for (const [sid, info] of connectedUsers.entries()) {
            if (info.userId === p.passenger_id) io.to(sid).emit('new_notification', { title: 'Checkpoint', body: `Bus passed through ${stop.city}` });
          }
          // Email guardians with checkpoint notifications enabled
          if (routeInfo) {
            const guardians = await all(`SELECT name, email FROM guardians WHERE passenger_id=$1 AND email IS NOT NULL AND email != '' AND checkpoint_notifs=1`, [p.passenger_id]);
            for (const g of guardians) {
              sendEmail(g.email, `Checkpoint Update — ${routeInfo.route_number}`, guardianCheckpointHTML({
                guardianName: g.name,
                routeNumber: routeInfo.route_number,
                from: routeInfo.from_city,
                to: routeInfo.to_city,
                city: stop.city,
                estimatedArrival: routeInfo.arrival_time,
              }));
            }
          }
        }
      }
    } catch (e) { console.error('[socket] stop_completed:', e.message); }
  });

  socket.on('disconnect', () => connectedUsers.delete(socket.id));

  socket.on('location:start', ({ routeId }) => {
    socket.join(`route:${routeId}`);
    socket.to(`route:${routeId}`).emit('driver:online', { routeId });
  });

  socket.on('location:update', ({ routeId, lat, lng, speed, heading }) => {
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

  socket.on('route:watch', ({ routeId }) => {
    socket.join(`route:${routeId}`);
  });

  socket.on('route:unwatch', ({ routeId }) => {
    socket.leave(`route:${routeId}`);
  });
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  const { saveToDisk } = require('./db/database');
  if (saveToDisk) saveToDisk();
  server.close(() => { console.log('Server closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDatabase();
  } catch (err) {
    console.warn('⚠️  Database unavailable, running in demo mode');
    console.warn('   Reason:', err.message);
  }
  server.listen(PORT, () => {
    console.log(`\n🚌  DormToHome running on http://localhost:${PORT}`);
    console.log(`    ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`    Demo accounts (password: password123)`);
    console.log(`    Passenger → alex@tamu.edu`);
    console.log(`    Driver    → marcus@dormtohome.com\n`);
  });
}

start();
