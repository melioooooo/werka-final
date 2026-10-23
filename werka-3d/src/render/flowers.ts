// Hand-made low-poly flowers, one merged geometry per FlowerType, built from a small spec table.
// Colours are baked into vertex colours (petal base darker, tips lighter; glow types go above 1
// so the bloom pass picks them up). Geometry origin = ground, +y up.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOWER_COLORS } from '../world/data.ts';

// [count, length, width, pitch (0 flat .. 1.5 upright, negative droops), cup (tip lift), tip roundness 0..1, shade]
type Layer = [number, number, number, number, number, number, number?];
type Center = { r: number; c: string; cone?: number; dome?: number };
type Head =
  | { k: 'radial'; layers: Layer[]; center?: Center; stamen?: number }
  | { k: 'spike'; n: number; r: number; len: number; bell?: boolean; hang?: boolean }
  | { k: 'bells'; n: number; r: number }
  | { k: 'pom'; r: number; n: number; bead: number }
  | { k: 'cluster'; n: number; spread: number; layers: Layer[]; center?: Center; twig?: boolean }
  | { k: 'cactus' } | { k: 'pad'; layers: Layer[]; center?: Center } | { k: 'shroom' }
  | { k: 'bird' } | { k: 'crystal' } | { k: 'cattail' } | { k: 'cushion' };
type Spec = { h: number; bend?: number; nod?: number; leaves?: 'blade' | 'pair' | 'rosette' | 'trefoil'; glow?: number; snow?: boolean; head: Head };

const C = (r: number, c: string, extra: Partial<Center> = {}): Center => ({ r, c, ...extra });

