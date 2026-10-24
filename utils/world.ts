import { Flower, FlowerType, Biome, Obstacle, WorldItem, Point } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FLOWER_COLORS, HOUSE_RECT, HOUSE_SCREEN, TRINKETS } from '../constants';

// Simple seeded random generator (LCG)
export class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    let h = 0xdeadbeef;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
    }
    h = (h ^ h >>> 16) >>> 0;
    this.seed = h;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

export const BRIDGE_WIDTH = 80;
export const SPAWN = { x: CANVAS_WIDTH / 2, y: 300 };
export const isHouseScreen = (sx: number, sy: number) => sx === HOUSE_SCREEN.x && sy === HOUSE_SCREEN.y;

export interface World {
  map: Biome[][];
  flowers: Flower[];
  obstacles: Obstacle[][][]; // [sy][sx]
  items: WorldItem[];
  elio: { x: number; y: number; screenX: number; screenY: number; cover?: Obstacle }; // cover: tree/rock he peeks from
  riverY: (globalX: number) => number;
  bridgeX: (sx: number, sy: number) => number;
}

const flowerTable = (biome: Biome): [FlowerType[], number] => {
  switch (biome) {
    case Biome.FOREST: return [[FlowerType.ROSE, FlowerType.ORCHID, FlowerType.BLUEBELL, FlowerType.PEONY, FlowerType.JASMINE, FlowerType.CHERRY_BLOSSOM], 25];
    case Biome.DESERT: return [[FlowerType.SUNFLOWER, FlowerType.CACTUS, FlowerType.POPPY, FlowerType.MARIGOLD], 10];
    case Biome.RIVER: return [[FlowerType.LILY, FlowerType.HYDRANGEA, FlowerType.HIBISCUS, FlowerType.LOTUS], 15];
    case Biome.TROPICAL: return [[FlowerType.BIRD_OF_PARADISE, FlowerType.PLUMERIA, FlowerType.PASSION_FLOWER, FlowerType.FRANGIPANI, FlowerType.HIBISCUS], 22];
    case Biome.MOUNTAIN: return [[FlowerType.EDELWEISS, FlowerType.ALPINE_ROSE, FlowerType.GENTIAN, FlowerType.COLUMBINE], 12];
    case Biome.MEADOW: return [[FlowerType.BLACK_EYED_SUSAN, FlowerType.CORNFLOWER, FlowerType.CLOVER, FlowerType.WILDFLOWER, FlowerType.DAISY, FlowerType.BUTTERCUP], 30];
    case Biome.SWAMP: return [[FlowerType.WATER_LILY, FlowerType.LOTUS, FlowerType.SWAMP_ROSE, FlowerType.MARSH_MARIGOLD, FlowerType.CATTAIL], 18];
    case Biome.TUNDRA: return [[FlowerType.ARCTIC_POPPY, FlowerType.MOSS_CAMPION, FlowerType.PURPLE_SAXIFRAGE, FlowerType.SNOW_CROCUS], 8];
    case Biome.ENCHANTED: return [[FlowerType.MOONFLOWER, FlowerType.STARBLOOM, FlowerType.CRYSTAL_ROSE, FlowerType.FAIRY_BELLS, FlowerType.GLOWSHROOM], 20];
    case Biome.GRASS:
    default: return [[FlowerType.DAISY, FlowerType.TULIP, FlowerType.LAVENDER, FlowerType.DAFFODIL, FlowerType.MARIGOLD], 18];
  }
};

