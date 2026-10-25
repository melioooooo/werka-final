import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { Flower } from '../types';
import { CritterSpawn, CRITTER_CAP, Pond, pondNorm, BRIDGE_WIDTH } from './world';
import { SPRITES, sprite } from './draw';
import { SoundManager } from './SoundManager';

// Ambient animals for the current screen. Purely visual: no collisions, never block pickups.
// One fixed pool of objects, reset on screen change; nothing is allocated per frame.
export const CRITTER = { BIRD: 0, FROG: 1, FISH: 2, BUTTERFLY: 3, FIREFLY: 4, RABBIT: 5, CRAB: 6, OWL: 7 } as const;
const REACT = 96; // ~3 tiles

interface Critter {
  type: number; v: number; flock: number; pond: Pond | null;
  x: number; y: number; z: number; vx: number; vy: number;
  hx: number; hy: number; // home (frogs), target (birds, butterflies, hops)
  ox: number; oy: number; // start of the current hop/flight
  state: number; t: number; dur: number; wait: number; cool: number; act: number; n: number;
  a: number; r: number; spd: number; face: number; phase: number; arc: number;
}
const blank = (): Critter => ({ type: 0, v: 0, flock: -1, pond: null, x: 0, y: 0, z: 0, vx: 0, vy: 0, hx: 0, hy: 0, ox: 0, oy: 0,
  state: 0, t: 0, dur: 0, wait: 0, cool: 0, act: 0, n: 0, a: 0, r: 0, spd: 0, face: 1, phase: 0, arc: 0 });
const pool: Critter[] = Array.from({ length: CRITTER_CAP }, blank);
let count = 0;

interface Ring { x: number; y: number; t: number }
const rings: Ring[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, t: 1e9 }));
const ring = (x: number, y: number) => {
  let r = rings[0];
  for (const q of rings) if (q.t > r.t) r = q;
  r.x = x; r.y = y; r.t = 0;
};

// Screen environment, set on load.
let gx0 = 0, hasRiver = false, bridge = -1e9;
let riverAt: (gx: number) => number = () => 0;
let dryAt: (x: number, y: number) => boolean = () => true;
let flowers: Flower[] = [];
let ponds: Pond[] = [];

