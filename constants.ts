import { FlowerType, Biome, Season } from './types';

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
  [FlowerType.ANEMONE]: '#f43f5e'     // Rose-500
};

export const BIOME_COLORS: Record<Biome, string> = {
  [Biome.GRASS]: '#4ade80',
  [Biome.FOREST]: '#15803d',
  [Biome.DESERT]: '#fed7aa',
  [Biome.RIVER]: '#4ade80' // Base grass, river drawn on top
};

export const BIOME_BG_COLORS: Record<Biome, string> = {
  [Biome.GRASS]: '#4ade80',
  [Biome.FOREST]: '#166534',
  [Biome.DESERT]: '#fed7aa',
  [Biome.RIVER]: '#22c55e'
};

// --- SEASONS CONFIG ---
export const SEASON_DURATION = 60000; // 1 minute per season for testing (real game: 5-10 mins)
export const DAY_CYCLE_DURATION = 600000; // 10 minutes (5m day / 5m night)

export const SEASON_COLORS: Record<Season, Record<Biome, string>> = {
  [Season.SPRING]: {
    [Biome.GRASS]: '#4ade80', // Fresh Green
    [Biome.FOREST]: '#166534',
    [Biome.DESERT]: '#fed7aa',
    [Biome.RIVER]: '#4ade80'
  },
  [Season.SUMMER]: {
    [Biome.GRASS]: '#84cc16', // Vibrant/Yellowish Green
    [Biome.FOREST]: '#15803d',
    [Biome.DESERT]: '#fde047', // Hotter sand
    [Biome.RIVER]: '#22c55e'
  },
  [Season.AUTUMN]: {
    [Biome.GRASS]: '#d97706', // Orange/Brown
    [Biome.FOREST]: '#b45309', // Darker Orange
    [Biome.DESERT]: '#fdba74',
    [Biome.RIVER]: '#84cc16' // Murkier water
  },
  [Season.WINTER]: {
    [Biome.GRASS]: '#e5e7eb', // Snowy White/Grey
    [Biome.FOREST]: '#374151', // Dark Grey Trees
    [Biome.DESERT]: '#d1d5db', // Cold Sand
    [Biome.RIVER]: '#93c5fd' // Icy Blue
  }
};

export const SEASON_FLOWERS: Record<Season, FlowerType[]> = {
  [Season.SPRING]: [FlowerType.TULIP, FlowerType.DAFFODIL, FlowerType.CHERRY_BLOSSOM, FlowerType.BLUEBELL, FlowerType.LILY, FlowerType.VIOLET, FlowerType.BUTTERCUP, FlowerType.IRIS, FlowerType.MAGNOLIA, FlowerType.WISTERIA],
  [Season.SUMMER]: [FlowerType.ROSE, FlowerType.SUNFLOWER, FlowerType.LAVENDER, FlowerType.HIBISCUS, FlowerType.POPPY, FlowerType.LOTUS, FlowerType.SNAPDRAGON, FlowerType.COSMOS, FlowerType.ZINNIA],
  [Season.AUTUMN]: [FlowerType.MARIGOLD, FlowerType.PEONY, FlowerType.ORCHID, FlowerType.CACTUS, FlowerType.CHRYSANTHEMUM, FlowerType.ANEMONE],
  [Season.WINTER]: [FlowerType.JASMINE, FlowerType.DAISY, FlowerType.CAMELLIA, FlowerType.FOXGLOVE]
};

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