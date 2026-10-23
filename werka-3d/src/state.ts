// Saved progress. Keys are prefixed werka3d_ so the 2D game's save is never touched.
export type Item = { id: string; type: string; color: string };
export type Bouquet = { id: string; date: string; flowers: string[]; colors: string[] };

const K = {
  inventory: 'werka3d_inventory',
  picked: 'werka3d_picked',
  bouquets: 'werka3d_bouquets',
  lastDate: 'werka3d_last_date',
};

export const today = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const read = <T>(k: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error('Storage failed', e); }
};

export const state = {
  date: '',
  inventory: [] as Item[],
  picked: new Set<string>(),
  bouquets: [] as Bouquet[],
};

// Load, applying the 2D daily rule: a new calendar day resets inventory (and picked flowers).
export function load() {
  state.date = today();
  const fresh = read<string | null>(K.lastDate, null) !== state.date;
  state.inventory = fresh ? [] : read<Item[]>(K.inventory, []);
  state.picked = new Set(fresh ? [] : read<string[]>(K.picked, []));
  state.bouquets = read<Bouquet[]>(K.bouquets, []);
  write(K.lastDate, state.date);
  save();
}

export function save() {
  write(K.inventory, state.inventory);
  write(K.picked, [...state.picked]);
  write(K.bouquets, state.bouquets);
}
