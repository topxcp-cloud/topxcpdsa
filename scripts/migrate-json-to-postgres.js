/* One-time migration helper for an older local data/db.json file.
 * Run with DATABASE_URL set. It refuses to overwrite an existing PostgreSQL state row.
 */
const fs = require('node:fs');
const path = require('node:path');
const { neon } = require('@neondatabase/serverless');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to the target PostgreSQL database.');
  const file = path.join(__dirname, '..', 'data', 'db.json');
  if (!fs.existsSync(file)) throw new Error(`No legacy JSON file found at ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data || typeof data !== 'object' || !Array.isArray(data.users)) throw new Error('The JSON file does not look like a TOP-X database export.');
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS topx_app_state (id integer PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
  const existing = await sql`SELECT id FROM topx_app_state WHERE id = 1`;
  if (existing.length) throw new Error('PostgreSQL already contains TOP-X state; refusing to overwrite it.');
  await sql`INSERT INTO topx_app_state (id, data, updated_at) VALUES (1, ${JSON.stringify(data)}::jsonb, now())`;
  console.log(`Migrated ${data.users.length} users and app state into PostgreSQL. Keep a secure backup of the JSON until verified.`);
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
