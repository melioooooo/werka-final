// 3D bouquet v2 (spec v4 §5): close-up flower heads packed on a dome without touching, stems
// gathered through a paper cone and a ribbon, leaves and little fillers in the gaps, keepsakes
// pinned on the paper. The same model is used to arrange (drag, turn, scale) and in the gallery.
// Placement maths lives in world/bouquet-layout.ts (tested by `npm run check`).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flowerHead, headKind } from './flowers.ts';
import { FLOWER_COLORS } from '../world/data.ts';
import { toon, outline } from './toon.ts';
import { pickupGeometry, pickupMat } from './pickups.ts';
import {
  DOME, RIM, TIE, WRAP, FLOOR, EXTRA_R, wrapRadius, headCentre, layoutFlowers, relaxFlowers, layoutExtras, relaxExtras,
  dirToDisk, diskToDir, wrapPoint, capsuleEnds, scaleHeads, headAxis, type Head, wrapToPose, poseToWrap, type Layout, type V3, type WrapPos,
} from '../world/bouquet-layout.ts';

const headMat = toon({ vertexColors: true, side: THREE.DoubleSide, rim: 0.4 });
const greenMat = toon({ vertexColors: true, side: THREE.DoubleSide, rim: 0.3 });
const paperOut = toon({ vertexColors: true, side: THREE.DoubleSide, rim: 0.25 });
const LINE = { head: outline('#1f2a2c', 0.008), extra: outline('#1f2a2c', 0.035), headSel: outline('#f1c76b', 0.03), extraSel: outline('#f1c76b', 0.08), paper: outline('#1f2a2c', 0.012) };
const RIBBONS = ['#e11d48', '#db2777', '#7c3aed', '#0e7490', '#c2410c', '#be185d'];
const EXTRA_SIZE = 0.5; // pickup models are ~0.6 across

const Y = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3(), w2 = new THREE.Vector3(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), m4 = new THREE.Matrix4();
const tmpC = new THREE.Color();

