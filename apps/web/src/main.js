// Minimal web client for the Uplift API (same REST surface as apps/mobile/lib/api.ts).
// API base is injected at Netlify build time via VITE_API_URL.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

// Bundled uplift photos (offline-first) — mirrors packages/content/images.json.
const UPLIFT_IMAGES = {
  hope: 'sunrise-field.jpg', confidence: 'mountain-peak.jpg', motivation: 'field-sunset.jpg',
  strength: 'mountain-lake.jpg', courage: 'ocean-wave.jpg', success: 'foggy-hills.jpg',
  failure: 'forest-road.jpg', relationships: 'canoe-lake.jpg', career: 'lake-tahoe.jpg',
  money: 'golden-field.jpg', purpose: 'landscape-road.jpg', 'self-belief': 'mountain-peak.jpg',
  gratitude: 'field-sunset.jpg', discipline: 'beach.jpg', leadership: 'mountain-lake.jpg',
  faith: 'sky-sunrise.jpg', family: 'canoe-lake.jpg', growth: 'forest-road.jpg',
};
const upliftImg = (u) => {
  const f = (u && UPLIFT_IMAGES[u.category]) || 'sunrise-field.jpg';
  return `<img src="images/${f}" alt="" style="width:100%;border-radius:12px;border:3px solid #111" onerror="this.remove()">`;
};
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
document.getElementById('linkForgot').onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  if (!email.includes('@')) { log('type your email first'); return; }
  try { await req('/api/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) }); log('if that email exists, a reset link is on its way — open it, then set a new password below'); }
  catch (err) { log(String(err)); }
};
// Email reset link lands here as ?reset=1&token=XXX (API-validated first).
{
  const q = new URLSearchParams(window.location.search);
  const token = q.get('token');
  if (q.get('reset') !== null && token) {
    document.getElementById('resetBox').style.display = '';
    document.getElementById('btnResetGo').onclick = async () => {
      const pw = document.getElementById('newPassword').value;
      if (pw.length < 8) { log('new password must be 8+ characters'); return; }
      try {
        await req(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ newPassword: pw }) });
        log('password updated — sign in above with the new password');
        window.history.replaceState({}, '', window.location.pathname);
      } catch (err) { log(String(err)); }
    };
  }
}
document.getElementById('btnPhoneSignup').onclick = async () => {
  const phoneNumber = document.getElementById('phone').value.trim();
  const password = document.getElementById('phonePw').value;
  if (!phoneNumber) { log('type your phone number first, e.g. 0803...'); return; }
  if (password.trim().length < 8) { log('password must be 8+ characters'); return; }
  try {
    await req('/api/phone/signup', { method: 'POST', body: JSON.stringify({ phoneNumber, password: password.trim() }) });
    await req('/api/auth/sign-in/phone-number', { method: 'POST', body: JSON.stringify({ phoneNumber, password: password.trim() }) });
    log('phone account created — signed in');
  } catch (e) { log(String(e)); }
};
document.getElementById('btnPhoneSignin').onclick = async () => {
  const phoneNumber = document.getElementById('phone').value.trim();
  const password = document.getElementById('phonePw').value;
  try { await req('/api/auth/sign-in/phone-number', { method: 'POST', body: JSON.stringify({ phoneNumber, password }) }); log('signed in with phone'); }
  catch (e) { log(String(e)); }
};
document.getElementById('btnToday').onclick = async () => {
  const mood = document.getElementById('mood').value;
  try {
    const u = await req(`/api/uplifts/today?mood=${encodeURIComponent(mood)}`);
    document.getElementById('uplift').innerHTML =
      `${upliftImg(u)}<h3>${u.greeting || ''}</h3><p>${u.body || ''}</p><p><b>Action:</b> ${u.action || u.action_text || ''}</p><small>source: ${u.source || ''}</small>`;
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

document.getElementById('btnJournalAdd').onclick = async () => {
  const body = document.getElementById('journalBody').value;
  if (!body.trim()) { log('type one sentence first'); return; }
  try { await req('/api/journal', { method: 'POST', body: JSON.stringify({ body: body.trim(), prompt: 'What are you proud of today?', victory: true }) }); log('journal saved'); }
  catch (e) { log(String(e)); }
};
document.getElementById('btnJournal').onclick = async () => {
  try {
    const j = await req('/api/journal', { method: 'GET' });
    document.getElementById('journal').innerHTML = (j || []).map(x => `<div>• ${x.body}</div>`).join('') || '(none)';
  } catch (e) { log(String(e)); }
};
document.getElementById('btnProgress').onclick = async () => {
  try {
    const p = await req('/api/journal/progress', { method: 'GET' });
    document.getElementById('journal').innerHTML = `<b>${p.title || "Look How Far You've Come"}</b>` +
      ((p.victories || []).map(v => `<div>🌱 ${v.body}</div>`).join('') || '<div>(no victories yet)</div>');
  } catch (e) { log(String(e)); }
};
document.getElementById('btnProfile').onclick = async () => {
  try {
    const p = await req('/api/profiles', { method: 'GET' });
    const e = await req('/api/entitlements', { method: 'GET' }).catch(() => ({}));
    document.getElementById('profile').innerHTML = `<div>Plan: <b>${e.tier || 'free'}</b></div><pre>${JSON.stringify(p, null, 1) || '(no profile yet)'}</pre>`;
  } catch (e) { log(String(e)); }
};
document.getElementById('btnPacks').onclick = async () => {
  try {
    const packs = await req('/api/packs', { method: 'GET' });
    const el = document.getElementById('profile');
    el.innerHTML = (packs || []).map(p =>
      `<div><b>${p.locked ? '🔒' : '✅'} ${p.title}</b><br/>${p.tagline}<br/>` +
      (p.locked ? `<button class="btn" data-pay="${p.id}">Pay ₦1,500 with Paystack</button> ` : '') +
      (p.locked ? `<button class="btn" data-unlock="${p.id}">Unlock free (demo)</button>` : '') + '</div>'
    ).join('') || '(none)';
    el.querySelectorAll('[data-pay]').forEach(b => b.onclick = async () => {
      try {
        const r = await req('/api/pay/initialize', { method: 'POST', body: JSON.stringify({ pack_id: b.dataset.pay }) });
        if (r.alreadyOwned) { log('already owned — tap Show packs again'); return; }
        if (!r.authorization_url) throw new Error('no payment link returned');
        log('opening Paystack checkout…');
        window.location.href = r.authorization_url;
      } catch (e) { log(String(e)); }
    });
    el.querySelectorAll('[data-unlock]').forEach(b => b.onclick = async () => {
      try { await req(`/api/packs/${encodeURIComponent(b.dataset.unlock)}/unlock`, { method: 'POST', body: '{}' }); log('unlocked — tap Show packs again'); }
      catch (e) { log(String(e)); }
    });
  } catch (e) { log(String(e)); }
};

// PWA: offline shell + visible install (box 8). API calls always hit the
// network (service worker only caches same-origin GETs, never /api... which
// is cross-origin anyway), so login and data stay live.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      () => {},
      (e) => log('offline setup skipped: ' + (e && e.message)),
    );
  });
}
{
  const installBtn = document.getElementById('btnInstall');
  const installHint = document.getElementById('installHint');
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let deferredPrompt = null;
  const showHint = (t) => { if (installHint) installHint.textContent = t; };
  if (isStandalone) {
    if (installBtn) installBtn.style.display = 'none';
    showHint('Running as an installed app. Open Uplift from your home screen.');
  } else if (isIos) {
    // iPhones have no install prompt: teach the manual path.
    showHint('iPhone: tap Share (the square with an arrow), then Add to Home Screen.');
  } else {
    showHint('Android/Computer: tap Install below (or the browser menu → Install / Add to Home screen).');
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = '';
    showHint('Tap Install below to add Uplift to your home screen.');
  });
  if (installBtn) installBtn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    installBtn.style.display = 'none';
  };
  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    showHint('Installed — open Uplift from your home screen.');
    log('installed');
  });
}

// Paystack return: ?paystack=callback&reference=XXX (or ?trxref=XXX).
// Verify server-side; the server unlocks the pack only on real success.
(async () => {
  const q = new URLSearchParams(window.location.search);
  const ref = q.get('reference') || q.get('trxref');
  if (!ref) return;
  try {
    const v = await req(`/api/pay/verify/${encodeURIComponent(ref)}`, { method: 'GET' });
    if (v.ok) log(`payment confirmed — ${v.pack} unlocked (premium). Tap Show packs.`);
    else log('payment not confirmed yet: ' + (v.error || 'pending'));
  } catch (e) { log(String(e)); }
  window.history.replaceState({}, '', window.location.pathname);
})();

checkHealth();
