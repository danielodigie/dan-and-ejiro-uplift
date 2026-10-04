import { Hono } from 'hono';
import { db } from './db.js';
import { auth } from './auth.js';
import { sql } from 'drizzle-orm';

async function me(c: any) {
  const s = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!s?.user) return null;
  return s.user;
}
const need = async (c: any, next: any) => {
  const u = await me(c);
  if (!u) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', u);
  await next();
};

export const profiles = new Hono({ strict: false });
profiles.use('*', need);
profiles.get('/', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM profiles WHERE user_id=${u.id}`);
  return c.json(r.rows[0] || null);
});
async function upsertProfile(c: any) {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO profiles (user_id, moods, situations, goals_focus, styles, faith_opt_in, notify_times, frequency)
    VALUES (${u.id}, ${JSON.stringify(b.moods || (b.mood ? [b.mood] : []))}, ${JSON.stringify(b.situations || (b.situation ? [b.situation] : []))}, ${JSON.stringify(b.goalsFocus || b.goals_focus || (b.goal ? [b.goal] : []))},
      ${JSON.stringify(b.styles || (b.style ? [b.style] : []))}, ${!!(b.faithOptIn ?? b.faith_opt_in)}, ${JSON.stringify(b.notifyTimes || b.notify_times || ['08:00','13:00','20:00'])}, ${b.frequency || 'daily'})
    ON CONFLICT (user_id) DO UPDATE SET moods=EXCLUDED.moods, situations=EXCLUDED.situations, goals_focus=EXCLUDED.goals_focus,
      styles=EXCLUDED.styles, faith_opt_in=EXCLUDED.faith_opt_in, notify_times=EXCLUDED.notify_times, frequency=EXCLUDED.frequency`);
  return c.json({ ok: true });
}
profiles.put('/', upsertProfile);
profiles.post('/', upsertProfile);

export const checkins = new Hono({ strict: false });
checkins.use('*', need);
checkins.get('/', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM checkins WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 30`);
  return c.json(r.rows);
});
checkins.post('/', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO checkins (user_id, mood, note) VALUES (${u.id}, ${b.mood}, ${b.note || null})`);
  await db.execute(sql`INSERT INTO streaks (user_id, current_count, longest, last_seen_date)
    VALUES (${u.id}, 1, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      current_count = CASE WHEN streaks.last_seen_date = CURRENT_DATE THEN streaks.current_count
        WHEN streaks.last_seen_date = CURRENT_DATE - INTERVAL '1 day' THEN streaks.current_count + 1 ELSE 1 END,
      longest = GREATEST(streaks.longest, CASE WHEN streaks.last_seen_date = CURRENT_DATE THEN streaks.current_count
        WHEN streaks.last_seen_date = CURRENT_DATE - INTERVAL '1 day' THEN streaks.current_count + 1 ELSE 1 END),
      last_seen_date = CURRENT_DATE`);
  return c.json({ ok: true, message: 'Start again. Keep going.' });
});

