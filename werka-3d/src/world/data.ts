// Rules and palettes ported from the 2D game (../constants.ts, ../types.ts, GameEngine biome lists).

export const MAX_INVENTORY = 12;
export const MAX_BOUQUET_SIZE = 8;
export const DAY_CYCLE_DURATION = 600000; // ms for a full day/night
export const START_TIME = 0.35; // 0..1 of the day, mid-morning

export type Biome =
  | 'GRASS' | 'FOREST' | 'DESERT' | 'RIVER' | 'TROPICAL'
  | 'MOUNTAIN' | 'MEADOW' | 'SWAMP' | 'TUNDRA' | 'ENCHANTED';

export const ALL_BIOMES: Biome[] = [
  'GRASS', 'FOREST', 'DESERT', 'RIVER', 'TROPICAL', 'MOUNTAIN', 'MEADOW', 'SWAMP', 'TUNDRA', 'ENCHANTED',
];

// Flower names are the 2D FlowerType string values.
export const FLOWER_COLORS: Record<string, string> = {
  'Rose': '#E11D48', 'Tulip': '#F59E0B', 'Daisy': '#F3F4F6', 'Lavender': '#8B5CF6',
  'Sunflower': '#FACC15', 'Lily': '#3B82F6', 'Cactus Flower': '#BE185D', 'Wild Orchid': '#D946EF',
  'Hydrangea': '#6366f1', 'Poppy': '#ef4444', 'Bluebell': '#60a5fa', 'Peony': '#f472b6',
  'Hibiscus': '#db2777', 'Marigold': '#ea580c', 'Jasmine': '#fef3c7', 'Daffodil': '#fde047',
  'Lotus': '#f9a8d4', 'Cherry Blossom': '#fbcfe8', 'Violet': '#7c3aed', 'Buttercup': '#fef08a',
  'Snapdragon': '#be123c', 'Camellia': '#9f1239', 'Iris': '#6366f1', 'Magnolia': '#fdf2f8',
  'Chrysanthemum': '#f97316', 'Wisteria': '#a78bfa', 'Foxglove': '#c026d3', 'Cosmos': '#f9a8d4',
  'Zinnia': '#fb7185', 'Anemone': '#f43f5e',
  'Bird of Paradise': '#f97316', 'Plumeria': '#fdf4ff', 'Passion Flower': '#a855f7', 'Frangipani': '#fef08a',
  'Edelweiss': '#f5f5f4', 'Alpine Rose': '#e11d48', 'Gentian': '#2563eb', 'Columbine': '#8b5cf6',
  'Black-Eyed Susan': '#fbbf24', 'Cornflower': '#3b82f6', 'Clover': '#ec4899', 'Wildflower': '#f472b6',
  'Water Lily': '#fdf4ff', 'Swamp Rose': '#f43f5e', 'Marsh Marigold': '#facc15', 'Cattail': '#78350f',
  'Arctic Poppy': '#fef08a', 'Moss Campion': '#f472b6', 'Purple Saxifrage': '#a855f7', 'Snow Crocus': '#e9d5ff',
  'Moonflower': '#e0e7ff', 'Starbloom': '#fef08a', 'Crystal Rose': '#c4b5fd', 'Fairy Bells': '#a5f3fc',
  'Glowshroom': '#4ade80',
};

export const BIOME_COLORS: Record<Biome, string> = {
  GRASS: '#4ade80', FOREST: '#15803d', DESERT: '#fed7aa', RIVER: '#4ade80', TROPICAL: '#14b8a6',
  MOUNTAIN: '#78716c', MEADOW: '#a3e635', SWAMP: '#365314', TUNDRA: '#e0f2fe', ENCHANTED: '#a855f7',
};

