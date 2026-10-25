import { Flower, FlowerType, Biome, Obstacle, WorldItem, Point } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FLOWER_COLORS, HOUSE_RECT, HOUSE_SCREEN, TRINKETS, RARITY_WEIGHT, rarityOf } from '../constants';

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
// Werka's drawn feet sit ~15px below her position, so water checks look at y + FEET.
export const FEET = 14;
// River band (signed distance from the river centre line): positive = how far inside the no-walk band.
export const riverDepth = (d: number) => Math.min(d + FEET + 40, 35 - d);
export const onBridge = (x: number, bx: number) => Math.abs(x - bx) < BRIDGE_WIDTH / 2 - 10;
export const SPAWN = { x: CANVAS_WIDTH / 2, y: 300 };
export const isHouseScreen = (sx: number, sy: number) => sx === HOUSE_SCREEN.x && sy === HOUSE_SCREEN.y;

// A pond: water ellipse (rx, ry) with a sandy/muddy rim drawn a bit wider.
export interface Pond { x: number; y: number; rx: number; ry: number }
// Normalised ellipse distance, 1 = on the (padded) edge.
export const pondNorm = (p: Pond, x: number, y: number, pad = 0) => {
  const dx = (x - p.x) / (p.rx + pad), dy = (y - p.y) / (p.ry + pad);
  return Math.sqrt(dx * dx + dy * dy);
};

// Ambient animals. type: see CRITTER in utils/critters.ts. pond: home water (null = river or none).
export interface CritterSpawn { type: number; x: number; y: number; flock: number; pond: Pond | null; v: number }

export interface World {
  map: Biome[][];
  ponds: Pond[][][]; // [sy][sx]
  critters: CritterSpawn[][][]; // [sy][sx]
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
  const ponds = genPonds(dateSeed, map, obstacles, flowers);
  const { items, elio } = placeItems(dateSeed, map, obstacles, ponds, riverY, bridgeX);
  const critters = genCritters(dateSeed, map, obstacles, ponds, riverY, bridgeX);
  return { map, ponds, critters, flowers, obstacles, items, elio, riverY, bridgeX };
};

// Ponds get their own stream and only go where nothing already stands, so trees, rocks and flowers never move.
const POND_BIOMES: Partial<Record<Biome, number>> = { [Biome.SWAMP]: 2, [Biome.TROPICAL]: 1, [Biome.MEADOW]: 0.5, [Biome.GRASS]: 0.5, [Biome.FOREST]: 0.5, [Biome.ENCHANTED]: 0.5 };
const genPonds = (dateSeed: string, map: Biome[][], obstacles: Obstacle[][][], flowers: Flower[]): Pond[][][] => {
  const rng = new SeededRandom(`${dateSeed}-ponds`);
  return map.map((row, sy) => row.map((biome, sx) => {
    const out: Pond[] = [];
    const want = POND_BIOMES[biome] ?? 0;
    const roll = rng.next();
    const n = isHouseScreen(sx, sy) ? 0 : want >= 1 ? want : roll < want ? 1 : 0;
    const here = flowers.filter(f => f.screenX === sx && f.screenY === sy);
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 60; tries++) {
        const rx = rng.range(70, 112), ry = rx * rng.range(0.5, 0.64);
        const p = { x: rng.range(rx + 60, CANVAS_WIDTH - rx - 60), y: rng.range(ry + 70, CANVAS_HEIGHT - ry - 70), rx, ry };
        if (p.x < 300 + rx && p.y < 300 + ry) continue; // keep the desktop HUD corner dry
        if (obstacles[sy][sx].some(o => pondNorm(p, o.x + 20, o.y + 24, 40) < 1)) continue;
        if (here.some(f => pondNorm(p, f.x, f.y, 14) < 1)) continue;
        if (out.some(q => Math.hypot(q.x - p.x, q.y - p.y) < q.rx + p.rx + 70)) continue;
        out.push(p);
        break;
      }
    }
    return out;
  }));
};

