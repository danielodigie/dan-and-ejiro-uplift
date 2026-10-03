// Minimal web client for the Uplift API (same REST surface as apps/mobile/lib/api.ts).
// API base is injected at Netlify build time via VITE_API_URL.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
document.getElementById('apiUrl').textContent = API_URL;

const log = (m) => { document.getElementById('log').textContent += m + '\n'; };

async function req(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path} ${t.slice(0, 200)}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}

async function checkHealth() {
  try {
    const h = await req('/api/health');
    document.getElementById('health').textContent = 'ok ' + JSON.stringify(h);
  } catch (e) {
    document.getElementById('health').textContent = 'unreachable — set VITE_API_URL. ' + e.message;
  }
}

document.getElementById('btnSignup').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try { await req('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ email, password, name: email }) }); log('signed up + signed in'); }
  catch (e) { log(String(e)); }
};
document.getElementById('btnSignin').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try { await req('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) }); log('signed in'); }
  catch (e) { log(String(e)); }
};
document.getElementById('btnToday').onclick = async () => {
  const mood = document.getElementById('mood').value;
  try {
    const u = await req(`/api/uplifts/today?mood=${encodeURIComponent(mood)}`);
    document.getElementById('uplift').innerHTML =
      `<h3>${u.greeting || ''}</h3><p>${u.body || ''}</p><p><b>Action:</b> ${u.action || u.action_text || ''}</p><small>source: ${u.source || ''}</small>`;
  } catch (e) { log(String(e)); }
};
document.getElementById('btnCheckin').onclick = async () => {
  const mood = document.getElementById('mood').value;
  try { await req('/api/checkins', { method: 'POST', body: JSON.stringify({ mood }) }); log('checked in'); }
  catch (e) { log(String(e)); }
};
document.getElementById('btnGoal').onclick = async () => {
  const title = document.getElementById('goalTitle').value;
  if (!title) return;
  try { await req('/api/goals', { method: 'POST', body: JSON.stringify({ title }) }); log('goal added'); }
  catch (e) { log(String(e)); }
};
document.getElementById('btnGoals').onclick = async () => {
  try {
    const g = await req('/api/goals');
    document.getElementById('goals').innerHTML = (g || []).map(x => `<div>• ${x.title} [${x.status}]</div>`).join('') || '(none)';
  } catch (e) { log(String(e)); }
};

checkHealth();
