// db.js — PostgreSQL connection + schema initializer
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const initSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Posts table (for all 4 service categories + announcements)
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(50) NOT NULL CHECK (category IN ('web_development','logo_creation','fashion_design','book_cover_design','announcement')),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        tags TEXT,
        image_path TEXT,
        image_original_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Client project registrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_name VARCHAR(255) NOT NULL,
        budget VARCHAR(100) NOT NULL,
        project_type VARCHAR(100) NOT NULL,
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        address TEXT,
        business_name VARCHAR(255),
        custom_concept TEXT,
        additional_description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','cleared')),
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Admin sessions (JWT blacklist for logout)
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        token_hash VARCHAR(64) PRIMARY KEY,
        blacklisted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Index for faster queries
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_submitted ON project_registrations(submitted_at DESC);`);

    await client.query('COMMIT');
    console.log('[DB] Schema initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Schema init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initSchema };

