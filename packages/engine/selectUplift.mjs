// Phase 3 engine helper — deterministic, no LLM. Mirrors planned selectUplift() in packages/engine.
// Usage: import { selectUplift } from './selectUplift.mjs'
import uplifts from '../content/uplifts.json' with { type: 'json' };

export function selectUplift({ mood, situation, style, faithOptIn = false, category, seenIds = [] } = {}) {
  const seen = new Set(seenIds.slice(-7)); // no repeat within 7
  let pool = uplifts.filter(u => !seen.has(u.id));
  if (!faithOptIn) pool = pool.filter(u => !u.faith);
  if (category) pool = pool.filter(u => u.category === category);
  if (mood) { const m = pool.filter(u => u.moods.includes(mood)); if (m.length) pool = m; }
  if (situation) { const s = pool.filter(u => u.situations.includes(situation)); if (s.length) pool = s; }
  if (style) { const st = pool.filter(u => u.styles.includes(style)); if (st.length) pool = st; }
  if (!pool.length) pool = uplifts.filter(u => !seen.has(u.id) && (faithOptIn || !u.faith));
  if (!pool.length) pool = uplifts;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const greeting = pick.greetings[Math.floor(Math.random() * pick.greetings.length)];
  return { ...pick, greeting };
}
