// Cottage interior (dollhouse cut-away, front wall open), the treasure shelf and the gallery scene.
import * as THREE from 'three';
import { buildBouquet } from './bouquet.ts';
import { toon, addOutlines, outline, bake } from './toon.ts';
import { adder, flatMat, solidMat, paint, Box, Cyl, Ico, Torus, rnd, pick, heart, TRINKETS, type Add } from './house-kit.ts';

const lam = (color: string) => toon({ color, rim: 0.25 });

// Furniture footprints {x, z, hw, hd} used for collision.
const SOLID = [
  { x: 0, z: -3.7, hw: 1.75, hd: 0.95 }, // crafting table
  { x: -5.1, z: -4.4, hw: 1.95, hd: 1.0 }, // fireplace + log pile
  { x: 4.8, z: -4.75, hw: 1.85, hd: 0.5 }, // treasure dresser
  { x: -5.95, z: -0.9, hw: 1.05, hd: 1.95 }, // bed
  { x: 6.6, z: -1.5, hw: 0.45, hd: 1.15 }, // pantry shelves
  { x: 5.55, z: 2.05, hw: 0.95, hd: 0.9 }, // armchair
  { x: 6.45, z: 3.6, hw: 0.35, hd: 0.35 }, // floor lamp
  { x: 4.55, z: 3.45, hw: 0.35, hd: 0.35 }, // knitting basket
  { x: -6.55, z: 2.75, hw: 0.45, hd: 0.85 }, // bench
  { x: -6.15, z: 4.85, hw: 0.6, hd: 0.6 }, // potted plant
  { x: 6.15, z: 5.15, hw: 0.45, hd: 0.45 }, // flower bucket
];
export const ROOM = { hw: 6.6, back: -4.6, front: 6 };
export const TABLE = { x: 0, z: -2.4 }; // stand here to craft
export const EXIT = { x: 0, z: 5.6 }; // door mat

export function interiorBlocked(x: number, z: number, r = 0.45) {
  if (Math.abs(x) > ROOM.hw - r || z < ROOM.back + r || z > ROOM.front) return true;
  return SOLID.some(s => Math.abs(x - s.x) < s.hw + r && Math.abs(z - s.z) < s.hd + r);
}

// Fit the room on any screen: whole width on landscape, ~11 units on portrait with a gentle pan.
const PITCH = THREE.MathUtils.degToRad(50);
export function interiorCamera(cam: THREE.PerspectiveCamera, target: THREE.Vector3) {
  const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const fitW = cam.aspect < 1 ? 11 : 15.5;
  const dist = Math.max(14.2 / (2 * tv), fitW / (2 * tv * cam.aspect));
  const pan = Math.max(0, (14.8 - 2 * dist * tv * cam.aspect) / 2);
  const x = THREE.MathUtils.clamp(target.x * 0.8, -pan, pan) + target.x * 0.05;
  const lz = -0.55 + (target.z - 1) * 0.08, ly = 0.9;
  cam.position.set(x, ly + Math.sin(PITCH) * dist, lz + Math.cos(PITCH) * dist);
  cam.lookAt(x, ly, lz);
}

// Soft canvas textures for fake light: radial pool and a beam that fades downward.
function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void, s = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = s;
  draw(c.getContext('2d')!, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const poolTex = canvasTex((g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});
const beamTex = canvasTex((g, s) => {
  const h = g.createLinearGradient(0, 0, s, 0);
  h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.2, 'rgba(255,255,255,1)');
  h.addColorStop(0.8, 'rgba(255,255,255,1)'); h.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = h; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, 0, s);
  v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, s, s);
});
const additive = (map: THREE.Texture) => new THREE.MeshBasicMaterial({
  map, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
});
const glow = (c: string, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

// Shared per-frame state, set up by buildInterior().
const paneMat = glow('#fff1cc', 1.5);
const bulbMat = glow('#ffcf70', 2.2);
const shadeMat = glow('#ffd9a0', 1.15);
const shaftMat = additive(beamTex);
const poolMat = additive(poolTex);
const glassMat = toon({ color: '#d8eef2', transparent: true, opacity: 0.28, rim: 0.9, depthWrite: false });
const outlineMat = outline('#1f2a2c', 0.022);

// --- Treasures --------------------------------------------------------------------------
const SLOTS = ['star', 'butterfly', 'marble', 'ring', 'shell', 'feather', 'key', 'button', 'ribbon', 'acorn', 'pebble', 'kiss'];
const SHELF = { x: 4.8, z: -4.92, rows: [3.45, 2.6, 1.75], cols: [-1.2, -0.4, 0.4, 1.2] };
let treasureState = { items: [] as string[], kisses: 0 };
let treasureHost: THREE.Group | null = null;
let goldHeart: THREE.Object3D | null = null;
let plaque: { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D } | null = null;

function drawPlaque(n: number) {
  if (!plaque) return;
  const g = plaque.ctx, w = g.canvas.width, h = g.canvas.height;
  g.fillStyle = '#6b4226'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f6ead2'; g.fillRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#e0567f';
  const hx = 62, hy = 68, r = 22;
  g.beginPath();
  g.moveTo(hx, hy + r * 1.3);
  g.bezierCurveTo(hx - r * 2.2, hy, hx - r * 1.1, hy - r * 1.5, hx, hy - r * 0.5);
  g.bezierCurveTo(hx + r * 1.1, hy - r * 1.5, hx + r * 2.2, hy, hx, hy + r * 1.3);
  g.fill();
  g.fillStyle = '#4a2c18';
  g.font = 'bold 64px Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`${n}`, 165, 70);
  plaque.tex.needsUpdate = true;
}

function rebuildTreasures() {
  if (!treasureHost) return;
  for (const c of [...treasureHost.children]) {
    treasureHost.remove(c);
    c.traverse(o => { if ((o as THREE.Mesh).isMesh && !o.userData.shared) (o as THREE.Mesh).geometry.dispose(); });
  }
  const { items, kisses } = treasureState;
  const have = new Set(items);
  if (kisses > 0) have.add('kiss');
  const g = new THREE.Group();
  SLOTS.forEach((id, i) => {
    if (!have.has(id)) return;
    const t = new THREE.Group();
    TRINKETS[id](adder(t), t);
    t.position.set(SHELF.x + SHELF.cols[i % 4], SHELF.rows[Math.floor(i / 4)] + 0.06, SHELF.z + 0.05);
    g.add(t);
  });
  // Kiss jar: one little heart per kiss (up to 14), plus the counter plaque.
  const n = Math.min(kisses, 14);
  for (let i = 0; i < n; i++) {
    const t = new THREE.Group();
    heart(adder(t), i % 3 ? '#f472b6' : '#fb7185', 0.42);
    const ring = i % 5, layer = Math.floor(i / 5);
    t.position.set(3.75 + Math.cos(ring * 1.3 + layer) * 0.12, 1.12 + layer * 0.13 + (ring % 2) * 0.05, -4.55 + Math.sin(ring * 1.3 + layer) * 0.08);
    t.rotation.set(0.3 * Math.sin(i), i * 0.9, 0.4 * Math.cos(i * 1.7));
    g.add(t);
  }
  const baked = bake(g);
  addHulls(baked);
  treasureHost.add(baked);
  goldHeart = null;
  if (have.has('golden_kiss')) {
    const t = new THREE.Group();
    TRINKETS.golden_kiss(adder(t), t);
    const gb = bake(t);
    addHulls(gb);
    gb.position.set(SHELF.x, 4.42, SHELF.z + 0.12);
    treasureHost.add(gb);
    goldHeart = gb;
  }
  drawPlaque(kisses);
}

// Collect first: adding hulls while traversing would visit the new hulls forever.
function addHulls(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) { const h = new THREE.Mesh(m.geometry, outlineMat); h.userData.shared = true; m.add(h); }
}