// Same RNG streams and call order as v2, so a given date keeps its flowers, trees and rocks.
export const makeWorld = (dateSeed: string): World => {
  const seedNum = [...dateSeed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 97, 0); // full-seed hash
  const riverY = (globalX: number) =>
    (CANVAS_HEIGHT / 2) +
    Math.sin((globalX + seedNum * 100) / 300) * 80 +
    Math.sin((globalX + seedNum * 50) / 100) * 20;
  const bridgeX = (sx: number, sy: number) =>
    Math.floor(new SeededRandom(`bridge-${dateSeed}-${sx}-${sy}`).range(200, CANVAS_WIDTH - 200));

  const rng = new SeededRandom(dateSeed);
  const allBiomes: Biome[] = [Biome.GRASS, Biome.FOREST, Biome.DESERT, Biome.RIVER, Biome.TROPICAL, Biome.MOUNTAIN, Biome.MEADOW, Biome.SWAMP, Biome.TUNDRA, Biome.ENCHANTED];

  const screenPositions: Point[] = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (!isHouseScreen(x, y)) screenPositions.push({ x, y });
  for (let i = screenPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [screenPositions[i], screenPositions[j]] = [screenPositions[j], screenPositions[i]];
  }
  const shuffledBiomes = [...allBiomes];
  for (let i = shuffledBiomes.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffledBiomes[i], shuffledBiomes[j]] = [shuffledBiomes[j], shuffledBiomes[i]];
  }
  const biomeAssignments = new Map<string, Biome>();
  screenPositions.forEach((pos, i) => biomeAssignments.set(`${pos.x},${pos.y}`, shuffledBiomes[i % shuffledBiomes.length]));

  const map: Biome[][] = [];
  for (let y = 0; y < 3; y++) {
    const row: Biome[] = [];
    for (let x = 0; x < 3; x++) row.push(isHouseScreen(x, y) ? Biome.GRASS : (biomeAssignments.get(`${x},${y}`) || rng.choice(allBiomes)));
    map.push(row);
  }

  const flowers: Flower[] = [];
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const biome = map[sy][sx];
      const [flowerTypes, density] = flowerTable(biome);
      for (let i = 0; i < density; i++) {
        const fX = rng.range(20, CANVAS_WIDTH - 20);
        const fY = rng.range(20, CANVAS_HEIGHT - 20);
        if (isHouseScreen(sx, sy)) {
          if (fX > HOUSE_RECT.x - 30 && fX < HOUSE_RECT.x + HOUSE_RECT.width + 30 &&
            fY > HOUSE_RECT.y - 30 && fY < HOUSE_RECT.y + HOUSE_RECT.height + 30) continue;
        }
        const type = rng.choice(flowerTypes);
        if (biome === Biome.RIVER) {
          const ry = riverY(sx * CANVAS_WIDTH + fX);
          if (type === FlowerType.LOTUS || type === FlowerType.LILY) {
            if (Math.abs(fY - ry) > 30) continue; // Lotus and Lily on water
          } else if (Math.abs(fY - ry) < 45) continue; // others on the bank
        }
        flowers.push({ id: `f-${sx}-${sy}-${i}`, type, x: fX, y: fY, screenX: sx, screenY: sy, color: FLOWER_COLORS[type], isPicked: false });
      }
    }
  }

  const obstacles = map.map((row, sy) => row.map((biome, sx) => genObstacles(dateSeed, sx, sy, biome, riverY)));
  const { items, elio } = placeItems(dateSeed, map, obstacles, riverY, bridgeX);
  return { map, flowers, obstacles, items, elio, riverY, bridgeX };
};

