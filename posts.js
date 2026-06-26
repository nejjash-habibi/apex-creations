// routes/posts.js — CRUD for all service posts
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const {
  authenticateAdmin,
  uploadLimiter,
  validateUploadedFile,
  sanitizeObject,
  safeFilePath,
  postValidationRules,
  checkValidation,
} = require('../middleware/security');

// ─── Multer Storage on Render Disk ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${uuidv4()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type.'));
  },
});

// ─── GET /api/posts — Public: list all posts (optionally filter by category) ──
router.get('/', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    const validCategories = ['web_development', 'logo_creation', 'fashion_design', 'book_cover_design', 'announcement'];

    let query = `SELECT id, category, title, description, tags, image_path, created_at FROM posts`;
    const params = [];

    if (category && validCategories.includes(category)) {
      query += ` WHERE category = $1`;
      params.push(category);
      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(Math.min(parseInt(limit) || 50, 100), parseInt(offset) || 0);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(Math.min(parseInt(limit) || 50, 100), parseInt(offset) || 0);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    console.error('[POSTS] Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// ─── GET /api/posts/:id — Public: single post ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Invalid post ID.' });

    const result = await pool.query(
      'SELECT id, category, title, description, tags, image_path, created_at FROM posts WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('[POSTS] Fetch single error:', err.message);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// ─── POST /api/posts — Admin: create post ──────────────────────────────────
router.post(
  '/',
  authenticateAdmin,
  uploadLimiter,
  upload.single('image'),
  validateUploadedFile,
  postValidationRules,
  checkValidation,
  async (req, res) => {
    try {
      const sanitized = sanitizeObject(req.body);
      const { category, title, description, tags } = sanitized;

      let imagePath = null;
      if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
      }

      const result = await pool.query(
        `INSERT INTO posts (category, title, description, tags, image_path, image_original_name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [category, title, description, tags || null, imagePath, req.file?.originalname || null]
      );

      res.status(201).json({ success: true, post: result.rows[0] });
    } catch (err) {
      // Clean up uploaded file on DB error
      if (req.file) {
        const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
        try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch {}
      }
      console.error('[POSTS] Create error:', err.message);
      res.status(500).json({ error: 'Failed to create post.' });
    }
  }
);

// ─── DELETE /api/posts/:id — Admin: delete post ────────────────────────────
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Invalid post ID.' });

    // Get post to find image file
    const existing = await pool.query('SELECT image_path FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Post not found.' });

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    // Delete image from disk
    if (existing.rows[0].image_path) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
      const filename = path.basename(existing.rows[0].image_path);
      try {
        const safePath = safeFilePath(uploadDir, filename);
        fs.unlinkSync(safePath);
      } catch (fileErr) {
        console.warn('[POSTS] File delete warning:', fileErr.message);
      }
    }

    res.json({ success: true, message: 'Post deleted and storage cleared.' });
  } catch (err) {
    console.error('[POSTS] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
