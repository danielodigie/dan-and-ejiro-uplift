export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://<your-lan-ip>:3000';

export type Uplift = {
  id: string; greeting: string; body: string; action: string;
  category: string; scripture?: string; faith?: boolean; crisis?: boolean; source?: string;
};

export type Prefs = {
  mood: string; situation: string; goal: string; styles: string[];
  faithOptIn: boolean; notifyTimes: string[]; frequency: string;
};

// --- Minimal cookie jar for Better Auth (React Native fetch has no cookie store) ---
let cookie = '';
function storeCookies(res: Response) {
  // React Native exposes set-cookie via headers.get('set-cookie')
  const setCookie: string | null =
    res.headers?.get?.('set-cookie') || (res.headers as any)?.get?.('Set-Cookie') || null;
  if (setCookie) {
    // Keep only name=value pairs (drop Expires/Path/HttpOnly attrs)
    const pairs = setCookie.split(',').map(s => s.trim()).filter(Boolean);
    // Better Auth may send multiple cookies comma-joined; naive split on ';' first chunk is safest:
    // store full header chunks split by ';' attributes is complex — store first-pair per cookie.
    const names = new Map<string, string>();
    // Preserve existing
    cookie.split(';').forEach(p => {
      const i = p.indexOf('=');
      if (i > 0) names.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
    });
    // set-cookie can be "a=1; Path=/, b=2; Path=/" — split on ', ' then take first ';' part
    setCookie.split(/,(?=[^;]+?=[^;]*?;)/g).forEach(chunk => {
      const first = chunk.split(';')[0].trim();
      const i = first.indexOf('=');
      if (i > 0) names.set(first.slice(0, i).trim(), first.slice(i + 1).trim());
    });
    void pairs;
    cookie = [...names.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}
function headers(extra: Record<string, string> = {}) {
  // React Native fetch sends no Origin header, but Better Auth rejects
  // origin-less POSTs (MISSING_OR_NULL_ORIGIN). Echo the API's own origin,
  // which the server always trusts (== baseURL). Browser CSRF protection is
  // unaffected: browsers send the true Origin, spoofed ones still 403.
  return { 'Content-Type': 'application/json', Origin: API_URL, ...(cookie ? { Cookie: cookie } : {}), ...extra };
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: headers(init.headers as any) });
  storeCookies(res);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path} ${text.slice(0, 120)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  return res.text();
}