// Called by gameplay whenever the pocket or kiss counter changes.
export function setHouseTreasures(items: string[], kissesTotal: number) {
  treasureState = { items: [...items], kisses: Math.max(0, kissesTotal | 0) };
  rebuildTreasures();
}

// --- Room -------------------------------------------------------------------------------
const WOOD = '#8a5530', DARK = '#5e3a1e', BEAM = '#6b4226', PLASTER = '#f1e1c1', STONE = ['#a39482', '#8f8172', '#b2a38f', '#857868'];

function windowAt(root: THREE.Object3D, x: number, y: number, z: number, ry: number, w: number, h: number) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  root.add(g);
  const a = adder(g);
  const pane = new THREE.Mesh(Box(w, h, 0.04), paneMat);
  pane.userData.noOutline = true;
  g.add(pane);
  const f = 0.14;
  a(Box(w + f * 2, f, 0.16), BEAM, 0, h / 2 + f / 2, 0.06);
  a(Box(w + f * 2, f, 0.16), BEAM, 0, -h / 2 - f / 2, 0.06);
  for (const s of [-1, 1]) a(Box(f, h, 0.16), BEAM, s * (w / 2 + f / 2), 0, 0.06);
  a(Box(0.07, h, 0.08), BEAM, 0, 0, 0.04);
  a(Box(w, 0.07, 0.08), BEAM, 0, 0, 0.04);
  a(Box(w + 0.6, 0.1, 0.38), WOOD, 0, -h / 2 - 0.2, 0.17); // sill
  // Curtains, tie-backs and a valance.
  for (const s of [-1, 1]) {
    a(Box(0.42, h + 0.5, 0.08), '#e898aa', s * (w / 2 + 0.3), 0.05, 0.2);
    a(Box(0.46, 0.08, 0.12), '#c0607a', s * (w / 2 + 0.3), -h * 0.15, 0.22);
  }
  a(Box(w + 1.3, 0.26, 0.14), '#d97d95', 0, h / 2 + 0.32, 0.22);
  // Sill pots.
  for (const s of [-0.32, 0.3]) {
    a(Cyl(0.13, 0.1, 0.22, 8), '#c4683c', s * w, -h / 2 - 0.04, 0.2);
    for (let i = 0; i < 4; i++) a(Ico(0.09, 0).scale(0.6, 1.3, 0.6), '#5f9150', s * w + Math.sin(i * 2) * 0.07, -h / 2 + 0.13 + (i % 2) * 0.06, 0.2 + Math.cos(i * 2) * 0.05).rotation.z = Math.sin(i * 2) * 0.4;
  }
  return g;
}

// One sloped light sheet from a window edge (top) down to the floor (bottom).
function sheet(root: THREE.Object3D, tl: number[], tr: number[], bl: number[], br: number[], color = '#ffe7b0') {
  const geo = new THREE.PlaneGeometry(1, 1);
  const p = geo.attributes.position;
  [tl, tr, bl, br].forEach((v, i) => p.setXYZ(i, v[0], v[1], v[2]));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(paint(geo, color, 1, 1), shaftMat);
  m.userData.noOutline = true;
  root.add(m);
}
function pool(root: THREE.Object3D, x: number, z: number, rx: number, rz: number, color: string, y = 0.015, mat = poolMat) {
  const m = new THREE.Mesh(paint(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), color, 1, 1), mat);
  m.position.set(x, y, z);
  m.userData.noOutline = true;
  root.add(m);
}

function flowerHead(a: Add, color: string, x: number, y: number, z: number, s = 1) {
  a(Ico(0.1 * s, 0).scale(1, 0.6, 1), color, x, y, z);
  a(Ico(0.04 * s, 0), '#fcd34d', x, y + 0.04 * s, z);
}