const SPECS: Record<string, Spec> = {
  'Rose': { h: 0.95, leaves: 'pair', head: { k: 'radial', layers: [[5, .2, .19, 1.3, 0, 1, .8], [5, .25, .22, 1.0, .05, 1, .92], [6, .3, .25, .55, .1, 1]], center: C(.07, '#9f1239') } },
  'Tulip': { h: 0.9, leaves: 'blade', head: { k: 'radial', layers: [[3, .34, .2, 1.36, 0, .7], [3, .34, .2, 1.28, 0, .7, .85]] } },
  'Daisy': { h: 0.7, leaves: 'pair', head: { k: 'radial', layers: [[13, .26, .07, .1, .03, .6]], center: C(.085, '#facc15', { dome: .7 }) } },
  'Lavender': { h: 1.05, leaves: 'blade', head: { k: 'spike', n: 10, r: .065, len: .5 } },
  'Sunflower': { h: 1.7, nod: .55, leaves: 'pair', head: { k: 'radial', layers: [[16, .32, .11, .12, .05, .4], [16, .26, .1, .35, 0, .4, .88]], center: C(.21, '#5b2c0a', { dome: .45 }) } },
  'Lily': { h: 1.05, nod: .45, leaves: 'blade', head: { k: 'radial', layers: [[6, .4, .12, .6, .28, .2]], center: C(.04, '#fde68a'), stamen: .26 } },
  'Cactus Flower': { h: 0, head: { k: 'cactus' } },
  'Wild Orchid': { h: 0.8, bend: .3, nod: 1.1, leaves: 'rosette', head: { k: 'radial', layers: [[3, .3, .19, .2, .1, .9], [2, .24, .12, .7, 0, .5, .8]], center: C(.06, '#fef3c7') } },
  'Hydrangea': { h: 0.8, leaves: 'pair', head: { k: 'pom', r: .3, n: 30, bead: .075 } },
  'Poppy': { h: 0.95, bend: .15, nod: .2, leaves: 'pair', head: { k: 'radial', layers: [[4, .27, .25, .6, .08, 1]], center: C(.07, '#1f1a17') } },
  'Bluebell': { h: 0.75, bend: .3, head: { k: 'bells', n: 4, r: .075 }, leaves: 'blade' },
  'Peony': { h: 0.8, leaves: 'pair', head: { k: 'radial', layers: [[6, .2, .2, 1.3, 0, 1, 1.08], [7, .26, .24, 1.0, 0, 1], [8, .33, .27, .6, 0, 1, .9]] } },
  'Hibiscus': { h: 1.0, nod: .5, leaves: 'pair', head: { k: 'radial', layers: [[5, .36, .27, .4, .05, 1]], center: C(.05, '#fef3c7'), stamen: .3 } },
  'Marigold': { h: 0.6, leaves: 'pair', head: { k: 'radial', layers: [[10, .13, .1, 1.1, 0, 1, 1.05], [12, .18, .11, .65, 0, 1, .92], [12, .21, .12, .25, 0, 1, .8]] } },
  'Jasmine': { h: 0.8, leaves: 'pair', head: { k: 'cluster', n: 5, spread: .16, layers: [[5, .11, .04, .15, 0, 0]], center: C(.025, '#fde68a') } },
  'Daffodil': { h: 0.95, nod: 1.05, leaves: 'blade', head: { k: 'radial', layers: [[6, .24, .12, .12, 0, .3]], center: C(.09, '#f59e0b', { cone: .16 }) } },
  'Lotus': { h: 0, head: { k: 'pad', layers: [[8, .24, .13, .95, .05, .4], [8, .28, .15, .5, .05, .4, .9]], center: C(.08, '#fde047') } },
  'Cherry Blossom': { h: 0.9, bend: .1, head: { k: 'cluster', n: 6, spread: .3, twig: true, layers: [[5, .085, .075, .25, 0, 1]], center: C(.025, '#be185d') } },
  'Violet': { h: 0.42, nod: .7, leaves: 'rosette', head: { k: 'radial', layers: [[2, .15, .13, 1.0, 0, 1], [3, .15, .13, .2, 0, 1, .85]], center: C(.03, '#fde047') } },
  'Buttercup': { h: 0.55, leaves: 'trefoil', head: { k: 'radial', layers: [[5, .14, .14, .95, 0, 1, 1.05]], center: C(.05, '#f59e0b') } },
  'Snapdragon': { h: 1.0, leaves: 'blade', head: { k: 'spike', n: 6, r: .1, len: .42 } },
  'Camellia': { h: 0.7, leaves: 'pair', head: { k: 'radial', layers: [[6, .2, .2, 1.1, 0, 1, 1.05], [7, .27, .23, .5, 0, 1, .9]], center: C(.06, '#fecdd3') } },
  'Iris': { h: 1.1, leaves: 'blade', head: { k: 'radial', layers: [[3, .3, .12, 1.4, -.05, .4], [3, .32, .15, -.45, 0, .6, .85]], center: C(.035, '#fde047') } },
  'Magnolia': { h: 1.0, bend: .2, head: { k: 'radial', layers: [[6, .3, .16, 1.15, .05, .7, 1.02], [3, .34, .19, .6, 0, .7, .9]], center: C(.05, '#fce7f3') } },
  'Chrysanthemum': { h: 0.8, leaves: 'pair', head: { k: 'radial', layers: [[12, .12, .05, 1.2, 0, .3, 1.05], [14, .18, .05, .8, 0, .3, .95], [16, .25, .05, .35, 0, .3, .85]], center: C(.04, '#78350f') } },
  'Wisteria': { h: 1.25, bend: .45, head: { k: 'spike', n: 11, r: .07, len: .55, hang: true } },
  'Foxglove': { h: 1.35, leaves: 'rosette', head: { k: 'spike', n: 7, r: .085, len: .6, bell: true } },
  'Cosmos': { h: 1.0, bend: .2, head: { k: 'radial', layers: [[8, .27, .1, .1, .02, .9]], center: C(.06, '#fef08a') } },
  'Zinnia': { h: 0.7, leaves: 'pair', head: { k: 'radial', layers: [[10, .14, .08, .5, 0, 1, 1.05], [10, .21, .09, .15, 0, 1, .9]], center: C(.07, '#fbbf24', { dome: .8 }) } },
  'Anemone': { h: 0.7, leaves: 'rosette', head: { k: 'radial', layers: [[6, .22, .17, .3, .05, 1]], center: C(.085, '#1e293b') } },
  'Bird of Paradise': { h: 1.1, leaves: 'blade', head: { k: 'bird' } },
  'Plumeria': { h: 0.5, leaves: 'rosette', head: { k: 'radial', layers: [[5, .23, .14, .3, 0, 1]], center: C(.05, '#fef08a') } },
  'Passion Flower': { h: 0.7, leaves: 'pair', head: { k: 'radial', layers: [[10, .24, .07, .05, 0, .3], [22, .19, .015, .15, 0, 0, .55]], center: C(.07, '#14532d') } },
  'Frangipani': { h: 0.55, leaves: 'rosette', head: { k: 'radial', layers: [[5, .22, .13, .35, .05, 1]], center: C(.05, '#fbbf24') } },
  'Edelweiss': { h: 0.4, leaves: 'rosette', head: { k: 'radial', layers: [[8, .18, .07, .05, .02, 0], [5, .1, .06, .4, 0, 0, 1.05]], center: C(.07, '#fef9c3', { dome: .9 }) } },
  'Alpine Rose': { h: 0.45, leaves: 'rosette', head: { k: 'cluster', n: 4, spread: .14, layers: [[5, .09, .08, .7, 0, 1]], center: C(.02, '#fde68a') } },
  'Gentian': { h: 0.35, leaves: 'rosette', head: { k: 'radial', layers: [[5, .2, .1, 1.3, .18, .2]] } },
  'Columbine': { h: 0.95, nod: .9, leaves: 'trefoil', head: { k: 'radial', layers: [[5, .2, .09, .4, 0, .2], [5, .2, .04, -1.0, 0, 0, .75]], center: C(.045, '#fef08a') } },
  'Black-Eyed Susan': { h: 0.9, leaves: 'pair', head: { k: 'radial', layers: [[11, .24, .08, .03, -.03, .6]], center: C(.1, '#3b1d0a', { dome: .9 }) } },
  'Cornflower': { h: 0.85, leaves: 'blade', head: { k: 'radial', layers: [[12, .16, .06, .5, 0, 0], [6, .1, .05, .9, 0, 0, .7]], center: C(.04, '#1e3a8a') } },
  'Clover': { h: 0.35, leaves: 'trefoil', head: { k: 'pom', r: .11, n: 18, bead: .045 } },
  'Wildflower': { h: 0.6, bend: .15, leaves: 'pair', head: { k: 'cluster', n: 3, spread: .14, layers: [[6, .13, .09, .3, 0, 1]], center: C(.035, '#fef08a') } },
  'Water Lily': { h: 0, head: { k: 'pad', layers: [[8, .22, .1, .7, .05, .2], [8, .24, .11, .35, 0, .2, .9]], center: C(.06, '#fef08a') } },
  'Swamp Rose': { h: 0.85, leaves: 'pair', head: { k: 'radial', layers: [[5, .2, .19, .4, .05, 1]], center: C(.06, '#fbbf24') } },
  'Marsh Marigold': { h: 0.5, leaves: 'rosette', head: { k: 'radial', layers: [[5, .18, .16, .5, 0, 1, 1.05]], center: C(.06, '#ca8a04') } },
  'Cattail': { h: 1.4, leaves: 'blade', head: { k: 'cattail' } },
  'Arctic Poppy': { h: 0.45, nod: .2, head: { k: 'radial', layers: [[4, .2, .19, .85, .05, 1]], center: C(.05, '#422006') } },
  'Moss Campion': { h: 0, head: { k: 'cushion' } },
  'Purple Saxifrage': { h: 0.18, head: { k: 'cluster', n: 4, spread: .16, layers: [[5, .12, .07, .3, 0, 0]], center: C(.02, '#fde68a') } },
  'Snow Crocus': { h: 0.3, snow: true, head: { k: 'radial', layers: [[6, .2, .09, 1.3, 0, .4]], center: C(.03, '#f59e0b') } },
  'Moonflower': { h: 0.9, glow: 1.5, leaves: 'pair', head: { k: 'radial', layers: [[5, .3, .3, .45, .06, 1]], center: C(.05, '#c7d2fe') } },
  'Starbloom': { h: 0.7, glow: 1.9, head: { k: 'radial', layers: [[5, .25, .13, .05, 0, 0], [5, .14, .08, .5, 0, 0, 1.1]], center: C(.06, '#fffbeb') } },
  'Crystal Rose': { h: 0.75, glow: 1.35, leaves: 'pair', head: { k: 'crystal' } },
  'Fairy Bells': { h: 0.75, bend: .35, glow: 1.7, head: { k: 'bells', n: 3, r: .08 } },
  'Glowshroom': { h: 0, glow: 2.1, head: { k: 'shroom' } },
};

