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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail))
      return res.status(400).json({ error: 'Invalid email format' });

    if (phone && phone.trim()) {
      const digits = phone.replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^1?\d{10}$/.test(digits))
        return res.status(400).json({ error: 'Invalid phone number — must be 10 digits' });
    }

    if (guardian_email && guardian_email.trim() && !emailRegex.test(guardian_email.trim()))
      return res.status(400).json({ error: 'Invalid guardian email format' });
    if (guardian_phone && guardian_phone.trim()) {
      const gDigits = guardian_phone.replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^1?\d{10}$/.test(gDigits))
        return res.status(400).json({ error: 'Invalid guardian phone number' });
    }

    console.log('[REGISTER] Checking existing user:', trimmedEmail);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (checkError) {
      console.error('[REGISTER] Check error:', checkError);
    }
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    console.log('[REGISTER] Creating Supabase auth user:', trimmedEmail);
    let userId;
    let authError;

    try {
      const { data: authData, error } = await supabase.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, phone, role }
      });
      authError = error;
      if (authData?.user) userId = authData.user.id;
    } catch {
      console.log('[REGISTER] Falling back to signUp (admin.createUser unavailable)');
      const { data: authData, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { first_name, last_name, phone, role } }
      });
      authError = error;
      if (authData?.user) userId = authData.user.id;
    }

    if (authError) {
      console.error('[REGISTER] Auth error:', authError);
      if (authError.message?.includes('already been registered') || authError.message?.includes('already registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: authError.message });
    }

    if (!userId) return res.status(500).json({ error: 'Failed to create user' });

    console.log('[REGISTER] Creating profile for:', userId);
    await run(
      `INSERT INTO users (id,first_name,last_name,email,phone,"role") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET first_name=$2, last_name=$3`,
      [userId, first_name, last_name, trimmedEmail, phone || '', role]
    );

    if (role === 'passenger' && (guardian_email || guardian_phone)) {
      await run(`INSERT INTO guardians (id,passenger_id,name,email,phone,checkpoint_notifs) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), userId, guardian_name || 'Guardian', guardian_email || '', guardian_phone || '', checkpoint_notifs ? 1 : 0]);
    }

    console.log('[REGISTER] Success for:', trimmedEmail);
    res.json({ message: 'Registration successful. You can now sign in.' });
  } catch (e) { 
    console.error('[REGISTER] Exception:', e);
    res.status(500).json({ error: e.message }); 
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('email not confirmed') || msg.includes('email not verified')) {
        return res.status(401).json({ error: 'Please verify your email before signing in.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = authData.user;
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[LOGIN] Profile fetch error:', profileError);
    }

    if (!profile) {
      console.log('[LOGIN] Profile not found for user, creating from auth metadata');
      const meta = user.user_metadata || {};
      await run(
        `INSERT INTO users (id,first_name,last_name,email,phone,"role") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [user.id, meta.first_name || '', meta.last_name || '', user.email, meta.phone || '', meta.role || 'passenger']
      );
    }

    const p = profile || { first_name: user.user_metadata?.first_name || '', last_name: user.user_metadata?.last_name || '', role: user.user_metadata?.role || 'passenger' };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: p.role, first_name: p.first_name, last_name: p.last_name },
      getSecret(req), { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, first_name: p.first_name, last_name: p.last_name, email: user.email, role: p.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      console.error('[ME] Profile fetch error:', error);
    }
    if (!profile) return res.status(404).json({ error: 'User not found' });
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