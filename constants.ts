import { FlowerType, Biome } from './types';

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;
export const TILE_SIZE = 32;
export const PLAYER_SPEED = 2.5;

// --- CUSTOM SPRITE CONFIGURATION ---
// PASTE YOUR IMAGE URL OR BASE64 STRING HERE
// PASTE YOUR IMAGE URL OR BASE64 STRING HERE
// PASTE YOUR IMAGE URL OR BASE64 STRING HERE
export const PLAYER_SPRITE_URL = "/sprites/front.png"; // Default
export const PLAYER_SPRITES = {
  DOWN: "/sprites/front.png",
  UP: "/sprites/back.png",
  LEFT: "/sprites/side.png",
  RIGHT: "/sprites/side.png" // Same image, flipped
};

// Sprite Rendering Config
export const SPRITE_SIZE = 52;     // 52x52 frames
export const SPRITE_SCALE = 1.5;   // Adjusted scale
export const ANIMATION_SPEED = 150;

// Frame Counts per direction
export const SPRITE_COUNTS = {
  DOWN: 4,
  UP: 4,
  LEFT: 2,
  RIGHT: 2
};

// Columns per sheet (to handle grid layout)
export const SPRITE_COLS = {
  DOWN: 2,
  UP: 2,
  LEFT: 1,
  RIGHT: 1
};

// Expected Layout:
// Front/Back: 104x104 -> 2x2 grid of 52x52
// Side: 52x104 -> 1x2 grid of 52x52
// -----------------------------------

export const FLOWER_COLORS: Record<FlowerType, string> = {
  [FlowerType.ROSE]: '#E11D48',      // Red-600
  [FlowerType.TULIP]: '#F59E0B',     // Amber-500
  [FlowerType.DAISY]: '#F3F4F6',     // White
  [FlowerType.LAVENDER]: '#8B5CF6',  // Violet-500
  [FlowerType.SUNFLOWER]: '#FACC15', // Yellow-400
  [FlowerType.LILY]: '#3B82F6',      // Blue-500
  [FlowerType.CACTUS]: '#BE185D',    // Pink-700
  [FlowerType.ORCHID]: '#D946EF',    // Fuchsia-500
  [FlowerType.HYDRANGEA]: '#6366f1', // Indigo
  [FlowerType.POPPY]: '#ef4444',     // Red-500
  [FlowerType.BLUEBELL]: '#60a5fa',  // Blue-400
  [FlowerType.PEONY]: '#f472b6',     // Pink-400
  [FlowerType.HIBISCUS]: '#db2777',  // Pink-600
  [FlowerType.MARIGOLD]: '#ea580c',  // Orange-600
  [FlowerType.JASMINE]: '#fef3c7',   // Amber-100
  [FlowerType.DAFFODIL]: '#fde047',  // Yellow-300
  [FlowerType.LOTUS]: '#f9a8d4',     // Pink-300
  [FlowerType.CHERRY_BLOSSOM]: '#fbcfe8', // Pink-200
  [FlowerType.VIOLET]: '#7c3aed',    // Violet-600
  [FlowerType.BUTTERCUP]: '#fef08a', // Yellow-200
  [FlowerType.SNAPDRAGON]: '#be123c',// Rose-700
  [FlowerType.CAMELLIA]: '#9f1239',  // Rose-800
  // New flower colors
  [FlowerType.IRIS]: '#6366f1',       // Indigo-500
  [FlowerType.MAGNOLIA]: '#fdf2f8',   // Pink-50 (white-pink)
  [FlowerType.CHRYSANTHEMUM]: '#f97316', // Orange-500
  [FlowerType.WISTERIA]: '#a78bfa',   // Violet-400
  [FlowerType.FOXGLOVE]: '#c026d3',   // Fuchsia-600
  [FlowerType.COSMOS]: '#f9a8d4',     // Pink-300
  [FlowerType.ZINNIA]: '#fb7185',     // Rose-400
  [FlowerType.ANEMONE]: '#f43f5e',    // Rose-500
  // Tropical biome flower colors
  [FlowerType.BIRD_OF_PARADISE]: '#f97316', // Orange-500 (vibrant orange)
  [FlowerType.PLUMERIA]: '#fdf4ff',   // Fuchsia-50 (white with pink)
  [FlowerType.PASSION_FLOWER]: '#a855f7', // Purple-500
  [FlowerType.FRANGIPANI]: '#fef08a', // Yellow-200 (cream yellow)
  // Mountain biome flower colors
  [FlowerType.EDELWEISS]: '#f5f5f4',  // Stone-100 (white)
  [FlowerType.ALPINE_ROSE]: '#e11d48', // Rose-600 (bright pink)
  [FlowerType.GENTIAN]: '#2563eb',    // Blue-600 (deep blue)
  [FlowerType.COLUMBINE]: '#8b5cf6',  // Violet-500
  // Meadow biome flower colors
  [FlowerType.BLACK_EYED_SUSAN]: '#fbbf24', // Amber-400 (golden yellow)
  [FlowerType.CORNFLOWER]: '#3b82f6', // Blue-500
  [FlowerType.CLOVER]: '#ec4899',     // Pink-500
  [FlowerType.WILDFLOWER]: '#f472b6', // Pink-400 (mixed wildflower)
  // Swamp biome flower colors
  [FlowerType.WATER_LILY]: '#fdf4ff', // Fuchsia-50 (white/pink)
  [FlowerType.SWAMP_ROSE]: '#f43f5e', // Rose-500
  [FlowerType.MARSH_MARIGOLD]: '#facc15', // Yellow-400
  [FlowerType.CATTAIL]: '#78350f',    // Amber-900 (brown)
  // Tundra biome flower colors
  [FlowerType.ARCTIC_POPPY]: '#fef08a', // Yellow-200 (pale yellow)
  [FlowerType.MOSS_CAMPION]: '#f472b6', // Pink-400
  [FlowerType.PURPLE_SAXIFRAGE]: '#a855f7', // Purple-500
  [FlowerType.SNOW_CROCUS]: '#e9d5ff', // Purple-200 (pale purple)
  // Enchanted biome flower colors
  [FlowerType.MOONFLOWER]: '#e0e7ff', // Indigo-100 (pale moonlight)
  [FlowerType.STARBLOOM]: '#fef08a',  // Yellow-200 (golden star)
  [FlowerType.CRYSTAL_ROSE]: '#c4b5fd', // Violet-300 (crystal)
  [FlowerType.FAIRY_BELLS]: '#a5f3fc', // Cyan-200 (fairy light)
  [FlowerType.GLOWSHROOM]: '#4ade80'  // Green-400 (bioluminescent)
};

