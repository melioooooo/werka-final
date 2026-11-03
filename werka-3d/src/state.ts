// Saved progress. Keys are prefixed werka3d_ so the 2D game's save is never touched.
export type Item = { id: string; type: string; color: string };
import type { Layout } from './world/bouquet-layout.ts';
import { DEFAULT_OUTFIT, cleanOutfit, type Outfit } from './world/outfits.ts';
// extras: pocket items tied on (trinket ids, 'kiss', 'golden_kiss'); missing on old bouquets.
// layout: hand-placed positions (spec v4 §3); missing on old bouquets, which use the auto layout.
export type Bouquet = { id: string; date: string; flowers: string[]; colors: string[]; extras?: string[]; layout?: Layout };

const K = {
  inventory: 'werka3d_inventory',
  picked: 'werka3d_picked',
  bouquets: 'werka3d_bouquets',
  lastDate: 'werka3d_last_date',
  pocket: 'werka3d_pocket',
  kisses: 'werka3d_kisses_total',
  elioDay: 'werka3d_elio_day',
  outfit: 'werka3d_outfit',
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
  pocket: [] as string[], // trinket ids, 'kiss', 'golden_kiss'; resets daily like the basket
  kissesTotal: 0, // lifetime
  elioDay: '', // date Elio last gave his golden kiss
  outfit: DEFAULT_OUTFIT as Outfit,
};

// Load, applying the 2D daily rule: a new calendar day resets inventory, pocket and picked ids.
export function load() {
  state.date = today();
  const fresh = read<string | null>(K.lastDate, null) !== state.date;
  state.inventory = fresh ? [] : read<Item[]>(K.inventory, []);
  state.picked = new Set(fresh ? [] : read<string[]>(K.picked, []));
  state.bouquets = read<Bouquet[]>(K.bouquets, []);
  state.pocket = fresh ? [] : read<string[]>(K.pocket, []);
  state.kissesTotal = read<number>(K.kisses, 0);
  state.elioDay = read<string>(K.elioDay, '');
  state.outfit = cleanOutfit(read<Partial<Outfit> | null>(K.outfit, null));
  write(K.lastDate, state.date);
  save();
}

export function save() {
  write(K.inventory, state.inventory);
  write(K.picked, [...state.picked]);
  write(K.bouquets, state.bouquets);
  write(K.pocket, state.pocket);
  write(K.kisses, state.kissesTotal);
  write(K.elioDay, state.elioDay);
  write(K.outfit, state.outfit);
}