const genObstacles = (dateSeed: string, sx: number, sy: number, biome: Biome, riverY: (gx: number) => number): Obstacle[] => {
  const rng = new SeededRandom(`${dateSeed}-${sx}-${sy}`);
  const out: Obstacle[] = [];
  const house = isHouseScreen(sx, sy);
  if (house) out.push({ x: HOUSE_RECT.x, y: HOUSE_RECT.y, width: HOUSE_RECT.width, height: HOUSE_RECT.height, type: 'HOUSE' });

  const isCollidingWithHouseOrPath = (x: number, y: number) => {
    if (!house) return false;
    if (x > HOUSE_RECT.x - 50 && x < HOUSE_RECT.x + HOUSE_RECT.width + 50 &&
      y > HOUSE_RECT.y - 50 && y < HOUSE_RECT.y + HOUSE_RECT.height + 50) return true;
    if (Math.abs(x - CANVAS_WIDTH / 2) < 60 && y > HOUSE_RECT.y) return true;
    if (Math.abs(x - SPAWN.x) < 50 && Math.abs(y - SPAWN.y) < 50) return true; // spawn protection
    return false;
  };
  const isCollidingWithRiver = (x: number, y: number) =>
    biome === Biome.RIVER && Math.abs(y - riverY(sx * CANVAS_WIDTH + x)) < 80;

  const numClusters = Math.floor(rng.range(1, 4));
  for (let i = 0; i < numClusters; i++) {
    const clusterX = rng.range(50, CANVAS_WIDTH - 50);
    const clusterY = rng.range(50, CANVAS_HEIGHT - 50);
    const clusterRadius = rng.range(60, 120);
    const clusterCount = Math.floor(rng.range(4, 9));
    const clusterType: 'TREE' | 'ROCK' = biome === Biome.DESERT ? 'ROCK' :
      (biome === Biome.FOREST ? 'TREE' : (rng.next() > 0.4 ? 'TREE' : 'ROCK'));
    if (isCollidingWithHouseOrPath(clusterX, clusterY)) continue;
    if (isCollidingWithRiver(clusterX, clusterY)) continue;
    for (let j = 0; j < clusterCount; j++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = rng.next() * clusterRadius * 0.8;
      const ox = clusterX + Math.cos(angle) * dist;
      const oy = clusterY + Math.sin(angle) * dist;
      if (ox < 20 || ox > CANVAS_WIDTH - 40 || oy < 20 || oy > CANVAS_HEIGHT - 40) continue;
      if (isCollidingWithHouseOrPath(ox, oy)) continue;
      if (isCollidingWithRiver(ox, oy)) continue;
      out.push({ x: ox, y: oy, width: 40, height: 40, type: clusterType });
    }
  }

  let scatterDensity = biome === Biome.FOREST ? 12 : (biome === Biome.DESERT ? 5 : 4);
  if (biome === Biome.RIVER) scatterDensity = 6;
  for (let i = 0; i < scatterDensity; i++) {
    const ox = rng.range(20, CANVAS_WIDTH - 40);
    const oy = rng.range(20, CANVAS_HEIGHT - 40);
    if (isCollidingWithHouseOrPath(ox, oy)) continue;
    if (isCollidingWithRiver(ox, oy)) continue;
    if (out.some(o => Math.abs(o.x - ox) < 30 && Math.abs(o.y - oy) < 30)) continue;
    out.push({ x: ox, y: oy, width: 40, height: 40, type: biome === Biome.DESERT ? 'ROCK' : 'TREE' });
  }
  return out;
};

