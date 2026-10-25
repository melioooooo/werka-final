// Ambient critters (spec v4 §4): where birds, frogs, fish and butterflies live today.
// Pure data from their own RNG stream, so flowers, trees and pickups for a date never move.
import { SeededRandom } from './rng.ts';
import { type World, HALF, EDGE, RIVER_HALF, biomeAt, blocked, inWater, onBridge, riverZ } from './generate.ts';
import type { Biome } from './data.ts';

export type CritterKind = 'bird' | 'frog' | 'fish' | 'butterfly';
// x, z: home. bird: flock id. frog: (wx, wz) water spot it dives to. fish: loop radii (rx, rz).
// butterfly: up to 3 flower spots it visits.
export type Critter = {
  kind: CritterKind; x: number; z: number;
  flock?: number; wx?: number; wz?: number; rx?: number; rz?: number;
  pts?: [number, number][]; ph: number;
};
export const MAX_CRITTERS = 60;
const BIRD_BIOMES = new Set<Biome>(['GRASS', 'MEADOW', 'FOREST', 'ENCHANTED']);
const BUTTERFLY_BIOMES = new Set<Biome>(['MEADOW', 'ENCHANTED', 'TROPICAL']);

export function spawnCritters(w: World): Critter[] {
  const rng = new SeededRandom(`${w.seed}-critters`);
  const lim = HALF - EDGE.slow;
  const out: Critter[] = [];
  const land = (x: number, z: number) =>
    Math.abs(x) < lim && Math.abs(z) < lim && Math.hypot(x, z) > 11 && !blocked(w, x, z, 0.6) && !inWater(w, x, z) &&
    !w.ponds.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 1.2);

  // Birds: 4-5 small flocks on open ground, the first one close to the cottage so it is seen early.
  const flocks = 4 + Math.floor(rng.next() * 2);
  for (let f = 0, tries = 0; f < flocks && tries < 300; tries++) {
    const near = f === 0;
    const a = rng.range(0, Math.PI * 2), d = near ? rng.range(15, 28) : rng.range(20, lim);
    const x = near ? Math.cos(a) * d : rng.range(-lim, lim), z = near ? Math.sin(a) * d : rng.range(-lim, lim);
    if (!BIRD_BIOMES.has(biomeAt(w, x, z)) || !land(x, z)) continue;
    if (out.some(c => c.kind === 'bird' && Math.hypot(c.x - x, c.z - z) < 30)) continue;
    const n = 3 + Math.floor(rng.next() * 4);
    for (let i = 0; i < n; i++) {
      const bx = x + rng.range(-1.6, 1.6), bz = z + rng.range(-1.6, 1.6);
      const ok = land(bx, bz) && BIRD_BIOMES.has(biomeAt(w, bx, bz));
      out.push({ kind: 'bird', x: ok ? bx : x, z: ok ? bz : z, flock: f, ph: rng.range(0, 10) });
    }
    f++;
  }

  // Frogs: on pond shores (two per pond) and a few on the river bank, each with a water spot to dive to.
  for (const p of w.ponds.slice(0, 5)) {
    for (let i = 0; i < 2; i++) {
      const a = rng.range(0, Math.PI * 2);
      const x = p.x + Math.cos(a) * (p.r + 0.35), z = p.z + Math.sin(a) * (p.r + 0.35);
      out.push({ kind: 'frog', x, z, wx: p.x + Math.cos(a) * (p.r - 1.3), wz: p.z + Math.sin(a) * (p.r - 1.3), ph: rng.range(0, 10) });
    }
  }
  for (let i = 0, tries = 0; i < 4 && tries < 80; tries++) {
    const x = rng.range(-lim, lim), s = rng.next() < 0.5 ? -1 : 1, rz = riverZ(w, x);
    const z = rz + s * (RIVER_HALF + 0.9);
    if (Math.abs(x - w.bridgeX) < 6 || Math.abs(x) < 14 || blocked(w, x, z, 0.3)) continue;
    out.push({ kind: 'frog', x, z, wx: x, wz: rz + s * (RIVER_HALF - 1.4), ph: rng.range(0, 10) });
    i++;
  }

  // Fish: slow loops in the river and the ponds.
  for (let i = 0, tries = 0; i < 7 && tries < 80; tries++) {
    const x = rng.range(-lim, lim);
    if (Math.abs(x - w.bridgeX) < 5) continue;
    out.push({ kind: 'fish', x, z: riverZ(w, x) + rng.range(-1, 1), rx: rng.range(1.6, 2.8), rz: rng.range(0.6, 1.2), ph: rng.range(0, 10) });
    i++;
  }
  for (const p of w.ponds.slice(0, 5)) {
    const r = Math.max(0.8, p.r - 2.2);
    out.push({ kind: 'fish', x: p.x, z: p.z, rx: r, rz: r * rng.range(0.6, 1), ph: rng.range(0, 10) });
  }

  // Butterflies: hop between flowers of the meadow, enchanted and tropical regions.
  const blooms = w.flowers.filter(f => BUTTERFLY_BIOMES.has(biomeAt(w, f.x, f.z)) && !onBridge(w, f.x, f.z));
  for (let i = 0, tries = 0; i < 14 && blooms.length && tries < 100; tries++) {
    const f = blooms[Math.floor(rng.next() * blooms.length)];
    if (out.some(c => c.kind === 'butterfly' && Math.hypot(c.x - f.x, c.z - f.z) < 8)) continue;
    const pts = blooms.filter(g => Math.hypot(g.x - f.x, g.z - f.z) < 7).slice(0, 3).map(g => [g.x, g.z] as [number, number]);
    out.push({ kind: 'butterfly', x: f.x, z: f.z, pts, ph: rng.range(0, 10) });
    i++;
  }
  return out.slice(0, MAX_CRITTERS);
}
