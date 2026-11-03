// Saved progress. World-only keys are prefixed werka3d_.
export type Item = { id: string; type: string; color: string };
import type { Layout } from './world/bouquet-layout.ts';
import { DEFAULT_OUTFIT, cleanOutfit, type Outfit } from './world/outfits.ts';
import { FLOWER_COLORS } from './world/data.ts';
import { loadShared, patchShared } from '../../shared/save.ts';
// extras: pocket items tied on (trinket ids, 'kiss', 'golden_kiss'); missing on old bouquets.
// layout: hand-placed positions (spec v4 §3); missing on old bouquets, which use the auto layout.
export type Bouquet = { id: string; date: string; flowers: string[]; colors: string[]; extras?: string[]; layout?: Layout };

// Basket, pocket, kisses, Elio's gift and bouquets live in the save shared with the 2D world.
const K = {
  picked: 'werka3d_picked',
  lastDate: 'werka3d_last_date',
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

// Load, applying the daily rule: a new calendar day resets inventory, pocket and picked ids.
export function load() {
  state.date = today();
  const fresh = read<string | null>(K.lastDate, null) !== state.date;
  const s = loadShared(state.date);
  state.inventory = s.inventory;
  state.picked = new Set(fresh ? [] : read<string[]>(K.picked, []));
  state.bouquets = s.bouquets.map(({ layout3d, ...b }) => ({
    ...b, colors: b.colors ?? b.flowers.map(t => FLOWER_COLORS[t] ?? '#f472b6'), layout: layout3d as Layout | undefined,
  }));
  state.pocket = s.pocket;
  state.kissesTotal = s.kisses;
  state.elioDay = s.elioDay;
  state.outfit = cleanOutfit(read<Partial<Outfit> | null>(K.outfit, null));
  write(K.lastDate, state.date);
  save();
}

export function save() {
  write(K.picked, [...state.picked]);
  write(K.outfit, state.outfit);
  patchShared({
    inventory: state.inventory, pocket: state.pocket, kisses: state.kissesTotal, elioDay: state.elioDay,
    bouquets: state.bouquets.map(({ layout, ...b }) => ({ ...b, layout3d: layout })),
  });
}
