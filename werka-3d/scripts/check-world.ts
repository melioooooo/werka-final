// Run: npm run check. Fails loudly if world generation stops being deterministic or sane.
import assert from 'node:assert/strict';
import { generateWorld, heightAt, blocked, HOUSE, SPAWN, WATER_FLOWERS } from '../src/world/generate.ts';

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

console.log(`ok: ${a.flowers.length} flowers (${a.flowers.filter(f => WATER_FLOWERS.has(f.type)).length} on water), ${a.ponds.length} ponds, ${a.landmarks.length} landmarks, ${a.trees.length} trees, ${a.rocks.length} rocks, biomes ${a.biomes.flat().join(' ')}`);
