// Run: npm run check. Fails loudly if world generation stops being deterministic or sane.
import assert from 'node:assert/strict';
import { generateWorld, heightAt, blocked, inWater, HOUSE, HALF, EDGE, SPAWN, WATER_FLOWERS, type World } from '../src/world/generate.ts';
import { TRINKETS } from '../src/world/data.ts';

const day = 'Friday, October 23, 2026';
const a = generateWorld(day);
const b = generateWorld(day);
assert.deepEqual(a, b, 'same date must give the same world');
assert.notDeepEqual(a.flowers, generateWorld('Saturday, October 24, 2026').flowers, 'other date must differ');

assert.equal(a.biomes[1][1], 'GRASS', 'house region is grass');
assert.equal(new Set(a.biomes.flat().filter((_, i) => i !== 4)).size, 8, '8 distinct outer biomes');
assert.ok(a.flowers.length > 120, `enough flowers (${a.flowers.length})`);
for (const f of a.flowers) {
  assert.ok(!(Math.abs(f.x) < HOUSE.w / 2 + 1 && Math.abs(f.z) < HOUSE.d / 2 + 1), `flower ${f.id} in house`);
  if (!WATER_FLOWERS.has(f.type)) assert.ok(!blocked(a, f.x, f.z, 0), `flower ${f.id} unreachable`);
}
assert.ok(!blocked(a, SPAWN.x, SPAWN.z), 'spawn is free');
// Water flowers float on a pond, everything else stands on dry land.
for (const f of a.flowers) {
  const inPond = a.ponds.some(p => Math.hypot(p.x - f.x, p.z - f.z) < p.r - 0.5);
  assert.equal(inPond, WATER_FLOWERS.has(f.type), `${f.type} ${f.id} water placement`);
}
assert.equal(heightAt(a, 3, 3), heightAt(b, 3, 3));

// Trinkets, kisses and Elio over a few months of dates: deterministic, valid, never moving the flowers.
const valid = (w: World, x: number, z: number, what: string) => {
  assert.ok(Math.abs(x) < HALF - EDGE.slow && Math.abs(z) < HALF - EDGE.slow, `${what} inside the map`);
  assert.ok(!(Math.abs(x) < HOUSE.w / 2 + 2 && Math.abs(z) < HOUSE.d / 2 + 2), `${what} not in house`);
  assert.ok(!inWater(w, x, z) && !w.ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 1), `${what} not in water`);
  assert.ok(!blocked(w, x, z), `${what} walkable`);
};
const ids = new Set(TRINKETS.map(t => t.id));
let nT = 0, nK = 0, minElio = Infinity;
const seen = new Set<string>();
for (let i = 0; i < 60; i++) {
  const d = new Date(2026, 0, 1 + i * 6).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const w = generateWorld(d), w2 = generateWorld(d);
  assert.deepEqual([w.trinkets, w.kisses, w.elio], [w2.trinkets, w2.kisses, w2.elio], `${d}: pickups deterministic`);
  assert.ok(w.trinkets.length >= 6 && w.trinkets.length <= 9, `${d}: 6-9 trinkets (${w.trinkets.length})`);
  assert.ok(w.kisses.length >= 3 && w.kisses.length <= 5, `${d}: 3-5 kisses (${w.kisses.length})`);
  for (const t of w.trinkets) { assert.ok(ids.has(t.type) && t.id.startsWith('t:')); valid(w, t.x, t.z, `${d} trinket ${t.id}`); seen.add(t.type); }
  for (const k of w.kisses) { assert.ok(k.id.startsWith('k:')); valid(w, k.x, k.z, `${d} kiss ${k.id}`); }
  valid(w, w.elio.x, w.elio.z, `${d} Elio`);
  valid(w, w.elio.ox, w.elio.oz, `${d} Elio step-out`);
  assert.ok(w.elio.line, `${d}: Elio has a line`);
  const de = Math.hypot(w.elio.x - SPAWN.x, w.elio.z - SPAWN.z);
  assert.ok(de > 0.3 * HALF * 2, `${d}: Elio far from spawn (${de.toFixed(0)})`);
  minElio = Math.min(minElio, de);
  nT += w.trinkets.length; nK += w.kisses.length;
}
assert.equal(seen.size, TRINKETS.length, `every trinket type appears (${[...seen].join(',')})`);
console.log(`ok: 60 dates, ${nT} trinkets, ${nK} kisses, Elio >= ${minElio.toFixed(0)} from spawn`);

console.log(`ok: ${a.flowers.length} flowers (${a.flowers.filter(f => WATER_FLOWERS.has(f.type)).length} on water), ${a.ponds.length} ponds, ${a.landmarks.length} landmarks, ${a.trees.length} trees, ${a.rocks.length} rocks, biomes ${a.biomes.flat().join(' ')}`);