const GREEN = '#3f8a3a', LEAF = '#4f9a42', BROWN = '#6e4a2e';
const tmpC = new THREE.Color();

// One part = non-indexed geometry with a colour attribute.
class Kit {
  parts: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, color: string, m?: THREE.Matrix4, shadeBase = 1, shadeTip = 1, glow = 1) {
    let geo = g.index ? g.toNonIndexed() : g;
    geo.deleteAttribute('uv');
    if (m) geo.applyMatrix4(m);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    tmpC.set(color);
    // Vertical gradient inside the part, optional (petals use their own).
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < pos.count; i++) { y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); }
    for (let i = 0; i < pos.count; i++) {
      const t = y1 > y0 ? (pos.getY(i) - y0) / (y1 - y0) : 1;
      const s = (shadeBase + (shadeTip - shadeBase) * t) * glow;
      col.set([tmpC.r * s, tmpC.g * s, tmpC.b * s], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(geo);
  }
  addRaw(geo: THREE.BufferGeometry) { this.parts.push(geo); }
  build() {
    const g = mergeGeometries(this.parts)!;
    g.computeBoundingSphere();
    return g;
  }
}

// Flat petal along +z: rounded or pointy, tip lifted by `cup`. Base darker, tip lighter.
function petal(len: number, wid: number, cup: number, tip: number, color: string, shade = 1, glow = 1) {
  const w = wid / 2, tz = len * (0.55 + 0.25 * tip);
  const P = [
    [0, 0, 0], [-w * 0.55, cup * 0.08, len * 0.22], [-w, cup * 0.35, tz], [0, cup, len],
    [w, cup * 0.35, tz], [w * 0.55, cup * 0.08, len * 0.22],
  ];
  const tri = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5];
  const pos = new Float32Array(tri.length * 3), col = new Float32Array(tri.length * 3);
  tmpC.set(color);
  tri.forEach((v, i) => {
    pos.set(P[v], i * 3);
    const s = (0.7 + 0.38 * (P[v][2] / len)) * shade * glow;
    col.set([tmpC.r * s, tmpC.g * s, tmpC.b * s], i * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const M = () => new THREE.Matrix4();
const rotYX = (a: number, pitch: number) => M().makeRotationY(a).multiply(M().makeRotationX(-pitch));

function addLayers(kit: Kit, frame: THREE.Matrix4, layers: Layer[], color: string, glow: number) {
  layers.forEach(([n, len, wid, pitch, cup, tip, shade = 1], li) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + li * (Math.PI / n);
      const g = petal(len, wid, cup, tip, color, shade, glow);
      g.applyMatrix4(frame.clone().multiply(rotYX(a, pitch)));
      kit.addRaw(g);
    }
  });
}

function addCenter(kit: Kit, frame: THREE.Matrix4, c: Center, glow: number) {
  if (c.cone) {
    const g = new THREE.CylinderGeometry(c.r, c.r * 0.6, c.cone, 8, 1, true).translate(0, c.cone / 2, 0);
    kit.add(g, c.c, frame, 0.8, 1.1, glow);
    kit.add(new THREE.CircleGeometry(c.r * 0.6, 8).rotateX(-Math.PI / 2).translate(0, 0.01, 0), '#b45309', frame);
  } else {
    kit.add(new THREE.IcosahedronGeometry(c.r, 1).scale(1, c.dome ?? 0.6, 1), c.c, frame, 0.8, 1.1, glow);
  }
}

const bead = (r: number) => new THREE.IcosahedronGeometry(r, 0);

function buildHead(kit: Kit, frame: THREE.Matrix4, s: Spec, color: string) {
  const glow = s.glow ?? 1, h = s.head;
  const at = (x: number, y: number, z: number, extra?: THREE.Matrix4) => {
    const m = frame.clone().multiply(M().makeTranslation(x, y, z));
    return extra ? m.multiply(extra) : m;
  };
  switch (h.k) {
    case 'radial':
      addLayers(kit, frame, h.layers, color, glow);
      if (h.center) addCenter(kit, frame, h.center, glow);
      if (h.stamen) {
        kit.add(new THREE.CylinderGeometry(0.012, 0.012, h.stamen, 3).translate(0, h.stamen / 2, 0), '#fef3c7', at(0, 0, 0, M().makeRotationX(0.25)));
        kit.add(bead(0.03), '#f59e0b', at(0, h.stamen * 0.97, h.stamen * 0.25));
      }
      break;
    case 'spike':
      for (let i = 0; i < h.n; i++) {
        const t = i / (h.n - 1);
        const r = h.r * (1 - t * 0.55);
        const y = h.hang ? -t * h.len : t * h.len;
        const side = (i % 2 ? 1 : -1) * r * 0.5;
        if (h.bell) {
          const g = new THREE.ConeGeometry(r, r * 2.2, 6, 1, true).rotateX(Math.PI).rotateZ(side > 0 ? -0.7 : 0.7);
          kit.add(g, color, at(side * 1.6, y, 0, M().makeRotationY(i * 2.4)), 1.05, 0.75, glow);
        } else {
          kit.add(bead(r), color, at(side, y, (i % 3 - 1) * r * 0.4), 0.85, 1.1, glow);
        }
      }
      break;
    case 'bells':
      for (let i = 0; i < h.n; i++) {
        const x = 0.05 + i * 0.09, y = -0.04 - i * 0.03;
        kit.add(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 3).translate(0, -0.04, 0), GREEN, at(x, y + 0.04, 0));
        kit.add(new THREE.ConeGeometry(h.r, h.r * 1.9, 6, 1, true).rotateX(Math.PI).translate(0, -h.r * 0.9, 0), color, at(x, y - 0.03, 0), 1.1, 0.75, glow);
        kit.add(bead(h.r * 0.35), '#fef3c7', at(x, y - 0.13 - h.r, 0), 1, 1, glow);
      }
      break;
    case 'pom': {
      for (let i = 0; i < h.n; i++) {
        const y = 1 - (i / (h.n - 1)) * 1.4, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
        const g = bead(h.bead);
        const shade = 0.82 + ((i * 7) % 5) * 0.07;
        kit.add(g, color, at(Math.cos(a) * rr * h.r, y * h.r * 0.85 + h.r * 0.6, Math.sin(a) * rr * h.r), shade, shade, glow);
      }
      break;
    }
    case 'cluster':
      for (let i = 0; i < h.n; i++) {
        const a = i * 2.4, r = h.spread * (0.4 + (i % 3) * 0.3), up = 0.04 + (i % 2) * 0.06;
        const end = new THREE.Vector3(Math.cos(a) * r, up + 0.06, Math.sin(a) * r);
        const len = end.length();
        const stem = new THREE.CylinderGeometry(h.twig ? 0.014 : 0.008, h.twig ? 0.02 : 0.01, len, 3).translate(0, len / 2, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
        kit.add(stem, h.twig ? BROWN : GREEN, frame.clone().multiply(M().makeRotationFromQuaternion(q)));
        const f = at(end.x, end.y, end.z, M().makeRotationZ(-end.x * 2).multiply(M().makeRotationX(end.z * 2)));
        addLayers(kit, f, h.layers, color, glow);
        if (h.center) addCenter(kit, f, h.center, glow);
      }
      break;
    case 'cactus': {
      kit.add(new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8).translate(0, 0.3, 0), '#3f8f4f', frame, 0.75, 1.05);
      kit.add(new THREE.IcosahedronGeometry(0.15, 1).scale(1, 0.6, 1).translate(0, 0.6, 0), '#4ea35d', frame);
      kit.add(new THREE.CylinderGeometry(0.06, 0.07, 0.25, 6).translate(0, 0.12, 0), '#3f8f4f', at(0.2, 0.25, 0, M().makeRotationZ(-0.4)));
      kit.add(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 6).translate(0, 0.1, 0), '#3f8f4f', at(-0.19, 0.32, 0, M().makeRotationZ(0.5)));
      const top = at(0, 0.68, 0);
      addLayers(kit, top, [[6, .12, .07, .75, 0, .5]], color, glow);
      addCenter(kit, top, C(.03, '#fde68a'), glow);
      break;
    }
    case 'pad': {
      kit.add(new THREE.CircleGeometry(0.42, 11, 0.3, Math.PI * 2 - 0.6).rotateX(-Math.PI / 2).translate(0, 0.03, 0), '#2f8a3e', frame);
      const f = at(0, 0.05, 0);
      addLayers(kit, f, h.layers, color, glow);
      if (h.center) addCenter(kit, f, h.center, glow);
      break;
    }
    case 'shroom': {
      kit.add(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6).translate(0, 0.15, 0), '#f5f0e6', frame, 0.8, 1.2, glow * 0.6);
      kit.add(new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.28, 0), color, frame, 0.7, 1.1, glow);
      for (let i = 0; i < 5; i++) kit.add(bead(0.025), '#ecfeff', at(Math.cos(i * 1.3) * 0.12, 0.38 - (i % 2) * 0.03, Math.sin(i * 1.3) * 0.12), 1, 1, glow);
      kit.add(new THREE.SphereGeometry(0.11, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0.22, 0.14, 0.05), color, frame, 0.7, 1.1, glow);
      kit.add(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 5).translate(0.22, 0.07, 0.05), '#f5f0e6', frame, 1, 1, glow * 0.6);
      break;
    }
    case 'bird': {
      kit.add(new THREE.ConeGeometry(0.05, 0.42, 5).rotateZ(Math.PI / 2).translate(0.15, 0, 0), '#4c6b3a', frame, 0.8, 1);
      for (let i = 0; i < 3; i++) {
        const g = petal(0.32 - i * 0.04, 0.06, 0.05, 0, '#f97316', 1.05, glow);
        g.applyMatrix4(at(0.02 + i * 0.03, 0.02, 0, M().makeRotationY(Math.PI / 2 + (i - 1) * 0.35).multiply(M().makeRotationX(-1.05))));
        kit.addRaw(g);
      }
      const t = petal(0.22, 0.05, 0.02, 0, '#5b21b6', 1, glow);
      t.applyMatrix4(at(0.05, 0.02, 0, M().makeRotationY(Math.PI / 2).multiply(M().makeRotationX(-0.5))));
      kit.addRaw(t);
      break;
    }
    case 'crystal':
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05, tilt = i ? 0.55 : 0;
        const g = new THREE.OctahedronGeometry(0.08, 0).scale(0.7, 1.8, 0.7).translate(0, 0.12, 0);
        kit.add(g, color, frame.clone().multiply(M().makeRotationY(a)).multiply(M().makeRotationX(tilt)), 0.8, 1.25, glow);
      }
      break;
    case 'cattail':
      kit.add(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 7).translate(0, 0.16, 0), color, frame, 0.85, 1.05);
      kit.add(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 3).translate(0, 0.4, 0), '#a3a35a', frame);
      break;
    case 'cushion':
      kit.add(new THREE.IcosahedronGeometry(0.32, 1).scale(1, 0.38, 1).translate(0, 0.04, 0), '#3d7a3a', frame, 0.75, 1.05);
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996, r = 0.26 * Math.sqrt((i + 0.5) / 14);
        kit.add(bead(0.04), color, at(Math.cos(a) * r, 0.14 - r * 0.25, Math.sin(a) * r), 0.95, 1.1, glow);
      }
      break;
  }
}

