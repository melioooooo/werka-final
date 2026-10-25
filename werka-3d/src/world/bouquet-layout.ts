// Bouquet arrangement maths (spec v4 §3, §5), no three.js so `npm run check` can test it.
// Flower heads are spheres sitting on a dome; keepsakes sit on the paper cone. Both are relaxed
// so nothing interpenetrates. Saved layouts use normalised coordinates in -1..1:
//   flowers: (x, y) = top view of the head's direction on the dome (unit disk), r = twist.
//   extras: x = angle around the wrap / PI, y = height on the wrap (-1 low .. 1 high), r = roll, s = scale.
export type V3 = [number, number, number];
export type FlowerPose = { x: number; y: number; r?: number };
export type ExtraPose = { x: number; y: number; r?: number; s?: number };
export type Layout = { flowers?: FlowerPose[]; extras?: ExtraPose[] };

export const DOME = { cy: -0.58, R: 1.33, maxPolar: 1.05 }; // head centres live on this sphere cap
export const RIM = { y: -0.3, r: 0.92 }; // top edge of the paper wrap (flared to hold the dome)
export const FLOOR = RIM.y + 0.05; // no head may dip below this: the dome starts right on the paper rim
export const TIE = { y: -1.25 }; // where the stems cross, under the ribbon
export const WRAP = { bottom: -1.6, rBottom: 0.22, low: -1.0, high: -0.58 }; // paper cone, keepsake band
export const wrapRadius = (y: number) => WRAP.rBottom + ((RIM.r - WRAP.rBottom) * (y - WRAP.bottom)) / (RIM.y - WRAP.bottom);
export const EXTRA_R = 0.15; // keepsake footprint radius at scale 1
const GAP = 0.012;
const BOW: V3 = [0, TIE.y + 0.08, wrapRadius(TIE.y + 0.08) + 0.08]; // ribbon bow at the front, an obstacle for keepsakes
const BOW_R = 0.2;

const SIN_MAX = Math.sin(DOME.maxPolar);
export const clampPose = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));

// --- flowers --------------------------------------------------------------------------------
export function diskToDir(x: number, y: number): V3 {
  let dx = clampPose(x) * SIN_MAX, dz = clampPose(y) * SIN_MAX;
  const l = Math.hypot(dx, dz);
  if (l > SIN_MAX) { dx *= SIN_MAX / l; dz *= SIN_MAX / l; }
  return [dx, Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)), dz];
}
export const dirToDisk = (u: V3) => ({ x: u[0] / SIN_MAX, y: u[2] / SIN_MAX });
export const headCentre = (u: V3, out: V3 = [0, 0, 0]): V3 => {
  out[0] = u[0] * DOME.R; out[1] = DOME.cy + u[1] * DOME.R; out[2] = u[2] * DOME.R;
  return out;
};

// Each head is a capsule along its facing direction u (it bounds the head's geometry exactly):
// radius r, half length h, centred on the dome. Spikes (lavender) are thin and long, daisies
// short and wide, so heads pack as tightly as their real shapes allow.
// up (0..1): how much a head stands up instead of facing out of the dome (spikes stand like stalks).
export type Head = { r: number; h: number; up?: number };

// Capsule axis for a head at dome direction u.
const ax: V3 = [0, 0, 0];
export function headAxis(u: V3, s: Head, out: V3 = ax): V3 {
  const k = s.up ?? 0;
  out[0] = u[0] * (1 - k); out[1] = u[1] * (1 - k) + k; out[2] = u[2] * (1 - k);
  const l = Math.hypot(out[0], out[1], out[2]) || 1;
  out[0] /= l; out[1] /= l; out[2] /= l;
  return out;
}
// Lowest point of a head, for the no-dipping-into-the-paper rule.
export function headBottom(u: V3, s: Head) {
  const a = headAxis(u, s);
  return DOME.cy + DOME.R * u[1] - Math.abs(a[1]) * s.h - s.r;
}
// Highest polar angle that keeps the head above FLOOR (bottom height falls as the polar angle grows).
const limits = new WeakMap<Head, number>();
const tu: V3 = [0, 0, 0];
function polarLimit(s: Head) {
  let lim = limits.get(s);
  if (lim !== undefined) return lim;
  let lo = 0, hi = DOME.maxPolar;
  tu[0] = Math.sin(hi); tu[1] = Math.cos(hi); tu[2] = 0;
  if (headBottom(tu, s) >= FLOOR) lim = hi;
  else {
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      tu[0] = Math.sin(m); tu[1] = Math.cos(m);
      if (headBottom(tu, s) >= FLOOR) lo = m; else hi = m;
    }
    lim = lo;
  }
  limits.set(s, lim);
  return lim;
}