// Biome -> flower list and per-screen density, same as the 2D generator.
export const BIOME_FLOWERS: Record<Biome, { types: string[]; density: number }> = {
  FOREST: { types: ['Rose', 'Wild Orchid', 'Bluebell', 'Peony', 'Jasmine', 'Cherry Blossom'], density: 25 },
  DESERT: { types: ['Sunflower', 'Cactus Flower', 'Poppy', 'Marigold'], density: 10 },
  RIVER: { types: ['Lily', 'Hydrangea', 'Hibiscus', 'Lotus'], density: 15 },
  TROPICAL: { types: ['Bird of Paradise', 'Plumeria', 'Passion Flower', 'Frangipani', 'Hibiscus'], density: 22 },
  MOUNTAIN: { types: ['Edelweiss', 'Alpine Rose', 'Gentian', 'Columbine'], density: 12 },
  MEADOW: { types: ['Black-Eyed Susan', 'Cornflower', 'Clover', 'Wildflower', 'Daisy', 'Buttercup'], density: 30 },
  SWAMP: { types: ['Water Lily', 'Lotus', 'Swamp Rose', 'Marsh Marigold', 'Cattail'], density: 18 },
  TUNDRA: { types: ['Arctic Poppy', 'Moss Campion', 'Purple Saxifrage', 'Snow Crocus'], density: 8 },
  ENCHANTED: { types: ['Moonflower', 'Starbloom', 'Crystal Rose', 'Fairy Bells', 'Glowshroom'], density: 20 },
  GRASS: { types: ['Daisy', 'Tulip', 'Lavender', 'Daffodil', 'Marigold'], density: 18 },
};

export const timeLabel = (t: number) =>
  t < 0.2 || t > 0.85 ? 'NIGHT' : t < 0.3 ? 'DAWN' : t < 0.7 ? 'DAY' : 'DUSK';

// Trinkets (spec v3, shared with 2D): pocket items found once per day, favouring some biomes.
export const MAX_POCKET = 8;
export const MAX_EXTRAS = 2; // pocket items a bouquet can carry
export type Trinket = { id: string; name: string; emoji: string; color: string; biomes: Biome[]; rare?: boolean };
export const TRINKETS: Trinket[] = [
  { id: 'ribbon', name: 'Silk Ribbon', emoji: '🎀', color: '#f472b6', biomes: ['GRASS', 'MEADOW'] },
  { id: 'button', name: 'Lost Button', emoji: '🔘', color: '#94a3b8', biomes: ['GRASS', 'RIVER'] },
  { id: 'shell', name: 'Seashell', emoji: '🐚', color: '#fcd5ce', biomes: ['RIVER', 'TROPICAL', 'SWAMP'] },
  { id: 'marble', name: 'Glass Marble', emoji: '🔮', color: '#818cf8', biomes: ['DESERT', 'ENCHANTED'] },
  { id: 'feather', name: 'Blue Feather', emoji: '🪶', color: '#38bdf8', biomes: ['FOREST', 'MOUNTAIN'] },
  { id: 'key', name: 'Old Key', emoji: '🗝️', color: '#d4a017', biomes: ['FOREST', 'DESERT'] },
  { id: 'ring', name: 'Tin Ring', emoji: '💍', color: '#e5e7eb', biomes: ['RIVER', 'SWAMP'] },
  { id: 'acorn', name: 'Lucky Acorn', emoji: '🌰', color: '#a16207', biomes: ['FOREST', 'MEADOW'] },
  { id: 'pebble', name: 'Heart Pebble', emoji: '🪨', color: '#a8a29e', biomes: ['MOUNTAIN', 'TUNDRA'] },
  { id: 'butterfly', name: 'Butterfly Charm', emoji: '🦋', color: '#a78bfa', biomes: ['ENCHANTED', 'TROPICAL'] },
  { id: 'star', name: 'Fallen Star', emoji: '⭐', color: '#fde047', biomes: ['ENCHANTED', 'TUNDRA'], rare: true },
];
// Every pocket item id (trinkets + kisses) -> display info.
export const POCKET_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  ...Object.fromEntries(TRINKETS.map(t => [t.id, t])),
  kiss: { name: "Elio's Kiss", emoji: '💋', color: '#f9a8d4' },
  golden_kiss: { name: "Elio's Golden Kiss", emoji: '💖', color: '#f5c542' },
};

export const ELIO_LINES = [
  'I was hiding behind this tree all morning.',
  "Werka! I knew you'd come this way.",
  "Shh, don't tell the flowers I'm here.",
  'I counted every petal on the way. I lost count at you.',
  'The wind told me you were close.',
  "I've been practising my hiding. Clearly not enough!",
  "This is my favourite spot. Now it's ours.",
  'You walked right past me once. I almost laughed.',
];
