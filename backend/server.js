// server.js — Apex Creations Main Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { initSchema } = require('./db');
const { helmetConfig, generalLimiter } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const projectsRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 10000;

// ─── Ensure upload directory exists ────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// ─── Trust proxy (required on Render) ──────────────────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ───────────────────────────────────────────────────────
app.use(helmetConfig);

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:3000',
  'http://localhost:10000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('CORS policy violation.'));
  },
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── Static Files ───────────────────────────────────────────────────────────
// Serve uploaded images securely
app.use('/uploads', (req, res, next) => {
  // Only allow image file extensions
  const ext = path.extname(req.path).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  next();
}, express.static(uploadDir, {
  maxAge: '7d',
  etag: true,
  dotfiles: 'deny',
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public'), {
  maxAge: '1h',
  etag: true,
  dotfiles: 'deny',
}));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/projects', projectsRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Apex Creations' });
});

// ─── SPA Fallback ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max 5MB.' });
  }
  if (err.message === 'Invalid file type.') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Boot ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await initSchema();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[APEX] Server running on port ${PORT}`);
      console.log(`[APEX] Environment: ${process.env.NODE_ENV}`);
      console.log(`[APEX] Upload directory: ${uploadDir}`);
    });
 } catch (err) {
  console.error('[APEX] Failed to start:');
  console.error(err);
  process.exit(1);
  } 
};

start();