const lastSfx = [0, 0, 0];
const sfx = (i: number, kind: 'FLAP' | 'RIBBIT' | 'PLOP', now: number) => {
  if (now - lastSfx[i] < 900) return; // quiet and rate-limited
  lastSfx[i] = now;
  SoundManager.getInstance().playSFX(kind);
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clampX = (x: number) => Math.max(30, Math.min(CANVAS_WIDTH - 30, x));
const clampY = (y: number) => Math.max(60, Math.min(CANVAS_HEIGHT - 30, y));

export const loadCritters = (spawns: CritterSpawn[], env: {
  sx: number; river: boolean; riverY: (gx: number) => number; bridgeX: number; ponds: Pond[]; dry: (x: number, y: number) => boolean;
}) => {
  gx0 = env.sx * CANVAS_WIDTH; hasRiver = env.river; riverAt = env.riverY; dryAt = env.dry; ponds = env.ponds; bridge = env.bridgeX;
  count = Math.min(spawns.length, CRITTER_CAP);
  for (let i = 0; i < count; i++) {
    const s = spawns[i], c = pool[i];
    Object.assign(c, blank());
    c.type = s.type; c.v = s.v; c.flock = s.flock; c.pond = s.pond;
    c.x = c.hx = s.x; c.y = c.hy = s.y;
    c.phase = (s.x * 0.13 + s.y * 0.07) % 6.28;
    c.wait = rnd(300, 2500);
    c.face = Math.random() < 0.5 ? -1 : 1;
    if (c.type === CRITTER.OWL) { c.dur = rnd(2500, 6000); c.face = 0; }
    if (c.type === CRITTER.FISH) {
      if (c.pond) { c.a = rnd(0, 6.28); c.r = rnd(0.25, 0.62); c.spd = rnd(0.00035, 0.0008) * (Math.random() < 0.5 ? -1 : 1); }
      else { c.r = s.y - env.riverY(gx0 + s.x); c.spd = rnd(0.02, 0.04) * c.face; }
    }
    if (c.type === CRITTER.FROG) { c.a = s.x; c.r = s.y; } // home on the rim
    if (c.type === CRITTER.FIREFLY) { c.vx = rnd(-0.3, 0.3); c.vy = rnd(-0.3, 0.3); }
  }
  for (const r of rings) r.t = 1e9;
};

export const setCritterFlowers = (f: Flower[]) => { flowers = f; };

// Birds of one flock leave together, in an arc, away from (px, py).
const scareFlock = (flock: number, px: number, py: number, now: number) => {
  let cx = 0, cy = 0, n = 0;
  for (let i = 0; i < count; i++) { const b = pool[i]; if (b.type === CRITTER.BIRD && b.flock === flock) { cx += b.x; cy += b.y; n++; } }
  if (!n) return;
  cx /= n; cy /= n;
  let dx = cx - px, dy = cy - py;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  let tx = cx, ty = cy;
  for (let k = 0; k < 10; k++) {
    const a = Math.atan2(dy, dx) + rnd(-0.9, 0.9), dist = rnd(240, 420);
    tx = clampX(cx + Math.cos(a) * dist); ty = clampY(cy + Math.sin(a) * dist);
    if (dryAt(tx, ty) && Math.hypot(tx - px, ty - py) > 200) break;
  }
  for (let i = 0; i < count; i++) {
    const b = pool[i];
    if (b.type !== CRITTER.BIRD || b.flock !== flock || b.state === 1) continue;
    b.state = 1; b.ox = b.x; b.oy = b.y;
    b.hx = tx + rnd(-30, 30); b.hy = ty + rnd(-16, 16);
    const len = Math.hypot(b.hx - b.x, b.hy - b.y);
    b.t = -rnd(0, 220); // they don't all take off on the same frame
    b.dur = 600 + len * 3.2;
    b.arc = 40 + len * 0.18;
    b.face = b.hx > b.x ? 1 : -1;
  }
  sfx(0, 'FLAP', now);
};

const waterPoint = (c: Critter) => {
  const p = c.pond;
  if (p) {
    const a = Math.atan2((c.y - p.y) / p.ry, (c.x - p.x) / p.rx);
    c.ox = p.x + Math.cos(a) * p.rx * 0.6; c.oy = p.y + Math.sin(a) * p.ry * 0.6;
  } else {
    const ry = riverAt(gx0 + c.x);
    c.ox = c.x + c.face * 10; c.oy = ry + (c.y < ry ? -14 : 14);
  }
};

const hopTo = (c: Critter, tx: number, ty: number, dur: number, arc: number) => {
  c.ox = c.x; c.oy = c.y; c.hx = tx; c.hy = ty; c.t = 0; c.dur = dur; c.arc = arc;
  if (Math.abs(tx - c.x) > 1) c.face = tx > c.x ? 1 : -1;
};
// Advance a hop; returns true when it lands.
const hopStep = (c: Critter, dt: number) => {
  c.t += dt;
  const u = Math.min(1, Math.max(0, c.t / c.dur));
  c.x = c.ox + (c.hx - c.ox) * u; c.y = c.oy + (c.hy - c.oy) * u;
  c.z = Math.sin(u * Math.PI) * c.arc;
  return u >= 1;
};

const pickFlower = (c: Critter, px: number, py: number, far: boolean) => {
  for (let k = 0; k < 8; k++) {
    if (flowers.length) {
      const f = flowers[Math.floor(Math.random() * flowers.length)];
      if (!far || Math.hypot(f.x - px, f.y - py) > 220) { c.hx = f.x; c.hy = f.y - 2; return; }
    } else { c.hx = rnd(60, CANVAS_WIDTH - 60); c.hy = rnd(80, CANVAS_HEIGHT - 60); return; }
  }
  c.hx = clampX(c.x + (c.x - px) * 2); c.hy = clampY(c.y + (c.y - py) * 2);
};

// Day-cycle time (0..1) -> night strength 0..1.
export const nightOf = (t: number) => (t < 0.2 || t > 0.85 ? 1 : t > 0.7 ? (t - 0.7) / 0.15 : t < 0.28 ? 1 - (t - 0.2) / 0.08 : 0);

// night: 0..1. After dark birds sleep on the ground and butterflies rest on a flower; the owl comes out.
let sleepy = false;
export const updateCritters = (dtRaw: number, px: number, py: number, now: number, night: number) => {
  const dt = Math.min(dtRaw, 50), k = dt / 16.67;
  sleepy = night > 0.5;
  for (const r of rings) r.t += dt;
  for (let i = 0; i < count; i++) {
    const c = pool[i];
    const dx = c.x - px, dy = c.y - py;
    const close = dx * dx + dy * dy < REACT * REACT;
    if (c.cool > 0) c.cool -= dt;
    switch (c.type) {
      case CRITTER.BIRD: {
        if (c.state === 1) {
          c.t += dt;
          const u = Math.min(1, Math.max(0, c.t / c.dur));
          c.x = c.ox + (c.hx - c.ox) * u; c.y = c.oy + (c.hy - c.oy) * u;
          c.z = Math.sin(u * Math.PI) * c.arc + (u < 1 && c.t > 0 ? 4 : 0);
          if (u >= 1) { c.state = 0; c.z = 0; c.wait = rnd(500, 1600); c.cool = 900; c.act = 0; }
          break;
        }
        if (close && c.cool <= 0) { scareFlock(c.flock, px, py, now); break; }
        if (c.act === 2) { if (hopStep(c, dt)) { c.act = 0; c.z = 0; } break; }
        if (c.act === 1) { c.t += dt; if (c.t > c.dur) c.act = 0; break; }
        if (sleepy) break; // asleep, head tucked in
        c.wait -= dt;
        if (c.wait <= 0) {
          c.wait = rnd(500, 2200);
          const r = Math.random();
          if (r < 0.012) scareFlock(c.flock, rnd(0, CANVAS_WIDTH), rnd(0, CANVAS_HEIGHT), now); // now and then the flock moves on by itself
          else if (r < 0.55) { c.act = 1; c.t = 0; c.dur = rnd(250, 500); }
          else {
            const tx = clampX(c.x + rnd(-14, 14)), ty = clampY(c.y + rnd(-8, 8));
            if (dryAt(tx, ty)) { c.act = 2; hopTo(c, tx, ty, 200, 5); }
          }
        }
        break;
      }
      case CRITTER.FROG: {
        if (c.state === 0) {
          if (close && c.cool <= 0) { waterPoint(c); const wx = c.ox, wy = c.oy; hopTo(c, wx, wy, 420, 16); c.state = 1; break; }
          if (c.act === 1) { c.t += dt; if (c.t > 520) c.act = 0; break; }
          c.wait -= dt;
          if (c.wait <= 0) { c.wait = rnd(3500, 9000); c.act = 1; c.t = 0; sfx(1, 'RIBBIT', now); }
        } else if (c.state === 1) {
          if (hopStep(c, dt)) { c.state = 2; c.t = 0; c.dur = rnd(3500, 7000); ring(c.x, c.y); sfx(2, 'PLOP', now); }
        } else if (c.state === 2) {
          c.t += dt;
          if (c.t > c.dur && Math.hypot(c.a - px, c.r - py) > 150) { hopTo(c, c.a, c.r, 460, 14); c.state = 3; ring(c.x, c.y); }
        } else if (hopStep(c, dt)) { c.state = 0; c.z = 0; c.wait = rnd(1500, 4000); c.cool = 600; }
        break;
      }
      case CRITTER.FISH: {
        if (close && c.cool <= 0 && c.state === 0) {
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          c.state = 1; c.t = 0; c.vx = (dx / d) * 3.6; c.vy = (dy / d) * (c.pond ? 2.6 : 0.8);
          if (!c.pond && Math.abs(c.vx) < 1.5) c.vx = (dx >= 0 ? 1 : -1) * 3.6;
        }
        if (c.state === 1) {
          c.t += dt;
          c.x += c.vx * k; c.y += c.vy * k;
          c.vx *= Math.pow(0.95, k); c.vy *= Math.pow(0.95, k);
          if (Math.abs(c.vx) > 0.2) c.face = c.vx > 0 ? 1 : -1;
          if (c.t > 1100) {
            c.state = 0; c.cool = 1500;
            if (c.pond) { const p = c.pond; c.a = Math.atan2((c.y - p.y) / p.ry, (c.x - p.x) / p.rx); c.r = Math.max(0.25, Math.min(0.68, pondNorm(p, c.x, c.y))); }
            else { c.spd = Math.abs(c.spd) * c.face; c.r = c.y - riverAt(gx0 + c.x); }
          }
        } else if (c.pond) {
          const p = c.pond;
          c.a += c.spd * dt;
          const tx = p.x + Math.cos(c.a) * p.rx * c.r, ty = p.y + Math.sin(c.a) * p.ry * c.r;
          const mx = (tx - c.x) * 0.08 * k;
          c.x += mx; c.y += (ty - c.y) * 0.08 * k;
          if (Math.abs(mx) > 0.05) c.face = mx > 0 ? 1 : -1;
        } else {
          c.x += c.spd * dt;
          if (c.x > CANVAS_WIDTH + 30) c.x = -30; else if (c.x < -30) c.x = CANVAS_WIDTH + 30;
          const ty = riverAt(gx0 + c.x) + c.r + Math.sin(now / 900 + c.phase) * 4;
          c.y += (ty - c.y) * 0.1 * k;
          c.face = c.spd > 0 ? 1 : -1;
        }
        // stay in the water
        if (c.pond) {
          const n = pondNorm(c.pond, c.x, c.y);
          if (n > 0.78) { const s = 0.78 / n; c.x = c.pond.x + (c.x - c.pond.x) * s; c.y = c.pond.y + (c.y - c.pond.y) * s; }
        } else if (hasRiver) {
          const ry = riverAt(gx0 + c.x);
          if (c.y < ry - 24) c.y = ry - 24; else if (c.y > ry + 24) c.y = ry + 24;
        }
        break;
      }
      case CRITTER.BUTTERFLY: {
        if (!sleepy && (c.state === 0 || c.state === 1) && close && c.cool <= 0) { c.state = 2; c.t = 0; c.a = Math.atan2(dy, dx); break; }
        if (c.state === 2) {
          c.t += dt;
          c.a += 0.0042 * dt;
          const tx = px + Math.cos(c.a) * 36, ty = py - 6 + Math.sin(c.a) * 20;
          c.face = tx > c.x ? 1 : -1;
          c.x += (tx - c.x) * 0.12 * k; c.y += (ty - c.y) * 0.12 * k;
          c.z += (30 + Math.sin(now / 200 + c.phase) * 6 - c.z) * 0.1 * k;
          if (c.t > 2600) { c.state = 0; c.cool = 7000; pickFlower(c, px, py, true); }
          break;
        }
        if (c.state === 1) {
          c.wait -= dt;
          c.z += (12 - c.z) * 0.2 * k;
          if (c.wait <= 0 && !sleepy) { c.state = 0; pickFlower(c, px, py, false); }
          break;
        }
        const tx = c.hx - c.x, ty = c.hy - c.y, d = Math.hypot(tx, ty);
        if (d < 5) { c.state = 1; c.wait = rnd(1500, 4500); break; }
        const sp = 0.9 * k;
        const wob = Math.sin(now / 170 + c.phase) * 0.7 * k;
        c.x += (tx / d) * sp - (ty / d) * wob; c.y += (ty / d) * sp + (tx / d) * wob;
        c.z += (20 + Math.sin(now / 260 + c.phase) * 7 - c.z) * 0.1 * k;
        c.face = tx > 0 ? 1 : -1;
        break;
      }
      case CRITTER.FIREFLY: {
        c.vx += (Math.random() - 0.5) * 0.04 * k; c.vy += (Math.random() - 0.5) * 0.04 * k;
        const d2 = dx * dx + dy * dy;
        if (d2 < 170 * 170 && d2 > 28 * 28) { const d = Math.sqrt(d2); c.vx -= (dx / d) * 0.012 * k; c.vy -= (dy / d) * 0.012 * k; } // curious: drift toward Werka
        const v = Math.hypot(c.vx, c.vy);
        if (v > 0.45) { c.vx *= 0.45 / v; c.vy *= 0.45 / v; }
        c.x += c.vx * k; c.y += c.vy * k;
        if (c.x < 20 || c.x > CANVAS_WIDTH - 20) c.vx = -c.vx;
        if (c.y < 40 || c.y > CANVAS_HEIGHT - 20) c.vy = -c.vy;
        break;
      }
      case CRITTER.OWL: {
        // turns its head toward Werka when she is near, otherwise looks around; blinks now and then
        if (dx * dx + dy * dy < 220 * 220) c.face = Math.abs(dx) < 24 ? 0 : dx < 0 ? 1 : -1;
        else { c.wait -= dt; if (c.wait <= 0) { c.wait = rnd(1500, 4000); c.face = Math.floor(Math.random() * 3) - 1; } }
        c.t += dt;
        if (c.t > c.dur) { c.t = 0; c.dur = rnd(2500, 6000); }
        break;
      }
      case CRITTER.RABBIT:
      case CRITTER.CRAB: {
        const crab = c.type === CRITTER.CRAB;
        if (c.state === 1) {
          if (hopStep(c, dt)) {
            c.z = 0;
            if (--c.n > 0) {
              // keep fleeing in the same direction, turning if blocked
              let ang = Math.atan2(c.hy - c.oy, c.hx - c.ox);
              const step = crab ? 26 : 36;
              for (let t = 0; t < 6; t++) {
                const tx = clampX(c.x + Math.cos(ang) * step), ty = clampY(c.y + Math.sin(ang) * step * (crab ? 0.3 : 1));
                if (dryAt(tx, ty)) { hopTo(c, tx, ty, crab ? 140 : 230, crab ? 0 : 9); break; }
                ang += t % 2 ? 0.9 * t : -0.9 * t;
              }
              if (c.t !== 0) { c.state = 0; c.n = 0; }
            } else { c.state = 0; c.wait = rnd(1200, 3000); }
          }
          break;
        }
        if (close && c.cool <= 0) {
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const step = crab ? 26 : 36;
          const tx = clampX(c.x + (dx / d) * step), ty = clampY(c.y + (dy / d) * step * (crab ? 0.3 : 1));
          hopTo(c, dryAt(tx, ty) ? tx : c.x, dryAt(tx, ty) ? ty : c.y, crab ? 140 : 230, crab ? 0 : 9);
          c.state = 1; c.n = crab ? 4 : 4; c.cool = 1800;
          break;
        }
        if (c.act === 1) { c.t += dt; if (c.t > 400) c.act = 0; }
        c.wait -= dt;
        if (c.wait <= 0) {
          c.wait = rnd(1500, 4000);
          const tx = clampX(c.x + rnd(-18, 18)), ty = clampY(c.y + (crab ? rnd(-3, 3) : rnd(-12, 12)));
          if (Math.random() < 0.5 && dryAt(tx, ty)) { hopTo(c, tx, ty, crab ? 500 : 240, crab ? 0 : 6); c.state = 1; c.n = 1; }
          else { c.act = 1; c.t = 0; } // ear twitch / claw wave
        }
        break;
      }
    }
  }
};

// --- Drawing ---
// Sprites at 2x like the trinkets; variants are palette swaps. Canvases resolved once, then indexed (no lookups by string per frame).
SPRITES.c_bird0 = { pal: { o: '#3b2a20', B: '#a0704a', b: '#ead7b7', w: '#6b4a33', e: '#111111', k: '#f59e0b', l: '#78350f' }, rows: [
  '......oo..', '.....oBeok', '.oooooBBo.', 'oBwwwBBbo.', '.owwwbbbo.', '..oobbbo..', '....l.l...'] };
SPRITES.c_bird1 = { pal: SPRITES.c_bird0.pal, rows: [ // peck
  '..........', '.oooo.....', 'oBwwwoo...', '.owwwBBoo.', '..oobbBeok', '....l.l...'] };
SPRITES.c_bird2 = { pal: SPRITES.c_bird0.pal, rows: [ // wings up
  '..o...o...', '.owo.owo..', '..owowo.oo', '..oBBBBBek', '...obbbo..', '....ooo...'] };
SPRITES.c_bird3 = { pal: SPRITES.c_bird0.pal, rows: [ // wings down
  '......oo..', '..ooooBeok', '.oBBBBBo..', 'owwbbbo...', '.ow.ooo...', '..o.......'] };
SPRITES.c_bird4 = { pal: SPRITES.c_bird0.pal, rows: [ // asleep, fluffed up
  '..........', '.....ooo..', '.ooooBBBo.', 'oBwwwBBBbo', '.owwwbbbbo', '..oobbbbo.', '...ooooo..'] };
const OWL_PAL = { o: '#2b1d12', F: '#7a5a3c', f: '#5a4029', W: '#f1e4c6', e: '#111111', y: '#facc15', k: '#f59e0b', b: '#cdb48c' };
const owlRows = (eyes: string) => ['o.......o', 'oo.ooo.oo', 'oFoFFFoFo', 'oWyWFWyWo', eyes, 'oFWWkWWFo', 'oFfbkbfFo', '.oFbfbFo.', '.oFbbbFo.', '..ofbfo..', '..okoko..'];
// 0 front, 1 looking left, 2 looking right, 3 blink
['oWeWFWeWo', 'oeWWFeWWo', 'oWWeFWWeo', 'oFFFFFFFo'].forEach((e, i) => { SPRITES[`c_owl${i}`] = { pal: OWL_PAL, rows: owlRows(e) }; });
SPRITES.c_frog0 = { pal: { o: '#1a2e05', G: '#65a30d', g: '#3f6212', t: '#d9f99d', W: '#ffffff', e: '#111111' }, rows: [
  '.oo....oo.', 'oWeo..oeWo', 'oGGGooGGGo', 'oGGGGGGGGo', 'ogGttttGgo', 'oGGGooGGGo', '.oo.oo.oo.'] };
SPRITES.c_frog1 = { pal: SPRITES.c_frog0.pal, rows: [ // throat puffed
  '.oo....oo.', 'oWeo..oeWo', 'oGGGooGGGo', 'oGGttttGGo', 'ogttttttgo', 'oGGttttGGo', '.oo.oo.oo.'] };
SPRITES.c_frog2 = { pal: SPRITES.c_frog0.pal, rows: [ // leap
  '.oo....oo.', 'oWeo..oeWo', 'oGGGGGGGGo', '.oGttttGo.', '..oGGGGo..', '.oGo..oGo.', 'oGo....oGo', 'oo......oo'] };
SPRITES.c_eyes = { pal: SPRITES.c_frog0.pal, rows: ['.oo....oo.', 'oWeo..oeWo', '.oGGGGGGo.'] };
SPRITES.c_fish = { pal: { o: '#c2410c', F: '#fb923c', e: '#1f2937', w: '#fff7ed' }, rows: [
  '...ooo...', '.oFwFFo.o', 'oFeFFFFoo', '.oFFwFo.o', '...ooo...'] };
SPRITES.c_fly0 = { pal: { o: '#9d174d', W: '#f9a8d4', w: '#fdf2f8', b: '#3f2a1d' }, rows: [
  'oo...oo', 'oWWoWWo', 'oWwbwWo', '.oWbWo.', '..o.o..'] };
SPRITES.c_fly1 = { pal: SPRITES.c_fly0.pal, rows: ['..o.o..', '.oWbWo.', '.oWbWo.', '..obo..', '...o...'] };
SPRITES.c_rab0 = { pal: { o: '#44352a', W: '#d6c3ad', w: '#ffffff', e: '#111111', p: '#f9a8d4' }, rows: [
  '......oo.', '.....oWo.', '.....oWoo', '..oooWWeo', '.oWWWWWWp', 'owWWWWWWo', 'owWWWWWo.', '.ooooooo.'] };
SPRITES.c_rab1 = { pal: SPRITES.c_rab0.pal, rows: [ // mid-hop
  '.......oo', '......oWo', '..ooooWWeo', '.owWWWWWWp', 'owWWWWWWo.', '.oo...oo..'] };
SPRITES.c_crab0 = { pal: { o: '#9a3412', R: '#f97316', r: '#fdba74', e: '#111111' }, rows: [
  'oo.....oo', 'oRo.e.oRo', '.oRReRRo.', 'oRrRRRrRo', '.o.o.o.o.'] };
SPRITES.c_crab1 = { pal: SPRITES.c_crab0.pal, rows: ['.oo...oo.', 'oRo.e.oRo', '.oRReRRo.', 'oRrRRRrRo', 'o.o.o.o.o'] };

const VARIANTS: Record<string, Record<string, string>[]> = {
  bird: [{}, { B: '#60a5fa', w: '#2563eb', b: '#dbeafe' }, { B: '#78716c', w: '#44403c', b: '#f87171' }],
  fly: [{}, { o: '#a16207', W: '#fde047', w: '#fefce8' }, { o: '#1d4ed8', W: '#93c5fd', w: '#eff6ff' }],
  fish: [{}, { F: '#fff7ed', w: '#fb923c', o: '#9a3412' }, { F: '#94a3b8', w: '#e2e8f0', o: '#475569' }],
  rab: [{}, { W: '#a8754f', o: '#3b2414' }, { W: '#e7e5e4', o: '#57534e' }],
};
const IMG: Record<string, HTMLCanvasElement[]> = {}; // name -> [variant*2 + flip]
const img = (name: string, fam: string, v: number, flip: number) => {
  let arr = IMG[name];
  if (!arr) {
    arr = IMG[name] = [];
    const vs = VARIANTS[fam] ?? [{}];
    for (let i = 0; i < 3; i++) for (let f = 0; f < 2; f++) arr.push(sprite(name, 2, vs[i % vs.length], f === 1));
  }
  return arr[(v % 3) * 2 + flip];
};
const blit = (ctx: CanvasRenderingContext2D, im: HTMLCanvasElement, x: number, y: number) =>
  ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height));