function addLeaves(kit: Kit, s: Spec, stemAt: (t: number) => THREE.Vector3) {
  const leaf = (len: number, wid: number, m: THREE.Matrix4, color = LEAF) => {
    const g = petal(len, wid, 0.06, 0.3, color, 0.95);
    g.applyMatrix4(m);
    kit.addRaw(g);
  };
  switch (s.leaves) {
    case 'blade':
      for (let i = 0; i < 3; i++) leaf(s.h * 0.55, 0.07, rotYX(i * 2.1 + 0.4, 1.15 - i * 0.12), i % 2 ? LEAF : '#3e8a3b');
      break;
    case 'pair':
      for (let i = 0; i < 2; i++) {
        const p = stemAt(0.35 + i * 0.15);
        leaf(0.18 + s.h * 0.1, 0.09, M().makeTranslation(p.x, p.y, p.z).multiply(rotYX(i * Math.PI + 0.5, 0.45)));
      }
      break;
    case 'rosette':
      for (let i = 0; i < 5; i++) leaf(0.2, 0.11, rotYX(i * 1.26, 0.18), i % 2 ? LEAF : '#438f3e');
      break;
    case 'trefoil':
      for (let i = 0; i < 3; i++) leaf(0.1, 0.1, M().makeTranslation(0, 0.04, 0).multiply(rotYX(i * 2.09, 0.1)), '#3f8f45');
      break;
  }
}

