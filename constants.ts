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
  [Biome.GRASS]: '#4ade80',
  [Biome.FOREST]: '#15803d',
  [Biome.DESERT]: '#fed7aa',
  [Biome.RIVER]: '#4ade80', // Base grass, river drawn on top
  [Biome.TROPICAL]: '#14b8a6', // Teal-500 (lush tropical)
  [Biome.MOUNTAIN]: '#78716c', // Stone-500 (rocky grey)
  [Biome.MEADOW]: '#a3e635', // Lime-400 (bright meadow)
  [Biome.SWAMP]: '#365314', // Lime-900 (murky dark green)
  [Biome.TUNDRA]: '#e0f2fe', // Sky-100 (icy pale blue)
  [Biome.ENCHANTED]: '#a855f7' // Purple-500 (magical purple)
};

export const BIOME_BG_COLORS: Record<Biome, string> = {
  [Biome.GRASS]: '#4ade80',
  [Biome.FOREST]: '#166534',
  [Biome.DESERT]: '#fed7aa',
  [Biome.RIVER]: '#22c55e',
  [Biome.TROPICAL]: '#0d9488', // Teal-600 (darker tropical green)
  [Biome.MOUNTAIN]: '#57534e', // Stone-600 (mountain grey)
  [Biome.MEADOW]: '#84cc16', // Lime-500 (golden meadow)
  [Biome.SWAMP]: '#1a2e05', // Very dark murky green
  [Biome.TUNDRA]: '#bae6fd', // Sky-200 (icy blue)
  [Biome.ENCHANTED]: '#7e22ce' // Purple-700 (deep magical purple)
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