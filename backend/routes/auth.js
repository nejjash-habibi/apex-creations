// routes/auth.js — Admin authentication
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');
const { authLimiter, authenticateAdmin } = require('../middleware/security');

// Hashed credentials are stored in env; we compare on login.
// ADMIN_PASSWORD in .env is plaintext; on first boot we'll compare directly
// (for simplicity on Render). For max security, store a bcrypt hash.

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    // Constant-time compare to prevent timing attacks
    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(username.trim()),
      Buffer.from(process.env.ADMIN_USERNAME || '')
    );
    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(process.env.ADMIN_PASSWORD || '')
    );

    if (!usernameMatch || !passwordMatch) {
      // Artificial delay to slow brute force
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { role: 'admin', username: username.trim(), iat: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256' }
    );

    res.json({
      success: true,
      token,
      message: 'Welcome, Lord Nejju.',
      expiresIn: 8 * 60 * 60,
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    // Blacklist the token
    await pool.query(
      'INSERT INTO token_blacklist (token_hash) VALUES ($1) ON CONFLICT DO NOTHING',
      [req.tokenHash]
    );
    // Cleanup old blacklisted tokens older than 9 hours
    await pool.query(`DELETE FROM token_blacklist WHERE blacklisted_at < NOW() - INTERVAL '9 hours'`);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[AUTH] Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// GET /api/auth/verify
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ valid: true, admin: req.admin.username });
});

module.exports = router;
