import { Hono } from 'hono';
import { db } from '../db.js';
import { auth } from '../auth.js';
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

export const profiles = new Hono();
profiles.use('*', need);
profiles.get('/', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM profiles WHERE user_id=${u.id}`);
  return c.json(r.rows[0] || null);
});
profiles.put('/', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO profiles (user_id, moods, situations, goals_focus, styles, faith_opt_in, notify_times, frequency)
    VALUES (${u.id}, ${JSON.stringify(b.moods || [])}, ${JSON.stringify(b.situations || [])}, ${JSON.stringify(b.goalsFocus || [])},
      ${JSON.stringify(b.styles || [])}, ${!!b.faithOptIn}, ${JSON.stringify(b.notifyTimes || ['08:00','13:00','20:00'])}, ${b.frequency || 'daily'})
    ON CONFLICT (user_id) DO UPDATE SET moods=EXCLUDED.moods, situations=EXCLUDED.situations, goals_focus=EXCLUDED.goals_focus,
      styles=EXCLUDED.styles, faith_opt_in=EXCLUDED.faith_opt_in, notify_times=EXCLUDED.notify_times, frequency=EXCLUDED.frequency`);
  return c.json({ ok: true });
});

export const checkins = new Hono();
checkins.use('*', need);
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

export const goals = new Hono();
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

export const journal = new Hono();
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

export const social = new Hono();
social.use('*', need);
social.post('/save', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO saves (user_id, uplift_id, collection) VALUES (${u.id}, ${b.upliftId}, ${b.collection || 'favorites'}) ON CONFLICT DO NOTHING`);
  return c.json({ ok: true });
});
social.post('/like', async c => {
  const u: any = c.get('user');
  const b = await c.req.json();
  await db.execute(sql`INSERT INTO likes (user_id, uplift_id) VALUES (${u.id}, ${b.upliftId}) ON CONFLICT DO NOTHING`);
  return c.json({ ok: true });
});
social.get('/streak', async c => {
  const u: any = c.get('user');
  const r: any = await db.execute(sql`SELECT * FROM streaks WHERE user_id=${u.id}`);
  return c.json(r.rows[0] || { current_count: 0, longest: 0 });
});
