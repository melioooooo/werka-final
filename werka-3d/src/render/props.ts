// Hand-placed set dressing: cottage yard props, one landmark per outer region, and scattered
// decor (fallen logs, mushrooms, mossy stones). Lantern/crystal glow is driven by setNight().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SeededRandom } from '../world/rng.ts';
import { type World, HOUSE, HALF, RIVER_HALF, heightAt, biomeAt, riverZ } from '../world/generate.ts';
import { toon, addOutlines, gradient, bake } from './toon.ts';

const mats = new Map<string, THREE.Material>();
const M = (color: string) => {
  let m = mats.get(color);
  if (!m) { m = toon({ color, occlude: true, rim: 0.35 }); mats.set(color, m); }
  return m;
};
const mesh = (g: THREE.BufferGeometry, color: string | THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(g, typeof color === 'string' ? M(color) : color);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};
const glowMat = (color: string) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.4) });
const glows: { mat: THREE.MeshBasicMaterial; base: THREE.Color; day: number }[] = [];
const glow = (color: string, dayLevel = 0.4) => {
  const mat = glowMat(color);
  glows.push({ mat, base: new THREE.Color(color), day: dayLevel });
  return mat;
};

// Radial falloff baked into a tiny canvas texture, shared by all lantern pools.
const poolMat = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,170,80,1)');
  gr.addColorStop(1, 'rgba(255,190,100,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
})();
const WOOD = '#8a5a34', WOOD_D = '#5e3b22', STONE = '#a49c90', STONE_D = '#7d766c', MOSS = '#5f9a45';

function lantern() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6).translate(0, 1.1, 0), WOOD_D));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08).translate(0.3, 2.15, 0), WOOD_D));
  const lamp = mesh(new THREE.BoxGeometry(0.32, 0.4, 0.32), glow('#ffc35a', 0.5), 0.55, 1.85, 0);
  lamp.castShadow = false;
  g.add(lamp, mesh(new THREE.ConeGeometry(0.28, 0.2, 4).rotateY(Math.PI / 4), '#3f3a36', 0.55, 2.12, 0));
  // Warm pool of light on the ground, only visible at night.
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24).rotateX(-Math.PI / 2), poolMat);
  pool.position.set(0.55, 0.08, 0);
  pool.userData.noOutline = true;
  g.add(pool);
  return g;
}

function fence(len: number) {
  const g = new THREE.Group();
  const posts = Math.max(2, Math.round(len / 1.6));
  for (let i = 0; i <= posts; i++) g.add(mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16).translate(0, 0.55, 0), WOOD, (i / posts - 0.5) * len, 0, 0));
  for (const y of [0.45, 0.85]) g.add(mesh(new THREE.BoxGeometry(len, 0.09, 0.07), WOOD, 0, y, 0));
  return g;
}

function signpost() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 2, 6).translate(0, 1, 0), WOOD_D));
  const a = mesh(new THREE.BoxGeometry(1.1, 0.3, 0.08), '#c79a5e', 0.4, 1.65, 0);
  const b = mesh(new THREE.BoxGeometry(0.9, 0.26, 0.08), '#b88a52', -0.3, 1.25, 0);
  a.rotation.z = 0.06; b.rotation.y = 0.5;
  g.add(a, b);
  return g;
}

// Ruined stone arch with hanging vines.
function arch() {
  const g = new THREE.Group();
  for (const x of [-1.6, 1.6]) for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), k % 2 ? STONE : STONE_D, x + (k % 2) * 0.05, 0.35 + k * 0.7, 0));
  const lintel = mesh(new THREE.BoxGeometry(4.4, 0.6, 0.9), STONE, 0.3, 3.05, 0);
  lintel.rotation.z = -0.08;
  g.add(lintel, mesh(new THREE.BoxGeometry(1.2, 0.5, 0.7), STONE_D, 2.1, 0.25, 0.8));
  const vineMat = toon({ color: MOSS, sway: 0.35, rim: 0.3 });
  for (let i = 0; i < 6; i++) {
    const len = 0.6 + (i % 3) * 0.45;
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.02, len, 4).translate(0, -len / 2, 0), vineMat, -1.4 + i * 0.5, 2.8, 0.47));
  }
  g.add(mesh(new THREE.IcosahedronGeometry(0.45, 0).scale(1.6, 0.5, 1.1), MOSS, -0.2, 3.38, 0));
  return g;
}