const shadow = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) => {
  ctx.fillRect(Math.round(x - rx), Math.round(y - 1), rx * 2, 2);
};

let glow: HTMLCanvasElement | null = null;
const getGlow = () => {
  if (glow) return glow;
  glow = document.createElement('canvas');
  glow.width = glow.height = 24;
  const g2 = glow.getContext('2d')!;
  const g = g2.createRadialGradient(12, 12, 1, 12, 12, 12);
  g.addColorStop(0, 'rgba(234,250,140,0.9)');
  g.addColorStop(1, 'rgba(234,250,140,0)');
  g2.fillStyle = g;
  g2.fillRect(0, 0, 24, 24);
  return glow;
};

// View rectangle for culling (in screen coordinates).
let vx0 = 0, vy0 = 0, vx1 = CANVAS_WIDTH, vy1 = CANVAS_HEIGHT;
export const setCritterView = (x: number, y: number, w: number, h: number) => { vx0 = x - 40; vy0 = y - 60; vx1 = x + w + 40; vy1 = y + h + 40; };
const seen = (c: Critter) => c.x > vx0 && c.x < vx1 && c.y > vy0 && c.y < vy1;

// Under everything: fish, splash rings, frog eyes peeking out of the water.
export const drawCrittersWater = (ctx: CanvasRenderingContext2D, now: number) => {
  for (let i = 0; i < count; i++) {
    const c = pool[i];
    if (!seen(c)) continue;
    if (c.type === CRITTER.FISH) {
      if (!c.pond && Math.abs(c.x - bridge) < BRIDGE_WIDTH / 2 + 8) continue; // under the bridge
      ctx.globalAlpha = 0.6;
      const im = img('c_fish', 'fish', c.pond ? c.v : 2, c.face > 0 ? 1 : 0);
      const wig = c.state === 1 ? Math.round(Math.sin(now / 40)) : 0;
      ctx.drawImage(im, Math.round(c.x - im.width / 2) + wig, Math.round(c.y - im.height / 2));
      ctx.globalAlpha = 1;
    } else if (c.type === CRITTER.FROG && c.state === 2 && c.t > 1600) {
      blit(ctx, img('c_eyes', 'frog', 0, 0), c.x, c.y + 3 + Math.round(Math.sin(now / 500) * 1));
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  for (const r of rings) {
    if (r.t > 900) continue;
    const u = r.t / 900;
    ctx.globalAlpha = 1 - u;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, 4 + u * 20, 2 + u * 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (u < 0.4) { ctx.fillStyle = '#e0f2fe'; ctx.fillRect(Math.round(r.x - 6 + u * 4), Math.round(r.y - 8 - u * 20), 2, 2); ctx.fillRect(Math.round(r.x + 4 - u * 4), Math.round(r.y - 6 - u * 16), 2, 2); }
  }
  ctx.globalAlpha = 1;
  // a few glints drifting on each pond
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < ponds.length; i++) {
    const p = ponds[i];
    for (let j = 0; j < 3; j++) {
      const u = (now / 2400 + j / 3 + i * 0.37) % 1;
      if (u > 0.6) continue;
      const a = j * 2.1 + i;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * p.rx * 0.45 + u * 10), Math.round(p.y + Math.sin(a) * p.ry * 0.45), 4 + Math.round(Math.sin(u * Math.PI) * 4), 2);
    }
  }
};

