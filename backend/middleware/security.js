// middleware/security.js — Central security hardening layer
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');

// ─── Helmet: HTTP Security Headers ─────────────────────────────────────────
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// ─── Rate Limiters ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Wait 15 minutes.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'Upload limit reached. Try again in 1 hour.' },
});

const projectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Project submission limit reached. Try again later.' },
});

// ─── JWT Authentication Middleware ─────────────────────────────────────────
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing.' });

    // Check token blacklist
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklisted = await pool.query(
      'SELECT 1 FROM token_blacklist WHERE token_hash = $1',
      [tokenHash]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    req.admin = decoded;
    req.tokenHash = tokenHash;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// ─── Input Sanitizer ────────────────────────────────────────────────────────
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return xss(input.trim(), {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
};

const sanitizeObject = (obj) => {
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = typeof obj[key] === 'string' ? sanitizeInput(obj[key]) : obj[key];
  }
  return result;
};

// ─── File Upload Validator ──────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateUploadedFile = (req, res, next) => {
  if (!req.file) return next();

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, WebP, GIF allowed.' });
  }

  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  // Sanitize original filename
  const ext = path.extname(req.file.originalname).toLowerCase();
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
  req.file.safeExt = safeExt;

  next();
};

// ─── Path Traversal Guard ───────────────────────────────────────────────────
const safeFilePath = (baseDir, requestedPath) => {
  const resolved = path.resolve(baseDir, path.basename(requestedPath));
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal attempt detected.');
  }
  return resolved;
};

// ─── Validation Result Checker ──────────────────────────────────────────────
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array().map(e => e.msg) });
  }
  next();
};

// ─── Post Validation Rules ──────────────────────────────────────────────────
const postValidationRules = [
  body('category')
    .isIn(['web_development', 'logo_creation', 'fashion_design', 'book_cover_design', 'announcement'])
    .withMessage('Invalid category.'),
  body('title')
    .isLength({ min: 2, max: 255 }).trim()
    .withMessage('Title must be 2–255 characters.'),
  body('description')
    .isLength({ min: 5, max: 5000 }).trim()
    .withMessage('Description must be 5–5000 characters.'),
  body('tags')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Tags too long.'),
];

// ─── Project Registration Validation Rules ──────────────────────────────────
const projectValidationRules = [
  body('project_name').isLength({ min: 2, max: 255 }).trim().withMessage('Project name required.'),
  body('budget').isLength({ min: 1, max: 100 }).trim().withMessage('Budget required.'),
  body('project_type').isLength({ min: 2, max: 100 }).trim().withMessage('Project type required.'),
  body('contact_phone').optional().isMobilePhone('any').withMessage('Invalid phone number.'),
  body('contact_email').optional().isEmail().normalizeEmail().withMessage('Invalid email.'),
  body('address').optional().isLength({ max: 500 }).trim(),
  body('business_name').optional().isLength({ max: 255 }).trim(),
  body('custom_concept').optional().isLength({ max: 5000 }).trim(),
  body('additional_description').optional().isLength({ max: 5000 }).trim(),
];

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  uploadLimiter,
  projectLimiter,
  authenticateAdmin,
  sanitizeInput,
  sanitizeObject,
  validateUploadedFile,
  safeFilePath,
  checkValidation,
  postValidationRules,
  projectValidationRules,
};

