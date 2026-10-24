// Pure world generation: no three.js, no DOM. Same seed string => same World.
import { SeededRandom } from './rng.ts';
import { ALL_BIOMES, BIOME_FLOWERS, FLOWER_COLORS, TRINKETS, ELIO_LINES, type Biome } from './data.ts';

export const REGION = 80; // one region ~ one 2D screen
export const HALF = (REGION * 3) / 2; // map spans [-HALF, HALF] on x and z
export const RIVER_HALF = 4; // half width of the water
export const BRIDGE_HALF = 1.8; // half width of the bridge deck
export const DECK_Y = 0.45;
export const HOUSE = { w: 10, d: 8, door: { x: 0, z: 4 } }; // centred on (0,0), door faces +z
export const SPAWN = { x: 0, z: 8 };

export type Tree = { x: number; z: number; s: number; kind: 'round' | 'pine' | 'palm' };
export type Rock = { x: number; z: number; s: number };
export type FlowerSpot = { id: string; type: string; color: string; x: number; z: number };
export type Pickup = { id: string; type: string; x: number; z: number }; // id 't:n' trinket / 'k:n' kiss
// Elio hides at (x, z), peeks out toward side `peek` (+-1) and steps out to (ox, oz) when Werka comes close.
export type Elio = { x: number; z: number; ox: number; oz: number; face: number; peek: number; line: string };
// Soft map edge: Werka slows from EDGE.slow units before the border and stops at EDGE.stop.
export const EDGE = { slow: 16, stop: 4 };

export type World = {
  seed: string;
  biomes: Biome[][]; // [row z][col x], 3x3, centre is GRASS
  riverPhase: number;
  bridgeX: number;
  trees: Tree[];
  rocks: Rock[];
  flowers: FlowerSpot[];
  ponds: Pond[]; // still water for lotus / water lilies
  landmarks: Landmark[]; // one signature prop per outer region
  trinkets: Pickup[];
  kisses: Pickup[];
  elio: Elio;
};
export type Pond = { x: number; z: number; r: number };
export type Landmark = { x: number; z: number; r: number; kind: Biome };
export const WATER_FLOWERS = new Set(['Lotus', 'Water Lily']);
export const WATER_Y = -0.55;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const riverZ = (w: World, x: number) =>
  40 + Math.sin((x + w.riverPhase) / 28) * 7 + Math.sin((x + w.riverPhase * 0.5) / 9) * 1.5;

export const onBridge = (w: World, x: number, z: number) =>
  Math.abs(x - w.bridgeX) < BRIDGE_HALF && Math.abs(z - riverZ(w, x)) < RIVER_HALF + 3;

export const inWater = (w: World, x: number, z: number) => Math.abs(z - riverZ(w, x)) < RIVER_HALF;

// Bilinear blend between the 4 nearest region centres; region cores stay pure.
// Writes into shared scratch buffers (no allocation: heightAt runs every frame).
const WB: Biome[] = ['GRASS', 'GRASS', 'GRASS', 'GRASS'];
const WK = [0, 0, 0, 0];
function weightsInto(w: World, x: number, z: number) {
  const u = (x + HALF) / REGION - 0.5;
  const v = (z + HALF) / REGION - 0.5;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const fx = smooth(0.3, 0.7, u - i0), fz = smooth(0.3, 0.7, v - j0);
  const ci = (i: number) => Math.min(2, Math.max(0, i));
  WB[0] = w.biomes[ci(j0)][ci(i0)]; WK[0] = (1 - fx) * (1 - fz);
  WB[1] = w.biomes[ci(j0)][ci(i0 + 1)]; WK[1] = fx * (1 - fz);
  WB[2] = w.biomes[ci(j0 + 1)][ci(i0)]; WK[2] = (1 - fx) * fz;
  WB[3] = w.biomes[ci(j0 + 1)][ci(i0 + 1)]; WK[3] = fx * fz;
}

export function biomeWeights(w: World, x: number, z: number): [Biome, number][] {
  weightsInto(w, x, z);
  return [[WB[0], WK[0]], [WB[1], WK[1]], [WB[2], WK[2]], [WB[3], WK[3]]];
}

