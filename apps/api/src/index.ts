import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth.js';
import { db } from './db.js';
import { enhanceWithGemini, llmEnabled, llmStatusMasked } from './llm.js';
import { sql } from 'drizzle-orm';
import { profiles, checkins, goals, journal, social } from './routes.js';
import { startJobs, presignPut, presignGet, crisisResponse, isCrisis } from './services.js';
import uplifts from '../../../packages/content/uplifts.json' with { type: 'json' };
import packsData from '../../../packages/content/packs.json' with { type: 'json' };

const app = new Hono({ strict: false });
const frontendOrigins = (process.env.FRONTEND_URL || process.env.MOBILE_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use('*', frontendOrigins.length
  ? cors({ origin: frontendOrigins, credentials: true })
  : cors({ origin: '*' }));
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

// Phase 5 — deeper personalization: rank by multi-style match count (premium
// clients send `styles=a,b`; free clients send single `style`). Falls back gracefully.
function rankByStyles(pool: any[], stylesCsv?: string, styleSingle?: string) {
  const wanted = (stylesCsv || styleSingle || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!wanted.length) return pool;
  const scored = pool.map(m => ({
    m,
    score: (m.styles || []).filter((s: string) => wanted.includes(s)).length,
  }));
  const best = Math.max(...scored.map(x => x.score));
  const top = scored.filter(x => x.score === best && best > 0);
  const shortlist = (top.length ? top : scored).slice(0, 5).map(x => x.m);
  return shortlist.length ? shortlist : pool;
}

// Sprint B — Today's Uplift (reads seeded Postgres first, falls back to JSON, then Gemini rewrite if enabled)
app.get('/api/uplifts/today', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const { mood, situation, style, faith, note } = c.req.query();
  if (isCrisis(note) || isCrisis(mood) || isCrisis(situation)) return c.json({ ...crisisResponse(), source: 'safety' });
  const faithOptIn = faith === 'true';
  const stylesCsv = c.req.query('styles') || '';
  const seenIds = (c.req.query('seen') || '').split(',').filter(Boolean).slice(-7);
  const seen = new Set(seenIds);
  const pickBase = async (): Promise<any> => {
    try {
      const r: any = await db.execute(sql`SELECT * FROM uplifts WHERE (${faith} = 'true' OR faith = false)
        AND (${mood} IS NULL OR moods::text LIKE '%' || ${mood} || '%') LIMIT 50`);
      const rows = (r.rows || []).filter((x: any) => !seen.has(String(x.id)));
      const pool = rows.length ? rows : r.rows;
      if (pool?.length) {
        const m = pick(pool);
        return { greeting: m.greeting, body: m.body, action: m.action_text, id: m.id, category: m.category, scripture: m.scripture || undefined };
      }
    } catch {}
    let pool: any[] = (uplifts as any[]).filter(x => (faithOptIn ? true : !x.faith) && !seen.has(String(x.id)));
    if (!pool.length) pool = (uplifts as any[]).filter(x => faithOptIn ? true : !x.faith);
    if (mood) { const f = pool.filter(x => x.moods.includes(mood)); if (f.length) pool = f; }
    if (situation) { const f = pool.filter(x => x.situations.includes(situation)); if (f.length) pool = f; }
    if (style) { const f = pool.filter(x => x.styles.includes(style)); if (f.length) pool = f; }
    pool = rankByStyles(pool, stylesCsv, style);
    const m = pick(pool);
    return { greeting: pick(m.greetings), ...m };
  };
  const base = await pickBase();
  if (!llmEnabled()) return c.json({ ...base, source: 'rule' });
  const out = await enhanceWithGemini(base, { mood, situation, style, faith }, faithOptIn);
  return c.json({ ...out, source: out === base ? 'rule' : 'gemini' });
});

