// Living biomes (spec v4 §4): birds, frogs, fish and butterflies that react when Werka comes near.
// Purely visual (no collisions). One InstancedMesh per part, a fixed pool, nothing allocated per frame,
// and only critters near Werka are animated (the rest are parked out of sight).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type World, HALF, EDGE, WATER_Y, walkY, blocked, inWater } from '../world/generate.ts';
import type { Critter } from '../world/critters.ts';
import { toon, outline } from './toon.ts';

type Part = [THREE.BufferGeometry, string];
function model(parts: Part[]) {
  const col = new THREE.Color();
  return mergeGeometries(parts.map(([g, c]) => {
    const p = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
    col.set(c);
    const n = p.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3);
    p.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return p;
  }))!;
}
const S = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);

// All models face +z, origin on the ground (birds, frogs) or the water (fish).
const BIRD = model([
  [S(0.15).scale(1, 0.85, 1.45).translate(0, 0.17, 0), '#ffffff'],
  [S(0.11).scale(0.9, 0.8, 1.2).translate(0, 0.13, 0.05), '#f3e6d0'],
  [S(0.1).translate(0, 0.29, 0.17), '#ffffff'],
  [new THREE.ConeGeometry(0.035, 0.11, 5).rotateX(Math.PI / 2).translate(0, 0.28, 0.3), '#f59e0b'],
  [new THREE.BoxGeometry(0.12, 0.03, 0.18).rotateX(-0.5).translate(0, 0.22, -0.24), '#ffffff'],
  [S(0.022, 5, 4).translate(0.07, 0.31, 0.24), '#1b1b1b'], [S(0.022, 5, 4).translate(-0.07, 0.31, 0.24), '#1b1b1b'],
  [new THREE.CylinderGeometry(0.012, 0.012, 0.09, 3).translate(0.05, 0.045, 0), '#d97706'], [new THREE.CylinderGeometry(0.012, 0.012, 0.09, 3).translate(-0.05, 0.045, 0), '#d97706'],
]);
const WING = model([[S(0.11, 6, 4).scale(1.5, 0.14, 0.85).translate(0.15, 0, -0.02), '#ffffff']]);
const FROG = model([
  [S(0.17).scale(1.1, 0.68, 1.2).translate(0, 0.11, 0), '#6fb24f'],
  [S(0.13).scale(1, 0.5, 1).translate(0, 0.07, 0.07), '#d9e8a6'],
  ...[-1, 1].flatMap((s): Part[] => [
    [S(0.055).translate(s * 0.08, 0.21, 0.12), '#7cc35a'], [S(0.04).translate(s * 0.085, 0.235, 0.15), '#fff9e6'], [S(0.022, 5, 4).translate(s * 0.088, 0.24, 0.185), '#1b1b1b'],
    [S(0.08).scale(0.8, 0.55, 1.5).translate(s * 0.16, 0.06, -0.08), '#5a9e42'],
    [S(0.04).scale(1, 0.5, 1.4).translate(s * 0.11, 0.02, 0.17), '#5a9e42'],
  ]),
]);
const FISH = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.45); s.quadraticCurveTo(0.17, 0.2, 0.1, -0.15); s.lineTo(0.2, -0.45); s.lineTo(0, -0.32); s.lineTo(-0.2, -0.45); s.lineTo(-0.1, -0.15); s.quadraticCurveTo(-0.17, 0.2, 0, 0.45);
  return new THREE.ShapeGeometry(s, 6).rotateX(-Math.PI / 2).scale(1, 1, -1);
})();
const FLY_WING = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.01, 0.02); s.bezierCurveTo(0.12, 0.22, 0.3, 0.2, 0.26, 0.04); s.bezierCurveTo(0.24, -0.02, 0.2, -0.04, 0.16, -0.05);
  s.bezierCurveTo(0.2, -0.16, 0.08, -0.2, 0.01, -0.04);
  return model([[new THREE.ShapeGeometry(s, 5).rotateX(-Math.PI / 2), '#ffffff'], [new THREE.CircleGeometry(0.035, 6).rotateX(-Math.PI / 2).translate(0.17, 0.002, -0.07), '#3b2a52']]);
})();
const FLY_BODY = model([[new THREE.CapsuleGeometry(0.018, 0.13, 2, 5).rotateX(Math.PI / 2), '#3b2a52']]);

