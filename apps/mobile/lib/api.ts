export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://<your-lan-ip>:3000';

export type Uplift = {
  id: string; greeting: string; body: string; action: string;
  category: string; scripture?: string; faith?: boolean;
};

async function get(path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}${path}?${q}`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function post(path: string, body: any = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function getList(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  today: (p: Record<string, string>) => get('/api/uplifts/today', p) as Promise<Uplift>,
  lift: (p: Record<string, string>) => get('/api/lift', p) as Promise<Uplift>,
  categories: () => get('/api/categories') as Promise<string[]>,
  saveProfile: (prefs: any) => post('/api/profiles', prefs),
  checkin: (mood: string, note?: string) => post('/api/checkins', { mood, note }),
  goals: () => getList('/api/goals'),
  addGoal: (title: string) => post('/api/goals', { title }),
  completeGoal: (id: string) => post(`/api/goals/${id}/done`),
  journal: () => getList('/api/journal'),
  addJournal: (body: string) => post('/api/journal', { body, prompt: 'What are you proud of today?', victory: true }),
  progress: () => getList('/api/journal/progress'),
  save: (upliftId: string) => post('/api/save', { upliftId }),
  like: (upliftId: string) => post('/api/like', { upliftId }),
  streak: () => getList('/api/streak'),
  event: (name: string, props = {}) => post('/api/events', { name, props }).catch(() => ({})),
};