export function biomeAt(w: World, x: number, z: number): Biome {
  return biomeWeights(w, x, z).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

const BIOME_HEIGHT: Record<Biome, (x: number, z: number) => number> = {
  MOUNTAIN: (x, z) => 6 + Math.sin(x * 0.11) * Math.cos(z * 0.09) * 4 + Math.sin(x * 0.045 + 1) * 1.5,
  TUNDRA: (x, z) => 1.5 + Math.sin(x * 0.07) * Math.sin(z * 0.08) * 1.2,
  DESERT: (x, z) => Math.sin(x * 0.09 + z * 0.03) * 1.3,
  FOREST: (x, z) => 0.8 + Math.sin(x * 0.05) * Math.cos(z * 0.06) * 2,
  SWAMP: () => -0.25,
  GRASS: (x, z) => 0.6 + Math.sin(x * 0.06) * Math.cos(z * 0.05) * 1.8,
  MEADOW: (x, z) => 0.4 + Math.sin(x * 0.05 + 1) * Math.cos(z * 0.04) * 1.9,
  RIVER: (x, z) => Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.2,
  TROPICAL: (x, z) => 0.3 + Math.sin(x * 0.08) * Math.sin(z * 0.07) * 0.9,
  ENCHANTED: (x, z) => 0.5 + Math.sin(x * 0.12) * Math.cos(z * 0.1) * 0.8,
};

// Terraces: flat shelves joined by short steep faces, which read as rock ledges.
export const TERRACE = 1.8;
const TERRACED: Partial<Record<Biome, boolean>> = { GRASS: true, FOREST: true, MEADOW: true, MOUNTAIN: true, TUNDRA: true, TROPICAL: true, ENCHANTED: true };
const terrace = (h: number) => {
  const b = Math.floor(h / TERRACE);
  return (b + smooth(0.78, 1, h / TERRACE - b)) * TERRACE;
};

export function heightAt(w: World, x: number, z: number): number {
  let h = 0;
  let tw = 0; // how much of this spot is terraced terrain (dunes, swamp and river banks stay smooth)
  weightsInto(w, x, z);
  for (let i = 0; i < 4; i++) if (WK[i] > 0) { h += BIOME_HEIGHT[WB[i]](x, z) * WK[i]; if (TERRACED[WB[i]]) tw += WK[i]; }
  h += (terrace(h) - h) * tw;
  // Flat yard around the house.
  h *= smooth(8, 13, Math.hypot(x, z));
  // Flat valley, then the carved riverbed.
  const d = Math.abs(z - riverZ(w, x));
  h += (0.2 - h) * (1 - smooth(RIVER_HALF + 4, RIVER_HALF + 16, d));
  h += (-1.8 - h) * (1 - smooth(RIVER_HALF - 1, RIVER_HALF + 2.5, d));
  for (const p of w.ponds) {
    const pd = Math.hypot(x - p.x, z - p.z);
    if (pd > p.r + 6) continue;
    h += (0.2 - h) * (1 - smooth(p.r + 1, p.r + 6, pd)); // flat shore
    h += (-1.5 - h) * (1 - smooth(p.r - 1.4, p.r + 0.4, pd)); // bowl
  }
  return h;
}

export const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

const TREES: Record<Biome, number> = {
  FOREST: 70, TROPICAL: 45, ENCHANTED: 35, SWAMP: 30, GRASS: 14, MEADOW: 8,
  RIVER: 16, TUNDRA: 18, MOUNTAIN: 22, DESERT: 0,
};
const ROCKS: Record<Biome, number> = {
  DESERT: 25, MOUNTAIN: 40, TUNDRA: 15, GRASS: 4, FOREST: 6, RIVER: 6, MEADOW: 3, SWAMP: 4, TROPICAL: 4, ENCHANTED: 8,
};

export function generateWorld(seed: string): World {
  const rng = new SeededRandom(seed);

  // Same biome assignment as 2D: shuffle the 8 outer cells and the biome list, centre is GRASS.
  const cells: { x: number; z: number }[] = [];
  for (let z = 0; z < 3; z++) for (let x = 0; x < 3; x++) if (x !== 1 || z !== 1) cells.push({ x, z });
  rng.shuffle(cells);
  const shuffled = rng.shuffle([...ALL_BIOMES]);
  const biomes: Biome[][] = [0, 1, 2].map(() => ['GRASS', 'GRASS', 'GRASS'] as Biome[]);
  cells.forEach((c, i) => (biomes[c.z][c.x] = shuffled[i]));

  const w: World = {
    seed, biomes,
    riverPhase: rng.range(0, 200),
    bridgeX: rng.range(-25, 25),
    trees: [], rocks: [], flowers: [], ponds: [], landmarks: [],
    trinkets: [], kisses: [], elio: { x: 0, z: 0, ox: 0, oz: 0, face: 0, peek: 1, line: '' },
  };

  const doorZ = HOUSE.door.z;
  const nearRiver = (x: number, z: number, m: number) => Math.abs(z - riverZ(w, x)) < RIVER_HALF + m;
  // Ponds (swamp and river regions) and one landmark per outer region, placed before anything else.
  for (let rz = 0; rz < 3; rz++) for (let rx = 0; rx < 3; rx++) {
    const biome = biomes[rz][rx];
    const cx = rx * REGION - HALF + REGION / 2, cz = rz * REGION - HALF + REGION / 2;
    if (rx !== 1 || rz !== 1) {
      for (let t = 0; t < 8; t++) {
        const x = cx + rng.range(-14, 14), z = cz + rng.range(-14, 14);
        if (!nearRiver(x, z, 10)) { w.landmarks.push({ x, z, r: 3, kind: biome }); break; }
      }
    }
    const n = biome === 'SWAMP' ? 4 : biome === 'RIVER' ? 2 : 0;
    for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
      const r = rng.range(3.5, 6);
      const x = cx + rng.range(-30, 30), z = cz + rng.range(-30, 30);
      if (nearRiver(x, z, r + 8) || Math.hypot(x, z) < 22) continue;
      if (w.landmarks.some(l => Math.hypot(l.x - x, l.z - z) < l.r + r + 6)) continue;
      if (w.ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + 4)) continue;
      w.ponds.push({ x, z, r });
      i++;
    }
  }

  const keepClear = (x: number, z: number, margin: number) =>
    w.ponds.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 1 + margin) ||
    w.landmarks.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 2 + margin) ||
    Math.hypot(x, z) < 9 + margin ||
    Math.abs(z - riverZ(w, x)) < RIVER_HALF + 1 + margin ||
    segDist(x, z, 0, doorZ, w.bridgeX, riverZ(w, w.bridgeX)) < 1 + margin ||
    (Math.abs(x - w.bridgeX) < 3 + margin && Math.abs(z - riverZ(w, x)) < RIVER_HALF + 6);

  for (let rz = 0; rz < 3; rz++) {
    for (let rx = 0; rx < 3; rx++) {
      const biome = biomes[rz][rx];
      const x0 = rx * REGION - HALF, z0 = rz * REGION - HALF;
      const pos = () => [rng.range(x0 + 2, x0 + REGION - 2), rng.range(z0 + 2, z0 + REGION - 2)];

      const { types, density } = BIOME_FLOWERS[biome];
      for (let i = 0; i < density * 2; i++) {
        const [x, z] = pos();
        const type = rng.choice(types);
        if (WATER_FLOWERS.has(type)) {
          // Floats in the shallows of one of this region's ponds, close enough to reach from the bank.
          const ponds = w.ponds.filter(p => Math.abs(p.x - (x0 + REGION / 2)) < REGION / 2 && Math.abs(p.z - (z0 + REGION / 2)) < REGION / 2);
          if (!ponds.length) continue;
          const p = ponds[Math.floor(rng.next() * ponds.length)], a = rng.range(0, Math.PI * 2), d = p.r - rng.range(0.9, 1.4);
          w.flowers.push({ id: `f-${rx}-${rz}-${i}`, type, color: FLOWER_COLORS[type], x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d });
          continue;
        }
        if (keepClear(x, z, 0)) continue;
        w.flowers.push({ id: `f-${rx}-${rz}-${i}`, type, color: FLOWER_COLORS[type], x, z });
      }

      const kind: Tree['kind'] = biome === 'TUNDRA' || biome === 'MOUNTAIN' ? 'pine' : biome === 'TROPICAL' ? 'palm' : 'round';
      for (let i = 0; i < TREES[biome]; i++) {
        const [x, z] = pos();
        const s = rng.range(0.8, 1.5);
        if (!keepClear(x, z, 3)) w.trees.push({ x, z, s, kind });
      }
      for (let i = 0; i < ROCKS[biome]; i++) {
        const [x, z] = pos();
        const s = rng.range(0.5, biome === 'MOUNTAIN' ? 2.2 : 1.3);
        if (!keepClear(x, z, 2)) w.rocks.push({ x, z, s });
      }
    }
  }

  // Flowers inside a tree trunk or rock, or on a shelf you cannot climb to, are dropped.
  const reach = reachable(w);
  const cell = (v: number) => Math.round(v + HALF);
  // Water flowers are checked from the bank point behind them.
  const shore = (f: FlowerSpot) => {
    const p = WATER_FLOWERS.has(f.type) ? w.ponds.find(q => Math.hypot(q.x - f.x, q.z - f.z) < q.r) : undefined;
    if (!p) return f;
    const d = Math.hypot(f.x - p.x, f.z - p.z) || 1;
    return { x: p.x + ((f.x - p.x) / d) * (p.r + 0.6), z: p.z + ((f.z - p.z) / d) * (p.r + 0.6) };
  };
  w.flowers = w.flowers.filter(f =>
    reach[cell(shore(f).z) * GRID + cell(shore(f).x)] === 1 &&
    !w.trees.some(t => Math.hypot(t.x - f.x, t.z - f.z) < 0.6 * t.s + 0.5) &&
    !w.rocks.some(r => Math.hypot(r.x - f.x, r.z - f.z) < r.s + 0.4));
  placeExtras(w, (x, z) => reach[cell(z) * GRID + cell(x)] === 1);
  return w;
}

