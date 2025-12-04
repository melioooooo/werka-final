export enum GameState {
  START_MENU = 'START_MENU',
  INTRO = 'INTRO',
  EXPLORING = 'EXPLORING',
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
  CAMELLIA = 'Camellia'
}

export enum Biome {
  GRASS = 'GRASS',
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  RIVER = 'RIVER'
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

export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER'
}

export interface Bouquet {
  id: string;
  date: string;
  flowers: FlowerType[];
  imageUrl: string;
  description: string;
}