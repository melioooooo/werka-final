// Dev-only lineup of every flower model (open /flowers.html on the dev server). Not in the build.
import * as THREE from 'three';
import { flowerGeometry, FLOWER_TYPES } from './render/flowers.ts';
import { toon } from './render/toon.ts';
import { buildPost } from './render/post.ts';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe3ef');
scene.add(new THREE.HemisphereLight('#cfe6ff', '#4b5a74', 1));
const sun = new THREE.DirectionalLight('#ffe2b0', 2);
sun.position.set(-6, 12, 8);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), toon({ color: '#6cc46a' }));
ground.receiveShadow = true;
scene.add(ground);
const mat = toon({ vertexColors: true, side: THREE.DoubleSide });
const cols = 11, gap = 1.6;
const labels = document.getElementById('l')!;
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 200);
const rows = Math.ceil(FLOWER_TYPES.length / cols);
camera.position.set(0, 22, 20);
camera.lookAt(0, 0, 0);
const items: [THREE.Vector3, string][] = [];
FLOWER_TYPES.forEach((t, i) => {
  const m = new THREE.Mesh(flowerGeometry(t), mat);
  m.position.set((i % cols - (cols - 1) / 2) * gap, 0, (Math.floor(i / cols) - (rows - 1) / 2) * gap * 1.3);
  m.scale.setScalar(1.3);
  m.castShadow = true;
  scene.add(m);
  items.push([m.position.clone(), t]);
});
const post = buildPost(renderer, 4);
renderer.setSize(innerWidth, innerHeight, false);
post.setSize(innerWidth, innerHeight, 1);
post.draw(scene, camera);
for (const [p, t] of items) {
  const s = p.clone().project(camera);
  const span = document.createElement('span');
  span.textContent = t;
  span.style.left = `${(s.x + 1) / 2 * innerWidth}px`;
  span.style.top = `${(1 - s.y) / 2 * innerHeight + 4}px`;
  labels.appendChild(span);
}
renderer.setAnimationLoop(() => post.draw(scene, camera));