export const BIOME_COLORS: Record<Biome, string> = {
  [Biome.GRASS]: '#6cc15a',
  [Biome.FOREST]: '#2f7d3c',
  [Biome.DESERT]: '#f1cf9c',
  [Biome.RIVER]: '#6cc15a', // Base grass, river drawn on top
  [Biome.TROPICAL]: '#2aa98f', // Teal (lush tropical)
  [Biome.MOUNTAIN]: '#857c72', // Stone (rocky grey)
  [Biome.MEADOW]: '#9ccb4c', // Lime (bright meadow)
  [Biome.SWAMP]: '#3d5822', // Lime-900-ish (murky dark green)
  [Biome.TUNDRA]: '#dcebf2', // Sky-100-ish (icy pale blue)
  [Biome.ENCHANTED]: '#9462c8' // Purple (magical purple)
};



// --- SEASONS CONFIG (REMOVED) ---
export const DAY_CYCLE_DURATION = 600000; // 10 minutes (5m day / 5m night)

export const HOUSE_SCREEN = { x: 1, y: 1 };

// Expanded House Footprint for the new Cottage Design
export const HOUSE_RECT = {
  x: CANVAS_WIDTH / 2 - 100,
  y: 60,
  width: 200,
  height: 140,
  doorX: CANVAS_WIDTH / 2 - 20,
  doorY: 200, // y + height approx
  doorWidth: 40,
  doorHeight: 10
};

export const MAX_INVENTORY = 12;
export const MAX_BOUQUET_SIZE = 8;

export const MAX_POCKET = 16; // golden kiss does not count
export const MAX_EXTRAS = 6;
export const RUN_MULT = 1.7;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'very_rare';
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 1, uncommon: 0.5, rare: 0.2, very_rare: 0.07 };
export interface PocketInfo { name: string; emoji: string; color: string; biomes?: Biome[]; rarity?: Rarity; shell?: boolean; fossil?: boolean }