const intentToCategory: Record<string, string> = {
  discouraged: 'hope', confidence: 'confidence', overwhelmed: 'strength', motivation: 'motivation',
  failure: 'failure', 'afraid-to-start': 'courage', lonely: 'relationships', hope: 'hope',
  'keep-going': 'discipline', decision: 'purpose', strength: 'strength',
};
app.get('/api/lift', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const { intent = 'hope', situation, style, faith, note } = c.req.query();
  if (isCrisis(note) || isCrisis(intent)) return c.json({ ...crisisResponse(), source: 'safety' });
  const faithOptIn = faith === 'true';
  const stylesCsv = c.req.query('styles') || '';
  const seenIds = (c.req.query('seen') || '').split(',').filter(Boolean).slice(-7);
  const seen = new Set(seenIds);
  const category = intentToCategory[intent] || 'hope';
  let pool: any[] = (uplifts as any[]).filter(x => x.category === category && (faithOptIn ? true : !x.faith));
  if (!pool.length) pool = (uplifts as any[]).filter(x => x.category === category);
  const unSeen = pool.filter(x => !seen.has(String(x.id)));
  if (unSeen.length) pool = unSeen;
  if (situation) { const f = pool.filter(x => x.situations.includes(situation as string)); if (f.length) pool = f; }
  if (style) { const f = pool.filter(x => x.styles.includes(style as string)); if (f.length) pool = f; }
  pool = rankByStyles(pool, stylesCsv, style as string);
  const m = pick(pool);
  const base = { greeting: pick(m.greetings), ...m };
  if (!llmEnabled()) return c.json({ ...base, source: 'rule' });
  const out = await enhanceWithGemini(base, { intent, situation: situation as string, style: style as string, faith }, faithOptIn);
  return c.json({ ...out, source: out === base ? 'rule' : 'gemini' });
});

// Masked LLM status — requires login, never returns the key
app.get('/api/llm/status', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  return c.json(llmStatusMasked());
});

app.get('/api/categories', async c => c.json([
  'hope','confidence','motivation','strength','courage','success','failure',
  'relationships','career','money','purpose','self-belief','gratitude',
  'discipline','leadership','faith','family','growth',
]));

// Sprint C — browse one category (respects faith opt-in + 7-day no-repeat)
app.get('/api/uplifts/category/:name', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const name = c.req.param('name');
  const { style, faith } = c.req.query();
  const faithOptIn = faith === 'true';
  const seen = new Set((c.req.query('seen') || '').split(',').filter(Boolean));
  let pool: any[] = (uplifts as any[]).filter(x => x.category === name && (faithOptIn || !x.faith));
  if (!pool.length) return c.json({ error: 'empty' }, 404);
  const unSeen = pool.filter(x => !seen.has(String(x.id)));
  if (unSeen.length) pool = unSeen;
  if (style) { const f = pool.filter(x => x.styles.includes(style as string)); if (f.length) pool = f; }
  const m = pick(pool);
  return c.json({ greeting: pick(m.greetings), ...m, source: 'rule' });
});

