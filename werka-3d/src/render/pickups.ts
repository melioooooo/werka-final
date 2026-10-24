// Trinkets and kisses: tiny toon trinkets (one vertex-coloured geometry each, so the pickup glow and
// fly-to-basket effects can reuse them), hovering with a bob, a slow spin and a star glint now and then.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Pickup } from '../world/generate.ts';
import { toon, addOutlines } from './toon.ts';

type Part = [THREE.BufferGeometry, string];
const S = (r: number, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h);

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.3, -0.55, -0.1, -0.5, 0.18);
  s.bezierCurveTo(-0.45, 0.48, -0.08, 0.5, 0, 0.25);
  s.bezierCurveTo(0.08, 0.5, 0.45, 0.48, 0.5, 0.18);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.3, 0, -0.5);
  return s;
}
const heart = (depth: number, bevel: number) =>
  new THREE.ExtrudeGeometry(heartShape(), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -depth / 2);

function starGeo() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.2 : 0.48;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1 }).translate(0, 0, -0.04);
}

// Each model is roughly 0.6 units across, centred on its middle.
const MODELS: Record<string, () => Part[]> = {
  ribbon: () => [
    [new THREE.TorusGeometry(0.16, 0.06, 6, 12).scale(1.2, 0.8, 0.6).translate(-0.19, 0.04, 0), '#f472b6'],
    [new THREE.TorusGeometry(0.16, 0.06, 6, 12).scale(1.2, 0.8, 0.6).translate(0.19, 0.04, 0), '#f472b6'],
    [S(0.08).scale(1, 1, 0.8), '#db2777'],
    [new THREE.BoxGeometry(0.09, 0.3, 0.03).translate(0, -0.15, 0).rotateZ(0.45), '#ec4899'],
    [new THREE.BoxGeometry(0.09, 0.3, 0.03).translate(0, -0.15, 0).rotateZ(-0.45), '#ec4899'],
  ],
  button: () => [
    [new THREE.CylinderGeometry(0.28, 0.28, 0.07, 18).rotateX(Math.PI / 2), '#94a3b8'],
    [new THREE.TorusGeometry(0.25, 0.035, 5, 18), '#cbd5e1'],
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]): Part =>
      [new THREE.CylinderGeometry(0.035, 0.035, 0.09, 6).rotateX(Math.PI / 2).translate(x * 0.07, y * 0.07, 0.01), '#334155']),
  ],
  shell: () => [
    ...Array.from({ length: 7 }, (_, i): Part => {
      const a = (i / 6 - 0.5) * 2.2;
      return [S(0.1, 6, 4).scale(0.75, 2.6, 0.5).translate(0, 0.24, 0).rotateZ(a), i % 2 ? '#fcd5ce' : '#f8b4a6'];
    }),
    [new THREE.BoxGeometry(0.18, 0.09, 0.08).translate(0, -0.02, 0), '#e9967a'],
  ],
  marble: () => [
    [S(0.24, 14, 10), '#818cf8'],
    [new THREE.TorusGeometry(0.21, 0.035, 5, 16).rotateX(1.1).rotateZ(0.5), '#e0e7ff'],
    [S(0.06).translate(-0.09, 0.1, 0.17), '#ffffff'],
  ],
  feather: () => [
    [S(0.15, 10, 6).scale(0.8, 2.4, 0.18).translate(0, 0.06, 0), '#38bdf8'],
    [S(0.1, 8, 5).scale(0.75, 1.3, 0.2).translate(0, 0.25, 0.01), '#0ea5e9'],
    [new THREE.CylinderGeometry(0.018, 0.012, 0.62, 5).translate(0, 0, 0.03), '#f0f9ff'],
  ].map(([g, c]) => [(g as THREE.BufferGeometry).rotateZ(-0.5), c] as Part),
  key: () => [
    [new THREE.TorusGeometry(0.11, 0.04, 6, 12).translate(-0.24, 0, 0), '#d4a017'],
    [new THREE.CylinderGeometry(0.035, 0.035, 0.4, 6).rotateZ(Math.PI / 2).translate(0.06, 0, 0), '#d4a017'],
    [new THREE.BoxGeometry(0.05, 0.11, 0.05).translate(0.2, -0.06, 0), '#b8860b'],
    [new THREE.BoxGeometry(0.05, 0.08, 0.05).translate(0.12, -0.05, 0), '#b8860b'],
  ],
  ring: () => [
    [new THREE.TorusGeometry(0.2, 0.05, 8, 18), '#e5e7eb'],
    [new THREE.OctahedronGeometry(0.1).scale(1, 1.2, 1).translate(0, 0.27, 0), '#f472b6'],
  ],
  acorn: () => [
    [S(0.17, 10, 8).scale(1, 1.25, 1).translate(0, -0.06, 0), '#c27c0e'],
    [S(0.2, 10, 6, ).scale(1, 0.55, 1).translate(0, 0.12, 0), '#78350f'],
    [new THREE.CylinderGeometry(0.025, 0.03, 0.12, 5).translate(0.02, 0.24, 0).rotateZ(-0.2), '#5b3a1a'],
  ],
  pebble: () => [[heart(0.16, 0.08).scale(0.55, 0.55, 1), '#a8a29e']],
  butterfly: () => [
    ...[-1, 1].flatMap((s): Part[] => [
      [S(0.15, 8, 5).scale(1, 1.2, 0.15).translate(s * 0.15, 0.08, 0).rotateY(s * 0.35), '#a78bfa'],
      [S(0.1, 8, 5).scale(1, 1.1, 0.15).translate(s * 0.12, -0.13, 0).rotateY(s * 0.35), '#c4b5fd'],
      [S(0.04, 6, 4).translate(s * 0.17, 0.1, 0.03).rotateY(s * 0.35), '#fde68a'],
    ]),
    [new THREE.CapsuleGeometry(0.03, 0.26, 3, 6), '#3b2a52'],
  ],
  star: () => [[starGeo().scale(0.75, 0.75, 1), '#fde047']],
  kiss: () => [[heart(0.12, 0.06).scale(0.6, 0.6, 1), '#f472b6']],
  golden_kiss: () => [[heart(0.14, 0.07).scale(0.72, 0.72, 1), '#f5c542'], [S(0.07).translate(-0.13, 0.12, 0.12), '#fff7cc']],
};

