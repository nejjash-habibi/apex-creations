// routes/projects.js — Client project registration pipeline
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { sendProjectNotification } = require('../services/mailer');
const {
  authenticateAdmin,
  projectLimiter,
  sanitizeObject,
  projectValidationRules,
  checkValidation,
} = require('../middleware/security');

// ─── POST /api/projects — Public: submit project registration ──────────────
router.post('/', projectLimiter, projectValidationRules, checkValidation, async (req, res) => {
  try {
    const sanitized = sanitizeObject(req.body);
    const {
      project_name,
      budget,
      project_type,
      contact_phone,
      contact_email,
      address,
      business_name,
      custom_concept,
      additional_description,
    } = sanitized;

    const result = await pool.query(
      `INSERT INTO project_registrations
        (project_name, budget, project_type, contact_phone, contact_email, address, business_name, custom_concept, additional_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        project_name,
        budget,
        project_type,
        contact_phone || null,
        contact_email || null,
        address || null,
        business_name || null,
        custom_concept || null,
        additional_description || null,
      ]
    );

    const newProject = result.rows[0];

    // Fire email notification asynchronously — don't block response
    setImmediate(async () => {
      try {
        await sendProjectNotification(newProject);
        console.log(`[MAIL] Notification sent for project: ${newProject.id}`);
      } catch (mailErr) {
        console.error('[MAIL] Notification failed:', mailErr.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Project registered successfully! We will contact you soon.',
      id: newProject.id,
    });
  } catch (err) {
    console.error('[PROJECTS] Submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit project. Please try again.' });
  }
});

// ─── GET /api/projects — Admin: list all project registrations ─────────────
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    let query = `SELECT * FROM project_registrations`;
    const params = [];

    if (status && ['pending', 'reviewed', 'cleared'].includes(status)) {
      query += ` WHERE status = $1`;
      params.push(status);
      query += ` ORDER BY submitted_at DESC LIMIT $2 OFFSET $3`;
      params.push(Math.min(parseInt(limit) || 100, 200), parseInt(offset) || 0);
    } else {
      query += ` ORDER BY submitted_at DESC LIMIT $1 OFFSET $2`;
      params.push(Math.min(parseInt(limit) || 100, 200), parseInt(offset) || 0);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, projects: result.rows });
  } catch (err) {
    console.error('[PROJECTS] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// ─── PATCH /api/projects/:id/status — Admin: update status ────────────────
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Invalid ID.' });
    if (!['pending', 'reviewed', 'cleared'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const result = await pool.query(
      'UPDATE project_registrations SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    res.json({ success: true, project: result.rows[0] });
  } catch (err) {
    console.error('[PROJECTS] Status update error:', err.message);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ─── DELETE /api/projects/:id — Admin: delete/clear project ───────────────
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Invalid ID.' });

    const result = await pool.query(
      'DELETE FROM project_registrations WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    res.json({ success: true, message: 'Project cleared from server storage.' });
  } catch (err) {
    console.error('[PROJECTS] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