const crown = () => gradient(mergeGeometries([[0, 0, 0, 1], [0.6, 0.3, 0.25, 0.72], [-0.55, 0.22, -0.3, 0.68], [0.05, 0.62, -0.05, 0.6]]
  .map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z).toNonIndexed()))!, 0.55, 1.2, false);

// One recognisable silhouette per biome.
const LANDMARK: Record<string, () => { g: THREE.Group; spin?: THREE.Object3D }> = {
  FOREST: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.9, 1.6, 6, 8).translate(0, 3, 0), '#6a4429'));
    for (let i = 0; i < 4; i++) { const r = mesh(new THREE.CylinderGeometry(0.25, 0.45, 2.2, 5).translate(0, 1.1, 0), '#5e3b22', Math.cos(i * 1.6) * 1.2, 0, Math.sin(i * 1.6) * 1.2); r.rotation.set(Math.sin(i * 1.6) * 0.9, 0, -Math.cos(i * 1.6) * 0.9); g.add(r); }
    const c = mesh(crown(), toon({ color: '#3a8f4a', vertexColors: true, occlude: true, sway: 0.01, rim: 0.5 }), 0, 7.5, 0);
    c.scale.setScalar(4.2);
    g.add(c);
    return { g };
  },
  DESERT: () => {
    const g = new THREE.Group();
    const a = mesh(new THREE.TorusGeometry(3, 0.75, 6, 12, Math.PI), '#d9a86a');
    g.add(a, mesh(new THREE.BoxGeometry(1.8, 0.6, 1.8), '#c4925a', -3, 0.3, 0), mesh(new THREE.BoxGeometry(1.8, 0.6, 1.8), '#c4925a', 3, 0.3, 0));
    return { g };
  },
  MOUNTAIN: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.DodecahedronGeometry(1.3 - i * 0.17, 0), i % 2 ? STONE : STONE_D, Math.sin(i) * 0.15, 0.9 + i * 1.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 4).translate(0, 1.2, 0), WOOD_D, 0, 6.3, 0));
    const flag = mesh(new THREE.BoxGeometry(1, 0.6, 0.04), toon({ color: '#e0574f', sway: 0.4, rim: 0.3 }), 0.5, 8.2, 0);
    g.add(flag);
    return { g };
  },
  MEADOW: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.6, 6, 8).translate(0, 3, 0), '#efe3c8'));
    g.add(mesh(new THREE.ConeGeometry(1.6, 1.8, 8).translate(0, 6.9, 0), '#b5523b'));
    g.add(mesh(new THREE.BoxGeometry(0.8, 1.4, 0.2), '#6b3f22', 0, 0.7, 1.45));
    const hub = new THREE.Group();
    hub.position.set(0, 5.4, 1.4);
    for (let i = 0; i < 4; i++) {
      const blade = mesh(new THREE.BoxGeometry(0.5, 3.4, 0.08).translate(0, 1.9, 0), '#e9dcc0');
      blade.rotation.z = (i * Math.PI) / 2;
      hub.add(blade);
    }
    g.add(hub);
    hub.userData.axis = 'z';
    return { g, spin: hub };
  },
  SWAMP: () => {
    const g = new THREE.Group();
    for (const [x, z] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) g.add(mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 5).translate(0, 1.1, 0), WOOD_D, x, 0, z));
    g.add(mesh(new THREE.BoxGeometry(3.4, 0.2, 3), WOOD, 0, 2.2, 0), mesh(new THREE.BoxGeometry(2.6, 1.6, 2.2), '#7c6a4a', 0, 3.1, 0));
    g.add(mesh(new THREE.ConeGeometry(2.4, 1.6, 4).rotateY(Math.PI / 4).translate(0, 4.7, 0), '#6b7a3a'));
    const win = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), glow('#ffcf6a', 0.6), 0, 3.2, 1.12);
    win.castShadow = false;
    g.add(win);
    return { g };
  },
  TUNDRA: () => {
    const g = new THREE.Group();
    const ice = toon({ color: '#bfe8ff', emissive: '#7fd0ff', emissiveIntensity: 0.25, occlude: true, rim: 0.8 });
    for (let i = 0; i < 7; i++) { const c = mesh(new THREE.OctahedronGeometry(0.7, 0).scale(0.6, 2.6 - (i % 3) * 0.5, 0.6), ice, Math.cos(i * 0.9) * (i ? 1.3 : 0), 1.2, Math.sin(i * 0.9) * (i ? 1.3 : 0)); c.rotation.set(Math.sin(i) * 0.4, i, Math.cos(i) * 0.4); g.add(c); }
    return { g };
  },
  ENCHANTED: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const st = mesh(new THREE.BoxGeometry(0.7, 2.4 + (i % 2) * 0.6, 0.5).translate(0, 1.2, 0), '#8c84a8', Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6); st.rotation.y = -a; g.add(st); }
    const crystal = mesh(new THREE.OctahedronGeometry(0.7, 0).scale(0.7, 1.6, 0.7), glow('#d9a6ff', 1), 0, 2, 0);
    crystal.castShadow = false;
    g.add(crystal);
    return { g, spin: crystal };
  },
  TROPICAL: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.2, 3.4, 1.8).translate(0, 1.7, 0), '#8a8f7a'));
    g.add(mesh(new THREE.BoxGeometry(2.4, 0.5, 2).translate(0, 2.7, 0.15), '#767b68'));
    g.add(mesh(new THREE.BoxGeometry(0.5, 1.1, 0.6).translate(0, 1.9, 1.05), '#767b68'));
    for (const x of [-0.55, 0.55]) g.add(mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), glow('#7fffd4', 0.3), x, 2.35, 0.93));
    g.add(mesh(new THREE.IcosahedronGeometry(0.6, 0).scale(1.8, 0.5, 1.4), MOSS, 0, 3.5, 0));
    return { g };
  },
  RIVER: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.6, 0.3, 2.6), STONE, 0, 0.15, 0));
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 5).translate(0, 1.4, 0), '#b5523b', x, 0, z));
    g.add(mesh(new THREE.ConeGeometry(2.1, 1.1, 4).rotateY(Math.PI / 4).translate(0, 3, 0), '#3c556f'));
    const c = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 6), glow('#ffd27a', 0.5), 0, 0.5, 0);
    c.castShadow = false;
    g.add(c);
    return { g };
  },
  GRASS: () => {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) for (let i = 0; i < 8; i++) {
      if (k > 2 && i % 3 === 0) continue; // broken top
      const a = (i / 8) * Math.PI * 2;
      const b = mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), (i + k) % 2 ? STONE : STONE_D, Math.cos(a) * 1.8, 0.4 + k * 0.8, Math.sin(a) * 1.8);
      b.rotation.y = -a;
      g.add(b);
    }
    const vineMat = toon({ color: MOSS, sway: 0.3, rim: 0.3 });
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.02, 1.6, 4).translate(0, -0.8, 0), vineMat, Math.cos(i * 1.2) * 2.15, 3.6, Math.sin(i * 1.2) * 2.15));
    return { g };
  },
};