function qs(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// --- Offline cache: last good uplift survives network loss (acceptance: offline-tolerant) ---
let cachedUplift: Uplift | null = null;
export function getCachedUplift(): Uplift | null { return cachedUplift; }
export const OFFLINE_UPLIFT: Uplift = {
  id: 'offline', greeting: 'Good morning.',
  body: 'You do not need to solve everything today. Focus on the next step and keep moving.',
  action: 'Do one 10-minute step now.', category: 'hope',
};

export const api = {
  // Auth (Better Auth email+password + guest-friendly: any email works locally)
  signUp: (email: string, password: string, name?: string) =>
    req('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ email, password, name: name || email }) }),
  signIn: (email: string, password: string) =>
    req('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signOut: () => req('/api/auth/sign-out', { method: 'POST', body: JSON.stringify({}) }),
  session: () => req('/api/auth/get-session', { method: 'GET' }).catch(() => null),

  // Sprint A — profile (PUT canonical, POST alias for compat)
  profile: () => req('/api/profiles', { method: 'GET' }).catch(() => null),
  saveProfile: (p: Partial<Prefs> & Record<string, any>) =>
    req('/api/profiles', { method: 'PUT', body: JSON.stringify({
      moods: [p.mood], situations: [p.situation], goalsFocus: p.goal ? [p.goal] : [],
      styles: p.styles || [], faithOptIn: !!p.faithOptIn,
      notifyTimes: p.notifyTimes || ['08:00', '13:00', '20:00'], frequency: p.frequency || 'daily',
      ...p,
    }) }),

  // Check-ins feed streak (Sprint D streak service lives server-side)
  checkin: (mood: string, note?: string) => req('/api/checkins', { method: 'POST', body: JSON.stringify({ mood, note }) }),
  checkins: () => req('/api/checkins', { method: 'GET' }).catch(() => []),

  // Sprint B/C — uplift engine (seen=comma ids → 7-day no-repeat, faith flag)
  today: async (p: Record<string, string>, seen: string[] = []) => {
    try {
      const u = await req(`/api/uplifts/today${qs({ ...p, seen: seen.join(',') })}`, { method: 'GET' }) as Uplift;
      cachedUplift = u;
      return u;
    } catch {
      return cachedUplift || OFFLINE_UPLIFT;
    }
  },
  lift: async (p: Record<string, string>, seen: string[] = []) => {
    try {
      const u = await req(`/api/lift${qs({ ...p, seen: seen.join(',') })}`, { method: 'GET' }) as Uplift;
      cachedUplift = u;
      return u;
    } catch {
      return cachedUplift || OFFLINE_UPLIFT;
    }
  },
  byCategory: (name: string, p: Record<string, string> = {}, seen: string[] = []) =>
    req(`/api/uplifts/category/${encodeURIComponent(name)}${qs({ ...p, seen: seen.join(',') })}`, { method: 'GET' }) as Promise<Uplift>,
  categories: () => req('/api/categories', { method: 'GET' }).catch(() => [
    'hope','confidence','motivation','strength','courage','success','failure',
    'relationships','career','money','purpose','self-belief','gratitude',
    'discipline','leadership','faith','family','growth',
  ]) as Promise<string[]>,

  // Sprint D — goals + steps
  goals: () => req('/api/goals', { method: 'GET' }).catch(() => []),
  addGoal: (title: string, extra: Record<string, any> = {}) =>
    req('/api/goals', { method: 'POST', body: JSON.stringify({ title, ...extra }) }),
  completeGoal: (id: string) => req(`/api/goals/${id}/done`, { method: 'POST', body: JSON.stringify({}) }),
  deleteGoal: (id: string) => req(`/api/goals/${id}`, { method: 'DELETE' }),
  goalSteps: (id: string) => req(`/api/goals/${id}/steps`, { method: 'GET' }).catch(() => []),
  addStep: (id: string, actionText: string) =>
    req(`/api/goals/${id}/steps`, { method: 'POST', body: JSON.stringify({ actionText }) }),
  completeStep: (stepId: string) => req(`/api/goals/steps/${stepId}/done`, { method: 'POST', body: JSON.stringify({}) }),

  // Sprint E — journal + Look How Far You've Come
  journal: () => req('/api/journal', { method: 'GET' }).catch(() => []),
  addJournal: (body: string, extra: Record<string, any> = {}) =>
    req('/api/journal', { method: 'POST', body: JSON.stringify({ body, prompt: 'What are you proud of today?', victory: true, ...extra }) }),
  deleteJournal: (id: string) => req(`/api/journal/${id}`, { method: 'DELETE' }),
  progress: () => req('/api/journal/progress', { method: 'GET' }).catch(() => ({ title: "Look How Far You've Come", victories: [] })),

  // Sprint B/E — meaningful actions (§34: like/save/share = meaningful)
  save: (upliftId: string, collection = 'favorites') => req('/api/save', { method: 'POST', body: JSON.stringify({ upliftId, collection }) }),
  unsave: (upliftId: string, collection?: string) =>
    req(`/api/saves${qs({ upliftId, collection })}`, { method: 'DELETE' }).catch(() => ({ ok: true })),
  saves: () => req('/api/saves', { method: 'GET' }).catch(() => []),
  collections: () => req('/api/collections', { method: 'GET' }).catch(() => []),
  like: (upliftId: string) => req('/api/like', { method: 'POST', body: JSON.stringify({ upliftId }) }),
  shareRecord: (upliftId: string, channel = 'system', r2Key?: string) =>
    req('/api/share', { method: 'POST', body: JSON.stringify({ upliftId, channel, r2Key }) }).catch(() => ({ ok: true })),
  streak: () => req('/api/streak', { method: 'GET' }).catch(() => ({ current_count: 0, longest: 0 })),

  // Files (R2 share-cards / journal attachments)
  presign: (key: string, contentType = 'image/png') =>
    req('/api/files/presign', { method: 'POST', body: JSON.stringify({ key, contentType }) }),

  // Entitlements premium-stub (Phase 5: tier + packs, restore simulates store restore)
  entitlements: () => req('/api/entitlements', { method: 'GET' }).catch(() => ({ tier: 'free', packs: [] })),
  setTier: (tier: string, packs: string[] = []) =>
    req('/api/entitlements', { method: 'POST', body: JSON.stringify({ tier, packs }) }).catch(() => ({ ok: true })),
  restore: () => req('/api/entitlements/restore', { method: 'POST', body: JSON.stringify({}) }).catch(() => ({ tier: 'free', packs: [] })),

  // Real payments via Paystack (server holds the secret; app only opens links)
  payStatus: () => req('/api/pay/status', { method: 'GET' }).catch(() => ({ configured: false })),
  payInit: (packId: string) =>
    req('/api/pay/initialize', { method: 'POST', body: JSON.stringify({ pack_id: packId }) }),
  payVerify: (reference: string) =>
    req(`/api/pay/verify/${encodeURIComponent(reference)}`, { method: 'GET' }),

  // Phase 5 — premium packs, journeys, guided reflections, insights
  packs: () => req('/api/packs', { method: 'GET' }).catch(() => []),
  packDays: (id: string, stylesCsv = '') =>
    req(`/api/packs/${encodeURIComponent(id)}/days${qs({ styles: stylesCsv })}`, { method: 'GET' }),
  unlockPack: (id: string) => req(`/api/packs/${encodeURIComponent(id)}/unlock`, { method: 'POST', body: JSON.stringify({}) }),
  guidedReflection: (topic = 'confidence') =>
    req(`/api/reflections/guided${qs({ topic })}`, { method: 'GET' }),
  insights: (full = false) => req(`/api/insights${qs({ full: full ? 'true' : '' })}`, { method: 'GET' }).catch(() => null),

  // Analytics (§34) — fire-and-forget
  event: (name: string, props: Record<string, any> = {}) =>
    req('/api/events', { method: 'POST', body: JSON.stringify({ name, props }) }).catch(() => ({})),

  // Phase 6 — privacy + analytics dashboard
  exportData: () => req('/api/account/export', { method: 'GET' }).catch(() => null),
  deleteAccount: () => req('/api/account', { method: 'DELETE' }),
  analytics: () => req('/api/analytics/summary', { method: 'GET' }).catch(() => null),
};