// Elio, trinkets and kisses: their own RNG stream, so flowers and trees for a date never move.
function placeExtras(w: World, reach: (x: number, z: number) => boolean) {
  const rng = new SeededRandom(`${w.seed}-pickups`);
  const lim = HALF - EDGE.slow;
  const free = (x: number, z: number, r: number) =>
    Math.abs(x) < lim && Math.abs(z) < lim && Math.hypot(x, z) > 14 && reach(x, z) && !blocked(w, x, z, r) &&
    !inWater(w, x, z) && !w.ponds.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 1.5);

  // Elio hides on the far (uphill, -z) side of a tree or rock, so the cover sits between him and the camera.
  const far = HALF * 2 * 0.3 + 5; // ~30% of the map width from the spawn, with room for the hiding offset
  const cover = [...w.trees.map(t => ({ x: t.x, z: t.z, r: 0.45 * t.s })), ...w.rocks.map(k => ({ x: k.x, z: k.z, r: 0.8 * k.s })),
    ...w.landmarks].filter(c => Math.hypot(c.x - SPAWN.x, c.z - SPAWN.z) > far);
  for (let t = 0; t < 400; t++) {
    const c = cover[Math.floor(rng.next() * cover.length)];
    const a = -Math.PI / 2 + rng.range(-0.7, 0.7), d = c.r + 1.1; // behind, slightly to one side
    const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    if (!free(x, z, 0.6)) continue;
    // Step-out spot clear of the canopy, on the side he faces first.
    const side = Math.cos(a) < 0 ? -1 : 1;
    const out = [side, -side].flatMap(sd => [3, 2.5].map(k => ({ sd, x: x + sd * k, z: z + 0.8 })))
      .find(o => free(o.x, o.z, 0.6) && !steep(w, x, z, o.x, o.z));
    if (!out) continue;
    w.elio = { x, z, ox: out.x, oz: out.z, face: Math.atan2(SPAWN.x - x, SPAWN.z - z), peek: out.sd, line: rng.choice(ELIO_LINES) };
    break;
  }

  const taken: { x: number; z: number }[] = [w.elio, ...w.flowers];
  const spot = (gap: number) => {
    for (let t = 0; t < 200; t++) {
      const x = rng.range(-lim, lim), z = rng.range(-lim, lim);
      if (!free(x, z, 0.5) || taken.some(o => Math.hypot(o.x - x, o.z - z) < (o === w.elio ? 4 : 1.2))) continue;
      if (w.trinkets.concat(w.kisses).some(o => Math.hypot(o.x - x, o.z - z) < gap)) continue;
      return { x, z };
    }
    return null;
  };
  const nT = 6 + Math.floor(rng.next() * 4), nK = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < nT; i++) {
    const p = spot(18);
    if (!p) continue;
    const b = biomeAt(w, p.x, p.z);
    const fav = TRINKETS.filter(t => t.biomes.includes(b) && (!t.rare || rng.next() < 0.35));
    const type = (fav.length && rng.next() < 0.8 ? rng.choice(fav) : rng.choice(TRINKETS.filter(t => !t.rare))).id;
    w.trinkets.push({ id: `t:${i}`, type, ...p });
  }
  for (let i = 0; i < nK; i++) {
    const p = spot(14);
    if (p) w.kisses.push({ id: `k:${i}`, type: 'kiss', ...p });
  }
}

