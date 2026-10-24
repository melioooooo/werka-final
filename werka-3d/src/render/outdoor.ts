// Outdoor scene: terraced terrain, stylised water, bridge, cottage, instanced trees/rocks/grass,
// per-type instanced flowers, drifting particles, pickup highlight + burst, day/night lighting.
import * as THREE from 'three';
import { SeededRandom } from '../world/rng.ts';
import { BIOME_COLORS, type Biome } from '../world/data.ts';
import {
  type World, HALF, RIVER_HALF, DECK_Y, HOUSE, WATER_FLOWERS, WATER_Y,
  biomeWeights, biomeAt, heightAt, riverZ, segDist,
} from '../world/generate.ts';
import { buildProps, decorInstances } from './props.ts';
import { toon, outline, addOutlines, gradient, bakeColors, U, MIST_GLSL } from './toon.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flowerGeometry } from './flowers.ts';

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const tmpC = new THREE.Color(), tmpB = new THREE.Color();

const place = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0) => {
  q.setFromAxisAngle(UP, rotY);
  mesh.setMatrixAt(i, m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)));
};

// Split scattered instances into a grid of InstancedMeshes so off-screen chunks are culled.
type Inst = { m: THREE.Matrix4; c: THREE.Color };
const CHUNK = 60;
function chunked(geo: THREE.BufferGeometry, mat: THREE.Material, list: Inst[], shadow = false, size = CHUNK) {
  const cells = new Map<number, Inst[]>();
  for (const it of list) {
    const k = Math.floor((it.m.elements[12] + HALF) / size) * 100 + Math.floor((it.m.elements[14] + HALF) / size);
    (cells.get(k) ?? cells.set(k, []).get(k)!).push(it);
  }
  return [...cells.values()].map(items => {
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, it.c); });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    mesh.castShadow = shadow;
    return mesh;
  });
}
const inst = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY: number, c: THREE.Color): Inst => {
  q.setFromAxisAngle(UP, rotY);
  return { m: new THREE.Matrix4().compose(v.set(x, y, z), q, sc.set(sx, sy, sz)), c: c.clone() };
};

// Outline hull that shares the instance matrices of its source mesh.
const hullOf = (src: THREE.InstancedMesh, width: number, occlude: boolean) => {
  const hull = new THREE.InstancedMesh(src.geometry, outline('#1f2a2c', width, occlude), src.count);
  hull.instanceMatrix = src.instanceMatrix;
  hull.count = src.count;
  return hull;
};

const pathStart = { x: HOUSE.door.x, z: HOUSE.door.z + 0.8 };

// Curated ground palette (the 2D BIOME_COLORS are too neon under real lighting).
const GROUND: Record<Biome, string> = {
  GRASS: '#3e9d45', FOREST: '#23824d', MEADOW: '#77b93c', DESERT: '#e9bd78', RIVER: '#3c9c4a',
  TROPICAL: '#18a07c', MOUNTAIN: '#6f9a55', SWAMP: '#3e7045', TUNDRA: '#dcedf3', ENCHANTED: '#5b86a6',
};
// Per-biome mist: fog tint so each region has its own air.
const MIST: Record<Biome, string> = {
  GRASS: '#bfe8cf', FOREST: '#9bd6bf', MEADOW: '#e2f0b0', DESERT: '#f6ddb0', RIVER: '#b8e4ec',
  TROPICAL: '#a2eadb', MOUNTAIN: '#cddbea', SWAMP: '#a9c49a', TUNDRA: '#e8f4fb', ENCHANTED: '#c7c6f2',
};
// Large soft patches, -1..1, so meadows read painted rather than flat.
const patch = (x: number, z: number) =>
  (Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * Math.cos(z * 0.09 + Math.sin(x * 0.05)) + Math.sin(x * 0.31 + z * 0.27) * 0.35) / 1.35;
const warm = new THREE.Color('#c9df4e'), cool = new THREE.Color('#145f63');
const groundColor = (w: World, x: number, z: number, out: THREE.Color) => {
  out.setRGB(0, 0, 0);
  for (const [b, k] of biomeWeights(w, x, z)) if (k > 0) out.add(tmpB.set(GROUND[b]).multiplyScalar(k));
  const p = patch(x, z);
  return p > 0 ? out.lerp(warm, p * 0.4) : out.lerp(cool, -p * 0.38);
};

// Puffy canopy: four faceted blobs, dark underside to light crown.
// Smooth normals per blob so the toon ramp paints soft bands instead of noisy facets.
const crownGeo = () => gradient(mergeGeometries([
  [0, 0, 0, 1], [0.6, 0.3, 0.25, 0.72], [-0.55, 0.22, -0.3, 0.68], [0.05, 0.62, -0.05, 0.6],
].map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z).toNonIndexed()))!, 0.55, 1.2, false);

// Past the playable square the land keeps going under the mist and swells into soft hills
// (river valley kept open), so the high camera never finds a hard edge.
export const OUT = 64;
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const landHeight = (w: World, x: number, z: number) => {
  const h = heightAt(w, x, z);
  const e = Math.max(Math.abs(x), Math.abs(z)) - HALF;
  if (e <= 0) return h;
  const d = Math.abs(z - riverZ(w, x));
  return h + (5 + 4 * Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.043)) * ss(2, 44, e) * ss(RIVER_HALF + 3, RIVER_HALF + 20, d);
};

