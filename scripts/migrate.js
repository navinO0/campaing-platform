#!/usr/bin/env node

/**
 * Production Database Migration Runner
 * Automatically applies pending SQL migrations in numerical order.
 * Tracks applied migrations in `whatsapp_campaign.schema_migrations`.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fallback to .env.local or .env in development
  const envFiles = [".env.local", ".env"];
  for (const envFile of envFiles) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return null;
}

async function runMigrations() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is not set.");
    console.error("Please provide DATABASE_URL in your environment or .env.local file.");
    process.exit(1);
  }

  const cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]+/, "");
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();

  try {
    console.log("🔄 Starting database migration runner...");

    // 1. Ensure schema and migration tracking table exist
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS whatsapp_campaign;

      CREATE TABLE IF NOT EXISTS whatsapp_campaign.schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const appliedResult = await client.query(
      `SELECT version FROM whatsapp_campaign.schema_migrations ORDER BY version ASC;`
    );
    const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

    // 3. Read migration files from scripts/migrations
    const migrationsDir = path.resolve(__dirname, "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("ℹ️ No migrations directory found at:", migrationsDir);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const version = file.split("_")[0];
      if (appliedVersions.has(version)) {
        continue;
      }

      console.log(`⏳ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      await client.query("BEGIN;");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO whatsapp_campaign.schema_migrations (version, name, applied_at)
           VALUES ($1, $2, NOW());`,
          [version, file]
        );
        await client.query("COMMIT;");
        console.log(`✅ Applied migration: ${file}`);
        appliedCount++;
      } catch (migrationError) {
        await client.query("ROLLBACK;");
        console.error(`❌ Migration failed in ${file}:`, migrationError.message);
        throw migrationError;
      }
    }

    if (appliedCount === 0) {
      console.log("✨ All database migrations are already up to date!");
    } else {
      console.log(`🎉 Successfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration runner error:", err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