function buildStatic() {
  const root = new THREE.Group();
  const a = adder(root);
  const f = adder(root, flatMat, 0.95, 1.0);

  // Floor: staggered planks over a dark underlay, stone foundation at the cut edge.
  f(Box(14.2, 0.1, 11.6), '#4a2f1c', 0, -0.11, 0.5);
  const PL = ['#9c6b40', '#94633a', '#a3744a', '#8a5c35', '#9a6a3f'];
  for (let i = 0; i < 20; i++) {
    let z = -5.2 + (i % 3) * -0.9;
    while (z < 6.25) {
      const len = 2.4 + rnd() * 2.6, z0 = Math.max(z, -5.2), z1 = Math.min(z + len, 6.25);
      if (z1 - z0 > 0.2) f(Box(0.66, 0.1, z1 - z0 - 0.04), pick(PL), -6.65 + i * 0.7, -0.05, (z0 + z1) / 2);
      z += len;
    }
  }
  for (let x = -7.4; x < 7.4;) {
    const w = Math.min(0.7 + rnd() * 0.6, 7.4 - x);
    a(Box(w - 0.05, 0.42, 0.45), pick(STONE), x + w / 2, -0.33, 6.42);
    x += w;
  }

  // Walls: plaster, wainscot boards, rails, timber frame.
  a(Box(14.8, 5.4, 0.3), PLASTER, 0, 2.7, -5.35);
  for (const s of [-1, 1]) a(Box(0.3, 5.4, 11.6), '#ead7b3', s * 7.15, 2.7, 0.4);
  for (let x = -6.82; x < 7; x += 0.36) a(Box(0.33, 1.3, 0.05), rnd() < 0.5 ? '#8a5a33' : '#94623a', x, 0.65, -5.18);
  for (const s of [-1, 1]) for (let z = -5.02; z < 6.2; z += 0.36) a(Box(0.05, 1.3, 0.33), rnd() < 0.5 ? '#8a5a33' : '#94623a', s * 6.98, 0.65, z);
  a(Box(14, 0.12, 0.14), DARK, 0, 1.36, -5.13);
  for (const s of [-1, 1]) a(Box(0.14, 0.12, 11.2), DARK, s * 6.93, 1.36, 0.55);
  a(Box(14.8, 0.42, 0.46), BEAM, 0, 5.2, -5.05);
  for (const s of [-1, 1]) {
    a(Box(0.46, 0.42, 11.6), BEAM, s * 6.85, 5.2, 0.4);
    a(Box(0.34, 5.4, 0.34), BEAM, s * 6.85, 2.7, -5.03); // back corners
    a(Box(0.46, 5.9, 0.46), BEAM, s * 7.08, 2.7, 6.0); // cut-away front posts
    a(Box(0.3, 5.4, 0.2), BEAM, s * 2.6, 2.7, -5.1); // bay posts
    for (const d of [-1, 1]) a(Box(0.16, 1.1, 0.12), BEAM, s * 2.6 + d * 0.42, 4.62, -5.1).rotation.z = d * 0.8;
    for (const z of [-1.4, 2.6]) {
      a(Box(0.2, 5.4, 0.3), BEAM, s * 6.92, 2.7, z);
      for (const d of [-1, 1]) a(Box(0.12, 1.1, 0.16), BEAM, s * 6.92, 4.62, z + d * 0.42).rotation.x = -d * 0.8;
    }
  }

  // Windows: big one behind the table, one above the bed. Light sheets fall in.
  windowAt(root, 0, 3.05, -5.18, 0, 1.9, 1.5);
  windowAt(root, -6.98, 3.05, -0.9, Math.PI / 2, 1.6, 1.3);
  for (const [x0, x1] of [[-0.9, -0.08], [0.08, 0.9]]) {
    sheet(root, [x0, 3.8, -5.12], [x1, 3.8, -5.12], [x0 * 1.25, 0.02, -0.9], [x1 * 1.25, 0.02, -0.9]);
    sheet(root, [x0, 2.3, -5.12], [x1, 2.3, -5.12], [x0 * 1.2, 0.02, -2.4], [x1 * 1.2, 0.02, -2.4]);
  }
  pool(root, 0, -1.6, 1.4, 1.0, '#ffe2a8', 0.012, shaftMat);

  // Woven rug: border, field, diamond motifs, fringes. Then the door mat.
  const RZ = 0.9;
  f(Box(5.6, 0.02, 3.6), '#a8475f', 0, 0.01, RZ);
  f(Box(5.2, 0.025, 3.2), '#ecd9b6', 0, 0.02, RZ);
  f(Box(4.9, 0.03, 0.1), '#8fb08a', 0, 0.03, RZ - 1.35);
  f(Box(4.9, 0.03, 0.1), '#8fb08a', 0, 0.03, RZ + 1.35);
  for (const [x, z, r, c] of [[0, 0, 0.75, '#c0607a'], [0, 0, 0.42, '#f5c56a'], [-1.75, 0, 0.45, '#7fa3c8'], [1.75, 0, 0.45, '#7fa3c8'], [-1.75, 0, 0.2, '#ecd9b6'], [1.75, 0, 0.2, '#ecd9b6']] as const)
    f(Box(r, 0.035 + r * 0.01, r).rotateY(Math.PI / 4), c, x, 0.03, RZ + z);
  for (const s of [-1, 1]) for (let i = 0; i < 16; i++) f(Box(0.05, 0.015, 0.22), '#e8d2a8', -2.55 + i * 0.34, 0.01, RZ + s * 1.9);
  f(Box(2.2, 0.03, 1.1), '#5f7741', EXIT.x, 0.015, EXIT.z);
  f(Box(1.9, 0.035, 0.8), '#83a05e', EXIT.x, 0.02, EXIT.z);

  // Fireplace: stone chimney breast, mantel, hearth, logs. Fire itself is animated separately.
  a(Box(2.7, 5.4, 1.0), '#6a5d52', -4.6, 2.7, -4.75);
  for (let y = 0.2, row = 0; y < 5.0; y += 0.42, row++) {
    for (let x = -5.95 + (row % 2) * 0.25; x < -3.25;) {
      const w = Math.min(0.42 + rnd() * 0.32, -3.25 - x);
      const inOpening = y < 1.45 && x + w > -5.3 && x < -3.9;
      if (!inOpening && w > 0.12) a(Box(w - 0.05, 0.37, 0.1), pick(STONE), x + w / 2, y, -4.22);
      x += w;
    }
  }
  f(Box(1.4, 1.25, 0.04), '#17110e', -4.6, 0.66, -4.2);
  a(Box(1.7, 0.22, 0.2), DARK, -4.6, 1.38, -4.15); // lintel
  a(Box(3.0, 0.16, 0.95), '#8a7b6d', -4.6, 0.08, -3.85); // hearth
  a(Box(3.0, 0.2, 0.55), WOOD, -4.6, 1.85, -4.05); // mantel
  for (const x of [-5.6, -5.25]) {
    a(Cyl(0.06, 0.06, 0.3 + (x + 6) * 0.2, 7), '#fbf3df', x, 2.1 + (x + 6) * 0.1, -4.0);
    const fl = new THREE.Mesh(Ico(0.045, 0).scale(1, 1.8, 1), bulbMat);
    fl.position.set(x, 2.32 + (x + 6) * 0.2, -4.0);
    fl.userData.noOutline = true;
    root.add(fl);
  }
  a(Cyl(0.12, 0.14, 0.32, 8), '#6f97c4', -4.2, 2.11, -4.0);
  a(Box(0.5, 0.42, 0.06), BEAM, -3.6, 2.2, -4.2).rotation.x = -0.1; // little frame
  a(Box(0.38, 0.3, 0.02), '#f6ead2', -3.6, 2.2, -4.16).rotation.x = -0.1;
  const love = new THREE.Group();
  heart(adder(love), '#e0567f', 0.45);
  love.position.set(-3.6, 2.2, -4.12);
  root.add(love);
  for (const [dx, ry] of [[-0.25, 0.4], [0.25, -0.4]]) a(Cyl(0.11, 0.11, 1.0, 7).rotateZ(Math.PI / 2), '#6b4423', -4.6 + dx, 0.28, -4.05).rotation.y = ry;
  // Log pile in the corner.
  for (const [x, y] of [[-6.75, 0.15], [-6.45, 0.15], [-6.15, 0.15], [-6.6, 0.42], [-6.3, 0.42], [-6.45, 0.69]]) {
    a(Cyl(0.15, 0.15, 0.85, 7).rotateX(Math.PI / 2), '#7a4e2c', x, y, -4.55);
    f(Cyl(0.11, 0.11, 0.01, 7).rotateX(Math.PI / 2), '#d8b07a', x, y, -4.12);
  }

  // Crafting table: the hero. Chunky top, turned legs, lower shelf, all the tools on top.
  a(Box(3.5, 0.18, 1.9), '#9a6236', 0, 1.12, -3.7);
  a(Box(3.1, 0.24, 1.5), WOOD, 0, 0.92, -3.7);
  a(Box(0.9, 0.18, 0.04), '#a8703f', 0, 0.92, -2.94);
  a(Ico(0.04, 0), '#d4a017', 0, 0.92, -2.9);
  for (const [x, z] of [[-1.5, -4.4], [1.5, -4.4], [-1.5, -3.0], [1.5, -3.0]]) {
    a(Cyl(0.1, 0.08, 0.95, 7), DARK, x, 0.48, z);
    a(Ico(0.12, 0), DARK, x, 0.6, z);
  }
  a(Box(3.0, 0.06, 1.3), WOOD, 0, 0.25, -3.7);
  a(Cyl(0.32, 0.26, 0.3, 10), '#c49a5a', 0.7, 0.43, -3.75); // basket under
  for (let i = 0; i < 6; i++) flowerHead(a, pick(['#e11d48', '#f472b6', '#facc15', '#a78bfa']), 0.55 + (i % 3) * 0.15, 0.62, -3.85 + Math.floor(i / 3) * 0.2, 0.9);
  // Vase bouquet.
  a(new THREE.LatheGeometry([[0, 0], [0.2, 0.02], [0.26, 0.2], [0.18, 0.42], [0.12, 0.5], [0.16, 0.58]].map(([x, y]) => new THREE.Vector2(x, y)), 10), '#6f97c4', -0.95, 1.21, -4.1);
  const COLS = ['#e11d48', '#facc15', '#f472b6', '#8b5cf6', '#fb923c', '#ffffff', '#e11d48'];
  COLS.forEach((c, i) => {
    const t = (i / COLS.length) * Math.PI * 2, r = 0.22 + (i % 2) * 0.12, hy = 2.25 + (i % 3) * 0.12;
    const s = a(Cyl(0.015, 0.02, 0.7, 4), '#4d7c3a', -0.95 + Math.cos(t) * r * 0.5, 1.95 + (hy - 2.25) / 2, -4.1 + Math.sin(t) * r * 0.5);
    s.rotation.set(Math.sin(t) * 0.35, 0, -Math.cos(t) * 0.35);
    flowerHead(a, c, -0.95 + Math.cos(t) * r, hy, -4.1 + Math.sin(t) * r, 1.3);
  });
  for (let i = 0; i < 4; i++) a(Ico(0.1, 0).scale(0.4, 1.4, 0.2), '#5f9150', -0.95 + Math.cos(i * 1.6) * 0.25, 1.85, -4.1 + Math.sin(i * 1.6) * 0.2).rotation.set(Math.sin(i * 1.6) * 0.8, i, -Math.cos(i * 1.6) * 0.8);
  // Kraft paper with loose stems.
  a(Box(1.05, 0.015, 0.75), '#d9b98a', 0.15, 1.22, -3.75).rotation.y = 0.25;
  for (let i = 0; i < 3; i++) {
    const st = a(Cyl(0.015, 0.015, 0.6, 4).rotateZ(Math.PI / 2), '#4d7c3a', 0.1 + i * 0.05, 1.25, -3.95 + i * 0.18);
    st.rotation.y = 0.3 - i * 0.15;
    flowerHead(a, ['#f472b6', '#facc15', '#e11d48'][i], 0.42 + i * 0.05, 1.28, -4.05 + i * 0.22, 1.2);
  }
  // Scissors, open, lying flat.
  for (const s of [-1, 1]) {
    a(Box(0.5, 0.02, 0.06), '#cbd2da', 0.7, 1.23, -3.25).rotation.y = s * 0.22;
    a(Torus(0.07, 0.022, 8).rotateX(Math.PI / 2), '#e2557a', 0.4, 1.24, -3.25 + s * 0.09);
  }
  // Ribbon spool with a trailing ribbon, twine ball, little oil lamp.
  a(Cyl(0.17, 0.17, 0.22, 12), '#f472b6', 1.3, 1.32, -4.15);
  for (const y of [1.22, 1.42]) a(Cyl(0.2, 0.2, 0.03, 12), '#c96d8a', 1.3, y, -4.15);
  for (let i = 0; i < 4; i++) a(Box(0.22, 0.012, 0.08), '#f472b6', 1.2 - i * 0.12, 1.22, -3.95 + i * 0.12 + Math.sin(i * 2) * 0.05).rotation.y = 0.6 + Math.sin(i * 2) * 0.5;
  a(Ico(0.13, 1), '#c8a878', 1.45, 1.33, -3.35);
  a(Cyl(0.13, 0.16, 0.12, 8), '#c9a227', -1.45, 1.27, -3.35);
  const lampGlass = new THREE.Mesh(Ico(0.11, 1).scale(1, 1.3, 1), bulbMat);
  lampGlass.position.set(-1.45, 1.45, -3.35);
  lampGlass.userData.noOutline = true;
  root.add(lampGlass);
  pool(root, -1.45, -3.35, 0.7, 0.7, '#ffcf7a', 1.215);

  // Treasure dresser: cream painted, teal back, cushions in each slot, glass kiss jar.
  const DR = '#ecdcbc', DX = SHELF.x;
  a(Box(3.7, 1.0, 0.9), DR, DX, 0.5, -4.75);
  a(Box(3.8, 0.08, 0.98), WOOD, DX, 1.03, -4.73);
  for (const s of [-1, 1]) {
    a(Box(1.6, 0.75, 0.04), '#e2cfa8', DX + s * 0.86, 0.5, -4.29);
    a(Ico(0.045, 0), '#c9a227', DX + s * 0.18, 0.55, -4.25);
  }
  a(Box(3.4, 3.0, 0.08), '#4f7f86', DX, 2.6, -5.15);
  for (const s of [-1, 1]) a(Box(0.12, 3.15, 0.5), DR, DX + s * 1.64, 2.62, -4.95);
  for (const y of SHELF.rows) a(Box(3.3, 0.07, 0.5), DR, DX, y, -4.95);
  a(Box(3.6, 0.16, 0.6), DR, DX, 4.18, -4.93);
  a(Box(3.7, 0.08, 0.66), WOOD, DX, 4.29, -4.92);
  for (const y of SHELF.rows) for (const c of SHELF.cols) a(Cyl(0.17, 0.19, 0.06, 10), '#9b3d63', DX + c, y + 0.065, SHELF.z + 0.05);
  a(Cyl(0.24, 0.26, 0.06, 12), '#9b3d63', DX, 4.36, SHELF.z + 0.12);
  // Bunting along the top of the dresser.
  for (let i = 0; i < 7; i++) a(new THREE.ConeGeometry(0.11, 0.2, 3).rotateX(Math.PI), ['#f472b6', '#facc15', '#8fb08a', '#7fa3c8'][i % 4], DX - 1.45 + i * 0.48, 3.98, -4.62);
  // Jar for the kisses (glass) and its cork, plaque next to it.
  const jar = new THREE.Mesh(Cyl(0.24, 0.24, 0.62, 14), glassMat);
  jar.position.set(3.75, 1.38, -4.55);
  jar.userData.noOutline = true;
  root.add(jar);
  a(Cyl(0.19, 0.17, 0.12, 10), '#b58350', 3.75, 1.74, -4.55);
  a(Torus(0.24, 0.025, 14).rotateX(Math.PI / 2), '#e0567f', 3.75, 1.6, -4.55);

  // Bed along the left wall, patchwork quilt.
  const BX = -5.95;
  a(Box(2.0, 0.45, 3.7), WOOD, BX, 0.38, -0.9);
  for (const [x, z] of [[-0.9, -2.65], [0.9, -2.65], [-0.9, 0.85], [0.9, 0.85]]) a(Box(0.14, 0.4, 0.14), DARK, BX + x, 0.2, -0.9 + z + 0.9);
  a(Box(2.1, 1.5, 0.16), WOOD, BX, 1.0, -2.78);
  a(Cyl(1.05, 1.05, 0.16, 14).rotateX(Math.PI / 2).scale(1, 0.35, 1), WOOD, BX, 1.75, -2.78);
  a(Box(2.1, 0.95, 0.14), WOOD, BX, 0.62, 0.98);
  a(Box(1.85, 0.25, 3.45), '#f6ecd8', BX, 0.72, -0.92);
  a(Box(1.3, 0.25, 0.6), '#ffffff', BX, 0.95, -2.3);
  a(Box(1.95, 0.08, 2.6), '#f7d9c4', BX, 0.88, -0.48);
  const PATCH = ['#e898aa', '#f3e3c8', '#8fb08a', '#f5c56a', '#7fa3c8', '#d87a8a'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) f(Box(0.44, 0.02, 0.4), PATCH[(i * 2 + j) % 6], BX - 0.69 + i * 0.46, 0.93, -1.5 + j * 0.42);
  a(Box(1.95, 0.12, 0.22), '#ffffff', BX, 0.92, -1.75);

  // Pantry shelves on the right wall: jars, pots, books.
  const PX = 6.62;
  for (const z of [-2.6, -0.4]) a(Box(0.7, 3.3, 0.1), WOOD, PX, 1.65, z);
  for (const y of [0.12, 0.95, 1.8, 2.65, 3.3]) a(Box(0.72, 0.07, 2.25), WOOD, PX, y, -1.5);
  for (const y of [0.16, 0.99, 1.84, 2.69]) {
    for (let z = -2.45; z < -0.55;) {
      const k = rnd();
      if (k < 0.4) { // jar
        const h = 0.3 + rnd() * 0.2;
        a(Cyl(0.13, 0.13, h, 8), pick(['#f5b942', '#c0392b', '#e898aa', '#9bc47a', '#f0e6d0']), PX, y + h / 2, z + 0.14);
        a(Cyl(0.14, 0.14, 0.06, 8), pick(['#c9a227', '#d87a8a', '#7fa3c8']), PX, y + h + 0.03, z + 0.14);
        z += 0.34;
      } else if (k < 0.62) { // pot with sprig
        a(Cyl(0.15, 0.11, 0.24, 8), '#c4683c', PX, y + 0.12, z + 0.16);
        for (let i = 0; i < 3; i++) a(Ico(0.08, 0).scale(0.6, 1.4, 0.6), '#5f9150', PX + Math.sin(i * 2.1) * 0.05, y + 0.32, z + 0.16 + Math.cos(i * 2.1) * 0.05).rotation.x = Math.cos(i * 2.1) * 0.5;
        z += 0.38;
      } else { // books
        const n = 2 + Math.floor(rnd() * 4);
        for (let i = 0; i < n; i++) {
          const h = 0.38 + rnd() * 0.2;
          a(Box(0.48, h, 0.1), pick(['#be123c', '#3b82f6', '#f59e0b', '#15803d', '#a855f7', '#e9e2d0', '#8a5530']), PX - 0.04, y + h / 2, z + 0.06 + i * 0.11);
        }
        z += n * 0.11 + 0.12;
      }
    }
  }

  // Reading corner: armchair, floor lamp, knitting basket.
  const chair = new THREE.Group();
  chair.position.set(5.55, 0, 2.05);
  chair.rotation.y = -Math.PI / 2 - 0.45;
  root.add(chair);
  const c = adder(chair);
  c(Box(1.5, 0.5, 1.3), '#c0607a', 0, 0.45, 0);
  c(Box(1.15, 0.2, 1.05), '#f0d9b5', 0, 0.78, 0.08);
  c(Box(1.5, 1.2, 0.32), '#c0607a', 0, 1.0, -0.56);
  c(Cyl(0.16, 0.16, 1.5, 8).rotateZ(Math.PI / 2), '#b04f6a', 0, 1.6, -0.56);
  for (const s of [-1, 1]) {
    c(Box(0.28, 0.6, 1.3), '#c0607a', s * 0.66, 0.7, 0);
    c(Cyl(0.15, 0.15, 1.3, 8).rotateX(Math.PI / 2), '#b04f6a', s * 0.66, 1.0, 0);
    for (const z of [-0.5, 0.5]) c(Cyl(0.06, 0.05, 0.2, 5), DARK, s * 0.6, 0.1, z);
  }
  c(Box(0.36, 0.05, 0.7), '#7fa3c8', 0.66, 1.16, 0.1);
  c(Box(0.05, 0.45, 0.7), '#7fa3c8', 0.83, 0.92, 0.1);
  a(Cyl(0.3, 0.34, 0.08, 10), DARK, 6.45, 0.04, 3.6);
  a(Cyl(0.04, 0.04, 2.3, 6), '#3d2a1c', 6.45, 1.2, 3.6);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 0.5, 10, 1, true), shadeMat);
  shade.position.set(6.45, 2.45, 3.6);
  shade.userData.noOutline = true;
  root.add(shade);
  pool(root, 6.1, 3.3, 1.9, 1.9, '#ffcf8a');
  a(Cyl(0.32, 0.26, 0.34, 10), '#b08850', 4.55, 0.17, 3.45);
  for (const [x, z, col] of [[4.47, 3.38, '#e898aa'], [4.65, 3.52, '#7fa3c8'], [4.5, 3.6, '#f5c56a']] as const) a(Ico(0.13, 1), col, x, 0.4, z);
  for (const s of [-1, 1]) a(Cyl(0.012, 0.012, 0.55, 4), '#d6d3d1', 4.55 + s * 0.04, 0.6, 3.45).rotation.z = s * 0.35;

  // Bench by the door, framed picture, small wall shelf.
  a(Box(0.75, 0.1, 1.6), WOOD, -6.55, 0.55, 2.75);
  for (const z of [2.1, 3.4]) a(Box(0.6, 0.5, 0.1), DARK, -6.55, 0.25, z);
  a(Box(0.6, 0.12, 1.4), '#8fb08a', -6.55, 0.66, 2.75);
  a(Ico(0.2, 1).scale(1, 0.6, 1.2), '#f5c56a', -6.6, 0.8, 3.2); // straw hat
  a(Cyl(0.32, 0.32, 0.03, 12), '#f5c56a', -6.6, 0.74, 3.2);
  a(Torus(0.2, 0.03).rotateX(Math.PI / 2), '#e898aa', -6.6, 0.82, 3.2);
  a(Box(0.06, 1.0, 1.3), BEAM, -6.96, 3.0, 4.2);
  f(Box(0.02, 0.8, 1.1), '#bfe0d0', -6.92, 3.0, 4.2);
  for (let i = 0; i < 3; i++) flowerHead(a, ['#f472b6', '#facc15', '#e11d48'][i], -6.9, 2.85 + i * 0.12, 3.95 + i * 0.25, 1.4);
  a(Box(0.4, 0.06, 1.6), WOOD, -6.8, 2.15, 1.55);
  for (let i = 0; i < 4; i++) a(Cyl(0.1, 0.1, 0.24 + (i % 2) * 0.08, 8), pick(['#f5b942', '#e898aa', '#9bc47a', '#7fa3c8']), -6.8, 2.3 + (i % 2) * 0.04, 0.95 + i * 0.38);

  // Front corners: big potted plant, flower bucket.
  a(Cyl(0.5, 0.38, 0.75, 10), '#c4683c', -6.15, 0.38, 4.85);
  a(Cyl(0.55, 0.55, 0.1, 10), '#b05a32', -6.15, 0.74, 4.85);
  for (let i = 0; i < 9; i++) {
    const t = i * 2.4, l = 0.9 + rnd() * 0.5;
    a(Ico(0.22, 0).scale(0.9, 0.18, 2.2), pick(['#4f7f45', '#5f9150', '#6aa058']), -6.15 + Math.cos(t) * 0.4, 1.0 + l * 0.6, 4.85 + Math.sin(t) * 0.4).rotation.set(-0.8 * Math.sin(t), -t + Math.PI / 2, 0.7 * Math.cos(t));
  }
  a(Cyl(0.32, 0.26, 0.6, 10), '#8fa3b0', 6.15, 0.3, 5.15);
  for (let i = 0; i < 7; i++) {
    const t = i * 0.9, x = 6.15 + Math.cos(t) * 0.14, z = 5.15 + Math.sin(t) * 0.14;
    a(Cyl(0.015, 0.02, 0.8, 4), '#4d7c3a', x, 0.85, z);
    flowerHead(a, pick(['#e11d48', '#f472b6', '#facc15', '#a78bfa', '#ffffff']), x + Math.cos(t) * 0.08, 1.27 + (i % 3) * 0.08, z + Math.sin(t) * 0.08, 1.4);
  }

  // Hanging plants flanking the window; dried bunches on the right beam.
  for (const s of [-1, 1]) {
    const x = s * 1.85;
    a(Box(0.08, 0.08, 0.55), BEAM, x, 4.65, -4.92);
    for (let i = 0; i < 3; i++) a(Cyl(0.008, 0.008, 0.9, 3), '#c8a878', x + Math.cos(i * 2.1) * 0.12, 4.2, -4.68 + Math.sin(i * 2.1) * 0.12).rotation.set(Math.sin(i * 2.1) * 0.13, 0, -Math.cos(i * 2.1) * 0.13);
    a(Cyl(0.26, 0.18, 0.32, 9), '#c4683c', x, 3.65, -4.68);
    for (let v = 0; v < 5; v++) {
      const t = v * 1.25, len = 4 + (v % 3);
      for (let k = 0; k < len; k++) a(Ico(0.08, 0).scale(1, 0.5, 1), k % 2 ? '#5f9150' : '#6aa058', x + Math.cos(t) * (0.24 + k * 0.01), 3.75 - k * 0.17, -4.68 + Math.sin(t) * (0.2 + k * 0.01)).rotation.y = k;
    }
  }
  for (const [z, col] of [[0.6, '#a78bfa'], [1.15, '#f472b6'], [1.7, '#facc15']] as const) {
    a(Cyl(0.008, 0.008, 0.5, 3), '#c8a878', 6.6, 4.75, z);
    for (let i = 0; i < 5; i++) {
      const t = i * 1.3;
      a(Cyl(0.012, 0.012, 0.55, 3), '#6b8f4a', 6.6 + Math.cos(t) * 0.03, 4.25, z + Math.sin(t) * 0.04);
      a(Ico(0.06, 0), col, 6.6 + Math.cos(t) * 0.07, 3.95, z + Math.sin(t) * 0.08);
    }
  }

  // Warm pools under the fire and lamps.
  pool(root, -4.6, -3.0, 1.8, 1.3, '#ff9a50');
  return root;
}

