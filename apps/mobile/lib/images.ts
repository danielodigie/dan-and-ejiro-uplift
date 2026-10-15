// Bundled uplift photos (offline-first). Metro needs static requires, so the
// map below mirrors packages/content/images.json — keep both in sync
// (packages/content/lint.mjs enforces the content side).
const MAP: Record<string, any> = {
  'sunrise-field.jpg': require('../assets/uplifts/sunrise-field.jpg'),
  'mountain-peak.jpg': require('../assets/uplifts/mountain-peak.jpg'),
  'foggy-hills.jpg': require('../assets/uplifts/foggy-hills.jpg'),
  'forest-road.jpg': require('../assets/uplifts/forest-road.jpg'),
  'field-sunset.jpg': require('../assets/uplifts/field-sunset.jpg'),
  'lake-tahoe.jpg': require('../assets/uplifts/lake-tahoe.jpg'),
  'beach.jpg': require('../assets/uplifts/beach.jpg'),
  'ocean-wave.jpg': require('../assets/uplifts/ocean-wave.jpg'),
  'mountain-lake.jpg': require('../assets/uplifts/mountain-lake.jpg'),
  'canoe-lake.jpg': require('../assets/uplifts/canoe-lake.jpg'),
  'golden-field.jpg': require('../assets/uplifts/golden-field.jpg'),
  'sky-sunrise.jpg': require('../assets/uplifts/sky-sunrise.jpg'),
  'landscape-road.jpg': require('../assets/uplifts/landscape-road.jpg'),
};

const BY_CATEGORY: Record<string, string> = {
  hope: 'sunrise-field.jpg',
  confidence: 'mountain-peak.jpg',
  motivation: 'field-sunset.jpg',
  strength: 'mountain-lake.jpg',
  courage: 'ocean-wave.jpg',
  success: 'foggy-hills.jpg',
  failure: 'forest-road.jpg',
  relationships: 'canoe-lake.jpg',
  career: 'lake-tahoe.jpg',
  money: 'golden-field.jpg',
  purpose: 'landscape-road.jpg',
  'self-belief': 'mountain-peak.jpg',
  gratitude: 'field-sunset.jpg',
  discipline: 'beach.jpg',
  leadership: 'mountain-lake.jpg',
  faith: 'sky-sunrise.jpg',
  family: 'canoe-lake.jpg',
  growth: 'forest-road.jpg',
};

export function imageForUplift(u: { category?: string }): any | null {
  const file = BY_CATEGORY[u?.category || ''] || 'sunrise-field.jpg';
  return MAP[file] || null;
}
