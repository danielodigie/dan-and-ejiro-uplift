// One-off generator: builds packages/db/seed.sql from packages/content/uplifts.json
// so the content can be seeded via the Supabase SQL Editor (paste + Run).
// Run: node scripts/gen-seed-sql.cjs  (from repo root)
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const seeds = JSON.parse(fs.readFileSync(path.join(root, 'packages', 'content', 'uplifts.json'), 'utf8'));

const lit = (v) => (v === null || v === undefined ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'");
const bool = (v) => (v ? 'TRUE' : 'FALSE');

const lines = [
  '-- Uplift content seed (generated from packages/content/uplifts.json).',
  '-- Run AFTER schema.sql. Idempotent: safe to re-run.',
  '',
];
for (const u of seeds) {
  const greeting = (u.greetings || [])[0] || '';
  lines.push(
    `INSERT INTO uplifts (id, body, greeting, category, moods, situations, styles, faith, scripture, action_text) VALUES (` +
    `${lit(u.id)}, ${lit(u.body)}, ${lit(greeting)}, ${lit(u.category)}, ` +
    `${lit(JSON.stringify(u.moods))}::jsonb, ${lit(JSON.stringify(u.situations))}::jsonb, ${lit(JSON.stringify(u.styles))}::jsonb, ` +
    `${bool(u.faith)}, ${lit(u.scripture || null)}, ${lit(u.action)}) ` +
    `ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body, greeting=EXCLUDED.greeting, category=EXCLUDED.category, ` +
    `moods=EXCLUDED.moods, situations=EXCLUDED.situations, styles=EXCLUDED.styles, faith=EXCLUDED.faith, ` +
    `scripture=EXCLUDED.scripture, action_text=EXCLUDED.action_text;`
  );
}
fs.writeFileSync(path.join(root, 'packages', 'db', 'seed.sql'), lines.join('\n') + '\n');
console.log(`Wrote seed.sql with ${seeds.length} uplifts.`);