function buildCat() {
  const g = new THREE.Group();
  const a = adder(g);
  const O = '#e8964a', L = '#f6dcb8';
  a(new THREE.SphereGeometry(0.34, 9, 6).scale(1.25, 0.62, 1), O, 0, 0.2, 0);
  a(new THREE.SphereGeometry(0.2, 8, 6).scale(1.0, 0.5, 0.8), L, 0.05, 0.16, 0.22);
  a(new THREE.SphereGeometry(0.19, 9, 6), O, 0.32, 0.26, 0.18);
  a(new THREE.SphereGeometry(0.09, 6, 4).scale(1, 0.7, 0.8), L, 0.38, 0.22, 0.32);
  for (const s of [-1, 1]) {
    a(new THREE.ConeGeometry(0.07, 0.14, 4), O, 0.32 + s * 0.11, 0.43, 0.15).rotation.z = -s * 0.3;
    a(Box(0.07, 0.015, 0.02), '#2a1d14', 0.32 + s * 0.07, 0.28, 0.35);
  }
  for (let i = 0; i < 7; i++) {
    const t = -0.4 + i * 0.4;
    a(Ico(0.065, 0), i > 4 ? '#c26b2a' : O, -Math.cos(t) * 0.42 + 0.05, 0.1, Math.sin(t) * 0.36);
  }
  for (const x of [-0.15, 0.08]) a(Box(0.04, 0.02, 0.4), '#c26b2a', x, 0.42, 0).rotation.y = 0.2;
  return bake(g);
}

