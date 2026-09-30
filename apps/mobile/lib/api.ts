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

export const api = {
  today: (p: Record<string, string>) => get('/api/uplifts/today', p) as Promise<Uplift>,
  lift: (p: Record<string, string>) => get('/api/lift', p) as Promise<Uplift>,
  categories: () => get('/api/categories') as Promise<string[]>,
};