// Ground critters go through the depth-sorted list: add(y, critter).
export const addGroundCritters = (add: (y: number, k: number, o: any) => void, k: number) => {
  for (let i = 0; i < count; i++) {
    const c = pool[i];
    if (!seen(c)) continue;
    if ((c.type === CRITTER.BIRD && c.state !== 1) || (c.type === CRITTER.FROG && c.state !== 2) || c.type === CRITTER.RABBIT || c.type === CRITTER.CRAB) add(c.y, k, c);
  }
};

export const drawGroundCritter = (ctx: CanvasRenderingContext2D, c: Critter, now: number) => {
  const f = c.face > 0 ? 0 : 1; // bird/rabbit sprites face right
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  switch (c.type) {
    case CRITTER.BIRD:
      shadow(ctx, c.x, c.y, 5);
      blit(ctx, img(sleepy && c.act === 0 ? 'c_bird4' : c.act === 1 && c.t > c.dur * 0.2 && c.t < c.dur * 0.8 ? 'c_bird1' : 'c_bird0', 'bird', c.v, f), c.x, c.y - c.z);
      break;
    case CRITTER.FROG: {
      shadow(ctx, c.x, c.y, 8);
      const name = c.state !== 0 ? 'c_frog2' : c.act === 1 && Math.floor(c.t / 130) % 2 === 0 ? 'c_frog1' : 'c_frog0';
      blit(ctx, img(name, 'frog', 0, 0), c.x, c.y - c.z);
      break;
    }
    case CRITTER.RABBIT:
      shadow(ctx, c.x, c.y, 8);
      blit(ctx, img(c.z > 1 ? 'c_rab1' : 'c_rab0', 'rab', c.v, f), c.x, c.y - c.z - (c.act === 1 && Math.floor(c.t / 100) % 2 ? 1 : 0));
      break;
    case CRITTER.CRAB: {
      shadow(ctx, c.x, c.y, 8);
      const moving = c.state === 1;
      blit(ctx, img(moving && Math.floor(now / 90) % 2 ? 'c_crab1' : 'c_crab0', 'crab', 0, 0), c.x, c.y - (c.act === 1 ? Math.floor(c.t / 100) % 2 : 0));
      break;
    }
  }
};

