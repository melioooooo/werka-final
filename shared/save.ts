// The save both worlds share (spec v5 §1): basket, pocket, lifetime kisses, Elio's daily gift, bouquets.
// Picked flowers stay per world. Bouquets keep one hand-placed layout per world, since the two use different coordinates.
export type SharedItem = { id: string; type: string; color: string };
export type SharedBouquet = {
  id: string; date: string; flowers: string[]; colors?: string[]; extras?: string[]; description?: string; imageUrl?: string;
  layout2d?: unknown; layout3d?: unknown;
};
export type Shared = { date: string; inventory: SharedItem[]; pocket: string[]; kisses: number; elioDay: string; bouquets: SharedBouquet[] };

const KEY = 'werka_shared';
const read = <T>(k: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? fallback; } catch { return fallback; }
};
const write = () => {
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) { console.error('Storage full', e); }
};
let cur: Shared;

// First run after v5: merge the two older saves. They stay in place, untouched.
function migrate(today: string): Shared {
  const fresh2 = localStorage.getItem('werka_last_date') === today, fresh3 = read('werka3d_last_date', '') === today;
  const list = <T>(k: string, ok: boolean) => { const v = ok ? read<T[]>(k, []) : []; return Array.isArray(v) ? v : []; };
  return {
    date: today,
    inventory: [...list<SharedItem>('werka_inventory', fresh2), ...list<SharedItem>('werka3d_inventory', fresh3)]
      .slice(0, 12).map(f => ({ id: f.id, type: f.type, color: f.color })),
    pocket: [...list<string>('werka_pocket', fresh2), ...list<string>('werka3d_pocket', fresh3)],
    kisses: (Number(localStorage.getItem('werka_kisses_total')) || 0) + (Number(read('werka3d_kisses_total', 0)) || 0),
    elioDay: localStorage.getItem('werka_elio_day') ?? read('werka3d_elio_day', ''),
    bouquets: [
      ...list<SharedBouquet & { layout?: unknown }>('werka_bouquets', true).map(({ layout, ...b }) => ({ ...b, layout2d: layout })),
      ...list<SharedBouquet & { layout?: unknown }>('werka3d_bouquets', true).map(({ layout, ...b }) => ({ ...b, layout3d: layout })),
    ],
  };
}

export function loadShared(today: string): Shared {
  cur = read<Shared | null>(KEY, null) ?? migrate(today);
  if (cur.date !== today) cur = { ...cur, date: today, inventory: [], pocket: [] }; // a new day empties basket and pocket
  write();
  return cur;
}
export function patchShared(p: Partial<Shared>) { cur = { ...cur, ...p }; write(); }

// Reset from either world wipes both. The empty shared save stays so the older saves are not merged back in.
export function resetAll(today: string) {
  for (const k of Object.keys(localStorage)) if (k.startsWith('werka')) localStorage.removeItem(k);
  cur = { date: today, inventory: [], pocket: [], kisses: 0, elioDay: '', bouquets: [] };
  write();
}