// Back onto the sphere, inside the cap allowed for this head.
function project(c: V3, s: Head, u: V3) {
  let x = c[0], y = c[1] - DOME.cy, z = c[2];
  const l = Math.hypot(x, y, z) || 1;
  x /= l; y /= l; z /= l;
  const lim = polarLimit(s), h = Math.hypot(x, z);
  if (Math.atan2(h, y) > lim) {
    const k = Math.sin(lim) / (h || 1);
    x = h ? x * k : Math.sin(lim); z *= k; y = Math.cos(lim);
  }
  u[0] = x; u[1] = y; u[2] = z;
}

// Closest points between segments [a0,a1] and [b0,b1]; writes them to pa, pb, returns the distance.
const d1: V3 = [0, 0, 0], d2: V3 = [0, 0, 0], rr: V3 = [0, 0, 0];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function segSeg(a0: V3, a1: V3, b0: V3, b1: V3, pa: V3, pb: V3) {
  for (let k = 0; k < 3; k++) { d1[k] = a1[k] - a0[k]; d2[k] = b1[k] - b0[k]; rr[k] = a0[k] - b0[k]; }
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, rr), c = dot(d1, rr), b = dot(d1, d2);
  const den = a * e - b * b;
  let s = den > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  let t = e > 1e-9 ? (b * s + f) / e : 0;
  if (t < 0) { t = 0; s = a > 1e-9 ? Math.min(1, Math.max(0, -c / a)) : 0; }
  else if (t > 1) { t = 1; s = a > 1e-9 ? Math.min(1, Math.max(0, (b - c) / a)) : 0; }
  for (let k = 0; k < 3; k++) { pa[k] = a0[k] + d1[k] * s; pb[k] = b0[k] + d2[k] * t; }
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}
export function capsuleEnds(u: V3, s: Head, e0: V3 = [0, 0, 0], e1: V3 = [0, 0, 0]) {
  headCentre(u, e0);
  const a = headAxis(u, s);
  for (let k = 0; k < 3; k++) { e1[k] = e0[k] + a[k] * s.h; e0[k] -= a[k] * s.h; }
  return [e0, e1];
}
// Gap between two head capsules (negative = they overlap).
const a0: V3 = [0, 0, 0], a1: V3 = [0, 0, 0], b0: V3 = [0, 0, 0], b1: V3 = [0, 0, 0], pa: V3 = [0, 0, 0], pb: V3 = [0, 0, 0];
export function headGap(ui: V3, si: Head, uj: V3, sj: Head) {
  capsuleEnds(ui, si, a0, a1); capsuleEnds(uj, sj, b0, b1);
  return segSeg(a0, a1, b0, b1, pa, pb) - si.r - sj.r;
}