export function buildProps(w: World, scene: THREE.Scene) {
  const rng = new SeededRandom(`${w.seed}-props`);
  const spinners: THREE.Object3D[] = [];
  // Spinning parts (windmill hub, crystal) stay separate; everything else is baked per material.
  const put = (o: THREE.Object3D, x: number, z: number, rotY = 0, keep?: THREE.Object3D) => {
    if (keep) keep.removeFromParent();
    const baked = bake(o);
    baked.position.set(x, heightAt(w, x, z), z);
    baked.rotation.y = rotY;
    if (keep) baked.add(keep);
    addOutlines(baked, 0.03, true);
    scene.add(baked);
  };

  // Cottage yard: lanterns along the path, fences, a signpost, a ruined arch with mossy stones.
  const bx = w.bridgeX, bz = riverZ(w, bx) - RIVER_HALF - 3;
  for (const t of [0.25, 0.55, 0.85]) {
    const x = HOUSE.door.x + (bx - HOUSE.door.x) * t, z = HOUSE.door.z + 0.8 + (bz - HOUSE.door.z - 0.8) * t;
    put(lantern(), x + (t === 0.55 ? -1.9 : 1.9), z, t === 0.55 ? Math.PI : 0);
  }
  put(fence(7), -8.5, 6.5, 0.15);
  put(fence(6), 8.5, 6.2, -0.2);
  put(fence(5), -9.8, 1, Math.PI / 2 + 0.1);
  put(signpost(), 3.3, 9.5, -0.4);
  put(arch(), -9.5, -6.5, 0.5);
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.DodecahedronGeometry(0.4 + rng.next() * 0.3, 0), i % 2 ? STONE : STONE_D);
    s.add(mesh(new THREE.IcosahedronGeometry(0.42, 0).scale(1, 0.35, 1).translate(0, 0.25, 0), MOSS));
    put(s, -9.5 + rng.range(-3, 3), -6.5 + rng.range(-3, 3), rng.range(0, 6));
  }

  for (const l of w.landmarks) {
    const make = LANDMARK[l.kind] ?? LANDMARK.GRASS;
    const { g, spin } = make();
    put(g, l.x, l.z, rng.range(0, 6), spin);
    if (spin) spinners.push(spin);
  }

  const setNight = (night: number) => {
    for (const g of glows) g.mat.color.copy(g.base).multiplyScalar(g.day + (2.6 - g.day) * night);
    poolMat.opacity = Math.max(0, night - 0.3) * 0.42;
  };
  const update = (time: number) => {
    for (const s of spinners) if (s.userData.axis === 'z') s.rotation.z = time * 0.6; else s.rotation.y = time * 0.6;
  };
  return { setNight, update };
}

