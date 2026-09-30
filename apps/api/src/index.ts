import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth.js';
import uplifts from '../../../packages/content/uplifts.json' with { type: 'json' };

const app = new Hono();
app.use('*', cors());

// Better Auth handler (all /api/auth/*)
app.on(['GET', 'POST'], '/api/auth/*', c => auth.handler(c.req.raw));

// Session guard
async function session(c: any) {
  const s = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!s?.user) return null;
  return s;
}
function pick(pool: any[], n = 1) { return pool[Math.floor(Math.random() * pool.length)]; }

// Sprint B — Today's Uplift
app.get('/api/uplifts/today', async c => {
  const s = await session(c);
  if (!s) return c.json({ error: 'unauthorized' }, 401);
  const { mood, situation, style, faith } = c.req.query();
  let pool: any[] = (uplifts as any[]).filter(u => faith === 'true' ? true : !u.faith);
  if (mood) { const f = pool.filter(u => u.moods.includes(mood)); if (f.length) pool = f; }
  if (situation) { const f = pool.filter(u => u.situations.includes(situation)); if (f.length) pool = f; }
  if (style) { const f = pool.filter(u => u.styles.includes(style)); if (f.length) pool = f; }
  const m = pick(pool);
  return c.json({ greeting: pick(m.greetings), ...m });
});

// Sprint C — I Need a Lift + categories
const intentToCategory: Record<string, string> = {
  discouraged: 'hope', confidence: 'confidence', overwhelmed: 'strength',
  motivation: 'motivation', failure: 'failure', 'afraid-to-start': 'courage',
  lonely: 'relationships', hope: 'hope', 'keep-going': 'discipline',
  decision: 'purpose', strength: 'strength',
};
app.get('/api/lift', async c => {
  const s = await session(c);
  if (!s) return c.json({ error: 'unauthorized' }, 401);
  const { intent = 'hope', situation, style, faith } = c.req.query();
  const category = intentToCategory[intent] || 'hope';
  let pool: any[] = (uplifts as any[]).filter(u => u.category === category && (faith === 'true' ? true : !u.faith));
  if (!pool.length) pool = (uplifts as any[]).filter(u => u.category === category);
  if (situation) { const f = pool.filter(u => u.situations.includes(situation as string)); if (f.length) pool = f; }
  if (style) { const f = pool.filter(u => u.styles.includes(style as string)); if (f.length) pool = f; }
  const m = pick(pool);
  return c.json({ greeting: pick(m.greetings), ...m });
});

app.get('/api/categories', async c => c.json([
  'hope','confidence','motivation','strength','courage','success','failure',
  'relationships','career','money','purpose','self-belief','gratitude',
  'discipline','leadership','faith','family','growth',
]));

// Sprint D/E stubs — Goals, Journal, Saves, Streak, Events, Files (R2 presign)
// Full Drizzle CRUD lands in Sprint D/E; these stubs keep mobile unblocked locally.
app.get('/api/health', c => c.json({ ok: true, phase: 4, stack: 'local-postgres + better-auth + r2' }));
app.post('/api/events', async c => c.json({ ok: true }));
app.get('/api/files/presign', async c => {
  const s = await session(c);
  if (!s) return c.json({ error: 'unauthorized' }, 401);
  return c.json({ note: 'R2 presign wired in Phase 4E — set R2_* env first', url: null });
});

const port = Number(process.env.API_PORT || 3000);
export default { port, fetch: app.fetch };
console.log(`Uplift API (Phase 4 skeleton) on http://localhost:${port}`);
