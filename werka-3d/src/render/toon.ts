// Shared stylised material kit: soft toon ramp + rim light, optional wind sway,
// optional see-through dither when an object stands between the camera and Werka,
// and an inverted-hull outline material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Global uniforms shared by every patched material (one object, updated once per frame).
export const U = {
  uTime: { value: 0 },
  uPlayer: { value: new THREE.Vector3() },
  uCam: { value: new THREE.Vector3() },
  uWind: { value: 1 },
  uRim: { value: new THREE.Color('#fff1d0') },
  uCut: { value: 0 }, // 0..1: how much of the house above the plinth is hidden (player behind it)
};

// Soft 5-step ramp: shadows stay readable and coloured instead of black.
const ramp = (() => {
  const data = new Uint8Array([90, 130, 180, 225, 255].flatMap(v => [v, v, v, 255]));
  const t = new THREE.DataTexture(data, 5, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();

type ToonOpts = THREE.MeshToonMaterialParameters & {
  sway?: number; // wind strength, scales with local height (y)
  occlude?: boolean; // dither away when between camera and player
  cut?: boolean; // also obeys U.uCut (house)
  rim?: number;
};

const VERT_HEAD = /* glsl */ `
uniform float uTime; uniform float uWind;
varying vec3 vOccWorld;
`;
const FRAG_HEAD = /* glsl */ `
uniform vec3 uPlayer; uniform vec3 uCam; uniform vec3 uRim; uniform float uCut;
varying vec3 vOccWorld;
// Interleaved gradient noise: a fine, even screen-door pattern (much less blocky than a 4x4 Bayer).
float bayer4(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
// 0..1 how much this fragment should vanish: near the camera->player line, in front of the player.
float occlusion() {
  vec3 ab = uPlayer + vec3(0.0, 1.0, 0.0) - uCam;
  float t = dot(vOccWorld - uCam, ab) / dot(ab, ab);
  float d = length(vOccWorld - (uCam + ab * clamp(t, 0.0, 1.0)));
  return (1.0 - smoothstep(1.8, 4.0, d)) * step(t, 0.96) * 0.9;
}
`;
// Occluders dither out; the house (cut) fades with real alpha so it dissolves smoothly.
const occChunk = (occlude: boolean, cut: boolean) => `#include <clipping_planes_fragment>
  float cutA = ${cut ? '1.0 - uCut * step(0.9, vOccWorld.y)' : '1.0'};
  {
    float fade = ${occlude ? 'occlusion()' : '0.0'};
    if (fade > bayer4(gl_FragCoord.xy)) discard;
    if (cutA < 0.02) discard;
  }`;
const alphaChunk = `diffuseColor.a *= cutA;
  #include <opaque_fragment>`;

export function toon(opts: ToonOpts = {}) {
  const { sway = 0, occlude = false, cut = false, rim = 0.35, ...params } = opts;
  const mat = new THREE.MeshToonMaterial({ gradientMap: ramp, transparent: cut, ...params });
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = VERT_HEAD + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${sway ? `{
          #if defined(USE_INSTANCING)
            vec3 ip = vec3(instanceMatrix[3]);
          #elif defined(USE_BATCHING)
            vec3 ip = vec3(batchingMatrix[3]);
          #else
            vec3 ip = vec3(modelMatrix[3]);
          #endif
          float hh = max(position.y, 0.0);
          float ph = uTime * 1.8 + ip.x * 0.31 + ip.z * 0.23;
          float gust = 0.6 + 0.4 * sin(uTime * 0.37 + ip.x * 0.05);
          transformed.x += (sin(ph) * 0.7 + sin(ph * 2.3) * 0.3) * ${sway.toFixed(3)} * hh * hh * gust * uWind;
          transformed.z += cos(ph * 0.8) * ${(sway * 0.5).toFixed(3)} * hh * hh * gust * uWind;
        }` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 wp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          vOccWorld = (modelMatrix * wp).xyz;
        }`);
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', occChunk(occlude, cut))
      .replace('#include <opaque_fragment>', `{
          vec3 V = normalize(vViewPosition);
          float fr = pow(1.0 - clamp(dot(normalize(normal), V), 0.0, 1.0), 3.0);
          outgoingLight += uRim * fr * ${rim.toFixed(3)};
        }
        ${alphaChunk}`);
  };
  mat.customProgramCacheKey = () => `toon-${sway}-${occlude}-${cut}-${rim}`;
  return mat;
}

// Inverted hull outline: back faces pushed out along normals, flat dark colour.
export function outline(color = '#1f2a2c', width = 0.04, occlude = false, cut = false) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: cut });
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = VERT_HEAD + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed += normalize(normal) * ${width.toFixed(3)};`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 wp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          vOccWorld = (modelMatrix * wp).xyz;
        }`);
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', occChunk(occlude, cut))
      .replace('#include <opaque_fragment>', alphaChunk);
  };
  mat.customProgramCacheKey = () => `outline-${width}-${occlude}-${cut}`;
  return mat;
}

// Adds an outline hull to every mesh in a group (non-instanced props: player, house, furniture).
export function addOutlines(root: THREE.Object3D, width = 0.035, occlude = false, cut = false) {
  const mat = outline('#1f2a2c', width, occlude, cut);
  const meshes: THREE.Mesh[] = [];
  root.traverse(o => { if ((o as THREE.Mesh).isMesh && !o.userData.noOutline) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    const hull = new THREE.Mesh(m.geometry, mat);
    hull.userData.noOutline = true;
    hull.castShadow = false;
    m.add(hull);
  }
}

// Bake a bottom-dark / top-light vertex colour ramp (multiplied with material/instance colour).
export function gradient(geo: THREE.BufferGeometry, bottom = 0.6, top = 1.15, flat = true) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (flat) g.computeVertexNormals();
  const pos = g.attributes.position;
  g.computeBoundingBox();
  const y0 = g.boundingBox!.min.y, y1 = g.boundingBox!.max.y;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - y0) / Math.max(1e-4, y1 - y0);
    col.fill(bottom + (top - bottom) * t, i * 3, i * 3 + 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// Static prop group -> one mesh per material (fewer draw calls). Children keep their look;
// the returned group replaces the original at the same transform.
export function bake(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const flags = new Map<THREE.Material, { cast: boolean; recv: boolean; noOutline: boolean }>();
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    const keepUv = !!(m.material as THREE.MeshBasicMaterial).map; // textured materials need their uvs
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color' && !(keepUv && k === 'uv')) g.deleteAttribute(k);
    g = g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    (byMat.get(m.material) ?? byMat.set(m.material, []).get(m.material)!).push(g);
    const f = flags.get(m.material) ?? { cast: false, recv: false, noOutline: true };
    f.cast ||= m.castShadow; f.recv ||= m.receiveShadow; f.noOutline &&= !!m.userData.noOutline;
    flags.set(m.material, f);
  });
  const out = new THREE.Group();
  out.position.copy(root.position); out.quaternion.copy(root.quaternion); out.scale.copy(root.scale);
  for (const [mat, list] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(list)!, mat);
    const f = flags.get(mat)!;
    mesh.castShadow = f.cast; mesh.receiveShadow = f.recv; mesh.userData.noOutline = f.noOutline;
    out.add(mesh);
  }
  return out;
}

// Merge a group's direct mesh children by material, in place (sub-groups and userData.keep meshes stay).
export function bakeChildren(group: THREE.Object3D) {
  const byMat = new Map<THREE.Material, THREE.Mesh[]>();
  for (const c of group.children) {
    const m = c as THREE.Mesh;
    if (!m.isMesh || m.userData.keep || Array.isArray(m.material)) continue;
    (byMat.get(m.material) ?? byMat.set(m.material, []).get(m.material)!).push(m);
  }
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map(m => {
      m.updateMatrix();
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
      return g.applyMatrix4(m.matrix);
    });
    const merged = new THREE.Mesh(mergeGeometries(geos)!, mat);
    merged.castShadow = list.some(m => m.castShadow);
    merged.userData.noOutline = list.every(m => m.userData.noOutline);
    for (const m of list) group.remove(m);
    group.add(merged);
  }
}
