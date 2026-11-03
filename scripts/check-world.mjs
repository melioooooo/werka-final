// `npm run check`: proves the 2D relief never costs a flower and that its ramps work (spec v5 §2).
import { build } from 'esbuild';
import assert from 'node:assert';
import { rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const out = `${here}.check-bundle.mjs`;
await build({ stdin: { contents: `export * from '../utils/world.ts'; export * from '../constants.ts'; export * from '../types.ts'; export * as d3 from '../werka-3d/src/world/data.ts'; export { seasonOfMonth } from '../shared/season.ts'; export { SKY_KEYS, skyAt } from '../shared/sky.ts';`, resolveDir: here, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { makeWorld, computeReach, reliefCell, RELIEF_CELL, FACE_ROWS, CANVAS_WIDTH, CANVAS_HEIGHT, TRINKETS, FlowerType, d3, seasonOfMonth, SKY_KEYS, skyAt } = await import(pathToFileURL(out).href);
rmSync(out);

// The two worlds share a save, so every id one can write must mean something to the other.
assert.deepEqual(Object.keys(TRINKETS).sort(), d3.TRINKETS.map(t => t.id).sort(), 'same trinkets in 2D and 3D');
for (const t of d3.TRINKETS) assert.equal(TRINKETS[t.id].rarity ?? (t.id === 'star' ? 'rare' : 'common'), t.rarity ?? (t.rare ? 'rare' : 'common'), `${t.id}: same rarity`);
const names2d = new Set(Object.values(FlowerType));
for (const [b, v] of Object.entries(d3.BIOME_FLOWERS)) for (const f of v.types) assert.ok(names2d.has(f), `${b}: 3D flower ${f} unknown in 2D`);

assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(seasonOfMonth), ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'], 'seasons by month');
SKY_KEYS.forEach((k, i) => { if (i) assert.ok(k.t > SKY_KEYS[i - 1].t, 'sky keys in order'); });
// The day loops with no jump, and no step of the day changes the light abruptly.
let prev = { ...skyAt(0), sky: [...skyAt(0).sky] };
for (let t = 0.001; t <= 1; t += 0.001) {
  const k = skyAt(t);
  for (const c of [0, 1, 2]) assert.ok(Math.abs(k.sky[c] - prev.sky[c]) < 12, `sky jumps at t=${t.toFixed(3)}`);
  assert.ok(Math.abs(k.sunI - prev.sunI) < 0.1, `sun jumps at t=${t.toFixed(3)}`);
  prev = { ...k, sky: [...k.sky] };
}

const DATES = 150;
let plateaus = 0, topFlowers = 0, screens = 0, withRelief = 0;
const pickable = ({ reach, GW }, f) => {
  const gx = f.screenX * CANVAS_WIDTH + f.x, gy = f.screenY * CANVAS_HEIGHT + f.y;
  for (let dy = -40; dy <= 40; dy += 16) for (let dx = -40; dx <= 40; dx += 16) {
    if (Math.hypot(dx, dy) > 44) continue;
    const c = Math.floor((gx + dx) / 16), r = Math.floor((gy + dy) / 16);
    if (c >= 0 && r >= 0 && c < GW && reach[r * GW + c]) return true;
  }
  return false;
};
for (let i = 0; i < DATES; i++) {
  const d = new Date(2026, 0, 1 + i * 2).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const w = makeWorld(d), w2 = makeWorld(d);
  assert.deepEqual(w.relief, w2.relief, `${d}: relief deterministic`);
  const flat = w.relief.map(row => row.map(() => []));
  const rFlat = computeReach(w.map, w.obstacles, w.ponds, flat, w.riverY, w.bridgeX);
  const rHill = computeReach(w.map, w.obstacles, w.ponds, w.relief, w.riverY, w.bridgeX);
  for (const f of w.flowers) {
    const list = w.relief[f.screenY][f.screenX];
    assert.ok(!list.some(p => reliefCell(p, f.x, f.y) >= 2), `${d} ${f.id}: flower on a cliff or ramp`);
    if (pickable(rFlat, f)) assert.ok(pickable(rHill, f), `${d} ${f.id}: relief cut this flower off`);
    if (list.some(p => reliefCell(p, f.x, f.y) === 1)) topFlowers++;
  }
  for (const it of w.items) assert.ok(!w.relief[it.screenY][it.screenX].some(p => reliefCell(p, it.x, it.y) >= 2), `${d} ${it.id}: item on a cliff`);
  w.relief.forEach((row, sy) => row.forEach((list, sx) => {
    screens++;
    if (list.length) withRelief++;
    assert.ok(list.length <= 2, `${d}: at most 2 plateaus`);
    plateaus += list.length;
    for (const p of list) {
      // The ramp really climbs: its foot and some of the top are reachable.
      let ramp = 0, top = 0;
      for (let r = 0; r < p.rows + FACE_ROWS; r++) for (let c = 0; c < p.cols; c++) {
        const k = p.kind[r * p.cols + c];
        const gc = Math.floor((sx * CANVAS_WIDTH + p.x + c * RELIEF_CELL + 8) / 16), gr = Math.floor((sy * CANVAS_HEIGHT + p.y + r * RELIEF_CELL + 8 - 14) / 16);
        if (k === 3 && rHill.reach[gr * rHill.GW + gc]) ramp++;
        if (k === 1 && rHill.reach[gr * rHill.GW + gc]) top++;
      }
      assert.ok(top > 0, `${d} ${sx},${sy}: top of plateau unreachable (ramp cells reached: ${ramp})`);
    }
  }));
}
console.log(`ok: ${DATES} dates, ${plateaus} plateaus on ${withRelief}/${screens} screens, ${topFlowers} flowers on top, no flower cut off`);
