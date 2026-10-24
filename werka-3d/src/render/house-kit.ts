// Interior building kit: vertex-coloured toon parts (so a whole room bakes into a few meshes)
// and the small trinket models shown on the treasure shelf.
import * as THREE from 'three';
import { toon, gradient } from './toon.ts';

export const solidMat = toon({ vertexColors: true, rim: 0.25 });
export const flatMat = toon({ vertexColors: true, rim: 0.05 });

const tint = new THREE.Color();
// Bake colour x bottom-dark/top-light ramp into the geometry.
export function paint(geo: THREE.BufferGeometry, color: string, lo = 0.82, hi = 1.06) {
  const g = gradient(geo, lo, hi);
  tint.set(color);
  const c = g.attributes.color;
  for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b);
  return g;
}

export type Add = (g: THREE.BufferGeometry, color: string, x?: number, y?: number, z?: number) => THREE.Mesh;
// Returns a part factory that drops painted meshes into `root`.
export function adder(root: THREE.Object3D, mat: THREE.Material = solidMat, lo = 0.82, hi = 1.06): Add {
  const flat = mat !== solidMat;
  return (g, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(paint(g, color, lo, hi), mat);
    m.position.set(x, y, z);
    m.castShadow = !flat;
    m.receiveShadow = true;
    m.userData.noOutline = flat;
    root.add(m);
    return m;
  };
}

export const Box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const Cyl = (rt: number, rb: number, h: number, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
export const Ico = (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const Torus = (r: number, t: number, s = 10) => new THREE.TorusGeometry(r, t, 4, s);

// Seeded random so the room is the same every visit.
let seed = 7;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

// Heart, centred, roughly 0.31 wide x 0.28 tall.
export function heart(a: Add, color: string, s = 1, y = 0) {
  for (const x of [-0.065, 0.065]) a(new THREE.SphereGeometry(0.09 * s, 10, 6).scale(1, 1, 0.55), color, x * s, y + 0.04 * s);
  a(new THREE.ConeGeometry(0.152 * s, 0.2 * s, 12).rotateX(Math.PI).scale(1, 1, 0.55), color, 0, y - 0.07 * s);
}

function star(a: Add, color: string, r = 0.17) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r * 0.42 : r;
    i ? sh.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : sh.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  return a(new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false }).translate(0, 0, -0.035), color);
}

// Trinket models, standing on y = 0, ~0.3-0.4 tall, facing +z.
export const TRINKETS: Record<string, (a: Add, g: THREE.Group) => void> = {
  ribbon: a => {
    for (const s of [-1, 1]) {
      a(Torus(0.09, 0.035).scale(1.2, 0.8, 0.6), '#f472b6', s * 0.11, 0.24).rotation.z = s * 0.3;
      a(Box(0.06, 0.2, 0.03), '#ec4899', s * 0.06, 0.1).rotation.z = s * 0.35;
    }
    a(Ico(0.05, 1), '#db2777', 0, 0.24);
  },
  button: a => {
    a(Cyl(0.15, 0.15, 0.05, 14).rotateX(Math.PI / 2), '#94a3b8', 0, 0.16);
    a(Torus(0.13, 0.02, 14), '#64748b', 0, 0.16, 0.025);
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) a(Cyl(0.018, 0.018, 0.02, 5).rotateX(Math.PI / 2), '#334155', x * 0.04, 0.16 + y * 0.04, 0.03);
  },
  shell: a => {
    a(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), '#fcd5ce', 0, 0.07);
    for (let i = 0; i < 5; i++) {
      const t = 0.35 + (i / 4) * (Math.PI - 0.7);
      a(Box(0.025, 0.15, 0.03), '#f4a99c', Math.cos(t) * 0.09, 0.07 + Math.sin(t) * 0.08, 0.03).rotation.z = t - Math.PI / 2;
    }
    a(Box(0.1, 0.05, 0.05), '#f4a99c', 0, 0.05);
  },
  marble: a => {
    a(Torus(0.08, 0.025), '#a8885a', 0, 0.025).rotation.x = Math.PI / 2;
    a(new THREE.SphereGeometry(0.13, 12, 8), '#818cf8', 0, 0.15);
    a(Torus(0.08, 0.015).rotateY(0.6), '#c7d2fe', 0, 0.15);
    a(new THREE.SphereGeometry(0.03, 6, 4), '#ffffff', -0.05, 0.21, 0.09);
  },
  feather: (_, g) => {
    const f = new THREE.Group();
    const af = adder(f);
    af(Ico(0.1, 1).scale(0.6, 1.9, 0.25), '#38bdf8', 0, 0.2);
    af(Ico(0.05, 1).scale(0.6, 1.6, 0.25), '#0ea5e9', 0, 0.36);
    af(Cyl(0.01, 0.012, 0.42, 4), '#e0f2fe', 0, 0.19, 0.02);
    f.rotation.z = -0.35;
    f.position.x = 0.06;
    g.add(f);
  },
  key: (_, g) => {
    const k = new THREE.Group();
    const ak = adder(k);
    ak(Torus(0.07, 0.025), '#d4a017', 0, 0.3);
    ak(Box(0.04, 0.24, 0.03), '#d4a017', 0, 0.13);
    ak(Box(0.07, 0.03, 0.03), '#b8860b', 0.035, 0.04);
    ak(Box(0.05, 0.03, 0.03), '#b8860b', 0.025, 0.09);
    k.rotation.z = 0.25;
    g.add(k);
  },
  ring: a => {
    a(Torus(0.1, 0.028, 14), '#e5e7eb', 0, 0.13);
    a(Ico(0.05, 0), '#f472b6', 0, 0.25);
  },
  acorn: a => {
    a(new THREE.SphereGeometry(0.11, 10, 8).scale(1, 1.25, 1), '#c58a2a', 0, 0.14);
    a(new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#7c4a12', 0, 0.2);
    a(Cyl(0.015, 0.02, 0.08, 5), '#5a3508', 0, 0.33);
  },
  pebble: a => heart(a, '#a8a29e', 1.15, 0.17),
  butterfly: a => {
    for (const s of [-1, 1]) {
      a(new THREE.CircleGeometry(0.11, 10).scale(1, 1.15, 1), '#a78bfa', s * 0.1, 0.25).rotation.y = s * 0.45;
      a(new THREE.CircleGeometry(0.075, 8), '#c4b5fd', s * 0.08, 0.11).rotation.y = s * 0.45;
    }
    a(Cyl(0.022, 0.018, 0.28, 5), '#3b2f4a', 0, 0.19);
  },
  star: a => { star(a, '#fde047').position.y = 0.19; },
  kiss: a => heart(a, '#f472b6', 1, 0.18),
  golden_kiss: a => heart(a, '#f5c542', 1.35, 0.24),
};