// Local analytics (§34): D1/D7 retention, meaningful rate, action rate via SQL later
app.post('/api/events', async c => {
  const u = await sessionUser(c);
  const b = await c.req.json().catch(() => ({}));
  if (!b.name) return c.json({ error: 'name required' }, 400);
  try { await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u?.id || null}, ${b.name}, ${JSON.stringify(b.props || {})})`); } catch {}
  return c.json({ ok: true });
});

// Phase 5 — Premium & Value Test (local stub, no Stripe yet).
// Free: daily, basic check-ins, selected categories, sharing, basic goals.
// Premium test: style-matched journeys + exclusive Confidence Pack + guided
// reflections + deeper progress insights.
async function getEntitlements(userId: string): Promise<{ tier: string; packs: string[] }> {
  try {
    const r: any = await db.execute(sql`SELECT * FROM entitlements WHERE user_id=${userId}`);
    const row = r.rows[0];
    if (row) return { tier: row.tier || 'free', packs: row.packs || [] };
  } catch {}
  return { tier: 'free', packs: [] };
}
function hasPack(ent: { tier: string; packs: string[] }, packId: string) {
  return ent.tier === 'premium' || ent.tier === 'premium-stub' || (ent.packs || []).includes(packId);
}
function paywallPayload(packId: string) {
  const pack = (packsData as any).packs.find((p: any) => p.id === packId);
  return {
    error: 'locked', pack: packId,
    paywall: {
      title: pack?.title || packId,
      tagline: pack?.tagline || 'Unlock deeper encouragement.',
      priceStub: pack?.priceStub || 'stub — no real charge in MVP',
      perks: ['7-day style-matched journey', 'Guided reflections', 'Deeper progress insights'],
    },
  };
}

app.get('/api/entitlements', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const ent = await getEntitlements(u.id);
  return c.json({ user_id: u.id, ...ent });
});
app.post('/api/entitlements', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const b = await c.req.json().catch(() => ({}));
  const current = await getEntitlements(u.id);
  const merged = [...new Set([...(current.packs || []), ...((b as any).packs || [])])];
  const tier = (b as any).tier || current.tier;
  try {
    await db.execute(sql`INSERT INTO entitlements (user_id, tier, packs) VALUES (${u.id}, ${tier}, ${JSON.stringify(merged)})
      ON CONFLICT (user_id) DO UPDATE SET tier=EXCLUDED.tier, packs=EXCLUDED.packs`);
  } catch {}
  try { await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u.id}, 'tier_change', ${JSON.stringify({ tier })})`); } catch {}
  return c.json({ ok: true, tier, packs: merged });
});
// Restore (simulates store restore: returns server truth, never charges)
app.post('/api/entitlements/restore', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const ent = await getEntitlements(u.id);
  try { await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u.id}, 'restore', ${JSON.stringify(ent)})`); } catch {}
  return c.json({ user_id: u.id, ...ent, restored: true });
});

// Premium packs registry (locked flag per user)
app.get('/api/packs', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const ent = await getEntitlements(u.id);
  return c.json((packsData as any).packs.map((p: any) => ({ ...p, locked: !hasPack(ent, p.id) })));
});
// Stub purchase: unlocks pack locally, upgrades tier, logs willingness-to-pay event
app.post('/api/packs/:id/unlock', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const id = c.req.param('id');
  const pack = (packsData as any).packs.find((p: any) => p.id === id);
  if (!pack) return c.json({ error: 'unknown pack' }, 404);
  const current = await getEntitlements(u.id);
  const merged = [...new Set([...(current.packs || []), id])];
  try {
    await db.execute(sql`INSERT INTO entitlements (user_id, tier, packs) VALUES (${u.id}, 'premium-stub', ${JSON.stringify(merged)})
      ON CONFLICT (user_id) DO UPDATE SET tier='premium-stub', packs=EXCLUDED.packs`);
    await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u.id}, 'pack_unlock', ${JSON.stringify({ pack: id })})`);
  } catch {}
  return c.json({ ok: true, tier: 'premium-stub', packs: merged });
});
// 7-day journey, style-matched (premium). Free users get 402 + paywall payload.
app.get('/api/packs/:id/days', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const id = c.req.param('id');
  const ent = await getEntitlements(u.id);
  if (!hasPack(ent, id)) return c.json(paywallPayload(id), 402);
  const { style } = c.req.query();
  const stylesCsv = c.req.query('styles') || '';
  let days: any[] = (packsData as any).days.filter((d: any) => d.pack === id).sort((a: any, b: any) => a.day - b.day);
  const wanted = (stylesCsv || style || '').split(',').map(s => s.trim()).filter(Boolean);
  days = days.map(d => ({ greeting: pick(d.greetings), ...d, source: 'pack' }));
  if (wanted.length) {
    // Order days so best style-matches surface first, but keep day numbers stable
    days = [...days].sort((a, b) =>
      (b.styles || []).filter((s: string) => wanted.includes(s)).length -
      (a.styles || []).filter((s: string) => wanted.includes(s)).length);
  }
  try { await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u.id}, 'journey_view', ${JSON.stringify({ pack: id })})`); } catch {}
  return c.json(days);
});

// Guided reflections (premium): 3-step flow — notice → reframe → one step
const GUIDED = [
  { step: 1, title: 'Notice', prompt: 'Name what you feel in one honest sentence. No fixing yet.' },
  { step: 2, title: 'Reframe', prompt: 'What is one true, kinder fact that answers the doubt?' },
  { step: 3, title: 'One step', prompt: 'What is the smallest useful action in the next 24 hours?' },
];
app.get('/api/reflections/guided', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const ent = await getEntitlements(u.id);
  const premium = ent.tier === 'premium' || ent.tier === 'premium-stub' || (ent.packs || []).length > 0;
  if (!premium) return c.json({ ...paywallPayload('confidence-pack'), error: 'locked' }, 402);
  const topic = c.req.query('topic') || 'confidence';
  return c.json({ topic, steps: GUIDED, closer: 'You showed up when it would have been easier to quit. That is progress.' });
});

// Progress insights (§34): basic counts free, full trend premium (?full=true gated)
app.get('/api/insights', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const full = c.req.query('full') === 'true';
  const ent = await getEntitlements(u.id);
  const premium = ent.tier === 'premium' || ent.tier === 'premium-stub' || (ent.packs || []).length > 0;
  if (full && !premium) return c.json({ ...paywallPayload('confidence-pack'), error: 'locked' }, 402);
  const count = async (q: string): Promise<number> => {
    try { const r: any = await db.execute(sql.raw(q.replaceAll('{uid}', u.id))); return Number(r.rows?.[0]?.c || 0); } catch { return 0; }
  };
  const basic = {
    streak: await count(`SELECT current_count AS c FROM streaks WHERE user_id='{uid}'`),
    goalsTotal: await count(`SELECT COUNT(*) AS c FROM goals WHERE user_id='{uid}'`),
    goalsDone: await count(`SELECT COUNT(*) AS c FROM goals WHERE user_id='{uid}' AND status='done'`),
    journalEntries: await count(`SELECT COUNT(*) AS c FROM journal_entries WHERE user_id='{uid}'`),
    victories: await count(`SELECT COUNT(*) AS c FROM journal_entries WHERE user_id='{uid}' AND victory=true`),
    saves: await count(`SELECT COUNT(*) AS c FROM saves WHERE user_id='{uid}'`),
    views: await count(`SELECT COUNT(*) AS c FROM events WHERE user_id='{uid}' AND name IN ('view_today','need_lift')`),
    meaningful: await count(`SELECT COUNT(*) AS c FROM events WHERE user_id='{uid}' AND name IN ('like','save','share')`),
  };
  const meaningfulRate = (basic as any).views ? Number((((basic as any).meaningful / (basic as any).views) * 100).toFixed(1)) : 0;
  if (!full) return c.json({ ...basic, meaningfulRate, tier: ent.tier, upgrade: !premium });
  const byDay: any[] = await (async () => {
    try {
      const r: any = await db.execute(sql`SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS d, COUNT(*) AS c FROM events WHERE user_id=${u.id} AND created_at > NOW() - INTERVAL '14 days' GROUP BY 1 ORDER BY 1`);
      return r.rows;
    } catch { return []; }
  })();
  try { await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (${u.id}, 'insight_view', ${JSON.stringify({ full: true })})`); } catch {}
  return c.json({ ...basic, meaningfulRate, tier: ent.tier, last14Days: byDay });
});