// Vertex colour fill with a soft bottom-dark / top-light ramp along one axis.
function tint(g: THREE.BufferGeometry, color: string, lo = 0.8, hi = 1.08, axis = 1) {
  const geo = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
  geo.computeVertexNormals();
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  let a = Infinity, b = -Infinity;
  for (let i = 0; i < p.count; i++) { a = Math.min(a, p.getComponent(i, axis)); b = Math.max(b, p.getComponent(i, axis)); }
  tmpC.set(color);
  for (let i = 0; i < p.count; i++) {
    const s = lo + (hi - lo) * (b > a ? (p.getComponent(i, axis) - a) / (b - a) : 1);
    col.set([tmpC.r * s, tmpC.g * s, tmpC.b * s], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Folded paper sheet around the cone: zigzag pleats that deepen toward the top, notched rim.
function paperSheet(scale: number, top: number, color: string, notch: number, pleat: number) {
  const rings = 6, segs = 26, pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= rings; j++) for (let k = 0; k <= segs; k++) {
    const f = j / rings, a = (k / segs) * Math.PI * 2;
    const y = WRAP.bottom + (top - WRAP.bottom) * f - (j === rings ? notch * (k % 2) : 0);
    const r = wrapRadius(Math.min(y, RIM.y)) * scale * (1 + pleat * f * f * (k % 2 ? 1 : -1)) + Math.max(0, y - RIM.y) * 0.5;
    pos.push(Math.sin(a) * r, y, Math.cos(a) * r);
    if (j < rings && k < segs) { const i0 = j * (segs + 1) + k, i1 = i0 + segs + 1; idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return tint(g, color, 0.78, 1.06);
}

// Leaf: folded along its midrib, length along +z, width along x.
function leafGeo(len: number, wid: number) {
  const pos: number[] = [], N = 5;
  const pt = (i: number, side: number) => {
    const u = i / N, half = (wid / 2) * Math.sin(Math.PI * Math.pow(u, 0.75));
    return [side * half, side === 0 ? 0.025 * Math.sin(Math.PI * u) : -0.01, len * u];
  };
  for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
    const a = pt(i, 0), b = pt(i + 1, 0), c = pt(i, s), d = pt(i + 1, s);
    pos.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
const basisTo = (dir: THREE.Vector3, out: THREE.Matrix4) => {
  const z = dir.clone().normalize(), x = new THREE.Vector3().crossVectors(Y, z);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  return out.makeBasis(x, new THREE.Vector3().crossVectors(z, x), z);
};

// Capsule along local y that holds every vertex of a head: centre c, half length h, radius r.
const capCache = new WeakMap<THREE.BufferGeometry, { c: THREE.Vector3; h: number; r: number }>();
function capsuleOf(g: THREE.BufferGeometry) {
  let cap = capCache.get(g);
  if (cap) return cap;
  g.computeBoundingBox();
  const b = g.boundingBox!, p = g.attributes.position;
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, cy = (b.min.y + b.max.y) / 2, h = (b.max.y - b.min.y) / 2;
  let r = 0;
  for (let i = 0; i < p.count; i++) {
    const dy = Math.max(0, Math.abs(p.getY(i) - cy) - h);
    r = Math.max(r, Math.hypot(p.getX(i) - cx, dy, p.getZ(i) - cz));
  }
  cap = { c: new THREE.Vector3(cx, cy, cz), h, r: r + 0.004 };
  capCache.set(g, cap);
  return cap;
}

// Hash for small per-bouquet variety (ribbon colour, jitter).
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export type Selection = { kind: 'flower' | 'extra'; i: number } | null;
export type BouquetModel = ReturnType<typeof buildBouquet>;

export function buildBouquet(types: string[], extras: string[] = [], saved?: Layout) {
  const group = new THREE.Group();
  const seed = hash(types.join() + extras.join());

  // --- heads ------------------------------------------------------------------------------
  const big = Math.min(1.4, Math.pow(8 / types.length, 0.3)); // fewer flowers, bigger heads
  const heads = types.map((type, i) => {
    const geo = flowerHead(type);
    const cap = capsuleOf(geo);
    // Ask for heads a bit too big: the layout then shrinks them all just enough to fit, so the
    // dome always ends up tightly packed. Long heads (tulips, spikes) are capped so they don't tower.
    const sc = Math.min((0.6 * big) / cap.r, (0.58 * big) / geo.boundingSphere!.radius);
    const mesh = new THREE.Mesh(geo, headMat);
    mesh.castShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.pick = { kind: 'flower', i };
    const hull = new THREE.Mesh(geo, LINE.head);
    mesh.add(hull);
    group.add(mesh);
    return { type, mesh, hull, cap, sc, wob: 0, wv: 0 };
  });
  // Spikes and bell sprays stand up like stalks; open blooms face out of the dome.
  const UP: Record<string, number> = { spike: 0.75, cattail: 0.8, bells: 0.45, bird: 0.5, crystal: 0.4 };
  const shapes: Head[] = heads.map(h => ({ r: h.cap.r * h.sc, h: h.cap.h * h.sc, up: UP[headKind(h.type)] ?? 0 }));
  const fl = layoutFlowers(shapes, saved?.flowers);
  const U = fl.u, twist = fl.twist;
  let k = fl.k;
  const rk = () => scaleHeads(shapes, k);
  // Distance from a point to the nearest head surface (negative inside a head).
  const e0: V3 = [0, 0, 0], e1: V3 = [0, 0, 0], sa = new THREE.Vector3(), sb = new THREE.Vector3(), seg = new THREE.Line3();
  const headClearance = (pt: THREE.Vector3) => {
    const sh = rk();
    let best = Infinity;
    U.forEach((u, i) => {
      capsuleEnds(u, sh[i], e0, e1);
      seg.set(sa.set(e0[0], e0[1], e0[2]), sb.set(e1[0], e1[1], e1[2]));
      best = Math.min(best, seg.closestPointToPoint(pt, true, v).distanceTo(pt) - sh[i].r);
    });
    return best;
  };

  const base = heads.map(() => new THREE.Vector3());
  const c3: V3 = [0, 0, 0];
  const poseHeads = () => heads.forEach((h, i) => {
    const u = U[i];
    // Face out of the dome. Wobble twists the head about its own axis, so its capsule never
    // moves and touched heads can never poke into their neighbours.
    const a = headAxis(u, shapes[i]);
    q.setFromUnitVectors(Y, v.set(a[0], a[1], a[2])).multiply(qt.setFromAxisAngle(Y, twist[i] + h.wob));
    headCentre(u, c3);
    const s = h.sc * k;
    w2.copy(h.cap.c).multiplyScalar(s).applyQuaternion(q);
    base[i].set(c3[0] - w2.x, c3[1] - w2.y, c3[2] - w2.z);
    h.mesh.matrix.compose(base[i], q, w2.setScalar(s));
    h.mesh.matrixWorldNeedsUpdate = true;
  });

  // --- stems (one merged mesh, rebuilt when heads move) ----------------------------------
  const stems = new THREE.Mesh(new THREE.BufferGeometry(), greenMat);
  stems.castShadow = true;
  group.add(stems);
  const buildStems = () => {
    const parts = heads.map((_, i) => {
      const u = U[i], hz = Math.hypot(u[0], u[2]);
      const dx = hz > 1e-3 ? u[0] / hz : Math.sin(i * 2.4), dz = hz > 1e-3 ? u[2] / hz : Math.cos(i * 2.4);
      const h = Math.min(1, hz / Math.sin(DOME.maxPolar));
      const j = ((seed >> (i * 3)) % 7) / 7 - 0.5;
      const pts = [
        new THREE.Vector3(-dx * (0.07 + 0.05 * h) + j * 0.03, TIE.y - 0.72 - j * 0.06, -dz * (0.07 + 0.05 * h)),
        new THREE.Vector3(dx * 0.025, TIE.y, dz * 0.025 + j * 0.02),
        new THREE.Vector3(dx * RIM.r * (0.2 + 0.5 * h), RIM.y + 0.02, dz * RIM.r * (0.2 + 0.5 * h)),
        base[i].clone(),
      ];
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const tube = tint(new THREE.TubeGeometry(curve, 22, 0.024, 5, false), i % 2 ? '#4f8f3e' : '#5c9a45', 0.72, 1.05);
      // A leaf partway up the stem, only where it cannot touch any head.
      const at = curve.getPoint(0.8), dir = curve.getTangent(0.8);
      const out = new THREE.Vector3(dx, 0.55, dz).normalize().lerp(dir, 0.25).normalize();
      const tip = at.clone().addScaledVector(out, 0.3);
      const clear = (pt: THREE.Vector3) => headClearance(pt) > 0.06;
      if (at.y > RIM.y + 0.05 && clear(tip) && clear(at.clone().lerp(tip, 0.5))) {
        const leaf = tint(leafGeo(0.3, 0.12), '#5b9a46', 0.75, 1.08, 2);
        leaf.applyMatrix4(basisTo(out, m4).setPosition(at));
        return mergeGeometries([tube, leaf])!;
      }
      return tube;
    });
    stems.geometry.dispose();
    stems.geometry = parts.length ? mergeGeometries(parts)! : new THREE.BufferGeometry();
  };

  // --- fillers: little blossom sprays (and the odd leaf) wherever a gap shows ------------
  // Candidates on the dome and in two rings just above the paper rim; each is kept only if it
  // clears every head capsule, so fillers can never clip a flower.
  const fillers = new THREE.Mesh(new THREE.BufferGeometry(), greenMat);
  group.add(fillers);
  const sprig = tint(leafGeo(0.24, 0.1), '#5e9e4a', 0.85, 1.1, 2);
  const tints = ['#fffaf0', '#f8ecd4', ...types.map(t => '#' + new THREE.Color(FLOWER_COLORS[t] ?? '#f9a8d4').lerp(new THREE.Color('#ffffff'), 0.55).getHexString())];
  const petalG = new THREE.IcosahedronGeometry(0.036, 0).scale(1, 0.32, 0.62).translate(0, 0, 0.036);
  const blossom = (color: string, m: THREE.Matrix4, out: THREE.BufferGeometry[]) => {
    for (let k = 0; k < 5; k++) out.push(tint(petalG.clone(), color, 0.9, 1.08).applyMatrix4(m.clone().multiply(new THREE.Matrix4().makeRotationY(k * 1.2566))));
    out.push(tint(new THREE.IcosahedronGeometry(0.018, 0), '#f6c453', 1, 1).applyMatrix4(m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.012, 0))));
  };
  const CR = 0.12; // spray radius
  const buildFillers = () => {
    const parts: THREE.BufferGeometry[] = [];
    const cands: { p: THREE.Vector3; n: THREE.Vector3; small?: boolean }[] = [];
    for (let n = 0; n < 160; n++) {
      const yv = 1 - (n / 159) * (1 - Math.cos(DOME.maxPolar + 0.2)), rad = Math.sqrt(1 - yv * yv), a = n * 2.39996 + (seed % 7);
      const d = new THREE.Vector3(Math.cos(a) * rad, yv, Math.sin(a) * rad);
      cands.push({ p: new THREE.Vector3(d.x * (DOME.R - 0.06), DOME.cy + d.y * (DOME.R - 0.06), d.z * (DOME.R - 0.06)), n: d });
    }
    // Inside the dome too: whatever shows between the heads is blossoms and leaves, not paper.
    for (const [y, r] of [[FLOOR + 0.13, RIM.r * 0.84], [FLOOR + 0.13, RIM.r * 0.5], [FLOOR + 0.3, RIM.r * 0.7], [FLOOR + 0.3, RIM.r * 0.3], [FLOOR + 0.5, RIM.r * 0.5], [FLOOR + 0.7, RIM.r * 0.2]]) for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2 + (seed % 5) * 0.1 + r;
      cands.push({ p: new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r), n: new THREE.Vector3(Math.sin(a), 0.9, Math.cos(a)).normalize() });
    }
    const bedTop: THREE.Vector3[] = [];
    // Foliage bed: a lumpy green mound filling the paper opening, pushed down wherever a head is,
    // so gaps between heads show leaves instead of paper and bare stems.
    {
      const RINGS = 7, SEG = 28, Rb = RIM.r * 0.97, pos: number[] = [], col: number[] = [];
      // Never taller than the flowers: the mound stays under the lowest-but-one head centre.
      const bedCap = U.map(u => headCentre(u, [0, 0, 0])[1]).sort((p, q) => q - p)[Math.min(1, U.length - 1)] - 0.12;
      const ring: THREE.Vector3[][] = [];
      const pt = new THREE.Vector3();
      for (let j = 0; j <= RINGS; j++) {
        const row: THREE.Vector3[] = [];
        for (let k = 0; k < (j ? SEG : 1); k++) {
          const a = (k / SEG) * Math.PI * 2 + j * 0.3, r = (j / RINGS) * Rb;
          const n = Math.sin(a * 5 + j * 1.7 + seed) * 0.035;
          let y = Math.min(RIM.y + 0.04 + 0.95 * (1 - (r / Rb) ** 2), bedCap) + n;
          for (let it = 0; it < 60; it++) {
            const rr2 = y < RIM.y ? Math.min(r, wrapRadius(y) * 0.95) : r;
            pt.set(Math.sin(a) * rr2, y, Math.cos(a) * rr2);
            if (headClearance(pt) > 0.03 || y < RIM.y - 0.35) break;
            y -= 0.03;
          }
          row.push(pt.clone());
          if (j > 0) bedTop.push(pt.clone());
        }
        ring.push(row);
      }
      const G = ['#3f7d36', '#4a8a3c', '#558f42', '#3a7232'];
      const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, i: number) => {
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        tmpC.set(G[(i * 7 + (seed % 5)) % G.length]);
        for (let q2 = 0; q2 < 3; q2++) col.push(tmpC.r, tmpC.g, tmpC.b);
      };
      for (let j = 1; j <= RINGS; j++) for (let k = 0; k < SEG; k++) {
        const k1 = (k + 1) % SEG;
        if (j === 1) tri(ring[0][0], ring[1][k], ring[1][k1], k);
        else { tri(ring[j - 1][k], ring[j][k], ring[j][k1], j * SEG + k); tri(ring[j - 1][k], ring[j][k1], ring[j - 1][k1], j * SEG + k + 3); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      parts.push(g);
    }
    // Blossoms sprinkled on the bed first, so the green mostly peeks around them.
    for (const p of bedTop) cands.unshift({ p: p.clone().add(new THREE.Vector3(0, 0.04, 0)), n: new THREE.Vector3(p.x * 0.6, 1, p.z * 0.6).normalize(), small: true });
    const placed: THREE.Vector3[] = [];
    let count = 0;
    for (const { p, n, small } of cands) {
      const cr = small ? 0.06 : CR;
      if (placed.length >= 120 || p.y - cr < RIM.y + 0.03 || headClearance(p) < cr) continue;
      if (placed.some(o => o.distanceTo(p) < (small ? 0.13 : 0.18))) continue;
      placed.push(p);
      const leafy = !small && count++ % 3 === 2;
      if (leafy) {
        for (let b = 0; b < 2; b++) {
          const g = sprig.clone();
          g.applyMatrix4(basisTo(n, m4).setPosition(p).multiply(new THREE.Matrix4().makeRotationZ(b * 3.1 + count).multiply(new THREE.Matrix4().makeRotationX(-1.1))));
          parts.push(g);
        }
      } else {
        const col = tints[(count * 7 + (seed % 3)) % tints.length];
        if (small) count++;
        for (let b = 0; b < (small ? 2 : 4); b++) {
          const t = b * 2.1 + count, o = b ? (small ? 0.035 : 0.065) : 0;
          const m = basisTo(n, new THREE.Matrix4()).setPosition(p)
            .multiply(new THREE.Matrix4().makeTranslation(Math.cos(t) * o, Math.sin(t) * o, 0.02 + (b % 2) * 0.02))
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); // blossom faces out along n
          blossom(col, m, parts);
        }
      }
    }
    // Foliage under the heads: leaf puffs on an inner shell hide the stems between heads.
    // Every leaf whose tip or middle would touch a head is dropped.
    const tipP = new THREE.Vector3(), midP = new THREE.Vector3(), dir = new THREE.Vector3();
    const free = (pt: THREE.Vector3) => headClearance(pt) > 0.03;
    for (let n = 0; n < 36; n++) {
      const yv = 1 - (n / 35) * (1 - Math.cos(DOME.maxPolar + 0.1)), rad = Math.sqrt(1 - yv * yv), a = n * 2.39996 + 1.3;
      const c = new THREE.Vector3(Math.cos(a) * rad, yv, Math.sin(a) * rad);
      const at = new THREE.Vector3(c.x * (DOME.R - 0.45), DOME.cy + c.y * (DOME.R - 0.45), c.z * (DOME.R - 0.45));
      for (let b = 0; b < 4; b++) {
        const t = b * 1.571 + n;
        dir.copy(c).addScaledVector(v.set(Math.cos(t), 0.2, Math.sin(t)), 0.9).normalize();
        const len = 0.34 + (b % 2) * 0.06;
        tipP.copy(at).addScaledVector(dir, len); midP.copy(at).addScaledVector(dir, len / 2);
        if (!free(tipP) || !free(midP) || !free(at) || tipP.y < RIM.y + 0.06 || midP.y < RIM.y + 0.04) continue;
        const g = tint(leafGeo(len, 0.16), b % 2 ? '#3f7d36' : '#4c8c3e', 0.7, 1.02, 2);
        g.applyMatrix4(basisTo(dir, m4).setPosition(at));
        parts.push(g);
      }
    }
    fillers.geometry.dispose();
    fillers.geometry = parts.length ? mergeGeometries(parts)! : new THREE.BufferGeometry();
  };

  // --- paper wrap, leaf collar, ribbon ---------------------------------------------------
  const outer = new THREE.Mesh(paperSheet(1, RIM.y, '#f3e4c4', 0.07, 0.035), paperOut);
  const inner = new THREE.Mesh(paperSheet(0.955, RIM.y + 0.02, '#f6c3cf', 0.05, 0.03), paperOut);
  outer.castShadow = true;
  outer.add(new THREE.Mesh(outer.geometry, LINE.paper));
  group.add(outer, inner);
  const ribbonCol = RIBBONS[seed % RIBBONS.length];
  const ribbonMat = toon({ color: ribbonCol, side: THREE.DoubleSide, rim: 0.4 });
  const ry = TIE.y, band = new THREE.Mesh(new THREE.CylinderGeometry(wrapRadius(ry + 0.05) + 0.018, wrapRadius(ry - 0.05) + 0.018, 0.1, 24, 1, true), ribbonMat);
  band.position.y = ry;
  const bow = new THREE.Group();
  bow.position.set(0, ry + 0.02, wrapRadius(ry) + 0.06);
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.028, 6, 14).scale(1.35, 0.85, 0.55), ribbonMat);
    loop.position.set(s * 0.11, 0.04, 0);
    loop.rotation.z = s * 0.35;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.26, 0.016).translate(0, -0.13, 0), ribbonMat);
    tail.position.set(s * 0.02, -0.02, 0.01);
    tail.rotation.set(-0.25, 0, s * 0.45);
    bow.add(loop, tail);
  }
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 0.9, 0.7), ribbonMat));
  for (const o of [...bow.children] as THREE.Mesh[]) { o.castShadow = true; o.add(new THREE.Mesh(o.geometry, LINE.paper)); }
  group.add(band, bow);

  // --- keepsakes on the paper ------------------------------------------------------------
  const ex = layoutExtras(extras.length, saved?.extras);
  const P: WrapPos[] = ex.p, S = ex.s, roll = ex.roll;
  const items = extras.map((id, i) => {
    const mesh = new THREE.Mesh(pickupGeometry(id), pickupMat);
    mesh.castShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.pick = { kind: 'extra', i };
    const hull = new THREE.Mesh(mesh.geometry, LINE.extra);
    mesh.add(hull);
    group.add(mesh);
    return { id, mesh, hull, wob: 0, wv: 0 };
  });
  const slope = (RIM.r - WRAP.rBottom) / (RIM.y - WRAP.bottom);
  const nrm = new THREE.Vector3(), xa = new THREE.Vector3(), ya = new THREE.Vector3(), pw: V3 = [0, 0, 0];
  const poseExtras = () => items.forEach((it, i) => {
    wrapPoint(P[i], pw);
    nrm.set(Math.sin(P[i].a), -slope, Math.cos(P[i].a)).normalize();
    xa.crossVectors(Y, nrm).normalize();
    ya.crossVectors(nrm, xa);
    const s = EXTRA_SIZE * S[i];
    m4.makeBasis(xa, ya, nrm).multiply(new THREE.Matrix4().makeRotationZ(roll[i] + it.wob));
    m4.scale(v.setScalar(s));
    const off = 0.035 + 0.05 * S[i]; // clear of the pleats
    m4.setPosition(pw[0] + nrm.x * off, pw[1] + nrm.y * off, pw[2] + nrm.z * off);
    it.mesh.matrix.copy(m4);
    it.mesh.matrixWorldNeedsUpdate = true;
  });

  const refresh = (full = true) => { poseHeads(); buildStems(); if (full) buildFillers(); poseExtras(); };
  refresh();

  // --- interaction ----------------------------------------------------------------------
  let sel: Selection = null;
  const select = (s: Selection) => {
    sel = s;
    heads.forEach((h, i) => { h.hull.material = s?.kind === 'flower' && s.i === i ? LINE.headSel : LINE.head; });
    items.forEach((it, i) => { it.hull.material = s?.kind === 'extra' && s.i === i ? LINE.extraSel : LINE.extra; });
  };
  const poke = (s: NonNullable<Selection>) => {
    const o = s.kind === 'flower' ? heads[s.i] : items[s.i];
    if (o) o.wv += s.kind === 'flower' ? 2.2 : 3;
  };
  const sphere = new THREE.Sphere(new THREE.Vector3(0, DOME.cy, 0), DOME.R);
  const hit = new THREE.Vector3();
  // Drag the selection along its surface (world-space ray). Neighbours make room.
  const inv = new THREE.Matrix4(), ray = new THREE.Ray();
  const dragTo = (worldRay: THREE.Ray) => {
    if (!sel) return;
    group.updateMatrixWorld();
    ray.copy(worldRay).applyMatrix4(inv.copy(group.matrixWorld).invert());
    if (sel.kind === 'flower') {
      if (!ray.intersectSphere(sphere, hit)) ray.closestPointToPoint(sphere.center, hit);
      hit.sub(sphere.center).normalize();
      // Clamp into the cap through the disk mapping, then let the solver push the others.
      const d = dirToDisk([hit.x, Math.max(hit.y, 0), hit.z]);
      const nu = diskToDir(d.x, d.y);
      // The dome is packed tight, so dropping a head onto a neighbour swaps the two places.
      const sh = rk(), i = sel.i;
      for (let j = 0; j < U.length; j++) {
        if (j === i) continue;
        const dot = nu[0] * U[j][0] + nu[1] * U[j][1] + nu[2] * U[j][2];
        if (Math.acos(Math.min(1, dot)) * DOME.R < sh[j].r * 0.6) {
          const t = U[j]; U[j] = U[i]; U[i] = t;
          heads[j].wv += 1.5;
          break;
        }
      }
      const u = U[i];
      u[0] = nu[0]; u[1] = nu[1]; u[2] = nu[2];
      relaxFlowers(U, rk(), i, 12);
      fillers.visible = false;
      refresh(false);
    } else {
      raycaster.ray.copy(worldRay);
      const hits = raycaster.intersectObject(outer, false);
      if (!hits.length) return;
      const p = group.worldToLocal(hits[0].point);
      const t = (p.y - WRAP.low) / (WRAP.high - WRAP.low);
      P[sel.i].a = Math.atan2(p.x, p.z);
      P[sel.i].t = Math.min(1, Math.max(0, t));
      relaxExtras(P, S, sel.i, 12);
      poseExtras();
    }
  };
  const raycaster = new THREE.Raycaster();
  // What a pointer ray touches: generous spheres around heads and keepsakes (easier on touch).
  const ball = new THREE.Sphere();
  const pick = (worldRay: THREE.Ray): Selection => {
    group.updateMatrixWorld();
    ray.copy(worldRay).applyMatrix4(inv.copy(group.matrixWorld).invert());
    let best: Selection = null, bestD = Infinity;
    const test = (s: NonNullable<Selection>) => {
      if (!ray.intersectSphere(ball, hit)) return;
      const d = hit.distanceTo(ray.origin);
      if (d < bestD) { bestD = d; best = s; }
    };
    // Heads: the ray against each head's own capsule, nearest hit along the ray wins.
    const sh = rk(), onRay = new THREE.Vector3();
    U.forEach((u, i) => {
      capsuleEnds(u, sh[i], e0, e1);
      const d2 = ray.distanceSqToSegment(sa.set(e0[0], e0[1], e0[2]), sb.set(e1[0], e1[1], e1[2]), onRay);
      if (d2 > sh[i].r * sh[i].r * 0.8) return;
      const d = onRay.distanceTo(ray.origin);
      if (d < bestD) { bestD = d; best = { kind: 'flower', i }; }
    });
    items.forEach((it, i) => { ball.set(v.setFromMatrixPosition(it.mesh.matrix), EXTRA_R * S[i] * 1.25); test({ kind: 'extra', i }); });
    return best;
  };
  const endDrag = () => {
    if (sel?.kind === 'flower') { relaxFlowers(U, rk(), -1, 80); fillers.visible = true; refresh(); }
    else if (sel) { relaxExtras(P, S, -1, 80); poseExtras(); }
  };
  const turn = (d: number) => {
    if (!sel) return;
    if (sel.kind === 'flower') { twist[sel.i] += d; poseHeads(); }
    else { roll[sel.i] += d; poseExtras(); }
    poke(sel);
  };
  const scale = (d: number) => {
    if (sel?.kind !== 'extra') return;
    S[sel.i] = Math.min(1.4, Math.max(0.7, S[sel.i] + d));
    relaxExtras(P, S, sel.i, 40);
    poseExtras();
    poke(sel);
  };
  let shuffles = 0;
  const shuffle = () => {
    shuffles++;
    const r = (n: number) => { const s = Math.sin(n * 127.1 + shuffles * 311.7 + seed) * 43758.5453; return s - Math.floor(s); };
    const order = heads.map((_, i) => i).sort((a, b) => r(a + 50) - r(b + 50));
    order.forEach((h, n) => {
      const rad = 0.8 * Math.sqrt((n + 0.5) / heads.length), a = r(n) * 6.283;
      const d = diskToDir(Math.cos(a) * rad, Math.sin(a) * rad);
      U[h][0] = d[0]; U[h][1] = d[1]; U[h][2] = d[2];
      twist[h] = r(n + 20) * 6.283;
      heads[h].wv += 1.5;
    });
    k = layoutFlowers(shapes, U.map(u => dirToDisk(u))).k;
    relaxFlowers(U, rk(), -1, 120);
    items.forEach((it, i) => { Object.assign(P[i], poseToWrap({ x: r(i + 80) * 2 - 1, y: r(i + 90) * 2 - 1 })); it.wv += 2; });
    relaxExtras(P, S, -1, 120);
    refresh();
  };
  const layout = (): Layout => ({
    flowers: U.map((u, i) => ({ ...dirToDisk(u), r: twist[i] % (Math.PI * 2) })),
    extras: P.map((p, i) => ({ ...wrapToPose(p), r: roll[i], s: S[i] })),
  });

  // Soft springs so touched things wobble and settle.
  const update = (dt: number, time: number) => {
    let moved = false;
    for (const o of [...heads, ...items]) {
      if (!o.wob && !o.wv) continue;
      o.wv += (-90 * o.wob - 7 * o.wv) * dt;
      o.wob += o.wv * dt;
      if (Math.abs(o.wob) < 1e-4 && Math.abs(o.wv) < 1e-3) o.wob = o.wv = 0;
      moved = true;
    }
    if (sel) {
      const pulse = 1 + Math.sin(time * 6) * 0.06;
      (sel.kind === 'flower' ? LINE.headSel : LINE.extraSel).color.setRGB(0.95 * pulse, 0.78 * pulse, 0.42 * pulse);
    }
    if (moved) { poseHeads(); poseExtras(); }
  };

  // World position of a piece (tests, and the studio uses it to frame things).
  const centreOf = (s: NonNullable<Selection>, out = new THREE.Vector3()) => {
    if (s.kind === 'flower') { headCentre(U[s.i], c3); out.set(c3[0], c3[1], c3[2]); }
    else out.setFromMatrixPosition(items[s.i].mesh.matrix);
    return group.localToWorld(out);
  };
  const pickables = [...heads.map(h => h.mesh), ...items.map(it => it.mesh)];
  const dispose = () => { stems.geometry.dispose(); fillers.geometry.dispose(); outer.geometry.dispose(); inner.geometry.dispose(); ribbonMat.dispose(); };
  return { group, pickables, pick, centreOf, select, poke, dragTo, endDrag, turn, scale, shuffle, layout, update, dispose, get selection() { return sel; } };
}