export function buildInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1d1814');

  scene.add(bake(buildStatic()));
  const cat = buildCat();
  cat.position.set(-5.7, 0.93, 0.35);
  cat.rotation.y = 0.6;
  scene.add(cat);

  // Fire: three flickering flame cones and an ember bed.
  const fire = new THREE.Group();
  fire.position.set(-4.6, 0.32, -4.0);
  const flameA = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 6), glow('#ff8a30', 1.8));
  const flameB = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 6), glow('#ffd36a', 2.2));
  const flameC = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 5), glow('#ff6a20', 1.7));
  flameA.position.y = 0.4; flameB.position.set(0.05, 0.3, 0.1); flameC.position.set(-0.3, 0.25, 0.02);
  const embers = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 4).scale(1.4, 0.25, 0.6), glow('#ff5a20', 1.3));
  fire.add(flameA, flameB, flameC, embers);
  fire.traverse(o => (o.userData.noOutline = true));
  scene.add(fire);

  const fireLight = new THREE.PointLight('#ff9a50', 16, 11, 1.6);
  fireLight.position.set(-4.6, 1.2, -3.2);
  const tableLight = new THREE.PointLight('#ffd59a', 10, 7, 1.5);
  tableLight.position.set(-0.6, 2.6, -2.9);
  const readLight = new THREE.PointLight('#ffcf8a', 6, 6, 1.5);
  readLight.position.set(6.2, 2.2, 3.4);
  const hemi = new THREE.HemisphereLight('#fff1dc', '#5a4030', 1.2);
  const key = new THREE.DirectionalLight('#ffe6c0', 1.3);
  key.position.set(-3, 12, 7);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  scene.add(fireLight, tableLight, readLight, hemi, key);

  addOutlines(scene, 0.03);
  treasureHost = new THREE.Group();
  scene.add(treasureHost);
  const p = document.createElement('canvas');
  p.width = 256; p.height = 140;
  plaque = { ctx: p.getContext('2d')!, tex: new THREE.CanvasTexture(p) };
  plaque.tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), toon({ map: plaque.tex, rim: 0.1 }));
  sign.position.set(4.35, 1.3, -4.45);
  sign.rotation.x = -0.18;
  scene.add(sign);
  rebuildTreasures();

  const C = {
    paneDay: new THREE.Color('#fff1cc').multiplyScalar(1.5), paneNight: new THREE.Color('#3a4f8a').multiplyScalar(0.7),
    sun: new THREE.Color('#ffe7b0'), moon: new THREE.Color('#9db4ff'),
    hemiDay: new THREE.Color('#fff1dc'), hemiNight: new THREE.Color('#9aa6d6'),
    keyDay: new THREE.Color('#ffe6c0'), keyNight: new THREE.Color('#8fa2e0'),
  };
  const update = (time: number, day = 1) => {
    const n = 1 - day;
    const fl = 0.8 + Math.sin(time * 13) * 0.1 + Math.sin(time * 7.3) * 0.1;
    flameA.scale.set(1, fl, 1);
    flameB.scale.set(1, 1.6 - fl * 0.7, 1);
    flameC.scale.set(1, 0.7 + Math.sin(time * 9.1) * 0.25, 1);
    fireLight.intensity = (10 + 10 * n) * fl;
    tableLight.intensity = 6 + 10 * n;
    readLight.intensity = 4 + 10 * n;
    paneMat.color.copy(C.paneNight).lerp(C.paneDay, day);
    shaftMat.color.copy(C.moon).lerp(C.sun, day);
    shaftMat.opacity = 0.12 + 0.45 * day;
    poolMat.opacity = 0.22 + 0.4 * n;
    hemi.color.copy(C.hemiNight).lerp(C.hemiDay, day);
    hemi.intensity = 0.5 + 0.45 * day;
    key.color.copy(C.keyNight).lerp(C.keyDay, day);
    key.intensity = 0.3 + 0.8 * day;
    cat.scale.set(1, 1 + Math.sin(time * 2.2) * 0.04, 1);
    if (goldHeart) { goldHeart.rotation.y = time * 1.2; goldHeart.position.y = 4.42 + Math.sin(time * 2) * 0.04; }
  };
  update(0, 1);
  return { scene, update };
}

export function buildGallery() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eddc');
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 16), lam('#c8b89a'));
  ped.position.y = -1.2;
  ped.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 32).rotateX(-Math.PI / 2), lam('#d9dfc6'));
  floor.position.y = -1.5;
  floor.receiveShadow = true;
  const key = new THREE.DirectionalLight('#fff4e0', 2);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  scene.add(ped, floor, key, new THREE.HemisphereLight('#ffffff', '#9aa58a', 1.4));
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 1.2, 5.2);
  camera.lookAt(0, 0.2, 0);

  let current: THREE.Group | null = null;
  const show = (types: string[] | null) => {
    if (current) scene.remove(current);
    current = types ? buildBouquet(types) : null;
    if (current) { current.position.y = -0.3; scene.add(current); }
  };
  const update = (time: number) => { if (current) current.rotation.y = time * 0.5; };
  return { scene, camera, show, update };
}

if (import.meta.env.DEV) Object.assign(window, { __houseTreasures: setHouseTreasures });
