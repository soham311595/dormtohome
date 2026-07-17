const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendEmail(to, subject, html) {
  // TEMP: Remove this override once domain is verified
  const original = to;
  to = 'daniil.m.arnold@gmail.com';
  subject = `[TEST - original recipient: ${original}] ${subject}`;

  if (!resend) {
    console.warn('[EMAIL] RESEND_API_KEY not set, skipping email to', to);
    return;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[EMAIL] Resend error:', error);
    } else {
      console.log('[EMAIL] Sent to', to, '- id:', data?.id);
    }
  } catch (e) {
    console.error('[EMAIL] sendEmail failed:', e.message);
  }
}

function bookingConfirmationHTML({ passengerName, from, to, routeNumber, seatNumber, date, time, driverName, amount }) {
  return `
<h2>Booking Confirmed!</h2>
<p>Hi ${passengerName},</p>
<p>Your seat has been booked successfully. Here are your trip details:</p>
<table>
  <tr><td><strong>Route:</strong></td><td>${from} → ${to}</td></tr>
  <tr><td><strong>Route #:</strong></td><td>${routeNumber}</td></tr>
  <tr><td><strong>Seat:</strong></td><td>${seatNumber}</td></tr>
  <tr><td><strong>Departure:</strong></td><td>${date} at ${time}</td></tr>
  <tr><td><strong>Driver:</strong></td><td>${driverName}</td></tr>
  <tr><td><strong>Amount Paid:</strong></td><td>$${amount}</td></tr>
</table>
<p>Have a safe trip!</p>
<p>— DormToHome Team</p>`;
}

function newBookingAlertHTML({ passengerName, from, to, routeNumber, seatNumber, date, time }) {
  return `
<h2>New Booking Alert</h2>
<p>A passenger has booked a seat on your route:</p>
<table>
  <tr><td><strong>Passenger:</strong></td><td>${passengerName}</td></tr>
  <tr><td><strong>Route:</strong></td><td>${from} → ${to}</td></tr>
  <tr><td><strong>Route #:</strong></td><td>${routeNumber}</td></tr>
  <tr><td><strong>Seat:</strong></td><td>${seatNumber}</td></tr>
  <tr><td><strong>Departure:</strong></td><td>${date} at ${time}</td></tr>
</table>
<p>— DormToHome Team</p>`;
}

function guardianCheckpointHTML({ guardianName, routeNumber, from, to, city, estimatedArrival }) {
  return `
<h2>Checkpoint Update</h2>
<p>Hi ${guardianName},</p>
<p>The bus for route <strong>${routeNumber}</strong> (${from} → ${to}) has passed through <strong>${city}</strong>.</p>
<p><strong>Estimated arrival:</strong> ${estimatedArrival}</p>
<p>Your passenger is on schedule.</p>
<p>— DormToHome Team</p>`;
}

function guardianCheckinHTML({ guardianName, passengerName, routeNumber, from, to, time, seatNumber }) {
  return `
<h2>Check-in Notification</h2>
<p>Hi ${guardianName},</p>
<p>Your passenger <strong>${passengerName}</strong> has checked in and boarded the bus for route <strong>${routeNumber}</strong> (${from} → ${to}).</p>
<p><strong>Departure time:</strong> ${time}</p>
<p><strong>Seat:</strong> ${seatNumber}</p>
<p>Your passenger is on the bus and the journey has begun.</p>
<p>— DormToHome Team</p>`;
}

function guardianDriverUpdateHTML({ guardianName, passengerName, routeNumber, from, to, message }) {
  return `
<h2>Driver Update — ${routeNumber}</h2>
<p>Hi ${guardianName},</p>
<p>There is an update from the driver of route <strong>${routeNumber}</strong> (${from} → ${to}) regarding your passenger <strong>${passengerName}</strong>:</p>
<p style="background:#f0ede6;padding:14px;border-radius:10px;font-size:15px;margin:14px 0">${message}</p>
<p>— DormToHome Team</p>`;
}

module.exports = { sendEmail, bookingConfirmationHTML, newBookingAlertHTML, guardianCheckpointHTML, guardianCheckinHTML, guardianDriverUpdateHTML };