// Collision for a walker of radius r. Bridge is the only way across the water.
export function blocked(w: World, x: number, z: number, r = 0.5): boolean {
  if (Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1) return true;
  if (Math.abs(z - riverZ(w, x)) < RIVER_HALF - 0.5 && !onBridge(w, x, z)) return true;
  if (Math.abs(x) < HOUSE.w / 2 + r && Math.abs(z) < HOUSE.d / 2 + r) return true;
  for (const p of w.ponds) if (Math.hypot(x - p.x, z - p.z) < p.r - 0.5) return true;
  for (const l of w.landmarks) if (Math.hypot(x - l.x, z - l.z) < l.r + r) return true;
  for (const t of w.trees) if (Math.abs(t.x - x) < 3 && Math.hypot(t.x - x, t.z - z) < 0.45 * t.s + r) return true;
  for (const k of w.rocks) if (Math.abs(k.x - x) < 3 && Math.hypot(k.x - x, k.z - z) < 0.8 * k.s + r) return true;
  return false;
}

// Walking surface height: the bridge deck counts as ground.
export const walkY = (w: World, x: number, z: number) =>
  onBridge(w, x, z) ? Math.max(DECK_Y, heightAt(w, x, z)) : heightAt(w, x, z);

export const MAX_SLOPE = 1.15; // rise per unit of distance the walker can climb