const BIRD_TINTS = ['#e8a26e', '#8fc1f0', '#f4d58a', '#f08a6a', '#f2f2ee'];
const FLY_TINTS = ['#f9a8d4', '#fde047', '#a78bfa', '#7dd3fc', '#fdba74', '#f0abfc'];

type Sfx = { flap: () => void; ribbit: () => void; plop: () => void };
type Bird = { c: Critter; x: number; y: number; z: number; h: number; st: 'ground' | 'fly'; t: number; dur: number; fx: number; fz: number; tx: number; tz: number; hop: number; peck: number; ox: number; oz: number };
type Frog = { c: Critter; x: number; y: number; z: number; h: number; st: 'sit' | 'dive' | 'under' | 'back'; t: number; croak: number };
type Fish = { c: Critter; a: number; fast: number; x: number; z: number; h: number };
type Fly = { c: Critter; x: number; y: number; z: number; h: number; tgt: number; perch: number; mode: 'wander' | 'circle' | 'leave'; t: number; cool: number };

const REACT = 6; // spec: within ~6 units
const K = 2.1; // drawn larger than life so they read from the high camera
const NEAR = 70; // animate only within this distance of Werka

export function buildCritters(w: World, list: Critter[], sfx: Sfx) {
  const group = new THREE.Group();
  const mat = toon({ vertexColors: true, rim: 0.45, side: THREE.DoubleSide });
  const line = outline('#1f2a2c', 0.022);
  const inst = (geo: THREE.BufferGeometry, m: THREE.Material, n: number, hull = false) => {
    const mesh = new THREE.InstancedMesh(geo, m, Math.max(1, n));
    mesh.count = n;
    mesh.frustumCulled = false; // instances move; the pool is small
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    if (hull) {
      const h = new THREE.InstancedMesh(geo, line, Math.max(1, n));
      h.instanceMatrix = mesh.instanceMatrix; h.count = n; h.frustumCulled = false;
      group.add(h);
    }
    return mesh;
  };
  const birds: Bird[] = [], frogs: Frog[] = [], fish: Fish[] = [], flies: Fly[] = [];
  for (const c of list) {
    const y = walkY(w, c.x, c.z);
    if (c.kind === 'bird') birds.push({ c, x: c.x, y, z: c.z, h: c.ph, st: 'ground', t: 0, dur: 1, fx: 0, fz: 0, tx: c.x, tz: c.z, hop: c.ph % 2, peck: 0, ox: 0, oz: 0 });
    else if (c.kind === 'frog') frogs.push({ c, x: c.x, y, z: c.z, h: Math.atan2(c.wx! - c.x, c.wz! - c.z) + Math.PI, st: 'sit', t: 0, croak: 3 + c.ph });
    else if (c.kind === 'fish') fish.push({ c, a: c.ph, fast: 0, x: c.x, z: c.z, h: 0 });
    else flies.push({ c, x: c.x, y: y + 0.8, z: c.z, h: 0, tgt: 0, perch: 0, mode: 'wander', t: 0, cool: 0 });
  }
  // Flock offsets from their centre, so a landing flock keeps its shape.
  const flockC = new Map<number, { x: number; z: number }>();
  for (const b of birds) {
    const f = flockC.get(b.c.flock!) ?? flockC.set(b.c.flock!, { x: 0, z: 0 }).get(b.c.flock!)!;
    f.x += b.x; f.z += b.z;
  }
  for (const [id, f] of flockC) { const n = birds.filter(b => b.c.flock === id).length; f.x /= n; f.z /= n; }
  for (const b of birds) { const f = flockC.get(b.c.flock!)!; b.ox = b.x - f.x; b.oz = b.z - f.z; }

  const birdM = inst(BIRD, mat, birds.length, true), wingM = inst(WING, mat, birds.length * 2);
  const frogM = inst(FROG, mat, frogs.length, true);
  const fishM = inst(FISH, new THREE.MeshBasicMaterial({ color: '#0b2a36', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), fish.length);
  fishM.renderOrder = 2; // over the water surface
  const flyM = inst(FLY_WING, mat, flies.length * 2, true), flyB = inst(FLY_BODY, mat, flies.length);
  // Contact shadows on the ground under birds and butterflies: they stay down when a bird takes off.
  const shadowM = inst(new THREE.CircleGeometry(0.28, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#1c3340', transparent: true, opacity: 0.3, depthWrite: false }), birds.length + flies.length);
  shadowM.renderOrder = 1;
  const RINGS = 6;
  const ringM = inst(new THREE.RingGeometry(0.28, 0.4, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), RINGS);
  ringM.renderOrder = 3;
  const rings = Array.from({ length: RINGS }, (_, i) => { ringM.setColorAt(i, new THREE.Color(0)); return { x: 0, z: 0, t: 9 }; });
  let nextRing = 0;
  const splash = (x: number, z: number) => { const r = rings[nextRing++ % RINGS]; r.x = x; r.z = z; r.t = 0; };

  const col = new THREE.Color();
  birds.forEach((b, i) => { col.set(BIRD_TINTS[Math.floor(b.c.ph * 7) % BIRD_TINTS.length]); birdM.setColorAt(i, col); wingM.setColorAt(i * 2, col.multiplyScalar(0.8)); wingM.setColorAt(i * 2 + 1, col); });
  flies.forEach((f, i) => { col.set(FLY_TINTS[Math.floor(f.c.ph * 7) % FLY_TINTS.length]); flyM.setColorAt(i * 2, col); flyM.setColorAt(i * 2 + 1, col); flyB.setColorAt(i, col.set('#ffffff')); });
  for (const m of [birdM, wingM, flyM, flyB]) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const put = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, yaw: number, pitch = 0, roll = 0, sx = 1, sy = 1, sz = 1) => {
    q.setFromEuler(e.set(pitch, yaw, roll, 'YXZ'));
    mesh.setMatrixAt(i, m4.compose(p.set(x, y, z), q, s.set(sx, sy, sz)));
  };
  const lim = HALF - EDGE.slow;
  const landOk = (x: number, z: number) => Math.abs(x) < lim && Math.abs(z) < lim && !blocked(w, x, z, 0.5) && !inWater(w, x, z) && Math.hypot(x, z) > 11;
  let flapAt = -9, ribbitAt = -9, plopAt = -9;
  const ease = (t: number) => t * t * (3 - 2 * t);

  const update = (dt: number, time: number, me: THREE.Vector3, day: number) => {
    const night = day < 0.3;
    // --- birds: whole flock bursts up when Werka comes close, lands again farther away.
    const fleeing = new Set<number>();
    for (const b of birds) if (b.st === 'ground' && Math.hypot(b.x - me.x, b.z - me.z) < REACT) fleeing.add(b.c.flock!);
    for (const id of fleeing) {
      const f = flockC.get(id)!;
      let ax = f.x - me.x, az = f.z - me.z;
      const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
      // Land 14-22 units away from Werka, turning a little until the spot is open ground.
      for (let k = 0; k < 12; k++) {
        const a = Math.atan2(ax, az) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45, d = 14 + ((time * 7 + k) % 8);
        const x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d;
        if (landOk(x, z)) { f.x = x; f.z = z; break; }
      }
      if (time - flapAt > 1) { flapAt = time; sfx.flap(); }
      birds.forEach(b => {
        if (b.c.flock !== id || b.st !== 'ground') return;
        b.st = 'fly'; b.t = -((b.c.ph * 13) % 1) * 0.3; b.fx = b.x; b.fz = b.z;
        b.tx = landOk(f.x + b.ox, f.z + b.oz) ? f.x + b.ox : f.x; b.tz = landOk(f.x + b.ox, f.z + b.oz) ? f.z + b.oz : f.z;
        b.dur = 2.6 + Math.hypot(b.tx - b.fx, b.tz - b.fz) * 0.05;
      });
    }
    birds.forEach((b, i) => {
      if (Math.abs(b.x - me.x) > NEAR || Math.abs(b.z - me.z) > NEAR) { birdM.setMatrixAt(i, ZERO); shadowM.setMatrixAt(i, ZERO); wingM.setMatrixAt(i * 2, ZERO); wingM.setMatrixAt(i * 2 + 1, ZERO); return; }
      let pitch = 0, flap = 0, lift = 0;
      if (b.st === 'fly') {
        b.t += dt;
        const k = Math.min(1, Math.max(0, b.t / b.dur)), e2 = ease(k);
        b.x = b.fx + (b.tx - b.fx) * e2; b.z = b.fz + (b.tz - b.fz) * e2;
        const g = walkY(w, b.x, b.z);
        lift = Math.sin(k * Math.PI) * 4 + Math.min(1, k * 4) * 1.5 * (1 - k); // pops up fast, glides down
        b.y = g + lift;
        b.h = Math.atan2(b.tx - b.fx, b.tz - b.fz);
        pitch = (0.5 - k) * 0.5;
        flap = Math.sin(time * 34 + b.c.ph) * 1.1;
        if (k >= 1) { b.st = 'ground'; b.hop = 0.5; }
      } else {
        // Ground: little hops, pecks, look around.
        b.hop -= dt;
        if (b.hop < 0 && !night) {
          b.hop = 0.8 + ((b.c.ph * 31 + time) % 2.2);
          b.h += Math.sin(time * 3.1 + b.c.ph) * 1.2;
          const nx = b.x + Math.sin(b.h) * 0.25, nz = b.z + Math.cos(b.h) * 0.25;
          if (landOk(nx, nz)) { b.x = nx; b.z = nz; }
          b.peck = (b.c.ph + time) % 3 < 1.2 ? 0.6 : 0;
          b.t = 0.18; // hop airtime
        }
        b.t = Math.max(0, b.t - dt);
        b.y = walkY(w, b.x, b.z) + Math.sin((b.t / 0.18) * Math.PI) * 0.12;
        b.peck = Math.max(0, b.peck - dt);
        pitch = b.peck > 0 ? Math.max(0, Math.sin(b.peck * 22)) * 0.6 : 0;
        flap = -1.3; // folded
      }
      put(birdM, i, b.x, b.y, b.z, b.h, pitch, 0, K, K, K);
      const gy = walkY(w, b.x, b.z), ss = K * Math.max(0.35, 1 - (b.y - gy) * 0.12);
      put(shadowM, i, b.x, gy + 0.04, b.z, 0, 0, 0, ss, 1, ss);
      const wy = b.y + 0.2 * K, cs = Math.cos(b.h), sn = Math.sin(b.h);
      put(wingM, i * 2, b.x + cs * 0.08 * K, wy, b.z - sn * 0.08 * K, b.h, pitch, -flap, K, K, K);
      put(wingM, i * 2 + 1, b.x - cs * 0.08 * K, wy, b.z + sn * 0.08 * K, b.h, pitch, flap, -K, K, K);
    });

    // --- frogs: throat pulse and ribbits; a hop into the water with a splash when Werka comes.
    frogs.forEach((f, i) => {
      if (Math.abs(f.x - me.x) > NEAR || Math.abs(f.z - me.z) > NEAR) { frogM.setMatrixAt(i, ZERO); return; }
      const near = Math.hypot(f.c.x - me.x, f.c.z - me.z);
      const wx = f.c.wx!, wz = f.c.wz!, home = walkY(w, f.c.x, f.c.z);
      let sy = 1, pitch = 0;
      if (f.st === 'sit') {
        f.x = f.c.x; f.z = f.c.z; f.y = home;
        sy = 1 + Math.max(0, Math.sin(time * 5 + f.c.ph)) ** 6 * 0.12;
        f.croak -= dt;
        if (f.croak < 0) { f.croak = 4 + (f.c.ph * 17 % 5); if (near < 28 && time - ribbitAt > 2) { ribbitAt = time; sfx.ribbit(); } }
        if (near < REACT) { f.st = 'dive'; f.t = 0; f.h = Math.atan2(wx - f.c.x, wz - f.c.z); }
      } else if (f.st === 'dive' || f.st === 'back') {
        f.t += dt / 0.55;
        const k = Math.min(1, f.t), out = f.st === 'back';
        const ax = out ? wx : f.c.x, az = out ? wz : f.c.z, bx = out ? f.c.x : wx, bz = out ? f.c.z : wz;
        f.x = ax + (bx - ax) * k; f.z = az + (bz - az) * k;
        const ay = out ? WATER_Y - 0.1 : home, by = out ? home : WATER_Y - 0.25;
        f.y = ay + (by - ay) * k + Math.sin(k * Math.PI) * 0.9;
        pitch = (k - 0.5) * (out ? -1 : 1) * 0.9;
        sy = 1.15;
        if (k >= 1) {
          if (out) f.st = 'sit';
          else { f.st = 'under'; f.t = 0; splash(wx, wz); if (time - plopAt > 0.4) { plopAt = time; sfx.plop(); } }
        }
      } else {
        // Under water: resurface once Werka has walked off.
        f.t += dt;
        if (f.t > 4 && near > REACT + 3) { f.st = 'back'; f.t = 0; f.h = Math.atan2(f.c.x - wx, f.c.z - wz); splash(wx, wz); }
      }
      if (f.st === 'under') frogM.setMatrixAt(i, ZERO);
      else put(frogM, i, f.x, f.y, f.z, f.h, pitch, 0, K, sy * K, K);
    });

    // --- fish: slow loops under the surface, dart away fast when Werka is on the bank.
    fish.forEach((f, i) => {
      if (Math.abs(f.c.x - me.x) > NEAR || Math.abs(f.c.z - me.z) > NEAR) { fishM.setMatrixAt(i, ZERO); return; }
      if (Math.hypot(f.x - me.x, f.z - me.z) < REACT) f.fast = Math.min(1, f.fast + dt * 6);
      else f.fast = Math.max(0, f.fast - dt * 0.4);
      const speed = 0.35 + f.fast * 2.4;
      f.a += dt * speed / Math.max(0.6, (f.c.rx! + f.c.rz!) / 2);
      const nx = f.c.x + Math.cos(f.a) * f.c.rx!, nz = f.c.z + Math.sin(f.a) * f.c.rz!;
      f.h = Math.atan2(nx - f.x, nz - f.z);
      f.x = nx; f.z = nz;
      const wig = Math.sin(time * (5 + f.fast * 14) + f.c.ph) * 0.12;
      put(fishM, i, f.x, WATER_Y + 0.015, f.z, f.h + wig, 0, 0, 1.25, 1, 1.25);
    });

    // --- butterflies: flower to flower; circle Werka for a moment, then flutter off.
    flies.forEach((f, i) => {
      if (night || Math.abs(f.x - me.x) > NEAR || Math.abs(f.z - me.z) > NEAR) { shadowM.setMatrixAt(birds.length + i, ZERO); flyM.setMatrixAt(i * 2, ZERO); flyM.setMatrixAt(i * 2 + 1, ZERO); flyB.setMatrixAt(i, ZERO); return; }
      f.cool = Math.max(0, f.cool - dt);
      const d = Math.hypot(f.x - me.x, f.z - me.z);
      if (f.mode === 'wander' && d < REACT && f.cool === 0) { f.mode = 'circle'; f.t = 0; }
      let tx: number, tz: number, ty: number, sp = 2.2;
      if (f.mode === 'circle') {
        f.t += dt;
        const a = f.t * 2.6 + f.c.ph;
        tx = me.x + Math.cos(a) * 1.3; tz = me.z + Math.sin(a) * 1.3; ty = me.y + 1.5 + Math.sin(f.t * 3) * 0.25; sp = 6;
        if (f.t > 3.2) { f.mode = 'leave'; f.cool = 12; }
      } else {
        const pts = f.c.pts!, tg = pts[f.tgt % pts.length];
        tx = tg[0]; tz = tg[1]; ty = walkY(w, tx, tz) + 0.95;
        if (f.mode === 'leave' && Math.hypot(f.x - f.c.x, f.z - f.c.z) < 2) f.mode = 'wander';
        if (Math.hypot(f.x - tx, f.z - tz) < 0.2) {
          f.perch += dt;
          if (f.perch > 1.6 + (f.c.ph % 1.5)) { f.perch = 0; f.tgt++; }
        }
      }
      const dx = tx - f.x, dz = tz - f.z, l = Math.hypot(dx, dz);
      if (l > 0.01) {
        const st = Math.min(l, sp * dt);
        f.x += (dx / l) * st + Math.sin(time * 4 + f.c.ph) * 0.01; f.z += (dz / l) * st;
        f.h = Math.atan2(dx, dz);
      }
      f.y += (ty + Math.sin(time * 6 + f.c.ph) * 0.12 - f.y) * Math.min(1, dt * 4);
      const perched = f.mode === 'wander' && f.perch > 0;
      const flap = perched ? 0.9 + Math.sin(time * 3 + f.c.ph) * 0.3 : Math.sin(time * 22 + f.c.ph) * 1.1 + 0.2;
      const F = 2.1, fg = walkY(w, f.x, f.z);
      put(flyM, i * 2, f.x, f.y, f.z, f.h, 0, -flap, F, F, F);
      put(flyM, i * 2 + 1, f.x, f.y, f.z, f.h, 0, flap, -F, F, F);
      put(flyB, i, f.x, f.y, f.z, f.h, 0, 0, F, F, F);
      put(shadowM, birds.length + i, f.x, fg + 0.04, f.z, 0, 0, 0, 0.9, 1, 0.9);
    });

    // --- splash rings.
    rings.forEach((r, i) => {
      if (r.t > 1.2) { ringM.setMatrixAt(i, ZERO); return; }
      r.t += dt;
      const k = r.t / 1.2;
      put(ringM, i, r.x, WATER_Y + 0.03, r.z, 0, 0, 0, 0.6 + k * 2.4, 1, 0.6 + k * 2.4);
      ringM.setColorAt(i, col.setScalar(0.7 * (1 - k)));
    });
    if (ringM.instanceColor) ringM.instanceColor.needsUpdate = true;
    for (const m of [birdM, wingM, frogM, fishM, flyM, flyB, ringM, shadowM]) m.instanceMatrix.needsUpdate = true;
  };
  // Dev / test hooks: where things are now, and their states.
  const debug = () => ({
    birds: birds.map(b => ({ x: b.x, z: b.z, st: b.st, flock: b.c.flock })),
    frogs: frogs.map(f => ({ x: f.x, z: f.z, st: f.st })),
    fish: fish.map(f => ({ x: f.x, z: f.z, fast: f.fast })),
    flies: flies.map(f => ({ x: f.x, z: f.z, mode: f.mode })),
  });
  return { group, update, debug };
}