export const goals = new Hono({ strict: false });
goals.use('*', need);
goals.get('/', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM goals WHERE user_id=${u.id} ORDER BY created_at DESC`);
  return c.json(r.rows);
});
goals.post('/', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  const r: any = await db.execute(sql`INSERT INTO goals (user_id, title, category, why, target_date, status)
    VALUES (${u.id}, ${b.title}, ${b.category || null}, ${b.why || null}, ${b.targetDate || null}, 'active') RETURNING *`);
  return c.json(r.rows[0]);
});
goals.post('/:id/done', async c => {
  const u: any = c.get('user');
  await db.execute(sql`UPDATE goals SET status='done' WHERE id=${c.req.param('id')} AND user_id=${u.id}`);
  return c.json({ ok: true, celebration: "You showed up when it would have been easier to quit. That's progress." });
});
goals.patch('/:id', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`UPDATE goals SET title=COALESCE(${b.title || null}, title), category=COALESCE(${b.category || null}, category),
    why=COALESCE(${b.why || null}, why), target_date=COALESCE(${b.targetDate || b.target_date || null}, target_date),
    status=COALESCE(${b.status || null}, status) WHERE id=${c.req.param('id')} AND user_id=${u.id}`);
  return c.json({ ok: true });
});
goals.delete('/:id', async c => {
  const u: any = c.get('user');
  await db.execute(sql`DELETE FROM goals WHERE id=${c.req.param('id')} AND user_id=${u.id}`);
  return c.json({ ok: true });
});
// Sprint D — goal steps (small next actions per goal)
goals.get('/:id/steps', async c => {
  const r: any = await db.execute(sql`SELECT * FROM goal_steps WHERE goal_id=${c.req.param('id')} ORDER BY done_at NULLS FIRST`);
  return c.json(r.rows);
});
goals.post('/:id/steps', async c => {
  const b = await c.req.json();
  const r: any = await db.execute(sql`INSERT INTO goal_steps (goal_id, action_text) VALUES (${c.req.param('id')}, ${b.actionText || b.action_text}) RETURNING *`);
  return c.json(r.rows[0]);
});
goals.post('/steps/:stepId/done', async c => {
  await db.execute(sql`UPDATE goal_steps SET done_at=NOW() WHERE id=${c.req.param('stepId')}`);
  return c.json({ ok: true, celebration: 'Small step done. Keep going.' });
});

export const journal = new Hono({ strict: false });
journal.use('*', need);
journal.get('/', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM journal_entries WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 50`);
  return c.json(r.rows);
});
journal.post('/', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  const r: any = await db.execute(sql`INSERT INTO journal_entries (user_id, prompt, body, mood, gratitude, victory)
    VALUES (${u.id}, ${b.prompt || null}, ${b.body}, ${b.mood || null}, ${JSON.stringify(b.gratitude || [])}, ${!!b.victory}) RETURNING *`);
  return c.json(r.rows[0]);
});
journal.get('/progress', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM journal_entries WHERE user_id=${u.id} AND victory=true ORDER BY created_at DESC LIMIT 20`);
  return c.json({ title: "Look How Far You've Come", victories: r.rows });
});
journal.delete('/:id', async c => {
  const u: any = c.get('user');
  await db.execute(sql`DELETE FROM journal_entries WHERE id=${c.req.param('id')} AND user_id=${u.id}`);
  return c.json({ ok: true });
});

export const social = new Hono({ strict: false });
// NOTE: no blanket use('*', need) here — this router is mounted at /api,
// so a wildcard would auth-gate every /api/* route including open ones
// like /api/health and /api/categories. Auth is applied per-route below.
social.get('/saves', need, async c => {
  const u: any = c.get('user');
  try {
    const r: any = await db.execute(sql`SELECT * FROM saves WHERE user_id=${u.id}`);
    return c.json(r.rows);
  } catch {
    return c.json([]);
  }
});
social.delete('/saves', need, async c => {
  const u: any = c.get('user');
  const { upliftId, collection } = c.req.query();
  try {
    if (collection) await db.execute(sql`DELETE FROM saves WHERE user_id=${u.id} AND uplift_id=${upliftId} AND collection=${collection}`);
    else await db.execute(sql`DELETE FROM saves WHERE user_id=${u.id} AND uplift_id=${upliftId}`);
  } catch {}
  return c.json({ ok: true });
});
social.get('/collections', need, async c => {
  const u: any = c.get('user');
  try {
    const r: any = await db.execute(sql`SELECT collection, COUNT(*) as count FROM saves WHERE user_id=${u.id} GROUP BY collection`);
    return c.json(r.rows);
  } catch {
    return c.json([]);
  }
});
social.post('/share', need, async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  try {
    const r: any = await db.execute(sql`INSERT INTO shares (user_id, uplift_id, channel, r2_key) VALUES (${u.id}, ${b.upliftId}, ${b.channel || 'system'}, ${b.r2Key || b.r2_key || null}) RETURNING *`);
    return c.json(r.rows[0]);
  } catch {
    return c.json({ ok: true });
  }
});
social.get('/shares', need, async c => {
  const u: any = c.get('user');
  try {
    const r: any = await db.execute(sql`SELECT * FROM shares WHERE user_id=${u.id} ORDER BY uplift_id DESC LIMIT 50`);
    return c.json(r.rows);
  } catch {
    return c.json([]);
  }
});
social.post('/save', need, async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO saves (user_id, uplift_id, collection) VALUES (${u.id}, ${b.upliftId}, ${b.collection || 'favorites'}) ON CONFLICT DO NOTHING`);
  return c.json({ ok: true });
});
social.post('/like', need, async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO likes (user_id, uplift_id) VALUES (${u.id}, ${b.upliftId}) ON CONFLICT DO NOTHING`);
  return c.json({ ok: true });
});
social.get('/streak', need, async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM streaks WHERE user_id=${u.id}`);
  return c.json(r.rows[0] || { current_count: 0, longest: 0 });
});
