// Run: npm run check. Fails loudly if world generation stops being deterministic or sane.
import assert from 'node:assert/strict';
import { generateWorld, heightAt, blocked, walkBlocked, steep, inWater, riverZ, HOUSE, HALF, EDGE, SPAWN, WATER_FLOWERS, RIVER_HALF, biomeAt, type World } from '../src/world/generate.ts';
import { TRINKETS } from '../src/world/data.ts';
import { spawnCritters, MAX_CRITTERS } from '../src/world/critters.ts';
import { layoutFlowers, layoutExtras, headGap, headBottom, extrasClear, scaleHeads, FLOOR, wrapPoint } from '../src/world/bouquet-layout.ts';

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
const DATES = 200;
let nShore = 0, nCrit = 0, nFossil = 0, nLedge = 0;
const shoreOf = (w: World, x: number, z: number) => Math.abs(z - riverZ(w, x)) < RIVER_HALF + 3.2 || w.ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 3.6);
for (let i = 0; i < DATES; i++) {
  const d = new Date(2026, 0, 1 + i * 3).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const w = generateWorld(d), w2 = generateWorld(d);
  assert.deepEqual([w.trinkets, w.kisses, w.elio], [w2.trinkets, w2.kisses, w2.elio], `${d}: pickups deterministic`);
  assert.ok(w.trinkets.length >= 12 && w.trinkets.length <= 19, `${d}: 12-19 trinkets (${w.trinkets.length})`);
  const shore = w.trinkets.filter(t => shoreOf(w, t.x, t.z) && TRINKETS.find(k => k.id === t.type)!.shell).length;
  assert.ok(shore >= 5, `${d}: at least 5 shells on the shore (${shore})`);
  nShore += shore;
  // Relief never stops the walker: if neither spot is an obstacle, the step is allowed, up or down, however steep.
  for (let k = 0; k < 4000; k++) {
    const x = (k * 7.31) % (2 * HALF) - HALF, z = (k * 13.77) % (2 * HALF) - HALF, a = k * 2.4, nx = x + Math.cos(a) * 0.1, nz = z + Math.sin(a) * 0.1;
    if (blocked(w, x, z) || blocked(w, nx, nz)) continue;
    if (steep(w, x, z, nx, nz)) nLedge++;
    assert.ok(!walkBlocked(w, nx, nz), `${d}: relief blocks the walker at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  const rocky = w.trinkets.filter(t => TRINKETS.find(k => k.id === t.type)!.fossil);
  assert.ok(rocky.every(t => w.rocks.some(k => Math.hypot(k.x - t.x, k.z - t.z) < k.s + 2)), `${d}: fossils beside rocks`);
  nFossil += rocky.length;
  // Critters: own stream (deterministic), capped, each where it belongs.
  const cr = spawnCritters(w);
  assert.deepEqual(cr, spawnCritters(generateWorld(d)), `${d}: critters deterministic`);
  assert.ok(cr.length <= MAX_CRITTERS && cr.length >= 15, `${d}: critter count ${cr.length}`);
  for (const c of cr) {
    if (c.kind === 'fish') assert.ok(inWater(w, c.x, c.z) || w.ponds.some(p => Math.hypot(p.x - c.x, p.z - c.z) < p.r), `${d}: fish in water`);
    if (c.kind === 'frog') assert.ok(!inWater(w, c.x, c.z) && (inWater(w, c.wx!, c.wz!) || w.ponds.some(p => Math.hypot(p.x - c.wx!, p.z - c.wz!) < p.r - 0.5)), `${d}: frog on shore, dives into water`);
    if (c.kind === 'bird') assert.ok(!blocked(w, c.x, c.z, 0.3) && ['GRASS', 'MEADOW', 'FOREST', 'ENCHANTED'].includes(biomeAt(w, c.x, c.z)), `${d}: bird on open ground`);
  }
  nCrit += cr.length;
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
assert.ok(nLedge > 0, 'the walker check must actually meet some ledges');
console.log(`ok: ${DATES} dates, ${nT} trinkets (${nShore} shells on shores), ${nCrit} critters, ${nK} kisses, Elio >= ${minElio.toFixed(0)} from spawn`);

console.log(`ok: ${a.flowers.length} flowers (${a.flowers.filter(f => WATER_FLOWERS.has(f.type)).length} on water), ${a.ponds.length} ponds, ${a.landmarks.length} landmarks, ${a.trees.length} trees, ${a.rocks.length} rocks, biomes ${a.biomes.flat().join(' ')}`);

// Bouquet layouts: heads never overlap and never dip into the paper, for any size and any saved
// layout (even every head dragged onto the same spot); keepsakes never overlap each other or the bow.
let rs = 7;
const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
let shrunk = 0;
for (let t = 0; t < 400; t++) {
  const n = 1 + (t % 8);
  // Capsules like bouquet.ts makes: daisies short and wide (h < r), spikes long and thin.
  const shapes = Array.from({ length: n }, () => { const r = 0.12 + rnd() * 0.36; return { r, h: rnd() * 0.45, up: rnd() < 0.3 ? rnd() * 0.8 : 0 }; });
  const saved = t % 3 === 0 ? undefined : Array.from({ length: n }, () => (t % 3 === 1 ? { x: 0.3, y: -0.2 } : { x: rnd() * 2 - 1, y: rnd() * 2 - 1 }));
  const { u, k } = layoutFlowers(shapes, saved);
  if (k < 1) shrunk++;
  const sh = scaleHeads(shapes, k);
  for (let i = 0; i < n; i++) {
    assert.ok(headBottom(u[i], sh[i]) >= FLOOR - 1e-3, `layout ${t}: head ${i} dips into the wrap`);
    for (let j = i + 1; j < n; j++) assert.ok(headGap(u[i], sh[i], u[j], sh[j]) >= -1e-3, `layout ${t}: heads ${i},${j} overlap`);
  }
  const m = t % 7;
  const ex = layoutExtras(m, t % 2 ? Array.from({ length: m }, () => ({ x: 0, y: -1, s: 1.4 })) : undefined);
  assert.ok(extrasClear(ex.p, ex.s), `layout ${t}: keepsakes overlap`);
  for (const p of ex.p) assert.ok(wrapPoint(p)[1] <= FLOOR, 'keepsake on the wrap');
}
console.log(`ok: 400 bouquet layouts clear (${shrunk} needed shrinking)`);
