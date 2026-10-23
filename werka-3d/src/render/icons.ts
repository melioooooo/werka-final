// Small 3D flower portraits for the crafting grid: the real flower model rendered once per type
// with a tiny offscreen renderer, cached as data URLs. Returns null if WebGL is unavailable.
import * as THREE from 'three';
import { flowerGeometry } from './flowers.ts';
import { toon } from './toon.ts';

const cache = new Map<string, string>();
let kit: { r: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; mesh: THREE.Mesh } | null = null;

function setup() {
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setSize(160, 160, false);
  r.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#cfe6ff', '#4b5a74', 1.3));
  const key = new THREE.DirectionalLight('#ffe8c4', 2.2);
  key.position.set(-2, 4, 3);
  scene.add(key);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const mesh = new THREE.Mesh(undefined, toon({ vertexColors: true, side: THREE.DoubleSide, rim: 0.5 }));
  scene.add(mesh);
  return { r, scene, cam, mesh };
}

export function flowerIcon(type: string): string | null {
  const hit = cache.get(type);
  if (hit) return hit;
  try {
    kit ??= setup();
    const geo = flowerGeometry(type);
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const bs = geo.boundingSphere!;
    kit.mesh.geometry = geo;
    kit.mesh.rotation.y = 0.6;
    // Frame the whole plant from slightly above.
    const d = bs.radius / Math.sin(THREE.MathUtils.degToRad(14)) * 1.05;
    kit.cam.position.set(bs.center.x, bs.center.y + d * 0.35, bs.center.z + d * 0.94);
    kit.cam.lookAt(bs.center);
    kit.r.render(kit.scene, kit.cam);
    const url = kit.r.domElement.toDataURL('image/png');
    cache.set(type, url);
    return url;
  } catch {
    return null;
  }
}