// Critters: deterministic per date from `${seed}-critters`; at most CRITTER_CAP per screen (only one screen runs at a time).
export const CRITTER_CAP = 40;
const genCritters = (dateSeed: string, map: Biome[][], obstacles: Obstacle[][][], ponds: Pond[][][], riverY: (gx: number) => number, bridgeX: (sx: number, sy: number) => number) => {
  const rng = new SeededRandom(`${dateSeed}-critters`);
  return map.map((row, sy) => row.map((biome, sx) => {
    const out: CritterSpawn[] = [];
    const ps = ponds[sy][sx];
    const river = biome === Biome.RIVER;
    const gx = (x: number) => sx * CANVAS_WIDTH + x;
    const dry = (x: number, y: number) =>
      !obstacles[sy][sx].some(o => x > o.x - 14 && x < o.x + o.width + 14 && y > o.y - 14 && y < o.y + o.height + 14) &&
      !ps.some(p => pondNorm(p, x, y, 16) < 1) && !(river && Math.abs(y - riverY(gx(x))) < 52);
    const open = (margin: number) => {
      for (let t = 0; t < 30; t++) {
        const x = rng.range(margin, CANVAS_WIDTH - margin), y = rng.range(margin + 30, CANVAS_HEIGHT - margin);
        if (dry(x, y)) return { x, y };
      }
      return null;
    };
    const add = (type: number, x: number, y: number, flock = -1, pond: Pond | null = null) => {
      if (out.length < CRITTER_CAP) out.push({ type, x, y, flock, pond, v: Math.floor(rng.next() * 3) });
    };
    // 0 BIRD: a flock or two hopping on open ground
    if ([Biome.GRASS, Biome.MEADOW, Biome.FOREST, Biome.ENCHANTED].includes(biome)) {
      const flocks = biome === Biome.MEADOW || biome === Biome.GRASS ? 2 : 1;
      for (let f = 0; f < flocks; f++) {
        const c = open(90);
        const n = 3 + Math.floor(rng.next() * 4);
        for (let i = 0; i < n && c; i++) {
          const x = c.x + rng.range(-34, 34), y = c.y + rng.range(-20, 20);
          if (dry(x, y)) add(0, x, y, f);
        }
      }
    }
    // 1 FROG on pond rims and river banks, 2 FISH under the surface, 6 CRAB on tropical shores
    for (const p of ps) {
      const frogs = biome === Biome.SWAMP ? 3 : 2;
      for (let i = 0; i < frogs; i++) {
        const a = rng.next() * Math.PI * 2;
        const x = p.x + Math.cos(a) * (p.rx + 12), y = p.y + Math.sin(a) * (p.ry + 10);
        if (biome !== Biome.TROPICAL && dry(x, y)) add(1, x, y, -1, p);
      }
      const fish = 2 + Math.floor(rng.next() * 2);
      for (let i = 0; i < fish; i++) add(2, p.x, p.y, -1, p);
      if (biome === Biome.TROPICAL) for (let i = 0; i < 2; i++) {
        const a = rng.next() * Math.PI * 2;
        const x = p.x + Math.cos(a) * (p.rx + 18), y = p.y + Math.sin(a) * (p.ry + 14);
        if (dry(x, y)) add(6, x, y, -1, p);
      }
    }
    if (river) {
      const bx = bridgeX(sx, sy);
      for (let i = 0; i < 4; i++) {
        const x = rng.range(60, CANVAS_WIDTH - 60), side = rng.next() < 0.5 ? -1 : 1;
        const y = riverY(gx(x)) + side * 56;
        if (Math.abs(x - bx) > 70 && dry(x, y + side * 4)) add(1, x, y);
      }
      for (let i = 0; i < 5; i++) { const x = rng.range(0, CANVAS_WIDTH); add(2, x, riverY(gx(x)) + rng.range(-18, 18)); }
    }
    // 3 BUTTERFLY around flowers
    const bf = ({ [Biome.MEADOW]: 5, [Biome.ENCHANTED]: 4, [Biome.TROPICAL]: 4, [Biome.GRASS]: 2 } as Partial<Record<Biome, number>>)[biome] ?? 0;
    for (let i = 0; i < bf; i++) { const c = open(60); if (c) add(3, c.x, c.y); }
    // 5 RABBIT in meadows and grass
    if ((biome === Biome.MEADOW || biome === Biome.GRASS) && rng.next() < 0.7) { const c = open(80); if (c) add(5, c.x, c.y); }
    // 7 OWL perched on a forest tree, only out at night
    if (biome === Biome.FOREST) {
      const trees = obstacles[sy][sx].filter(o => o.type === 'TREE' && o.y > 90 && o.x > 40 && o.x < CANVAS_WIDTH - 80);
      if (trees.length) { const t = trees[Math.floor(rng.next() * trees.length)]; add(7, t.x + 20, t.y - 12); }
    }
    // 4 FIREFLY everywhere; only visible at dusk and night
    for (let i = 0; i < 12; i++) add(4, rng.range(40, CANVAS_WIDTH - 40), rng.range(60, CANVAS_HEIGHT - 40));
    return out;
  }));
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
const placeItems = (dateSeed: string, map: Biome[][], obstacles: Obstacle[][][], ponds: Pond[][][], riverY: (gx: number) => number, bridgeX: (sx: number, sy: number) => number) => {
  const GW = (CANVAS_WIDTH * 3) / CELL, GH = (CANVAS_HEIGHT * 3) / CELL;
  const local = (c: number, r: number) => {
    const gx = c * CELL + CELL / 2, gy = r * CELL + CELL / 2;
    const sx = Math.floor(gx / CANVAS_WIDTH), sy = Math.floor(gy / CANVAS_HEIGHT);
    return { gx, gy, sx, sy, x: gx - sx * CANVAS_WIDTH, y: gy - sy * CANVAS_HEIGHT };
  };
  // Mirrors the player's collision (obstacle boxes + 8px, river unless on the bridge), a bit stricter.
  const passable = (sx: number, sy: number, x: number, y: number, gx: number) => {
    for (const o of obstacles[sy][sx]) if (x > o.x - 10 && x < o.x + o.width + 10 && y > o.y - 10 && y < o.y + o.height + 10) return false;
    if (map[sy][sx] === Biome.RIVER && riverDepth(y - riverY(gx)) > -3 && Math.abs(x - bridgeX(sx, sy)) >= BRIDGE_WIDTH / 2 - 14) return false;
    for (const p of ponds[sy][sx]) if (pondNorm(p, x, y + FEET, 6) < 1) return false;
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
  type Spot = { sx: number; sy: number; x: number; y: number; gx: number; gy: number; nearCover: boolean };
  const spots: Spot[] = [];
  const shore: Spot[] = []; // dry land right next to water: where shells wash up
  for (let r = 0; r < GH; r++) {
    for (let c = 0; c < GW; c++) {
      if (!reach[r * GW + c]) continue;
      const p = local(c, r);
      if (p.x < 40 || p.x > CANVAS_WIDTH - 40 || p.y < 40 || p.y > CANVAS_HEIGHT - 40) continue;
      if (!reach[r * GW + c + 1] || !reach[r * GW + c - 1] || !reach[(r + 1) * GW + c] || !reach[(r - 1) * GW + c]) continue;
      const rd = map[p.sy][p.sx] === Biome.RIVER ? Math.abs(p.y - riverY(p.gx)) : Infinity;
      if (rd < 50) continue;
      const pn = ponds[p.sy][p.sx].reduce((m, q) => Math.min(m, pondNorm(q, p.x, p.y, 18)), Infinity);
      if (pn < 1) continue;
      if (p.x < 270 && p.y < 280) continue; // under the desktop HUD
      if (isHouseScreen(p.sx, p.sy) && p.x > HOUSE_RECT.x - 50 && p.x < HOUSE_RECT.x + HOUSE_RECT.width + 50 && p.y < HOUSE_RECT.y + HOUSE_RECT.height + 70) continue;
      const nearCover = obstacles[p.sy][p.sx].some(o => o.type !== 'HOUSE' && Math.hypot(o.x + 20 - p.x, o.y + 20 - p.y) < 64);
      const s = { ...p, nearCover };
      spots.push(s);
      if (rd < 82 && Math.abs(p.x - bridgeX(p.sx, p.sy)) > 70) shore.push(s);
      else if (pn < 1.45) shore.push(s);
    }
  }

  const rng = new SeededRandom(`${dateSeed}-trinkets`);
  const taken: { gx: number; gy: number }[] = [];
  const free = (s: { gx: number; gy: number }) => taken.every(t => Math.hypot(t.gx - s.gx, t.gy - s.gy) > 60);
  // Rarity-weighted choice: common 1, uncommon 0.5, rare 0.2, very rare 0.07.
  const weighted = (keys: string[]) => {
    let r = rng.next() * keys.reduce((a, k) => a + RARITY_WEIGHT[rarityOf(k)], 0);
    for (const k of keys) if ((r -= RARITY_WEIGHT[rarityOf(k)]) < 0) return k;
    return keys[keys.length - 1];
  };
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
  const keys = Object.keys(TRINKETS);
  const shells = keys.filter(k => TRINKETS[k].shell);
  const landKeys = keys.filter(k => !TRINKETS[k].shell);
  const nTrinkets = 9 + Math.floor(rng.next() * 5); // 9-13
  const nShore = 2 + Math.floor(rng.next() * 3); // 2-4 of them washed up on a shore
  for (let i = 0; i < nTrinkets; i++) {
    const s = (i < nShore && pick(shore)) || pick(spots);
    if (!s) continue;
    const biome = map[s.sy][s.sx];
    const onShore = shore.includes(s);
    const pool = onShore ? shells : keys;
    const fav = pool.filter(k => TRINKETS[k].biomes!.includes(biome));
    const kind = fav.length && rng.next() < 0.65 ? weighted(fav) : weighted(onShore ? shells : landKeys);
    items.push({ id: `t:${i}`, kind, x: s.x, y: s.y, screenX: s.sx, screenY: s.sy, isPicked: false });
  }
  const nKisses = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < nKisses; i++) {
    const s = pick(spots);
    if (s) items.push({ id: `k:${i}`, kind: 'kiss', x: s.x, y: s.y, screenX: s.sx, screenY: s.sy, isPicked: false });
  }
  return { items, elio };
};
