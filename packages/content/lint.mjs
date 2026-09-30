// Phase 3 content lint — run: node packages/content/lint.mjs
// Checks: length, tone (banned phrases), crisis safety, taxonomy validity, duplicates, faith rules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const uplifts = JSON.parse(fs.readFileSync(path.join(__dir, 'uplifts.json'), 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync(path.join(__dir, 'taxonomy.json'), 'utf8'));

const BANNED = ['just be positive', 'you are a failure', 'give up', 'worthless', 'god hates', 'never will', 'always fail', 'kill yourself', 'self-harm'];
const CRISIS = ['suicide', 'kill myself', 'self-harm', 'end my life'];
const errors = [];
const seenBodies = new Set();
let faithCount = 0;

for (const u of uplifts) {
  const tag = u.id || '(no-id)';
  if (!u.id || !/^[a-z0-9-]+$/.test(u.id)) errors.push(`${tag}: bad id`);
  if (!u.body || u.body.length < 40 || u.body.length > 280) errors.push(`${tag}: body length ${u.body?.length} (must be 40-280)`);
  if (!u.action || u.action.length < 10 || u.action.length > 140) errors.push(`${tag}: action length (must be 10-140)`);
  if (!taxonomy.categories.includes(u.category)) errors.push(`${tag}: unknown category ${u.category}`);
  for (const m of u.moods || []) if (!taxonomy.moods.includes(m)) errors.push(`${tag}: unknown mood ${m}`);
  for (const s of u.situations || []) if (!taxonomy.situations.includes(s)) errors.push(`${tag}: unknown situation ${s}`);
  for (const st of u.styles || []) if (!taxonomy.styles.includes(st)) errors.push(`${tag}: unknown style ${st}`);
  const low = (u.body + ' ' + (u.action || '')).toLowerCase();
  for (const b of BANNED) if (low.includes(b)) errors.push(`${tag}: banned phrase "${b}"`);
  for (const c of CRISIS) if (low.includes(c)) errors.push(`${tag}: CRISIS language — must route to resources, not content`);
  if (seenBodies.has(u.body.trim().toLowerCase())) errors.push(`${tag}: duplicate body`);
  seenBodies.add(u.body.trim().toLowerCase());
  if (u.faith) {
    faithCount++;
    if (u.category !== 'faith' && !(u.styles || []).includes('spiritual')) errors.push(`${tag}: faith=true should be category faith or style spiritual`);
    if (!u.scripture) errors.push(`${tag}: faith message missing scripture`);
  } else if (u.category === 'faith') errors.push(`${tag}: category faith must have faith=true`);
  if (!u.greetings || u.greetings.length < 1) errors.push(`${tag}: missing greetings`);
}

const cats = {};
for (const u of uplifts) cats[u.category] = (cats[u.category] || 0) + 1;
const missing = taxonomy.categories.filter(c => !cats[c]);
const greetingVariants = uplifts.reduce((n, u) => n + (u.greetings?.length || 1), 0);

console.log(`Seeds: ${uplifts.length} | Greeting variants: ${greetingVariants} | Faith: ${faithCount}`);
console.log('Per-category:', JSON.stringify(cats));
if (missing.length) console.log('Missing categories:', missing.join(', '));
if (uplifts.length < 100) console.log('WARN: below 100 seeds — expand toward 350 target (see README).');
if (errors.length) { console.error(`\nFAIL: ${errors.length} error(s):`); for (const e of errors) console.error(' - ' + e); process.exit(1); }
console.log('\nPASS: content lint clean. No repeats, tone ok, faith rules ok.');