// Phase 6 — Privacy: export + delete (local-first; faith data flagged sensitive)
app.get('/api/account/export', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const grab = async (query: string) => {
    try { const r: any = await db.execute(sql.raw(query.replaceAll('{uid}', u.id))); return r.rows; }
    catch { return []; }
  };
  return c.json({
    user: { id: u.id, email: (u as any).email || null, name: (u as any).name || null },
    profile: await grab(`SELECT * FROM profiles WHERE user_id='{uid}'`),
    checkins: await grab(`SELECT * FROM checkins WHERE user_id='{uid}' ORDER BY created_at DESC LIMIT 200`),
    goals: await grab(`SELECT * FROM goals WHERE user_id='{uid}'`),
    journal: await grab(`SELECT * FROM journal_entries WHERE user_id='{uid}' ORDER BY created_at DESC LIMIT 200`),
    saves: await grab(`SELECT * FROM saves WHERE user_id='{uid}'`),
    streak: await grab(`SELECT * FROM streaks WHERE user_id='{uid}'`),
    entitlements: await grab(`SELECT * FROM entitlements WHERE user_id='{uid}'`),
    events: await grab(`SELECT name, created_at FROM events WHERE user_id='{uid}' ORDER BY created_at DESC LIMIT 500`),
    sensitive: ['profile.faith_opt_in is treated as sensitive: export is yours only, never shared, deleted on request'],
  });
});
app.delete('/api/account', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  try { await db.execute(sql`DELETE FROM goal_steps WHERE goal_id IN (SELECT id FROM goals WHERE user_id=${u.id})`); } catch {}
  for (const t of ['events','files','shares','likes','saves','journal_entries','goals','checkins','streaks','entitlements','profiles']) {
    try { await db.execute(sql.raw(`DELETE FROM ${t} WHERE user_id='${u.id}'`)); } catch {}
  }
  try { await db.execute(sql`DELETE FROM session WHERE "userId"=${u.id}`); } catch {}
  try { await db.execute(sql`DELETE FROM account WHERE "userId"=${u.id}`); } catch {}
  try { await db.execute(sql`DELETE FROM "user" WHERE id=${u.id}`); } catch {}
  return c.json({ ok: true });
});