// Scattered decor as instanced meshes: logs, mushrooms, mossy stones.
export function decorInstances(w: World, rng: SeededRandom, near: (x: number, z: number) => boolean) {
  const logs: THREE.Matrix4[] = [], shrooms: THREE.Matrix4[] = [], mossy: THREE.Matrix4[] = [];
  const m = () => new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 2600; i++) {
    const x = rng.range(-HALF + 3, HALF - 3), z = rng.range(-HALF + 3, HALF - 3);
    if (near(x, z)) continue;
    const b = biomeAt(w, x, z), y = heightAt(w, x, z), r = rng.next();
    if ((b === 'FOREST' || b === 'SWAMP' || b === 'ENCHANTED' || b === 'TROPICAL') && r < 0.05) {
      const s = rng.range(0.8, 1.4);
      logs.push(m().compose(new THREE.Vector3(x, y + 0.25 * s, z), q.setFromEuler(e.set(0, rng.range(0, 6), Math.PI / 2)), new THREE.Vector3(s, s * rng.range(1.5, 2.6), s)));
    } else if ((b === 'FOREST' || b === 'SWAMP' || b === 'ENCHANTED' || b === 'MEADOW' || b === 'GRASS') && r < 0.16) {
      for (let k = 0; k < 3; k++) {
        const s = rng.range(0.6, 1.2);
        shrooms.push(m().compose(new THREE.Vector3(x + rng.range(-0.6, 0.6), y, z + rng.range(-0.6, 0.6)), q.setFromEuler(e.set(0, rng.range(0, 6), 0)), new THREE.Vector3(s, s, s)));
      }
    } else if (b !== 'DESERT' && b !== 'TUNDRA' && r < 0.24) {
      const s = rng.range(0.3, 0.7);
      mossy.push(m().compose(new THREE.Vector3(x, y + 0.1 * s, z), q.setFromEuler(e.set(0, rng.range(0, 6), 0)), new THREE.Vector3(s * 1.3, s * 0.8, s)));
    }
  }
  const logGeo = gradient(mergeGeometries([
    new THREE.CylinderGeometry(0.35, 0.4, 1, 8).toNonIndexed(),
    new THREE.CylinderGeometry(0.2, 0.06, 0.5, 5).rotateZ(1.2).translate(0.3, 0.1, 0).toNonIndexed(),
  ])!, 0.75, 1.1, false);
  const shroomGeo = (() => {
    const stem = new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6).translate(0, 0.15, 0).toNonIndexed();
    const cap = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.28, 0).toNonIndexed();
    const paint = (g: THREE.BufferGeometry, c: string) => {
      const col = new THREE.Color(c), arr = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) col.toArray(arr, i);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return g;
    };
    return mergeGeometries([paint(stem, '#f3ead8'), paint(cap, '#d9463b')])!;
  })();
  const mossyGeo = (() => {
    const rock = new THREE.DodecahedronGeometry(1, 0).toNonIndexed();
    const cols = new Float32Array(rock.attributes.position.count * 3);
    const a = new THREE.Color(STONE), b = new THREE.Color(MOSS);
    for (let i = 0; i < rock.attributes.position.count; i++) (rock.attributes.position.getY(i) > 0.35 ? b : a).toArray(cols, i * 3);
    rock.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    rock.computeVertexNormals();
    return rock;
  })();
  const make = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], color?: string) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((mm, i) => { im.setMatrixAt(i, mm); if (color) im.setColorAt(i, new THREE.Color(color)); });
    im.count = list.length;
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    return im;
  };
  return [
    make(logGeo, toon({ vertexColors: true, occlude: true, rim: 0.3 }), logs, '#7a5233'),
    make(shroomGeo, toon({ vertexColors: true, rim: 0.4 }), shrooms),
    make(mossyGeo, toon({ vertexColors: true, occlude: true, rim: 0.3 }), mossy),
  ];
}

export type Props = ReturnType<typeof buildProps>;
