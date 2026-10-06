// Phase 6 — API-level E2E: Morning → Afternoon → Evening journey (§32).
// Run against a live server + seeded DB:
//   node apps/api/journey-test.mjs [baseUrl]
// Exit 0 pass, 1 fail, 2 server unreachable (SKIP with setup hint).
const base = process.argv[2] || 'http://localhost:3000';
let cookie = '';
function headers(extra = {}) {
  // Plain Node fetch sends no Origin; Better Auth 403s origin-less POSTs.
  // Send the API's own origin (always trusted, == baseURL), like the mobile app does.
  return { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...extra };
}
async function req(path, init = {}) {
  const res = await fetch(base + path, { ...init, headers: headers(init.headers) });
  const sc = res.headers.getSetCookie?.() || [];
  if (sc.length) cookie = sc.map(s => s.split(';')[0]).join('; ');
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch {}
  return { status: res.status, json, body };
}
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && cond ? '' : ' ' + String(extra).slice(0, 160)}`);
  if (!cond) process.exitCode = 1;
}

try {
  await fetch(base + '/api/health');
} catch {
  console.log('SKIP: server unreachable — start it first: pnpm --filter @uplift/api dev');
  console.log('Setup: create DB uplift, set apps/api/.env, then: pnpm --filter @uplift/db seed');
  process.exit(2);
}

const email = `journey${Date.now()}@test.com`;
// Morning: sign up + onboarding + check-in + Today's Uplift
let r = await req('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ email, password: 'uplift123', name: 'journey' }) });
check('morning: sign-up', r.status < 400, r.status);
r = await req('/api/profiles', { method: 'PUT', body: JSON.stringify({ moods: ['okay'], situations: ['career'], goalsFocus: ['Get a new job'], styles: ['gentle'], faithOptIn: false }) });
check('morning: onboarding profile saved', r.status === 200, r.status);
r = await req('/api/checkins', { method: 'POST', body: JSON.stringify({ mood: 'okay' }) });
check('morning: check-in (feeds streak)', r.status === 200, r.status);
r = await req('/api/uplifts/today?mood=okay&situation=career&style=gentle', { method: 'GET' });
check("morning: Today's Uplift", r.status === 200 && !!r.json?.body, r.status);
const todayId = r.json?.id || 'offline';
await req('/api/events', { method: 'POST', body: JSON.stringify({ name: 'view_today', props: { upliftId: todayId } }) });

// Afternoon: I Need a Lift + save + action becomes a goal
r = await req('/api/lift?intent=discouraged&situation=career&style=gentle', { method: 'GET' });
check('afternoon: I Need a Lift', r.status === 200 && !!r.json?.body, r.status);
r = await req('/api/save', { method: 'POST', body: JSON.stringify({ upliftId: todayId, collection: 'favorites' }) });
check('afternoon: save uplift', r.status === 200, r.status);
r = await req('/api/goals', { method: 'POST', body: JSON.stringify({ title: 'Apply for one opportunity' }) });
check('afternoon: action becomes goal', r.status === 200 && !!r.json?.id, r.status);
const goalId = r.json?.id;
if (goalId) {
  r = await req(`/api/goals/${goalId}/done`, { method: 'POST', body: JSON.stringify({}) });
  check('afternoon: goal done celebrates', r.status === 200 && !!r.json?.celebration, r.status);
}

// Evening: journal reflect + Look How Far You've Come + insights + export (privacy)
r = await req('/api/journal', { method: 'POST', body: JSON.stringify({ body: "I didn't give up.", victory: true }) });
check('evening: journal entry', r.status === 200, r.status);
r = await req('/api/journal/progress', { method: 'GET' });
check("evening: Look How Far You've Come", r.status === 200 && Array.isArray(r.json?.victories), r.status);
r = await req('/api/insights', { method: 'GET' });
check('evening: progress insights', r.status === 200, r.status);
r = await req('/api/account/export', { method: 'GET' });
check('privacy: export works', r.status === 200 && !!r.json?.profile, r.status);

console.log(process.exitCode ? 'JOURNEY FAIL' : 'JOURNEY PASS');