const cache = new Map<string, THREE.BufferGeometry>();

export function flowerGeometry(type: string): THREE.BufferGeometry {
  const hit = cache.get(type);
  if (hit) return hit;
  const s = SPECS[type] ?? SPECS['Wildflower'];
  const color = FLOWER_COLORS[type] ?? '#f472b6';
  const kit = new Kit();
  let frame = M();
  let stemAt = (t: number) => new THREE.Vector3(0, s.h * t, 0);
  if (s.h > 0) {
    const bend = s.bend ?? 0;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, s.h * 0.7, 0), new THREE.Vector3(bend, s.h, 0));
    stemAt = t => curve.getPoint(t);
    kit.add(new THREE.TubeGeometry(curve, 4, 0.022 + s.h * 0.008, 4, false), s.head.k === 'cattail' ? '#5f7a35' : GREEN, undefined, 0.7, 1.05);
    const top = curve.getPoint(1), tan = curve.getTangent(1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    frame = M().makeTranslation(top.x, top.y, top.z).multiply(M().makeRotationFromQuaternion(q)).multiply(M().makeRotationZ(-(s.nod ?? 0)));
  }
  if (s.snow) kit.add(new THREE.CircleGeometry(0.28, 9).rotateX(-Math.PI / 2).translate(0, 0.02, 0), '#f8fafc');
  addLeaves(kit, s, stemAt);
  buildHead(kit, frame, s, color);
  const g = kit.build();
  cache.set(type, g);
  return g;
}

export const FLOWER_TYPES = Object.keys(SPECS);
