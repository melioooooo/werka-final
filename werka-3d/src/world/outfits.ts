// Werka's wardrobe (spec v5 §6): 3D only, everything unlocked. Data only, the look lives in render/player.ts.
export type TopKind = 'blouse' | 'tee' | 'stripes' | 'knit' | 'cardigan';
export type BottomKind = 'dress' | 'long' | 'mini' | 'pants' | 'shorts' | 'overalls';
export const TOPS = [
  { id: 'sun', name: 'Sun blouse', kind: 'blouse' as TopKind, color: '#f3dc8a', accent: '#e8c766' },
  { id: 'cream', name: 'Cream tee', kind: 'tee' as TopKind, color: '#f6efe0', accent: '#dcd2bc' },
  { id: 'sailor', name: 'Sailor stripes', kind: 'stripes' as TopKind, color: '#f4f1ea', accent: '#2f4b7c' },
  { id: 'moss', name: 'Moss knit', kind: 'knit' as TopKind, color: '#7f9a68', accent: '#5f7a4e' },
  { id: 'rose', name: 'Rose cardigan', kind: 'cardigan' as TopKind, color: '#e7a3b4', accent: '#fbf3e4' },
  { id: 'night', name: 'Night tee', kind: 'tee' as TopKind, color: '#2d3148', accent: '#20233a' },
];
export const BOTTOMS = [
  { id: 'petal', name: 'Petal skirt', kind: 'dress' as BottomKind, color: '#e58fa8', accent: '#c96d8a', legs: '#3b3a4a' },
  { id: 'meadow', name: 'Long meadow skirt', kind: 'long' as BottomKind, color: '#8fb07a', accent: '#6f9160', legs: '#3b3a4a' },
  { id: 'plum', name: 'Plum mini', kind: 'mini' as BottomKind, color: '#7c4a78', accent: '#5f3560', legs: '#2c2a38' },
  { id: 'jeans', name: 'Blue jeans', kind: 'pants' as BottomKind, color: '#4d6c9c', accent: '#3a5580', legs: '#4d6c9c' },
  { id: 'sand', name: 'Sand shorts', kind: 'shorts' as BottomKind, color: '#d9c39a', accent: '#bfa87d', legs: '#f2c9a0' },
  { id: 'dungarees', name: 'Dungarees', kind: 'overalls' as BottomKind, color: '#5a7fa8', accent: '#d9a441', legs: '#5a7fa8' },
];
export const SCARVES = [
  { id: 'none', name: 'No scarf', colors: [] as string[] },
  { id: 'red', name: 'Red', colors: ['#e0574f', '#c9463f'] },
  { id: 'sky', name: 'Sky', colors: ['#7fb6d9', '#5f9bc2'] },
  { id: 'honey', name: 'Honey', colors: ['#e2b04a', '#c8953a'] },
  { id: 'candy', name: 'Candy stripes', colors: ['#f6efe0', '#e58fa8'] },
];
export const GLASSES = [
  { id: 'none', name: 'No glasses', color: '' },
  { id: 'shades', name: 'Sunglasses', color: '#1f2230' },
  { id: 'hearts', name: 'Heart shades', color: '#e0567f' },
  { id: 'round', name: 'Round gold', color: '#d6b25e' },
];
export const HATS = [
  { id: 'none', name: 'No hat', color: '' },
  { id: 'straw', name: 'Straw hat', color: '#e6cf94' },
  { id: 'beret', name: 'Beret', color: '#b34a4a' },
  { id: 'beanie', name: 'Beanie', color: '#6f8fb0' },
  { id: 'bucket', name: 'Bucket hat', color: '#c9b38a' },
];
export const OUTFIT_SLOTS = [
  { key: 'top', label: 'Top', items: TOPS },
  { key: 'bottom', label: 'Bottom', items: BOTTOMS },
  { key: 'scarf', label: 'Scarf', items: SCARVES },
  { key: 'glasses', label: 'Glasses', items: GLASSES },
  { key: 'hat', label: 'Hat', items: HATS },
] as const;
export type Outfit = { top: string; bottom: string; scarf: string; glasses: string; hat: string };
export const DEFAULT_OUTFIT: Outfit = { top: 'sun', bottom: 'petal', scarf: 'red', glasses: 'none', hat: 'none' };
// Saved data may come from an older build: keep known ids, default the rest.
export const cleanOutfit = (o: Partial<Outfit> | null | undefined): Outfit => {
  const out = { ...DEFAULT_OUTFIT };
  for (const s of OUTFIT_SLOTS) { const v = o?.[s.key]; if ((s.items as readonly { id: string }[]).some(i => i.id === v)) out[s.key] = v as string; }
  return out;
};