const sand = new THREE.Color('#e3cf98'), snow = new THREE.Color('#f4f7fb'), dirt = new THREE.Color('#c9a46a');
const cliff = new THREE.Color('#a08f7c'), cliffDark = new THREE.Color('#5f5650'), lip = new THREE.Color('#9fd16a');
function landColor(w: World, x: number, z: number, h: number, out: THREE.Color) {
  groundColor(w, x, z, out);
  const gx = landHeight(w, x + 0.5, z) - landHeight(w, x - 0.5, z), gz = landHeight(w, x, z + 0.5) - landHeight(w, x, z - 0.5);
  const slope = Math.abs(gx) + Math.abs(gz);
  const base = heightAt(w, x, z);
  if (base > 8.5) out.lerp(snow, Math.min(1, (base - 8.5) / 1.2));
  // Sunlit grass lip right above a drop, then a rock face that darkens toward its foot.
  const above = landHeight(w, x, z - 1.2) - h;
  if (slope < 0.9 && h - landHeight(w, x, z + 1.4) > 0.9) out.lerp(lip, 0.35);
  if (slope > 1.0) {
    const k = Math.min(1, (slope - 1.0) * 2.5);
    const strata = 0.9 + 0.12 * Math.sin(h * 5.5 + Math.sin(x * 0.7) * 0.8);
    out.lerp(tmpB.copy(cliff).multiplyScalar(strata), k).lerp(cliffDark, k * Math.min(0.55, Math.max(0, above * 0.35)));
  }
  const d = Math.abs(z - riverZ(w, x));
  if (d < RIVER_HALF + 2.8) out.lerp(sand, Math.min(1, 1 - Math.max(0, d - RIVER_HALF - 0.6) / 2.2));
  const bx = w.bridgeX, bz = riverZ(w, bx);
  const pd = Math.min(segDist(x, z, pathStart.x, pathStart.z, bx, bz - RIVER_HALF - 3), segDist(x, z, bx, bz + RIVER_HALF + 3, bx + 6, bz + 22));
  const wob = Math.sin(x * 1.7) * 0.25 + Math.sin(z * 2.3) * 0.2;
  if (pd < 1.5 + wob) out.lerp(dirt, Math.min(1, (1.5 + wob - pd) * 1.5));
  const sandK = biomeWeights(w, x, z).reduce((a, [b, k]) => a + (b === 'DESERT' ? k : 0), 0);
  if (sandK > 0) out.multiplyScalar(1 + sandK * 0.07 * Math.sin(x * 0.9 + z * 0.35 + Math.sin(z * 0.2) * 2));
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return out.multiplyScalar(0.93 + (n - Math.floor(n)) * 0.1);
}

// Ground as a grid of tiles (frustum culled): 1-unit cells on the map, 5-unit cells past it.
// Tiles share their border vertices and normals come from the height field, so no seams.
function terrain(w: World) {
  const segs: [number, number, number][] = [[-HALF - OUT, -HALF, OUT / 4]];
  for (let a = -HALF; a < HALF; a += 60) segs.push([a, a + 60, 60]);
  segs.push([HALF, HALF + OUT, OUT / 4]);
  const mat = toon({ vertexColors: true, rim: 0.12 });
  const acc = new THREE.Color();
  const tiles: THREE.Mesh[] = [];
  for (const [x0, x1, nx] of segs) for (const [z0, z1, nz] of segs) {
    const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
      const h = landHeight(w, x, z);
      pos.push(x, h, z);
      v.set(landHeight(w, x - 0.5, z) - landHeight(w, x + 0.5, z), 1, landHeight(w, x, z - 0.5) - landHeight(w, x, z + 0.5)).normalize();
      nor.push(v.x, v.y, v.z);
      landColor(w, x, z, h, acc);
      col.push(acc.r, acc.g, acc.b);
      if (i < nx && j < nz) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    tiles.push(mesh);
  }
  return tiles;
}