const cache = new Map<string, THREE.BufferGeometry>();
export function pickupGeometry(type: string) {
  let g = cache.get(type);
  if (g) return g;
  const col = new THREE.Color();
  const parts = (MODELS[type] ?? MODELS.pebble)().map(([geo, c]) => {
    const p = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
    col.set(c);
    const n = p.attributes.position.count;
    p.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, i) => [col.r, col.g, col.b][i % 3]), 3));
    return p;
  });
  g = mergeGeometries(parts)!;
  g.computeBoundingSphere();
  cache.set(type, g);
  return g;
}

export const pickupMat = toon({ vertexColors: true, rim: 0.7 });
const glowMat = toon({ vertexColors: true, rim: 1, emissive: '#5a3a00' });

// Four-point star glint, drawn once to a canvas.
const glintTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,245,200,0.6)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  x.fillStyle = g;
  x.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, r = i % 2 ? 5 : 32;
    x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  x.fill();
  return new THREE.CanvasTexture(c);
})();
const glintMat = new THREE.SpriteMaterial({ map: glintTex, color: '#fff6d8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });

const shadowMat = new THREE.MeshBasicMaterial({ color: '#1c3340', transparent: true, opacity: 0.25, depthWrite: false });
const HOVER = 0.95, SIZE = 1.7;
export function buildPickups(list: Pickup[], ground: (x: number, z: number) => number) {
  const group = new THREE.Group();
  const items = list.map((p, i) => {
    const m = new THREE.Mesh(pickupGeometry(p.type), p.type === 'star' ? glowMat : pickupMat);
    m.scale.setScalar(SIZE);
    m.castShadow = true;
    addOutlines(m, 0.035);
    const glint = new THREE.Sprite(glintMat);
    glint.scale.setScalar(0);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 14).rotateX(-Math.PI / 2), shadowMat);
    const y = ground(p.x, p.z);
    shadow.position.set(p.x, y + 0.05, p.z);
    m.position.set(p.x, y + HOVER, p.z);
    group.add(m, glint, shadow);
    return { p, m, glint, shadow, y, ph: i * 1.7 };
  });
  const byId = new Map(items.map(it => [it.p.id, it]));

  const hide = (id: string) => {
    const it = byId.get(id);
    if (it) it.m.visible = it.shadow.visible = it.glint.visible = false;
  };
  const pose = (id: string) => byId.get(id)!.m.matrixWorld;
  const update = (time: number, near: THREE.Vector3) => {
    for (const it of items) {
      if (!it.m.visible || Math.abs(it.p.x - near.x) > 60 || Math.abs(it.p.z - near.z) > 50) continue;
      const kiss = it.p.type === 'kiss';
      const bob = Math.sin(time * (kiss ? 2.2 : 1.6) + it.ph) * (kiss ? 0.16 : 0.1);
      it.m.position.set(it.p.x, it.y + HOVER + bob, it.p.z);
      it.m.rotation.set(0, kiss ? Math.sin(time * 1.4 + it.ph) * 0.6 : time * 0.9 + it.ph, kiss ? 0 : Math.sin(time * 1.2 + it.ph) * 0.15);
      // Kisses beat softly like a heart.
      const beat = kiss ? 1 + Math.max(0, Math.sin(time * 5 + it.ph)) ** 8 * 0.18 : 1;
      it.m.scale.setScalar(SIZE * beat);
      it.m.updateMatrixWorld();
      it.shadow.scale.setScalar(1 - bob * 0.8);
      // Glint: a quick star flash every ~3 s, offset per pickup.
      const g = (time * 0.33 + it.ph * 0.37) % 1;
      const k = g < 0.12 ? Math.sin((g / 0.12) * Math.PI) : 0;
      it.glint.scale.setScalar(k * 1.5);
      it.glint.position.set(it.p.x + 0.22, it.m.position.y + 0.25, it.p.z + 0.15);
      it.glint.material.rotation = time;
    }
  };
  return { group, hide, pose, update };
}

