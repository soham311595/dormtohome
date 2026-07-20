const express = require('express');
const router = express.Router();
const { get, run, pool } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/payments/create-intent', authMiddleware, requireRole('passenger'), async (req, res) => {
  try {
    const { route_id, seat_number, destination_stop } = req.body;
    if (!route_id || !seat_number || !destination_stop) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const route = await get('SELECT * FROM routes WHERE id=$1', [route_id]);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const taken = await get('SELECT id FROM bookings WHERE route_id=$1 AND seat_number=$2', [route_id, seat_number]);
    if (taken) return res.status(409).json({ error: 'Seat already taken' });

    const amount = Math.round(parseFloat(route.price_per_seat) * 100);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid price' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        route_id,
        seat_number,
        destination_stop,
        passenger_id: req.user.id,
      },
    });

    res.json({ client_secret: paymentIntent.client_secret, amount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/payments/refund', authMiddleware, requireRole('passenger'), async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    if (!payment_intent_id) return res.status(400).json({ error: 'Missing payment_intent_id' });

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
      return res.status(400).json({ error: 'Payment cannot be refunded' });
    }

    const refund = await stripe.refunds.create({ payment_intent: payment_intent_id });
    res.json({ success: true, refund_id: refund.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/config/stripe-key', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

module.exports = router;