export const TRINKETS: Record<string, PocketInfo> = {
  ribbon: { name: 'Silk Ribbon', emoji: '🎀', color: '#f472b6', biomes: [Biome.GRASS, Biome.MEADOW] },
  button: { name: 'Lost Button', emoji: '🔘', color: '#94a3b8', biomes: [Biome.GRASS, Biome.RIVER] },
  shell: { name: 'Seashell', emoji: '🐚', color: '#fcd5ce', biomes: [Biome.RIVER, Biome.TROPICAL, Biome.SWAMP], shell: true },
  marble: { name: 'Glass Marble', emoji: '🔮', color: '#818cf8', biomes: [Biome.DESERT, Biome.ENCHANTED] },
  feather: { name: 'Blue Feather', emoji: '🪶', color: '#38bdf8', biomes: [Biome.FOREST, Biome.MOUNTAIN] },
  key: { name: 'Old Key', emoji: '🗝️', color: '#d4a017', biomes: [Biome.FOREST, Biome.DESERT] },
  ring: { name: 'Tin Ring', emoji: '💍', color: '#e5e7eb', biomes: [Biome.RIVER, Biome.SWAMP] },
  acorn: { name: 'Lucky Acorn', emoji: '🌰', color: '#a16207', biomes: [Biome.FOREST, Biome.MEADOW] },
  pebble: { name: 'Heart Pebble', emoji: '🪨', color: '#a8a29e', biomes: [Biome.MOUNTAIN, Biome.TUNDRA] },
  butterfly: { name: 'Butterfly Charm', emoji: '🦋', color: '#a78bfa', biomes: [Biome.ENCHANTED, Biome.TROPICAL] },
  star: { name: 'Fallen Star', emoji: '⭐', color: '#fde047', biomes: [Biome.ENCHANTED, Biome.TUNDRA], rarity: 'rare' },
  // v4 seashell family: mostly on shores (river banks, pond edges)
  pink_shell: { name: 'Pink Conch', emoji: '🐚', color: '#f9a8d4', biomes: [Biome.RIVER, Biome.TROPICAL], rarity: 'uncommon', shell: true },
  scallop: { name: 'Scallop Shell', emoji: '🐚', color: '#fdba74', biomes: [Biome.RIVER, Biome.SWAMP, Biome.TROPICAL], shell: true },
  spiral_shell: { name: 'Spiral Shell', emoji: '🐚', color: '#e7d3b0', biomes: [Biome.SWAMP, Biome.RIVER], rarity: 'uncommon', shell: true },
  pearl: { name: 'Pearl', emoji: '⚪', color: '#f8fafc', biomes: [Biome.RIVER, Biome.TROPICAL], rarity: 'rare', shell: true },
  black_pearl: { name: 'Black Pearl', emoji: '⚫', color: '#475569', biomes: [Biome.TROPICAL, Biome.SWAMP], rarity: 'very_rare', shell: true },
  // v4 trinkets
  clover: { name: 'Four-leaf Clover', emoji: '🍀', color: '#4ade80', biomes: [Biome.GRASS, Biome.MEADOW], rarity: 'uncommon' },
  crystal: { name: 'Ice Crystal', emoji: '💎', color: '#a5f3fc', biomes: [Biome.TUNDRA, Biome.MOUNTAIN], rarity: 'uncommon' },
  amber: { name: 'Amber Drop', emoji: '🟠', color: '#f59e0b', biomes: [Biome.FOREST, Biome.DESERT], rarity: 'uncommon' },
  moon_charm: { name: 'Moon Charm', emoji: '🌙', color: '#c4b5fd', biomes: [Biome.ENCHANTED], rarity: 'rare' },
  ladybug: { name: 'Ladybug Pin', emoji: '🐞', color: '#ef4444', biomes: [Biome.MEADOW, Biome.GRASS, Biome.FOREST] },
  bell: { name: 'Tiny Bell', emoji: '🔔', color: '#facc15', biomes: [Biome.MOUNTAIN, Biome.GRASS], rarity: 'uncommon' },
  // v5 fossils: beside rocks
  ammonite: { name: 'Ammonite', emoji: '🐚', color: '#b08d57', biomes: [Biome.MOUNTAIN, Biome.DESERT], rarity: 'uncommon', fossil: true },
  trilobite: { name: 'Trilobite', emoji: '🪲', color: '#8d8378', biomes: [Biome.MOUNTAIN, Biome.DESERT], rarity: 'rare', fossil: true },
  fern_fossil: { name: 'Fern Fossil', emoji: '🌿', color: '#9a9a86', biomes: [Biome.FOREST, Biome.MOUNTAIN], rarity: 'uncommon', fossil: true },
  shark_tooth: { name: 'Shark Tooth', emoji: '🦷', color: '#f1ead6', biomes: [Biome.RIVER, Biome.TROPICAL, Biome.DESERT], rarity: 'rare', fossil: true },
  // v5 more shells
  nautilus: { name: 'Nautilus', emoji: '🐚', color: '#f4e3cf', biomes: [Biome.TROPICAL, Biome.RIVER], rarity: 'rare', shell: true },
  cowrie: { name: 'Cowrie', emoji: '🐚', color: '#d9a066', biomes: [Biome.TROPICAL, Biome.RIVER], shell: true },
  whelk: { name: 'Whelk', emoji: '🐚', color: '#c9b79c', biomes: [Biome.RIVER, Biome.SWAMP], shell: true },
  urchin: { name: 'Sea Urchin', emoji: '🟣', color: '#8b5cf6', biomes: [Biome.TROPICAL], rarity: 'uncommon', shell: true },
  sand_dollar: { name: 'Sand Dollar', emoji: '⚪', color: '#efe6d2', biomes: [Biome.TROPICAL, Biome.RIVER], rarity: 'uncommon', shell: true },
};
export const rarityOf = (k: string): Rarity => TRINKETS[k]?.rarity ?? 'common';

export const POCKET_INFO: Record<string, PocketInfo> = {
  ...TRINKETS,
  kiss: { name: "Elio's Kiss", emoji: '💋', color: '#f472b6' },
  golden_kiss: { name: "Elio's Golden Kiss", emoji: '💖', color: '#facc15' },
};