// Same rule as the flood fill: compare heights one unit ahead in the walking direction.
export function steep(w: World, x0: number, z0: number, x1: number, z1: number) {
  const d = Math.hypot(x1 - x0, z1 - z0);
  if (d < 1e-6) return false;
  const ax = x0 + (x1 - x0) / d, az = z0 + (z1 - z0) / d;
  return Math.abs(walkY(w, ax, az) - walkY(w, x0, z0)) > MAX_SLOPE;
}

// Flood fill on a 1-unit grid from the spawn point, using the walker's rules (minus trees/rocks).
const GRID = HALF * 2 + 1;
function reachable(w: World): Uint8Array {
  const seen = new Uint8Array(GRID * GRID);
  const hgt = new Float32Array(GRID * GRID);
  const ok = new Uint8Array(GRID * GRID);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const x = i - HALF, z = j - HALF, k = j * GRID + i;
    hgt[k] = walkY(w, x, z);
    ok[k] = Math.abs(x) < HALF - 1 && Math.abs(z) < HALF - 1 &&
      !(Math.abs(z - riverZ(w, x)) < RIVER_HALF - 0.5 && !onBridge(w, x, z)) &&
      !(Math.abs(x) < HOUSE.w / 2 + 0.5 && Math.abs(z) < HOUSE.d / 2 + 0.5) &&
      !w.ponds.some(p => Math.hypot(x - p.x, z - p.z) < p.r - 0.5) &&
      !w.landmarks.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 0.5) ? 1 : 0;
  }
  const start = Math.round(SPAWN.z + HALF) * GRID + Math.round(SPAWN.x + HALF);
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const k = queue.pop()!;
    const i = k % GRID, j = (k - i) / GRID;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= GRID || nj >= GRID) continue;
      const n = nj * GRID + ni;
      if (seen[n] || !ok[n] || Math.abs(hgt[n] - hgt[k]) > MAX_SLOPE) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  return seen;
}
