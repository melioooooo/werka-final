export enum GameState {
  START_MENU = 'START_MENU',
  INTRO = 'INTRO',
  EXPLORING = 'EXPLORING',
  INSIDE_HOUSE = 'INSIDE_HOUSE',
  CRAFTING = 'CRAFTING',
  GENERATING = 'GENERATING',
  GALLERY = 'GALLERY'
}

export interface Point {
  x: number;
  y: number;
}

export enum FlowerType {
  ROSE = 'Rose',
  TULIP = 'Tulip',
  DAISY = 'Daisy',
  LAVENDER = 'Lavender',
  SUNFLOWER = 'Sunflower',
  LILY = 'Lily',
  CACTUS = 'Cactus Flower',
  ORCHID = 'Wild Orchid',
  HYDRANGEA = 'Hydrangea',
  POPPY = 'Poppy',
  BLUEBELL = 'Bluebell',
  PEONY = 'Peony',
  HIBISCUS = 'Hibiscus',
  MARIGOLD = 'Marigold',
  JASMINE = 'Jasmine',
  DAFFODIL = 'Daffodil',
  LOTUS = 'Lotus',
  CHERRY_BLOSSOM = 'Cherry Blossom',
  VIOLET = 'Violet',
  BUTTERCUP = 'Buttercup',
  SNAPDRAGON = 'Snapdragon',
  CAMELLIA = 'Camellia',
  // New flower types
  IRIS = 'Iris',
  MAGNOLIA = 'Magnolia',
  CHRYSANTHEMUM = 'Chrysanthemum',
  WISTERIA = 'Wisteria',
  FOXGLOVE = 'Foxglove',
  COSMOS = 'Cosmos',
  ZINNIA = 'Zinnia',
  ANEMONE = 'Anemone',
  // Tropical biome flowers
  BIRD_OF_PARADISE = 'Bird of Paradise',
  PLUMERIA = 'Plumeria',
  PASSION_FLOWER = 'Passion Flower',
  FRANGIPANI = 'Frangipani',
  // Mountain biome flowers
  EDELWEISS = 'Edelweiss',
  ALPINE_ROSE = 'Alpine Rose',
  GENTIAN = 'Gentian',
  COLUMBINE = 'Columbine',
  // Meadow biome flowers
  BLACK_EYED_SUSAN = 'Black-Eyed Susan',
  CORNFLOWER = 'Cornflower',
  CLOVER = 'Clover',
  WILDFLOWER = 'Wildflower',
  // Swamp biome flowers
  WATER_LILY = 'Water Lily',
  SWAMP_ROSE = 'Swamp Rose',
  MARSH_MARIGOLD = 'Marsh Marigold',
  CATTAIL = 'Cattail',
  // Tundra biome flowers
  ARCTIC_POPPY = 'Arctic Poppy',
  MOSS_CAMPION = 'Moss Campion',
  PURPLE_SAXIFRAGE = 'Purple Saxifrage',
  SNOW_CROCUS = 'Snow Crocus',
  // Enchanted biome flowers
  MOONFLOWER = 'Moonflower',
  STARBLOOM = 'Starbloom',
  CRYSTAL_ROSE = 'Crystal Rose',
  FAIRY_BELLS = 'Fairy Bells',
  GLOWSHROOM = 'Glowshroom'
}

export enum Biome {
  GRASS = 'GRASS',
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  RIVER = 'RIVER',
  TROPICAL = 'TROPICAL',
  MOUNTAIN = 'MOUNTAIN',
  MEADOW = 'MEADOW',
  SWAMP = 'SWAMP',
  TUNDRA = 'TUNDRA',
  ENCHANTED = 'ENCHANTED'
}

export interface Flower {
  id: string;
  type: FlowerType;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  color: string;
  isPicked: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'TREE' | 'ROCK' | 'HOUSE' | 'RIVER_BANK';
}

export interface Player {
  x: number;
  y: number;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  isMoving: boolean;
  inventory: Flower[];
}



export interface Bouquet {
  id: string;
  date: string;
  flowers: FlowerType[];
  imageUrl: string;
  description: string;
}