// Hearts that pop up and drift away (golden kiss, kiss pickups).
export function heartBurst(scene: THREE.Scene) {
  const N = 14;
  const mesh = new THREE.InstancedMesh(heart(0.08, 0.04).scale(0.3, 0.3, 1), toon({ color: '#ffffff', rim: 0.6 }), N);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const parts = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color();
  let t = 9;
  const fire = (at: THREE.Vector3, gold = false) => {
    parts.forEach((pt, i) => {
      pt.p.copy(at);
      const a = (i / N) * Math.PI * 2;
      pt.v.set(Math.cos(a) * (1 + Math.random()), 3 + Math.random() * 2.5, Math.sin(a) * (1 + Math.random()));
      pt.s = 0.7 + Math.random() * 0.8;
      mesh.setColorAt(i, col.set(gold && i % 2 ? '#f5c542' : i % 3 ? '#f472b6' : '#fb7185'));
    });
    mesh.instanceColor!.needsUpdate = true;
    t = 0; mesh.visible = true;
  };
  const update = (dt: number, cam: THREE.Camera) => {
    if (t > 1.6) { mesh.visible = false; return; }
    t += dt;
    const k = Math.min(1, t / 1.6);
    parts.forEach((pt, i) => {
      pt.v.y -= 2.5 * dt;
      pt.v.x *= 0.97; pt.v.z *= 0.97;
      pt.p.addScaledVector(pt.v, dt);
      const s = pt.s * Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k * k);
      mesh.setMatrixAt(i, m4.compose(pt.p, q.copy(cam.quaternion), sc.setScalar(s)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { fire, update };
}