// Over everything: birds in flight, butterflies.
export const drawCrittersAir = (ctx: CanvasRenderingContext2D, now: number) => {
  for (let i = 0; i < count; i++) {
    const c = pool[i];
    if (!seen(c)) continue;
    if (c.type === CRITTER.BIRD && c.state === 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      shadow(ctx, c.x, c.y, 4);
      const up = c.t < 0 ? 0 : Math.floor((now + c.phase * 100) / 90) % 2;
      blit(ctx, img(c.t < 0 ? 'c_bird0' : up ? 'c_bird2' : 'c_bird3', 'bird', c.v, c.face > 0 ? 0 : 1), c.x, c.y - c.z);
    } else if (c.type === CRITTER.BUTTERFLY) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      shadow(ctx, c.x, c.y, 3);
      const open = sleepy && c.state === 1 ? 0 : Math.floor((now + c.phase * 100) / (c.state === 1 ? 420 : 110)) % 2;
      blit(ctx, img(open ? 'c_fly0' : 'c_fly1', 'fly', c.v, 0), c.x, c.y - c.z);
    }
  }
};

// Drawn after the night tint so they actually glow.
export const drawFireflies = (ctx: CanvasRenderingContext2D, now: number, night: number) => {
  if (night <= 0.02) return;
  for (let i = 0; i < count; i++) {
    const c = pool[i];
    if (c.type === CRITTER.OWL && night > 0.3 && seen(c)) {
      // drawn over the night tint but dimmed, so its yellow eyes stand out in the dark
      ctx.globalAlpha = Math.min(1, (night - 0.3) / 0.4) * 0.85;
      const f = c.t > c.dur - 160 ? 3 : c.face === 0 ? 0 : c.face > 0 ? 1 : 2;
      blit(ctx, img(`c_owl${f}`, 'owl', 0, 0), c.x, c.y);
      ctx.globalAlpha = 1;
      continue;
    }
    if (c.type === CRITTER.FIREFLY && seen(c)) {
      const b = Math.sin(now / 520 + c.phase * 3);
      const a = night * (b > 0 ? 0.35 + b * 0.65 : 0.12);
      ctx.globalAlpha = a;
      ctx.drawImage(getGlow(), Math.round(c.x - 12), Math.round(c.y - 12));
      ctx.fillStyle = '#f7fee7';
      ctx.fillRect(Math.round(c.x - 1), Math.round(c.y - 1), 2, 2);
      ctx.globalAlpha = 1;
    }
  }
};

// Headless test hook.
export const critterDebug = () => pool.slice(0, count).map(c => ({ type: c.type, x: Math.round(c.x), y: Math.round(c.y), state: c.state, z: Math.round(c.z) }));
