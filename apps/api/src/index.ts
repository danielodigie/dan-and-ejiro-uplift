import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth.js';
import { db } from './db.js';
import { sql } from 'drizzle-orm';
import { profiles, checkins, goals, journal, social } from './routes.js';
import { startJobs, presignPut, presignGet } from './services.js';
import uplifts from '../../../packages/content/uplifts.json' with { type: 'json' };

const app = new Hono();
app.use('*', cors());
app.on(['GET', 'POST'], '/api/auth/*', c => auth.handler(c.req.raw));

app.route('/api/profiles', profiles);
app.route('/api/checkins', checkins);
app.route('/api/goals', goals);
app.route('/api/journal', journal);
app.route('/api', social);

async function sessionUser(c: any) {
  const s = await auth.api.getSession({ headers: c.req.raw.headers });
  return s?.user || null;
}
const pick = (a: any[]) => a[Math.floor(Math.random() * a.length)];

// Sprint B — Today's Uplift (reads seeded Postgres first, falls back to JSON)
app.get('/api/uplifts/today', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const { mood, situation, style, faith } = c.req.query();
  try {
    const r: any = await db.execute(sql`SELECT * FROM uplifts WHERE (${faith} = 'true' OR faith = false)
      AND (${mood} IS NULL OR moods::text LIKE '%' || ${mood} || '%') LIMIT 50`);
    if (r.rows.length) { const m = pick(r.rows); return c.json({ greeting: m.greeting, body: m.body, action: m.action_text, id: m.id, category: m.category }); }
  } catch {}
  let pool: any[] = (uplifts as any[]).filter(x => faith === 'true' ? true : !x.faith);
  if (mood) { const f = pool.filter(x => x.moods.includes(mood)); if (f.length) pool = f; }
  if (situation) { const f = pool.filter(x => x.situations.includes(situation)); if (f.length) pool = f; }
  if (style) { const f = pool.filter(x => x.styles.includes(style)); if (f.length) pool = f; }
  const m = pick(pool);
  return c.json({ greeting: pick(m.greetings), ...m });
});

const intentToCategory: Record<string, string> = {
  discouraged: 'hope', confidence: 'confidence', overwhelmed: 'strength', motivation: 'motivation',
  failure: 'failure', 'afraid-to-start': 'courage', lonely: 'relationships', hope: 'hope',
  'keep-going': 'discipline', decision: 'purpose', strength: 'strength',
};
app.get('/api/lift', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const { intent = 'hope', situation, style, faith } = c.req.query();
  const category = intentToCategory[intent] || 'hope';
  let pool: any[] = (uplifts as any[]).filter(x => x.category === category && (faith === 'true' ? true : !x.faith));
  if (!pool.length) pool = (uplifts as any[]).filter(x => x.category === category);
  if (situation) { const f = pool.filter(x => x.situations.includes(situation as string)); if (f.length) pool = f; }
  if (style) { const f = pool.filter(x => x.styles.includes(style as string)); if (f.length) pool = f; }
  const m = pick(pool);
  return c.json({ greeting: pick(m.greetings), ...m });
});

app.get('/api/categories', async c => c.json([
  'hope','confidence','motivation','strength','courage','success','failure',
  'relationships','career','money','purpose','self-belief','gratitude',
  'discipline','leadership','faith','family','growth',
]));

// Local analytics (§34): D1/D7 retention, meaningful rate, action rate via SQL later
app.post('/api/events', async c => {
  const u = await sessionUser(c);
  const b = await c.req.json().catch(() => ({}));
  try { await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u?.id || null}, ${b.name}, ${JSON.stringify(b.props || {})})`); } catch {}
  return c.json({ ok: true });
});

// R2 presigned URLs (Phase 4E) — mobile uploads share-cards / journal attachments direct to R2
app.post('/api/files/presign', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const { key, contentType } = await c.req.json();
  if (!process.env.R2_ACCOUNT_ID) return c.json({ error: 'R2 not configured — set R2_* env' }, 400);
  const url = await presignPut(`${u.id}/${key}`, contentType || 'image/png');
  await db.execute(sql`INSERT INTO files (user_id, r2_key, purpose, mime) VALUES (${u.id}, ${`${u.id}/${key}`}, 'share', ${contentType || 'image/png'})`);
  return c.json({ url });
});
app.get('/api/files/url', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const key = c.req.query('key');
  const url = await presignGet(key);
  return c.json({ url });
});

app.get('/api/health', c => c.json({ ok: true, phase: '4D', stack: 'local-postgres + better-auth + r2' }));
startJobs();

const port = Number(process.env.API_PORT || 3000);
export default { port, fetch: app.fetch };
console.log(`Uplift API Phase 4D on http://localhost:${port}`);