const ci: V3 = [0, 0, 0], cj: V3 = [0, 0, 0];
// Push overlapping heads apart along the dome. pinned (being dragged) gives way much less.
// Returns the worst remaining overlap.
export function relaxFlowers(u: V3[], sh: Head[], pinned = -1, iters = 40) {
  let worst = 0;
  for (let it = 0; it < iters; it++) {
    worst = 0;
    for (let i = 0; i < u.length; i++) { headCentre(u[i], ci); project(ci, sh[i], u[i]); }
    for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) {
      const gap = headGap(u[i], sh[i], u[j], sh[j]) - GAP;
      if (gap >= 0) continue;
      worst = Math.max(worst, -gap);
      let dx = pa[0] - pb[0], dy = pa[1] - pb[1], dz = pa[2] - pb[2];
      let d = Math.hypot(dx, dy, dz);
      if (d < 1e-6) { // axes cross: split sideways, deterministically
        headCentre(u[i], ci); headCentre(u[j], cj);
        dx = ci[0] - cj[0]; dy = ci[1] - cj[1]; dz = ci[2] - cj[2]; d = Math.hypot(dx, dy, dz);
        if (d < 1e-6) { const a = (i * 2.399 + j) % 6.283; dx = Math.cos(a); dy = 0; dz = Math.sin(a); d = 1; }
      }
      const wi = i === pinned ? 0.12 : 1, wj = j === pinned ? 0.12 : 1;
      const push = (-gap * 1.05) / (d * (wi + wj));
      headCentre(u[i], ci); headCentre(u[j], cj);
      ci[0] += dx * push * wi; ci[1] += dy * push * wi; ci[2] += dz * push * wi;
      cj[0] -= dx * push * wj; cj[1] -= dy * push * wj; cj[2] -= dz * push * wj;
      project(ci, sh[i], u[i]); project(cj, sh[j], u[j]);
    }
    if (worst < 1e-4) break;
  }
  return worst;
}

// Default spot for head i of n: a sunflower spiral over the cap.
export function defaultDisk(i: number, n: number): FlowerPose {
  if (n === 1) return { x: 0, y: 0 };
  const rad = (n < 4 ? 0.45 : n < 7 ? 0.75 : 1) * Math.sqrt((i + 0.5) / n), a = i * 2.39996 + 0.6; // big bouquets reach the rim
  return { x: Math.cos(a) * rad, y: Math.sin(a) * rad };
}

// True if no two heads overlap and none dips below the floor, without moving anything.
export function fits(u: V3[], sh: Head[]) {
  for (let i = 0; i < u.length; i++) {
    if (headBottom(u[i], sh[i]) < FLOOR - 1e-4) return false;
    for (let j = i + 1; j < u.length; j++) if (headGap(u[i], sh[i], u[j], sh[j]) < GAP - 1e-4) return false;
  }
  return true;
}

export const scaleHeads = (sh: Head[], k: number) => sh.map(s => ({ r: s.r * k, h: s.h * k, up: s.up }));

// Full layout: start from saved (or default) poses, relax, and if the heads cannot all fit
// shrink every head a little and try again. k is that shrink (1 = full size).
export function layoutFlowers(shapes: Head[], saved?: FlowerPose[]) {
  const n = shapes.length;
  const u = shapes.map((_, i) => {
    const p = saved?.[i] ?? defaultDisk(i, n);
    return diskToDir(p.x, p.y);
  });
  let k = 1;
  // A saved layout comes back exactly as arranged: find the head size it was made at instead of
  // moving anything (it was relaxed at that size, so it fits).
  if (saved) {
    while (k > 0.5 && !fits(u, scaleHeads(shapes, k))) k *= 0.96;
    if (k <= 0.5) k = 1; // not a layout we made: relax it like a fresh one
  }
  for (let tries = 0; tries < 40; tries++) {
    if (relaxFlowers(u, scaleHeads(shapes, k), -1, 120) < 1e-4) break;
    k *= 0.96;
  }
  return { u, k, twist: shapes.map((_, i) => saved?.[i]?.r ?? ((i * 1.7) % 6.283)) };
}

// --- keepsakes on the paper ------------------------------------------------------------------
export type WrapPos = { a: number; t: number }; // angle around the cone, 0..1 up the keepsake band
export const wrapPoint = (p: WrapPos, out: V3 = [0, 0, 0]): V3 => {
  const y = WRAP.low + (WRAP.high - WRAP.low) * p.t, rr = wrapRadius(y);
  out[0] = Math.sin(p.a) * rr; out[1] = y; out[2] = Math.cos(p.a) * rr;
  return out;
};
const toWrap = (c: V3, p: WrapPos) => {
  p.a = Math.atan2(c[0], c[2]);
  p.t = clampPose((c[1] - WRAP.low) / (WRAP.high - WRAP.low), 0, 1);
};
export const poseToWrap = (e: ExtraPose): WrapPos => ({ a: clampPose(e.x) * Math.PI, t: (clampPose(e.y) + 1) / 2 });
export const wrapToPose = (p: WrapPos) => ({ x: Math.atan2(Math.sin(p.a), Math.cos(p.a)) / Math.PI, y: p.t * 2 - 1 });