// Trinkets, kisses and Elio get their own RNG stream and are only placed on cells reachable from the spawn.
const CELL = 16;
const placeItems = (dateSeed: string, map: Biome[][], obstacles: Obstacle[][][], riverY: (gx: number) => number, bridgeX: (sx: number, sy: number) => number) => {
  const GW = (CANVAS_WIDTH * 3) / CELL, GH = (CANVAS_HEIGHT * 3) / CELL;
  const local = (c: number, r: number) => {
    const gx = c * CELL + CELL / 2, gy = r * CELL + CELL / 2;
    const sx = Math.floor(gx / CANVAS_WIDTH), sy = Math.floor(gy / CANVAS_HEIGHT);
    return { gx, gy, sx, sy, x: gx - sx * CANVAS_WIDTH, y: gy - sy * CANVAS_HEIGHT };
  };
  // Mirrors the player's collision (obstacle boxes + 8px, river unless on the bridge), a bit stricter.
  const passable = (sx: number, sy: number, x: number, y: number, gx: number) => {
    for (const o of obstacles[sy][sx]) if (x > o.x - 10 && x < o.x + o.width + 10 && y > o.y - 10 && y < o.y + o.height + 10) return false;
    if (map[sy][sx] === Biome.RIVER && Math.abs(y - riverY(gx)) < 37 && Math.abs(x - bridgeX(sx, sy)) >= BRIDGE_WIDTH / 2 - 4) return false;
    return true;
  };
  const reach = new Uint8Array(GW * GH);
  const start = Math.floor(SPAWN.y / CELL + GH / 3) * GW + Math.floor(SPAWN.x / CELL + GW / 3);
  const queue = [start];
  reach[start] = 1;
  while (queue.length) {
    const i = queue.pop()!;
    const c = i % GW, r = (i - c) / GW;
    for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
      if (nc < 0 || nr < 0 || nc >= GW || nr >= GH) continue;
      const j = nr * GW + nc;
      if (reach[j]) continue;
      const p = local(nc, nr);
      if (!passable(p.sx, p.sy, p.x, p.y, p.gx)) continue;
      reach[j] = 1;
      queue.push(j);
    }
  }

  // A good spot: reachable with some room around it, off the screen edges, on dry land, clear of the house and door.
  const spots: { sx: number; sy: number; x: number; y: number; gx: number; gy: number; nearCover: boolean }[] = [];
  for (let r = 0; r < GH; r++) {
    for (let c = 0; c < GW; c++) {
      if (!reach[r * GW + c]) continue;
      const p = local(c, r);
      if (p.x < 40 || p.x > CANVAS_WIDTH - 40 || p.y < 40 || p.y > CANVAS_HEIGHT - 40) continue;
      if (!reach[r * GW + c + 1] || !reach[r * GW + c - 1] || !reach[(r + 1) * GW + c] || !reach[(r - 1) * GW + c]) continue;
      if (map[p.sy][p.sx] === Biome.RIVER && Math.abs(p.y - riverY(p.gx)) < 50) continue;
      if (p.x < 270 && p.y < 280) continue; // under the desktop HUD
      if (isHouseScreen(p.sx, p.sy) && p.x > HOUSE_RECT.x - 50 && p.x < HOUSE_RECT.x + HOUSE_RECT.width + 50 && p.y < HOUSE_RECT.y + HOUSE_RECT.height + 70) continue;
      const nearCover = obstacles[p.sy][p.sx].some(o => o.type !== 'HOUSE' && Math.hypot(o.x + 20 - p.x, o.y + 20 - p.y) < 64);
      spots.push({ ...p, nearCover });
    }
  }

  const rng = new SeededRandom(`${dateSeed}-trinkets`);
  const taken: { gx: number; gy: number }[] = [];
  const free = (s: { gx: number; gy: number }) => taken.every(t => Math.hypot(t.gx - s.gx, t.gy - s.gy) > 60);
  const pick = (pool: typeof spots) => {
    for (let tries = 0; tries < 40 && pool.length; tries++) {
      const s = pool[Math.floor(rng.next() * pool.length)];
      if (free(s)) { taken.push(s); return s; }
    }
    return null;
  };

  // Elio: away from the spawn (>= 30% of the map diagonal), off the house screen, preferably next to a tree or rock.
  const minDist = 0.3 * Math.hypot(CANVAS_WIDTH * 3, CANVAS_HEIGHT * 3);
  const sp = { gx: SPAWN.x + CANVAS_WIDTH, gy: SPAWN.y + CANVAS_HEIGHT };
  const far = spots.filter(s => !isHouseScreen(s.sx, s.sy) && Math.hypot(s.gx - sp.gx, s.gy - sp.gy) >= minDist);
  const hidden = far.filter(s => s.nearCover);
  const e = pick(hidden.length ? hidden : far.length ? far : spots)!;
  let cover: Obstacle | undefined, best = 64;
  for (const o of obstacles[e.sy][e.sx]) {
    const d = Math.hypot(o.x + 20 - e.x, o.y + 20 - e.y);
    if (o.type !== 'HOUSE' && d < best) { best = d; cover = o; }
  }
  const elio = { x: e.x, y: e.y, screenX: e.sx, screenY: e.sy, cover };

  const items: WorldItem[] = [];
  const ids = Object.keys(TRINKETS).filter(k => k !== 'star');
  const nTrinkets = 6 + Math.floor(rng.next() * 4);
  for (let i = 0; i < nTrinkets; i++) {
    const s = pick(spots);
    if (!s) continue;
    const biome = map[s.sy][s.sx];
    const fav = Object.keys(TRINKETS).filter(k => TRINKETS[k].biomes!.includes(biome) && (k !== 'star' || rng.next() < 0.25));
    const kind = fav.length && rng.next() < 0.65 ? rng.choice(fav) : rng.choice(ids);
    items.push({ id: `t:${i}`, kind, x: s.x, y: s.y, screenX: s.sx, screenY: s.sy, isPicked: false });
  }
  const nKisses = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < nKisses; i++) {
    const s = pick(spots);
    if (s) items.push({ id: `k:${i}`, kind: 'kiss', x: s.x, y: s.y, screenX: s.sx, screenY: s.sy, isPicked: false });
  }
  return { items, elio };
};
