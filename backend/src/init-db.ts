import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDatabase() {
  try {
    // Create artist_info_cache table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS artist_info_cache (
        artist_name VARCHAR(255) PRIMARY KEY,
        info_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index on artist_name for faster lookups (though it's already a primary key)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_artist_name ON artist_info_cache(artist_name);
    `);

    console.log("✅ Database tables initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase();