// Default: a row across the front, alternating left/right, second row higher up.
export function defaultExtra(i: number): ExtraPose {
  const k = Math.floor((i + 1) / 2) * (i % 2 ? -1 : 1);
  return { x: k * 0.17, y: i >= 4 ? 0.85 : -0.25 + (i % 2) * 0.1 };
}

const pi: V3 = [0, 0, 0], pj: V3 = [0, 0, 0];
export function relaxExtras(p: WrapPos[], s: number[], pinned = -1, iters = 40) {
  let worst = 0;
  for (let it = 0; it < iters; it++) {
    worst = 0;
    for (let i = 0; i < p.length; i++) {
      wrapPoint(p[i], pi);
      // The bow is fixed: push the keepsake off it.
      const bx = pi[0] - BOW[0], by = pi[1] - BOW[1], bz = pi[2] - BOW[2], bd = Math.hypot(bx, by, bz), bmin = BOW_R + EXTRA_R * s[i];
      if (bd < bmin) {
        worst = Math.max(worst, bmin - bd);
        const k = (bmin - bd) * 1.02 / (bd || 1);
        pi[0] += (bd ? bx : 1) * k; pi[1] += (bd ? by : 0.2) * k; pi[2] += bz * k;
        toWrap(pi, p[i]);
      }
      for (let j = i + 1; j < p.length; j++) {
        wrapPoint(p[i], pi); wrapPoint(p[j], pj);
        let dx = pi[0] - pj[0], dy = pi[1] - pj[1], dz = pi[2] - pj[2];
        let d = Math.hypot(dx, dy, dz);
        const min = EXTRA_R * (s[i] + s[j]) + GAP;
        if (d >= min) continue;
        worst = Math.max(worst, min - d);
        // A little sideways bias so a vertical stack (clamped by the band) can still spread around the cone.
        const sg = (i + j) % 2 ? 1 : -1, ta = (p[i].a + p[j].a) / 2;
        dx += Math.cos(ta) * sg * d * 0.35; dz -= Math.sin(ta) * sg * d * 0.35;
        if (d < 1e-6) { dx = Math.cos(ta) * sg; dy = 0; dz = -Math.sin(ta) * sg; }
        const len = Math.hypot(dx, dy, dz);
        const wi = i === pinned ? 0.12 : 1, wj = j === pinned ? 0.12 : 1;
        const push = ((min - d) * 1.02) / (len * (wi + wj));
        pi[0] += dx * push * wi; pi[1] += dy * push * wi; pi[2] += dz * push * wi;
        pj[0] -= dx * push * wj; pj[1] -= dy * push * wj; pj[2] -= dz * push * wj;
        toWrap(pi, p[i]); toWrap(pj, p[j]);
      }
    }
    if (worst < 1e-4) break;
  }
  return worst;
}

export function layoutExtras(n: number, saved?: ExtraPose[]) {
  const poses = Array.from({ length: n }, (_, i) => saved?.[i] ?? defaultExtra(i));
  const p = poses.map(poseToWrap);
  const s = poses.map(e => clampPose(e.s ?? 1, 0.7, 1.4));
  relaxExtras(p, s, -1, 120);
  return { p, s, roll: poses.map(e => e.r ?? 0) };
}

// Min distance between two keepsakes / a keepsake and the bow, for tests.
export function extrasClear(p: WrapPos[], s: number[]) {
  for (let i = 0; i < p.length; i++) {
    wrapPoint(p[i], pi);
    if (Math.hypot(pi[0] - BOW[0], pi[1] - BOW[1], pi[2] - BOW[2]) < BOW_R + EXTRA_R * s[i] - 1e-3) return false;
    for (let j = i + 1; j < p.length; j++) {
      wrapPoint(p[j], pj);
      if (Math.hypot(pi[0] - pj[0], pi[1] - pj[1], pi[2] - pj[2]) < EXTRA_R * (s[i] + s[j]) - 1e-3) return false;
    }
  }
  return true;
}