function water(w: World) {
  const W = RIVER_HALF + 1.6;
  const pts: number[] = [], uvs: number[] = [], idx: number[] = [];
  const steps = 260;
  for (let i = 0; i <= steps; i++) {
    const x = -HALF - OUT + (i / steps) * (HALF + OUT) * 2, z = riverZ(w, x);
    pts.push(x, WATER_Y, z - W, x, WATER_Y, z + W);
    uvs.push(x, -W, x, W);
    if (i < steps) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // Ponds: discs whose uv.y is the distance from the centre, scaled so the foam lands on the shore.
  for (const p of w.ponds) {
    const c = pts.length / 3, segs = 28, R = p.r + 0.9, k = 5.0 / (p.r - 0.3);
    pts.push(p.x, WATER_Y, p.z); uvs.push(p.x, 0);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push(p.x + Math.cos(a) * R, WATER_Y, p.z + Math.sin(a) * R);
      uvs.push(p.x + Math.cos(a) * R, R * k);
      if (i < segs) idx.push(c, c + 2 + i, c + 1 + i);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...U, uTimeF: U.uTime, uDay: { value: 1 }, uSky: { value: new THREE.Color('#bfe3ef') } },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv; varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      ${MIST_GLSL}
      uniform float uTime; uniform float uDay; uniform vec3 uSky; uniform vec3 uRim;
      varying vec2 vUv; varying vec3 vW;
      void main() {
        float d = abs(vUv.y);
        vec3 deep = vec3(0.05, 0.22, 0.38), shallow = vec3(0.2, 0.56, 0.62);
        vec3 c = mix(deep, shallow, smoothstep(0.8, 4.9, d));
        // Sky sheen on the deep middle, sliding ripple bands and sparkles where the sun catches.
        c = mix(c, uSky * 0.75, 0.22 * (1.0 - smoothstep(0.0, 4.0, d)));
        float flow = sin(vW.x * 0.9 - uTime * 1.6 + sin(vW.z * 1.3 + uTime) * 1.5) * sin(vW.x * 0.37 + vW.z * 0.8 - uTime * 0.9);
        c += vec3(0.45, 0.7, 0.8) * smoothstep(0.82, 0.97, flow) * 0.22;
        float sp = sin(vW.x * 3.1 - uTime * 2.2 + sin(vW.z * 2.7)) * sin(vW.z * 3.7 + uTime * 1.7 + sin(vW.x * 1.9));
        c += uRim * smoothstep(0.93, 0.99, sp) * 0.7 * uDay;
        float edge = d + sin(vW.x * 2.1 + uTime * 1.3) * 0.12 + sin(vW.x * 5.3 - uTime * 2.0) * 0.06;
        float foam = smoothstep(4.5, 4.65, edge) * (1.0 - smoothstep(5.05, 5.35, edge));
        foam = max(foam, smoothstep(4.05, 4.12, edge) * (1.0 - smoothstep(4.12, 4.22, edge)) * 0.6);
        c = mix(c, vec3(0.88, 0.95, 0.96), foam);
        c *= mix(0.35, 1.0, uDay);
        c *= 1.0 - cloudShade(vW.xz) * 0.3;
        gl_FragColor = vec4(c, mix(0.84, 0.96, foam));
        #include <fog_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uMist, edgeMist(vW));
      }`,
  });
  return new THREE.Mesh(g, mat);
}

function bridge(w: World) {
  const grp = new THREE.Group();
  const wood = toon({ color: '#a36f42' }), dark = toon({ color: '#6d4526' });
  const len = (RIVER_HALF + 3) * 2;
  for (let k = 0; k < 12; k++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, len / 12 - 0.08), k % 2 ? wood : toon({ color: '#986639' }));
    plank.position.set(0, -0.11 + Math.sin(k * 0.26) * 0.25 * Math.sin((k / 11) * Math.PI), -len / 2 + (k + 0.5) * (len / 12));
    grp.add(plank);
  }
  for (const sx of [-1.75, 1.75]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), dark);
    rail.position.set(sx, 0.95, 0);
    grp.add(rail);
    for (let k = -3; k <= 3; k++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.7, 0.2), dark);
      post.position.set(sx, 0.2, (k * len) / 7);
      grp.add(post);
    }
  }
  grp.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  const baked = bakeColors(grp);
  baked.position.set(w.bridgeX, DECK_Y, riverZ(w, w.bridgeX));
  addOutlines(baked, 0.03);
  return baked;
}

function house() {
  const grp = new THREE.Group();
  const mats = new Map<string, THREE.Material>();
  const T = (color: string) => mats.get(color) ?? mats.set(color, toon({ color, occlude: true, cut: true })).get(color)!;
  const add = (g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, m?: THREE.Material) => {
    const mesh = new THREE.Mesh(g, m ?? T(color));
    mesh.position.set(x, y, z);
    grp.add(mesh);
    return mesh;
  };
  const W = HOUSE.w, D = HOUSE.d, front = D / 2;
  add(new THREE.BoxGeometry(W + 0.4, 0.6, D + 0.4), '#9b948a', 0, 0.3, 0); // stone plinth
  add(new THREE.BoxGeometry(W, 3.8, D), '#f1e2c2', 0, 2.4, 0);
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2])
    add(new THREE.BoxGeometry(0.35, 3.9, 0.35), '#6b4a2e', x, 2.4, z); // timber corners
  add(new THREE.BoxGeometry(W + 0.1, 0.25, D + 0.1), '#6b4a2e', 0, 4.25, 0);
  add(new THREE.BoxGeometry(W + 0.05, 0.18, 0.12), '#6b4a2e', 0, 2.0, front + 0.02); // mid rail

  // Pitched roof: staggered courses of clay tiles, each tipped so its lower lip catches the light.
  const pitch = 0.62, ridgeY = 7.3, slope = front + 1.6, rows = 7, tileW = 0.86;
  const tile = new THREE.BoxGeometry(tileW - 0.05, 0.13, slope / rows + 0.32);
  const roofRng = new SeededRandom('roof');
  const roofMat = toon({ vertexColors: true, occlude: true, cut: true });
  const tileGeos: THREE.BufferGeometry[] = [];
  const base = new THREE.Color('#b5563c'), tc = new THREE.Color();
  for (const sd of [-1, 1]) for (let r = 0; r < rows; r++) {
    const n = Math.ceil((W + 1.6) / tileW) + 1, off = (r % 2) * tileW * 0.5;
    for (let k = 0; k < n; k++) {
      const x = -(W + 1.6) / 2 + k * tileW + off;
      if (x > (W + 1.6) / 2) continue;
      const along = (r + 0.5) * (slope / rows);
      const m = new THREE.Matrix4().makeTranslation(0, ridgeY, 0)
        .multiply(new THREE.Matrix4().makeRotationX(sd * pitch))
        .multiply(new THREE.Matrix4().makeTranslation(x, 0.08 - r * 0.012, sd * along))
        .multiply(new THREE.Matrix4().makeRotationX(sd * -0.11))
        .multiply(new THREE.Matrix4().makeRotationZ(roofRng.range(-0.025, 0.025)));
      const g = tile.clone().toNonIndexed().applyMatrix4(m);
      tc.copy(base).offsetHSL(roofRng.range(-0.006, 0.006), roofRng.range(-0.03, 0.02), roofRng.range(-0.022, 0.022) - r * 0.004);
      const cols = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < cols.length; i += 3) tc.toArray(cols, i);
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      g.deleteAttribute('uv');
      tileGeos.push(g);
    }
  }
  const roof = new THREE.Mesh(mergeGeometries(tileGeos)!, roofMat);
  grp.add(roof);
  // Under-deck so the gaps between tiles never show the sky, ridge cap and verge boards.
  for (const sd of [-1, 1]) {
    const deck = add(new THREE.BoxGeometry(W + 1.5, 0.1, slope), '#7c3a29', 0, 0, 0);
    deck.position.set(0, ridgeY - Math.cos(pitch) * 0.02, 0);
    deck.rotation.x = sd * pitch;
    deck.geometry.translate(0, 0, sd * slope / 2);
    for (const x of [-(W + 1.7) / 2, (W + 1.7) / 2]) {
      const verge = add(new THREE.BoxGeometry(0.22, 0.3, slope + 0.1), '#5a3a22', 0, 0, 0);
      verge.geometry.translate(0, 0.02, sd * (slope / 2 + 0.05));
      verge.position.set(x, ridgeY, 0);
      verge.rotation.x = sd * pitch;
    }
  }
  add(new THREE.CylinderGeometry(0.26, 0.26, W + 1.9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), '#8f3b2a', 0, ridgeY + 0.12, 0);
  const gable = new THREE.Shape([new THREE.Vector2(-front, 0), new THREE.Vector2(front, 0), new THREE.Vector2(0, ridgeY - 4.3)]);
  for (const x of [-W / 2, W / 2]) {
    const gm = add(new THREE.ExtrudeGeometry(gable, { depth: 0.2, bevelEnabled: false }), '#e8d6b0', x - 0.1, 4.3, 0);
    gm.rotation.y = Math.PI / 2;
    add(new THREE.BoxGeometry(0.24, 0.7, 0.7), '#6b4a2e', x + Math.sign(x) * 0.08, 5.6, 0); // gable vent
  }
  // Stone chimney through the back slope, with a cap.
  add(new THREE.BoxGeometry(1.1, 3.4, 1.1), '#8f8478', 2.9, 6.75, -1.4);
  add(new THREE.BoxGeometry(1.35, 0.3, 1.35), '#6f665e', 2.9, 8.55, -1.4);
  add(new THREE.BoxGeometry(0.7, 0.2, 0.7), '#2a2420', 2.9, 8.71, -1.4);
  add(new THREE.BoxGeometry(1.8, 2.8, 0.25), '#6b3f22', 0, 1.9, front + 0.05); // door
  add(new THREE.BoxGeometry(2.2, 0.25, 0.4), '#5a3a22', 0, 3.42, front + 0.12); // lintel
  add(new THREE.SphereGeometry(0.1, 6, 4), '#f3dc8a', 0.6, 1.85, front + 0.22);
  add(new THREE.BoxGeometry(2.8, 0.25, 1.3), '#a8a29e', 0, 0.12, front + 0.75); // step
  const glass = toon({ color: '#cfe6f0', emissive: '#ffc766', emissiveIntensity: 0, occlude: true, cut: true });
  for (const x of [-3, 3]) {
    add(new THREE.BoxGeometry(1.7, 1.5, 0.12), '#6b3f22', x, 2.6, front + 0.03);
    add(new THREE.BoxGeometry(1.4, 1.2, 0.14), '', x, 2.6, front + 0.05, glass);
    add(new THREE.BoxGeometry(0.08, 1.2, 0.18), '#6b3f22', x, 2.6, front + 0.06); // mullion
    add(new THREE.BoxGeometry(1.9, 0.3, 0.45), '#7a4a26', x, 1.75, front + 0.2); // flower box
    for (let k = 0; k < 4; k++) add(new THREE.IcosahedronGeometry(0.16, 0), ['#e11d48', '#facc15', '#f472b6', '#8b5cf6'][k], x - 0.6 + k * 0.4, 2.0, front + 0.25);
  }
  grp.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  const baked = bakeColors(grp);
  addOutlines(baked, 0.04, true, true);
  return { grp: baked, glass };
}

const FOLIAGE: Partial<Record<Biome, string>> = {
  FOREST: '#2f7a3a', ENCHANTED: '#b98ad6', TROPICAL: '#25a874', SWAMP: '#55692a',
  TUNDRA: '#5a8a78', MOUNTAIN: '#3a6d52', MEADOW: '#66b04c', DESERT: '#7d9a4a',
};

// Trees in 80-unit chunks: a few extra draw calls, but off-screen canopies (and their shadows) are skipped.
function trees(w: World, rng: SeededRandom) {
  const trunks: Inst[] = [], round: Inst[] = [], pine: Inst[] = [];
  for (const t of w.trees) {
    const y = heightAt(w, t.x, t.z);
    const tall = t.kind === 'palm' ? 4 : t.kind === 'pine' ? 1.4 : 1.9;
    trunks.push(inst(t.x, y - 0.1, t.z, t.s, tall * t.s, t.s, rng.range(0, 6), tmpC.set(t.kind === 'palm' ? '#a07a4f' : '#6e4a2e')));
    const col = tmpC.set(FOLIAGE[biomeAt(w, t.x, t.z)] ?? (t.kind === 'pine' ? '#3a6d52' : '#4c9a3c')).offsetHSL(rng.range(-0.02, 0.02), 0, rng.range(-0.05, 0.05));
    if (t.kind === 'pine') pine.push(inst(t.x, y + 0.9 * t.s, t.z, 1.15 * t.s, 3.4 * t.s, 1.15 * t.s, rng.range(0, 6), col));
    else if (t.kind === 'palm') round.push(inst(t.x, y + 4 * t.s, t.z, 1.5 * t.s, 0.35 * t.s, 1.5 * t.s, rng.range(0, 6), col));
    else round.push(inst(t.x, y + 2.4 * t.s, t.z, 1.25 * t.s, 1.05 * t.s, 1.25 * t.s, rng.range(0, 6), col));
  }
  // Pines: two stacked cones.
  const pineGeo = gradient(mergeGeometries([
    new THREE.ConeGeometry(1, 0.6, 7).translate(0, 0.3, 0).toNonIndexed(),
    new THREE.ConeGeometry(0.75, 0.55, 7).translate(0, 0.62, 0).toNonIndexed(),
  ])!, 0.55, 1.15);
  const trunkMeshes = chunked(new THREE.CylinderGeometry(0.15, 0.26, 1, 6).translate(0, 0.5, 0), toon({ occlude: true }), trunks, true, 80);
  return [
    ...trunkMeshes, ...trunkMeshes.map(m => hullOf(m, 0.05, true)),
    ...chunked(crownGeo(), toon({ vertexColors: true, sway: 0.05, occlude: true, rim: 0.5 }), round, true, 80),
    ...chunked(pineGeo, toon({ vertexColors: true, sway: 0.03, occlude: true, rim: 0.45 }), pine, true, 80),
    ...farTrees(w),
  ];
}

// Low-cost woods past the edge: one merged trunk+crown geometry, no shadows, no outlines.
const FAR_TREES: Partial<Record<Biome, number>> = {
  FOREST: 0.6, TROPICAL: 0.45, ENCHANTED: 0.4, SWAMP: 0.35, GRASS: 0.22, MEADOW: 0.12, RIVER: 0.25, TUNDRA: 0.3, MOUNTAIN: 0.35, DESERT: 0.03,
};
function farTrees(w: World) {
  const rng = new SeededRandom(`${w.seed}-far`);
  const paint = (g: THREE.BufferGeometry, k: number) => {
    const c = new Float32Array(g.attributes.position.count * 3).fill(k);
    return g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  };
  const crown = crownGeo();
  crown.deleteAttribute('uv');
  crown.scale(1.25, 1.05, 1.25).translate(0, 2.4, 0);
  const trunkG = paint(new THREE.CylinderGeometry(0.15, 0.26, 2, 5).translate(0, 1, 0).toNonIndexed(), 0.35);
  trunkG.deleteAttribute('uv');
  const roundGeo = mergeGeometries([trunkG, crown])!;
  const pineGeo = mergeGeometries([trunkG.clone().scale(1, 0.6, 1), gradient(mergeGeometries([
    new THREE.ConeGeometry(1.15, 2.2, 6).translate(0, 1.9, 0).toNonIndexed(),
    new THREE.ConeGeometry(0.85, 1.9, 6).translate(0, 3.0, 0).toNonIndexed(),
  ])!, 0.55, 1.15)].map(g => { g.deleteAttribute('uv'); return g; }))!;
  const round: Inst[] = [], pine: Inst[] = [];
  for (let x = -HALF - OUT + 2; x < HALF + OUT - 2; x += 3.4) for (let z = -HALF - OUT + 2; z < HALF + OUT - 2; z += 3.4) {
    const jx = x + rng.range(-1.5, 1.5), jz = z + rng.range(-1.5, 1.5);
    const e = Math.max(Math.abs(jx), Math.abs(jz)) - HALF;
    if (e < 2.5) continue;
    const b = biomeAt(w, jx, jz);
    if (rng.next() > (FAR_TREES[b] ?? 0.2) * (0.6 + 0.6 * ss(0, 20, e)) || Math.abs(jz - riverZ(w, jx)) < RIVER_HALF + 2.5) continue;
    const s = rng.range(0.9, 1.6);
    const c = tmpC.set(FOLIAGE[b] ?? '#4c9a3c').offsetHSL(rng.range(-0.02, 0.02), 0, rng.range(-0.06, 0.04));
    (b === 'TUNDRA' || b === 'MOUNTAIN' ? pine : round).push(inst(jx, landHeight(w, jx, jz) - 0.2, jz, s, s * rng.range(0.9, 1.2), s, rng.range(0, 6), c));
  }
  const mat = toon({ vertexColors: true, sway: 0.03, rim: 0.4 });
  return [...chunked(roundGeo, mat, round), ...chunked(pineGeo, mat, pine)];
}

// Boulder: a lumpy, flat-bottomed icosahedron, flat shaded, darker at the foot.
function rockGeo(seed: number, tall = 1, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.sin(v.x * 4.1 + seed) * Math.sin(v.y * 3.7 - seed * 0.7) * Math.sin(v.z * 4.3 + seed * 1.3);
    v.multiplyScalar(0.84 + 0.3 * h);
    v.y = v.y < -0.2 ? -0.2 - (v.y + 0.2) * 0.15 : v.y > 0.55 ? 0.55 + (v.y - 0.55) * 0.35 : v.y;
    p.setXYZ(i, v.x, v.y * tall, v.z);
  }
  return gradient(g, 0.62, 1.18);
}

function rocks(w: World, rng: SeededRandom) {
  const mesh = new THREE.InstancedMesh(rockGeo(1.7), toon({ vertexColors: true, occlude: true, rim: 0.3 }), Math.max(1, w.rocks.length));
  w.rocks.forEach((r, i) => {
    place(mesh, i, r.x, heightAt(w, r.x, r.z) + 0.12 * r.s, r.z, r.s, 0.85 * r.s, 0.9 * r.s, rng.range(0, 6));
    const b = biomeAt(w, r.x, r.z);
    mesh.setColorAt(i, tmpC.set(b === 'DESERT' ? '#c99f70' : b === 'TUNDRA' ? '#b9c3c9' : b === 'ENCHANTED' ? '#9a92b8' : '#9c968c').offsetHSL(0, 0, rng.range(-0.06, 0.06)));
  });
  mesh.count = w.rocks.length;
  mesh.castShadow = mesh.receiveShadow = true;
  return [mesh, hullOf(mesh, 0.05, true)];
}

// Stepping stones along the path.
function stones(w: World, rng: SeededRandom) {
  const bx = w.bridgeX, bz = riverZ(w, bx) - RIVER_HALF - 3;
  const len = Math.hypot(bx - pathStart.x, bz - pathStart.z);
  const n = Math.floor(len / 1.3);
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.55, 0.16, 7), toon({ color: '#b8b0a2' }), n);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = pathStart.x + (bx - pathStart.x) * t + rng.range(-0.4, 0.4), z = pathStart.z + (bz - pathStart.z) * t;
    const s = rng.range(0.7, 1.1);
    place(mesh, i, x, heightAt(w, x, z) + 0.04, z, s, 1, s * rng.range(0.7, 1), rng.range(0, 6));
  }
  mesh.receiveShadow = true;
  return mesh;
}

const GRASS_DENSITY: Partial<Record<Biome, number>> = { DESERT: 0.12, TUNDRA: 0.35, MOUNTAIN: 0.4, SWAMP: 0.9 };

function grass(w: World, rng: SeededRandom) {
  const max = 22000;
  // A tuft = five leaning blades, dark at the root and sunlit at the tip.
  const blade = (h: number) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([
    -0.07, 0, 0, 0, 0, 0.04, 0.12, h, 0, 0, 0, 0.04, 0.07, 0, 0, 0.12, h, 0], 3));
  const blades = [0, 1.3, 2.5, 3.8, 5.0].map((a, i) => blade(0.44 + (i % 2) * 0.16).translate(0.06, 0, 0).rotateY(a));
  const geo = gradient(mergeGeometries(blades)!, 0.72, 1.3);
  const list: Inst[] = [];
  let n = 0;
  const bx = w.bridgeX, bz = riverZ(w, bx);
  for (let i = 0; i < max * 1.8 && n < max; i++) {
    // Clumped: half the tufts sit next to the previous one.
    const x = n && rng.next() < 0.5 ? clumpX + rng.range(-0.7, 0.7) : rng.range(-HALF, HALF);
    const z = n && rng.next() < 0.5 ? clumpZ + rng.range(-0.7, 0.7) : rng.range(-HALF, HALF);
    const b = biomeAt(w, x, z);
    if (rng.next() > (GRASS_DENSITY[b] ?? 1) || Math.abs(z - riverZ(w, x)) < RIVER_HALF + 1.3) continue;
    if (Math.abs(x) < HOUSE.w / 2 + 0.6 && Math.abs(z) < HOUSE.d / 2 + 0.6) continue;
    if (segDist(x, z, pathStart.x, pathStart.z, bx, bz - RIVER_HALF - 3) < 1.0) continue;
    const h = heightAt(w, x, z);
    const slope = Math.abs(heightAt(w, x + 0.4, z) - h) + Math.abs(heightAt(w, x, z + 0.4) - h);
    if (slope > 0.5) continue; // no grass on cliff faces
    clumpX = x; clumpZ = z;
    const s = rng.range(0.7, 1.35);
    list.push(inst(x, h, z, s, s * rng.range(0.8, 1.5), s, rng.range(0, 6), groundColor(w, x, z, tmpC).offsetHSL(rng.range(-0.015, 0.02), 0.04, rng.range(-0.06, 0.05))));
    n++;
  }
  return chunked(geo, toon({ vertexColors: true, sway: 0.9, rim: 0.2, side: THREE.DoubleSide }), list);
}
let clumpX = 0, clumpZ = 0;

// Stone slabs packed along terrace risers, turned to face down-slope, so drops read as cliffs.
function ledges(w: World, rng: SeededRandom) {
  const list: Inst[] = [];
  for (let x = -HALF + 2; x < HALF - 2; x += 1.1) for (let z = -HALF + 2; z < HALF - 2; z += 1.1) {
    const jx = x + rng.range(-0.45, 0.45), jz = z + rng.range(-0.45, 0.45);
    const gx = heightAt(w, jx + 0.4, jz) - heightAt(w, jx - 0.4, jz), gz = heightAt(w, jx, jz + 0.4) - heightAt(w, jx, jz - 0.4);
    const slope = Math.hypot(gx, gz) / 0.8;
    if (slope < 1.5 || rng.next() > 0.8) continue;
    const s = rng.range(0.6, 0.95);
    const b = biomeAt(w, jx, jz);
    const c = tmpC.set(b === 'TUNDRA' ? '#aab4ba' : b === 'ENCHANTED' ? '#8c84a8' : b === 'DESERT' ? '#c4976a' : '#968b7e').offsetHSL(0, 0, rng.range(-0.07, 0.05));
    list.push(inst(jx, heightAt(w, jx, jz) - 0.55, jz, s * 1.25, s * rng.range(1.1, 1.6), s * 0.8, Math.atan2(gx, gz) + rng.range(-0.3, 0.3), c));
  }
  return chunked(rockGeo(4.2, 1.2, 0), toon({ vertexColors: true, occlude: true, rim: 0.3 }), list, true);
}

// Desert cacti (decoration only, flowerless so they don't read as pickable).
function cacti(w: World, rng: SeededRandom) {
  const geo = gradient(mergeGeometries([
    new THREE.CylinderGeometry(0.28, 0.34, 2.2, 8).translate(0, 1.1, 0).toNonIndexed(),
    new THREE.SphereGeometry(0.28, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.2, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.16, 0.18, 0.9, 7).translate(0, 0.45, 0).rotateZ(-0.9).translate(0.35, 0.95, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.15, 0.16, 0.7, 7).translate(0.72, 1.55, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.14, 0.16, 0.6, 7).translate(0, 0.3, 0).rotateZ(0.9).translate(-0.3, 1.3, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.13, 0.14, 0.5, 7).translate(-0.62, 1.78, 0).toNonIndexed(),
  ])!, 0.7, 1.15, false);
  const list: Inst[] = [];
  for (let i = 0; i < 4000; i++) {
    const x = rng.range(-HALF, HALF), z = rng.range(-HALF, HALF);
    if (biomeAt(w, x, z) !== 'DESERT' || rng.next() > 0.12) continue;
    if (w.flowers.some(f => Math.abs(f.x - x) < 1.5 && Math.abs(f.z - z) < 1.5)) continue;
    const s = rng.range(0.6, 1.2);
    list.push(inst(x, heightAt(w, x, z) - 0.05, z, s, s, s, rng.range(0, 6), tmpC.set('#4f9a5a').offsetHSL(0, 0, rng.range(-0.05, 0.05))));
  }
  return list.length ? chunked(geo, toon({ vertexColors: true, occlude: true, rim: 0.4 }), list, true) : [];
}

// Decoration that is not pickable: tiny blossoms in the grass and puffy bushes.
function sprinkles(w: World, rng: SeededRandom) {
  const max = 5000;
  const cols = ['#fdfcf3', '#fde68a', '#f9a8d4', '#a5b4fc', '#fef3c7'];
  const list: Inst[] = [];
  let n = 0;
  let cx = 0, cz = 0, col = cols[0];
  for (let i = 0; i < max * 2 && n < max; i++) {
    // 70% land in meadow clumps of one colour, the rest scattered.
    if (i % 40 === 0) { cx = rng.range(-HALF, HALF); cz = rng.range(-HALF, HALF); col = cols[Math.floor(rng.next() * cols.length)]; }
    const clump = rng.next() < 0.7;
    const x = clump ? cx + rng.range(-3, 3) : rng.range(-HALF, HALF), z = clump ? cz + rng.range(-3, 3) : rng.range(-HALF, HALF);
    const b = biomeAt(w, x, z);
    if (b === 'DESERT' || b === 'TUNDRA' || Math.abs(z - riverZ(w, x)) < RIVER_HALF + 1.5) continue;
    if (w.ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 0.5)) continue;
    if (Math.abs(x) < HOUSE.w / 2 + 0.6 && Math.abs(z) < HOUSE.d / 2 + 0.6) continue;
    list.push(inst(x, heightAt(w, x, z) + 0.18, z, 1, 0.6, 1, 0, tmpC.set(clump ? col : cols[Math.floor(rng.next() * cols.length)])));
    n++;
  }
  return chunked(new THREE.IcosahedronGeometry(0.07, 0), toon({ rim: 0.3 }), list);
}

function bushes(w: World, rng: SeededRandom) {
  const max = 700;
  const list: Inst[] = [];
  let n = 0;
  const bx = w.bridgeX, bz = riverZ(w, bx);
  for (let i = 0; i < max * 3 && n < max; i++) {
    // Mostly hugging trees, some free-standing.
    const t = w.trees.length && rng.next() < 0.6 ? w.trees[Math.floor(rng.next() * w.trees.length)] : null;
    const x = t ? t.x + rng.range(-2.2, 2.2) : rng.range(-HALF, HALF), z = t ? t.z + rng.range(-2.2, 2.2) : rng.range(-HALF, HALF);
    const b = biomeAt(w, x, z);
    if (b === 'DESERT' || b === 'TUNDRA' || Math.abs(z - riverZ(w, x)) < RIVER_HALF + 2) continue;
    if (Math.hypot(x, z) < 10 || segDist(x, z, pathStart.x, pathStart.z, bx, bz - RIVER_HALF - 3) < 2.2) continue;
    if (w.flowers.some(f => Math.abs(f.x - x) < 1.2 && Math.abs(f.z - z) < 1.2)) continue; // keep flowers visible
    const s = rng.range(0.45, 0.85);
    list.push(inst(x, heightAt(w, x, z) + 0.35 * s, z, s * 1.2, s * 0.85, s * 1.2, rng.range(0, 6), tmpC.set(FOLIAGE[b] ?? '#4f9a42').offsetHSL(0.01, -0.05, rng.range(-0.08, 0))));
    n++;
  }
  const bushGeo = gradient(mergeGeometries([[0, 0, 0, 1], [0.55, 0.15, 0.2, 0.7], [-0.5, 0.1, -0.25, 0.65]]
    .map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z).toNonIndexed()))!, 0.55, 1.2, false);
  return chunked(bushGeo, toon({ vertexColors: true, sway: 0.04, occlude: true, rim: 0.45 }), list, true);
}

// All flowers in one BatchedMesh: one draw call (plus shadow) for every type on the map.
function flowerMeshes(w: World, rng: SeededRandom) {
  const mat = toon({ vertexColors: true, sway: 0.22, rim: 0.3, side: THREE.DoubleSide });
  const types = [...new Set(w.flowers.map(f => f.type))];
  let verts = 0;
  for (const t of types) verts += flowerGeometry(t).attributes.position.count;
  const batch = new THREE.BatchedMesh(w.flowers.length, verts, 0, mat);
  const geoId = new Map(types.map(t => [t, batch.addGeometry(flowerGeometry(t))]));
  const where = new Map<string, number>();
  const pose = new Map<string, THREE.Matrix4>();
  for (const f of w.flowers) {
    const id = batch.addInstance(geoId.get(f.type)!);
    const s = rng.range(1.5, 1.9);
    const y = WATER_FLOWERS.has(f.type) ? WATER_Y - 0.02 : heightAt(w, f.x, f.z);
    q.setFromAxisAngle(UP, rng.range(0, 6.28));
    const mm = new THREE.Matrix4().compose(v.set(f.x, y, f.z), q, sc.set(s, s, s));
    batch.setMatrixAt(id, mm);
    pose.set(f.id, mm);
    where.set(f.id, id);
  }
  batch.castShadow = true;
  const hide = (id: string) => {
    const i = where.get(id);
    if (i !== undefined) batch.setVisibleAt(i, false);
  };
  return { meshes: [batch], hide, pose };
}

// Ambient particles around the player: pollen by day, fireflies at dusk/night. GPU-animated.
function particles() {
  const N = 500;
  const seed = new Float32Array(N * 4);
  const rng = new SeededRandom('particles');
  for (let i = 0; i < N * 4; i++) seed[i] = rng.next();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uPlayer: U.uPlayer, uNight: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 seed; uniform float uTime; uniform vec3 uPlayer; uniform float uNight; uniform float uPx;
      varying float vA; varying vec3 vC;
      void main() {
        float fly = step(0.55, seed.w); // 45% fireflies, rest pollen
        vec3 p = vec3(seed.x * 44.0, 0.3 + seed.y * 4.5, seed.z * 44.0);
        p += vec3(sin(uTime * (0.2 + seed.y * 0.3) + seed.z * 20.0) * 2.0 + uTime * 0.6,
                  sin(uTime * (0.5 + seed.x) + seed.w * 30.0) * 0.6,
                  cos(uTime * (0.25 + seed.w * 0.3) + seed.x * 20.0) * 2.0);
        p.xz = uPlayer.xz + mod(p.xz - uPlayer.xz + 22.0, 44.0) - 22.0;
        p.y += uPlayer.y;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float blink = 0.5 + 0.5 * sin(uTime * (1.5 + seed.x * 2.0) + seed.y * 40.0);
        vA = mix(0.35 * (1.0 - uNight), uNight * blink, fly);
        vC = mix(vec3(1.0, 0.95, 0.75), vec3(0.85, 1.0, 0.35) * 2.2, fly);
        gl_PointSize = mix(3.0, 6.5, fly) * uPx * (30.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying vec3 vC;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vC * a, a);
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

// Pickup feedback: highlight copy of the flower in reach, sparkle ring, burst + fly-to-basket.
function pickupFx(scene: THREE.Scene) {
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(undefined, glowMat);
  glow.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.8, depthWrite: false }));
  ring.visible = false;
  scene.add(glow, ring);

  const B = 40;
  const bPos = new Float32Array(B * 3), bVel = new Float32Array(B * 3), bCol = new Float32Array(B * 3);
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  bg.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  const burst = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  burst.frustumCulled = false;
  burst.visible = false;
  const fly = new THREE.Mesh(undefined, toon({ vertexColors: true, side: THREE.DoubleSide }));
  fly.visible = false;
  scene.add(burst, fly);
  let bt = 9, ft = 9;
  const from = new THREE.Vector3(), to = new THREE.Vector3();

  const highlight = (geo: THREE.BufferGeometry | null, pose: THREE.Matrix4 | null, time: number) => {
    glow.visible = ring.visible = !!geo;
    if (!geo || !pose) return;
    glow.geometry = geo;
    glow.matrixAutoUpdate = false;
    glow.matrix.copy(pose).multiply(m4.makeScale(1.12, 1.12, 1.12));
    glowMat.opacity = 0.22 + Math.sin(time * 6) * 0.12;
    v.setFromMatrixPosition(pose);
    ring.position.set(v.x, v.y + 0.06, v.z);
    ring.scale.setScalar(1 + Math.sin(time * 4) * 0.06);
  };
  const pick = (geo: THREE.BufferGeometry, pose: THREE.Matrix4, color: string, basket: THREE.Vector3) => {
    from.setFromMatrixPosition(pose);
    to.copy(basket);
    tmpC.set(color);
    for (let i = 0; i < B; i++) {
      bPos.set([from.x, from.y + 0.7, from.z], i * 3);
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5;
      bVel.set([Math.cos(a) * s, 2 + Math.random() * 3, Math.sin(a) * s], i * 3);
      const k = i % 3 ? 1.6 : 2.4; // some sparkle white-hot
      bCol.set(i % 3 ? [tmpC.r * k, tmpC.g * k, tmpC.b * k] : [k, k, k * 0.8], i * 3);
    }
    bg.attributes.color.needsUpdate = true;
    bt = 0; burst.visible = true;
    fly.geometry = geo; ft = 0; fly.visible = true;
  };
  const update = (dt: number, basket: THREE.Vector3) => {
    if (bt < 0.9) {
      bt += dt;
      for (let i = 0; i < B; i++) {
        bVel[i * 3 + 1] -= 9 * dt;
        bPos[i * 3] += bVel[i * 3] * dt; bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt; bPos[i * 3 + 2] += bVel[i * 3 + 2] * dt;
      }
      bg.attributes.position.needsUpdate = true;
      (burst.material as THREE.PointsMaterial).opacity = 1 - bt / 0.9;
    } else burst.visible = false;
    if (ft < 0.45) {
      ft += dt;
      const t = Math.min(1, ft / 0.45), e = t * t * (3 - 2 * t);
      to.copy(basket);
      fly.position.lerpVectors(from, to, e);
      fly.position.y += Math.sin(t * Math.PI) * 1.4;
      fly.scale.setScalar(1.2 * (1 - e) + 0.15);
      fly.rotation.y += dt * 10;
    } else fly.visible = false;
  };
  return { highlight, pick, update };
}

// Sky colour keyframes over the 0..1 day.
const SKY: [number, string][] = [
  [0, '#141b36'], [0.2, '#26325e'], [0.25, '#f2b08e'], [0.32, '#bfe3ef'], [0.64, '#bfe3ef'],
  [0.72, '#ffc58e'], [0.78, '#f08a7a'], [0.86, '#2b2d58'], [1, '#141b36'],
];
const skyAt = (t: number, out: THREE.Color) => {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [t0, a] = SKY[i], [t1, b] = SKY[i + 1];
    if (t <= t1) return out.set(a).lerp(tmpB.set(b), (t - t0) / (t1 - t0));
  }
  return out.set(SKY[0][1]);
};

export type Outdoor = ReturnType<typeof buildOutdoor>;

export function buildOutdoor(w: World) {
  const scene = new THREE.Scene();
  const rng = new SeededRandom(`${w.seed}-render`);
  scene.fog = new THREE.Fog('#bfe3ef', 95, 210);
  scene.background = new THREE.Color('#bfe3ef');

  // Blue sky fill + warm key: shadows read teal, lit faces read gold.
  const hemi = new THREE.HemisphereLight('#9cc8ff', '#2f5f78', 1.25);
  const sun = new THREE.DirectionalLight('#ffe2b0', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.25;
  scene.add(hemi, sun, sun.target);

  const { grp: houseGrp, glass } = house();
  const fl = flowerMeshes(w, rng);
  const water0 = water(w);
  const parts = particles();
  const grassMeshes = grass(w, rng), sprinkleMeshes = sprinkles(w, rng);
  const bx = w.bridgeX, bz = riverZ(w, bx);
  const busy = (x: number, z: number) =>
    Math.hypot(x, z) < 12 || Math.abs(z - riverZ(w, x)) < RIVER_HALF + 3 ||
    segDist(x, z, pathStart.x, pathStart.z, bx, bz - RIVER_HALF - 3) < 2.5 ||
    w.ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 1.5) ||
    w.landmarks.some(l => Math.hypot(l.x - x, l.z - z) < l.r + 2) ||
    w.flowers.some(f => Math.abs(f.x - x) < 1.4 && Math.abs(f.z - z) < 1.4) ||
    w.trees.some(t => Math.abs(t.x - x) < 1.6 && Math.abs(t.z - z) < 1.6);
  scene.add(...terrain(w), water0, bridge(w), houseGrp, ...trees(w, rng), ...rocks(w, rng), stones(w, rng), ...grassMeshes, ...sprinkleMeshes,
    ...bushes(w, rng), ...cacti(w, rng), ...ledges(w, rng), ...decorInstances(w, rng, busy), ...fl.meshes, parts);
  // Edge mist + cloud shadows only while this scene renders (the interior shares the materials).
  scene.onBeforeRender = () => { U.uEdge.value = HALF; U.uCloud.value = cloud; };
  scene.onAfterRender = () => { U.uEdge.value = 1e5; U.uCloud.value = 0; };
  let cloud = 0;
  const props = buildProps(w, scene);
  const fx = pickupFx(scene);

  const skyCol = new THREE.Color(), mist = new THREE.Color();
  const lastCell = { x: 1e9, z: 0 };
  let lastBiome: Biome = 'GRASS';
  const light = { day: 1, golden: 0 };
  const setTime = (t: number, focus: THREE.Vector3, time = 0) => {
    skyAt(t, skyCol);
    const ang = (t - 0.25) * Math.PI * 2; // sunrise at t=0.25, noon at 0.5
    const elev = Math.sin(ang);
    const day = Math.max(0, Math.min(1, elev * 3 + 0.3));
    const golden = day * Math.max(0, 1 - Math.abs(elev - 0.12) * 3.5); // low sun, still up
    // Fog/sky: time of day tinted by the biome Werka stands in.
    const cx = Math.round(focus.x / 4), cz = Math.round(focus.z / 4);
    if (cx !== lastCell.x || cz !== lastCell.z) { lastCell.x = cx; lastCell.z = cz; lastBiome = biomeAt(w, focus.x, focus.z); }
    mist.set(MIST[lastBiome]);
    skyCol.lerp(mist, 0.45 * day);
    (scene.background as THREE.Color).copy(skyCol);
    scene.fog!.color.lerp(skyCol, 0.08); // ease between biomes
    // Edge mist: the fog colour, a touch paler by day so the world evaporates into light.
    U.uMist.value.copy(scene.fog!.color).lerp(tmpB.set('#ffffff'), 0.18 * day);
    (water0.material as THREE.ShaderMaterial).uniforms.uSky.value.copy(skyCol);
    cloud = 0.9 * day;
    const dir = elev > -0.05 ? 1 : -1;
    // Keep the sun low-ish and to the side so shadows are long and readable from above.
    sun.position.set(focus.x + Math.cos(ang) * 40 * dir - 14, focus.y + 30 + Math.abs(elev) * 30, focus.z + 26);
    sun.target.position.copy(focus);
    if (day > 0) sun.color.set('#ff8a4a').lerp(tmpB.set('#fff0d0'), Math.min(1, Math.max(0, elev * 2.4)));
    else sun.color.set('#8fa6ff');
    sun.intensity = day > 0 ? 0.9 + 1.6 * day + golden * 0.6 : 0.55;
    hemi.intensity = 0.55 + 0.75 * day + golden * 0.35;
    hemi.color.set('#9cc8ff').lerp(tmpB.set('#ffb98a'), golden * 0.55).lerp(tmpB.set('#5a6aa8'), 1 - day);
    hemi.groundColor.set(day > 0.3 ? '#2f5f78' : '#1a2140');
    glass.emissiveIntensity = 1.6 * (1 - day) + golden * 0.6;
    props.setNight(1 - day);
    props.update(time);
    (parts.material as THREE.ShaderMaterial).uniforms.uNight.value = 1 - day;
    (water0.material as THREE.ShaderMaterial).uniforms.uDay.value = 0.35 + 0.65 * day;
    U.uRim.value.set(day > 0.3 ? '#ffe7b8' : '#8fa6ff').lerp(tmpB.set('#ff9a5c'), golden * 0.7);
    light.day = day; light.golden = golden;
    return light;
  };

  // Quality hooks: shadow resolution and how much grass/blossom is drawn.
  const counts = new Map<THREE.InstancedMesh, number>();
  for (const m of [...grassMeshes, ...sprinkleMeshes]) counts.set(m, m.count);
  const setQuality = (shadow: number, grassK: number) => {
    if (sun.shadow.mapSize.x !== shadow) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    for (const [m, n] of counts) m.count = Math.floor(n * grassK);
  };

  return { scene, setTime, setQuality, hideFlower: fl.hide, flowerPose: fl.pose, fx, particles: parts, sun };
}
