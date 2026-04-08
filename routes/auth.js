const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { all, get, run } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

const getSecret = (req) =>
  (req.app && req.app.locals.JWT_SECRET) ||
  process.env.JWT_SECRET ||
  'dormtohome-secret-change-in-production';

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role,
            guardian_name, guardian_email, guardian_phone, checkpoint_notifs } = req.body;
    if (!first_name || !last_name || !email || !password || !role)
      return res.status(400).json({ error: 'Missing required fields' });
    if (!['passenger','driver'].includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name, phone, role }
      }
    });

    if (error) return res.status(400).json({ error: error.message });

    // Create profile immediately
    await run(
      `INSERT INTO users (id,first_name,last_name,email,phone,"role") VALUES ($1,$2,$3,$4,$5,$6)`,
      [authData.user.id, first_name, last_name, email, phone || '', role]
    );

    if (role === 'passenger' && (guardian_email || guardian_phone)) {
      await run(`INSERT INTO guardians (id,passenger_id,name,email,phone,checkpoint_notifs) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), authData.user.id, guardian_name || 'Guardian', guardian_email || '', guardian_phone || '', checkpoint_notifs ? 1 : 0]);
    }

    res.json({ message: 'Registration successful. Please check your email to verify your account.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(401).json({ error: 'Invalid credentials' });

    const user = authData.user;
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: profile?.role || 'passenger', first_name: profile?.first_name || '', last_name: profile?.last_name || '' },
      getSecret(req), { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, first_name: profile?.first_name, last_name: profile?.last_name, email: user.email, role: profile?.role || 'passenger' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'Name required' });
    
    await supabase
      .from('users')
      .update({ first_name, last_name, phone: phone || '' })
      .eq('id', req.user.id);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', async (req, res) => {
  try {
    await supabase.auth.signOut();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;