// Phase 6 — local analytics dashboard API (§34; mirrors packages/db/analytics.sql)
app.get('/api/analytics/summary', async c => {
  const u = await sessionUser(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  const one = async (query: string) => {
    try { const r: any = await db.execute(sql.raw(query)); return Number(r.rows?.[0]?.c || 0); }
    catch { return 0; }
  };
  const views = await one(`SELECT COUNT(*) AS c FROM events WHERE name IN ('view_today','need_lift')`);
  const meaningful = await one(`SELECT COUNT(*) AS c FROM events WHERE name IN ('like','save','share')`);
  const goalsTotal = await one(`SELECT COUNT(*) AS c FROM goals`);
  const goalsDone = await one(`SELECT COUNT(*) AS c FROM goals WHERE status='done'`);
  const tiers: any = await (async () => {
    try { const r: any = await db.execute(sql`SELECT tier, COUNT(*) AS c FROM entitlements GROUP BY tier`); return r.rows; }
    catch { return []; }
  })();
  return c.json({
    users: await one(`SELECT COUNT(DISTINCT user_id) AS c FROM events WHERE user_id IS NOT NULL`),
    views, meaningful,
    meaningfulRate: views ? Number(((meaningful / views) * 100).toFixed(1)) : 0,
    goalsTotal, goalsDone,
    goalDoneRate: goalsTotal ? Number(((goalsDone / goalsTotal) * 100).toFixed(1)) : 0,
    shares: await one(`SELECT COUNT(*) AS c FROM shares`),
    paywallViews: await one(`SELECT COUNT(*) AS c FROM events WHERE name='paywall_view'`),
    packUnlocks: await one(`SELECT COUNT(*) AS c FROM events WHERE name='pack_unlock'`),
    tiers,
  });
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

app.get('/api/health', c => c.json({ ok: true, phase: '5-premium-test', stack: 'local-postgres + better-auth + r2' }));

startJobs();

const port = Number(process.env.PORT || process.env.API_PORT || 3000);
export default { port, fetch: app.fetch };

// Plain-Node HTTP adapter (no extra deps): bridges Node req/res to app.fetch.
import { createServer } from 'node:http';
const server = createServer(async (nreq: any, nres: any) => {
  try {
    const url = `http://${nreq.headers.host || `localhost:${port}`}${nreq.url}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(nreq.headers as Record<string, string | string[] | undefined>)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach(x => headers.append(k, x));
      else headers.set(k, v);
    }
    const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes((nreq.method || 'GET').toUpperCase());
    const chunks: Buffer[] = [];
    if (hasBody) for await (const c of nreq) chunks.push(c as Buffer);
    const init: RequestInit & { duplex?: string } = { method: nreq.method, headers };
    if (hasBody && chunks.length) { init.body = Buffer.concat(chunks) as any; (init as any).duplex = 'half'; }
    const out = await app.fetch(new Request(url, init as RequestInit));
    const outHeaders: Record<string, string> = {};
    out.headers.forEach((v, k) => { outHeaders[k] = v; });
    nres.writeHead(out.status, outHeaders);
    nres.end(Buffer.from(await out.arrayBuffer()));
  } catch {
    try { nres.writeHead(500); nres.end('server error'); } catch {}
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Uplift API Phase 5 (premium test) on http://localhost:${port}`));
