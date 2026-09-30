// Seed local Postgres uplifts from packages/content/uplifts.json
// Run: pnpm --filter @uplift/db seed  (requires DATABASE_URL)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, '..', '..');
const seeds = JSON.parse(fs.readFileSync(path.join(root, 'packages', 'content', 'uplifts.json'), 'utf8'));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = (t: string, v: any[]) => pool.query(t, v);

await q(`CREATE TABLE IF NOT EXISTS uplifts (
  id TEXT PRIMARY KEY, body TEXT NOT NULL, greeting TEXT, category TEXT NOT NULL,
  moods JSONB, situations JSONB, styles JSONB, faith BOOLEAN DEFAULT FALSE,
  scripture TEXT, action_text TEXT)`, []);

let upserted = 0;
for (const u of seeds) {
  await q(`INSERT INTO uplifts (id, body, greeting, category, moods, situations, styles, faith, scripture, action_text)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body, greeting=EXCLUDED.greeting, category=EXCLUDED.category,
      moods=EXCLUDED.moods, situations=EXCLUDED.situations, styles=EXCLUDED.styles, faith=EXCLUDED.faith,
      scripture=EXCLUDED.scripture, action_text=EXCLUDED.action_text`,
    [u.id, u.body, (u.greetings || [])[0] || '', u.category, JSON.stringify(u.moods), JSON.stringify(u.situations),
     JSON.stringify(u.styles), !!u.faith, u.scripture || null, u.action]);
  upserted++;
}
console.log(`Seeded ${upserted} uplifts into local Postgres.`);
await pool.end();
