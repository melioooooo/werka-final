// Cottage interior (cut-away, front wall open) and the gallery display scene.
import * as THREE from 'three';
import { buildBouquet } from './bouquet.ts';
import { toon, addOutlines } from './toon.ts';

const lam = (color: string) => toon({ color, rim: 0.25 });

const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};

// Furniture footprints {x, z, hw, hd} used for collision.
const SOLID = [
  { x: 0, z: -3.7, hw: 1.7, hd: 0.9 }, // crafting table
  { x: -5.4, z: -4.3, hw: 1.4, hd: 0.8 }, // fireplace
  { x: 5.4, z: -4.4, hw: 1.2, hd: 0.6 }, // bookshelf
  { x: 5, z: 1.5, hw: 0.9, hd: 0.9 }, // armchair
];
export const ROOM = { hw: 6.6, back: -4.6, front: 6 };
export const TABLE = { x: 0, z: -2.4 }; // stand here to craft
export const EXIT = { x: 0, z: 5.6 }; // door mat

export function interiorBlocked(x: number, z: number, r = 0.45) {
  if (Math.abs(x) > ROOM.hw - r || z < ROOM.back + r || z > ROOM.front + 0.4) return true;
  return SOLID.some(s => Math.abs(x - s.x) < s.hw + r && Math.abs(z - s.z) < s.hd + r);
}

export function buildInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b2620');

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12).rotateX(-Math.PI / 2), lam('#a8743f'));
  floor.position.z = 0.5;
  floor.receiveShadow = true;
  // Plank lines.
  for (let i = -6; i <= 6; i++) { const p = box(0.04, 0.01, 12, '#7d522a', i, 0.005, 0.5); p.userData.noOutline = true; scene.add(p); }
  floor.userData.noOutline = true;
  scene.add(floor,
    box(14, 5, 0.4, '#efe0c0', 0, 2.5, -5.4),
    box(0.4, 5, 12, '#e6d5b2', -7.2, 2.5, 0.5),
    box(0.4, 5, 12, '#e6d5b2', 7.2, 2.5, 0.5),
    box(14.8, 0.5, 0.5, '#6b3f22', 0, 5, -5.2), // beam
  );

  // Crafting table with a vase and loose petals.
  scene.add(box(3.4, 0.2, 1.8, '#7a4a26', 0, 1.1, -3.7));
  for (const [x, z] of [[-1.5, -4.4], [1.5, -4.4], [-1.5, -3], [1.5, -3]]) scene.add(box(0.18, 1.1, 0.18, '#5e3a1e', x, 0.55, z));
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.5, 8), lam('#7fa3c8'));
  vase.position.set(-1, 1.45, -3.9);
  scene.add(vase);
  ['#e11d48', '#facc15', '#8b5cf6', '#f472b6'].forEach((c, i) => {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), lam(c));
    p.position.set(0.3 + i * 0.3, 1.25, -3.4 + (i % 2) * 0.3);
    scene.add(p);
  });
  // Shears, so the table reads as a work bench.
  scene.add(box(0.7, 0.05, 0.12, '#9ca3af', 0.9, 1.23, -4));

  // Fireplace with a flickering fire.
  scene.add(box(2.8, 2.6, 1.4, '#8f7b6a', -5.4, 1.3, -4.6), box(1.6, 1.2, 0.2, '#1f1a17', -5.4, 0.7, -3.85));
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a3c').multiplyScalar(2.5) }));
  fire.userData.noOutline = true;
  fire.position.set(-5.4, 0.5, -3.95);
  const fireLight = new THREE.PointLight('#ff9a50', 18, 12, 1.6);
  fireLight.position.set(-5.4, 1.2, -3.2);
  scene.add(fire, fireLight);

  // Bookshelf.
  scene.add(box(2.4, 3.6, 1, '#6b3f22', 5.4, 1.8, -4.6));
  const bookCols = ['#be123c', '#3b82f6', '#f59e0b', '#15803d', '#a855f7', '#f3f4f6'];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++)
    scene.add(box(0.25, 0.7, 0.6, bookCols[(k + row * 2) % 6], 4.55 + k * 0.33, 0.8 + row * 1.1, -4.15));

  // Armchair and round rug.
  scene.add(box(1.8, 0.8, 1.8, '#b9506d', 5, 0.4, 1.5), box(1.8, 1.4, 0.4, '#b9506d', 5.7, 1, 1.5));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20).rotateX(-Math.PI / 2), lam('#c9a2c9'));
  rug.position.set(0, 0.02, 0.8);
  rug.receiveShadow = true;
  scene.add(rug);

  // Window on the back wall and the exit mat.
  const win = box(2, 1.4, 0.1, '#bfe0f2', 3, 3, -5.15);
  scene.add(win, box(2.2, 0.05, 1.2, '#5f7741', EXIT.x, 0.03, EXIT.z));

  const hemi = new THREE.HemisphereLight('#fff1dc', '#5a4030', 1.3);
  const key = new THREE.DirectionalLight('#ffe6c0', 1.4);
  key.position.set(4, 10, 6);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
  key.shadow.mapSize.set(1024, 1024);
  scene.add(hemi, key);

  rug.userData.noOutline = true;
  addOutlines(scene, 0.03);
  const update = (time: number) => {
    const f = 0.8 + Math.sin(time * 13) * 0.1 + Math.sin(time * 7.3) * 0.1;
    fire.scale.set(1, f, 1);
    fireLight.intensity = 16 * f;
  };
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
