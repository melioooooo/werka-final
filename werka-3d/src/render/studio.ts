// Bouquet studio: the gallery scene with an orbit camera (drag to turn, wheel / pinch to zoom).
// When editable, a press on a flower or keepsake selects it and dragging moves it on its surface.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildBouquet, type BouquetModel, type Selection } from './bouquet.ts';
import type { Layout } from '../world/bouquet-layout.ts';
import { toon } from './toon.ts';

const LIFT = 1.4; // bouquet origin height; the stem ends rest on the table top
const FOCUS_Y = LIFT - 0.42; // middle of the bouquet
const TOP = LIFT - 2.04; // table top

// Flat-shaded, vertex-coloured part (keeps the TUNIC facets).
function part(g: THREE.BufferGeometry, color: string, lo = 0.85, hi = 1.05) {
  const geo = g.toNonIndexed();
  geo.computeVertexNormals();
  const p = geo.attributes.position, c = new THREE.Color(color), col = new Float32Array(p.count * 3);
  geo.computeBoundingBox();
  const y0 = geo.boundingBox!.min.y, y1 = geo.boundingBox!.max.y;
  for (let i = 0; i < p.count; i++) { const k = lo + (hi - lo) * (y1 > y0 ? (p.getY(i) - y0) / (y1 - y0) : 1); col.set([c.r * k, c.g * k, c.b * k], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Warm soft backdrop, a little round café table with a scalloped cloth, key + rim + fill light.
function dress(scene: THREE.Scene) {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 256;
  const g = cv.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#e9cfb0'); gr.addColorStop(0.5, '#f6e6d0'); gr.addColorStop(1, '#d9b48e');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const bg = new THREE.CanvasTexture(cv);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;

  const mat = toon({ vertexColors: true, rim: 0.2 });
  const parts: THREE.BufferGeometry[] = [];
  parts.push(part(new THREE.CylinderGeometry(1.25, 1.25, 0.1, 14).translate(0, TOP - 0.05, 0), '#b07a4a'));
  // Cloth: a disc on top and a skirt whose hem dips in scallops.
  const skirt = new THREE.CylinderGeometry(1.32, 1.5, 0.55, 28, 2, true);
  const sp = skirt.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i);
    if (y < 0) sp.setY(i, y - 0.08 * Math.abs(Math.sin(Math.atan2(sp.getZ(i), sp.getX(i)) * 7)));
    const a = Math.atan2(sp.getZ(i), sp.getX(i)), r = Math.hypot(sp.getX(i), sp.getZ(i)) * (1 + (y < 0 ? 0.04 * Math.sin(a * 14) : 0));
    sp.setX(i, Math.cos(a) * r); sp.setZ(i, Math.sin(a) * r);
  }
  parts.push(part(skirt.translate(0, TOP - 0.26, 0), '#f6ead6', 0.78, 1.02));
  parts.push(part(new THREE.CylinderGeometry(1.32, 1.32, 0.02, 28).translate(0, TOP + 0.005, 0), '#fbf3e6', 1, 1));
  parts.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.012, 20).translate(0, TOP + 0.02, 0), '#e9a7b4', 1, 1)); // small doily under the bouquet
  // Turned leg and feet below the cloth.
  parts.push(part(new THREE.CylinderGeometry(0.1, 0.16, 1.4, 8).translate(0, TOP - 1.2, 0), '#8a5a33'));
  for (let i = 0; i < 3; i++) parts.push(part(new THREE.BoxGeometry(0.14, 0.1, 0.8).translate(0, TOP - 1.86, 0.36).rotateY(i * 2.094), '#7a4e2c'));
  const floor = new THREE.Mesh(part(new THREE.CircleGeometry(7, 24).rotateX(-Math.PI / 2).translate(0, TOP - 1.92, 0), '#dfbb94', 1, 1), mat);
  scene.add(floor);
  const set = new THREE.Mesh(mergeGeometries(parts)!, mat);
  set.receiveShadow = true;
  scene.add(set);

  const key = new THREE.DirectionalLight('#ffd9a8', 1.8);
  key.position.set(-3.5, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
  key.shadow.bias = -0.0008;
  const rim = new THREE.DirectionalLight('#cfe2ff', 1.4);
  rim.position.set(2.5, 3.5, -6);
  const fill = new THREE.DirectionalLight('#ffe7cf', 0.45);
  fill.position.set(5, 1.5, 3);
  scene.add(key, key.target, rim, fill, new THREE.HemisphereLight('#fff3e2', '#a27e5c', 0.75));
}

export function buildStudio(canvas: HTMLCanvasElement, view: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) {
  const cam = view.camera;
  const holder = new THREE.Group();
  holder.position.y = LIFT;
  view.scene.add(holder);
  dress(view.scene);
  let model: BouquetModel | null = null;
  let editable = false, active = false;
  let onSelect: (s: Selection) => void = () => {};
  const o = { yaw: 0.35, pitch: 0.5, dist: 7, yawT: 0.35, pitchT: 0.5, distT: 7, fit: 7, idle: 0 };

  const show = (b: { flowers: string[]; extras?: string[]; layout?: Layout } | null, edit = false, select?: (s: Selection) => void) => {
    if (model) { holder.remove(model.group); model.dispose(); }
    model = b ? buildBouquet(b.flowers, b.extras ?? [], b.layout) : null;
    if (model) holder.add(model.group);
    editable = edit;
    onSelect = select ?? (() => {});
    o.distT = o.fit; o.pitchT = 0.5; o.idle = 0;
    return model;
  };

  // px, py: fraction of the screen to move the bouquet right / up, away from a panel.
  const resize = (w: number, h: number, px = 0, py = 0) => {
    // Fit ~3.6 units tall and ~2.9 wide, whichever binds.
    const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    o.fit = Math.max(4.1 / (2 * tv), 3.0 / (2 * tv * (w / h))) * 1.1;
    o.distT = o.dist = o.fit;
    cam.setViewOffset(w, h, -w * px, h * py, w, h);
    cam.updateProjectionMatrix();
  };

  // --- pointers -----------------------------------------------------------------------------
  const ptrs = new Map<number, { x: number; y: number }>();
  let mode: 'none' | 'orbit' | 'drag' | 'pinch' = 'none';
  let moved = 0, pinch = 0;
  const ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
  const rayAt = (x: number, y: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    return ray.ray;
  };
  const span = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  canvas.addEventListener('pointerdown', e => {
    if (!active) return;
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    o.idle = 0;
    if (ptrs.size === 2) {
      if (mode === 'drag') model?.endDrag();
      mode = 'pinch'; pinch = span();
      return;
    }
    moved = 0;
    const s = editable && model ? model.pick(rayAt(e.clientX, e.clientY)) : null;
    if (s && model) {
      mode = 'drag';
      model.select(s); model.poke(s); onSelect(s);
    } else mode = 'orbit';
  });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!active || !p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    o.idle = 0;
    if (mode === 'pinch' && ptrs.size === 2) {
      const d = span();
      if (pinch > 0) o.distT = THREE.MathUtils.clamp(o.distT * (pinch / d), o.fit * 0.45, o.fit * 1.5);
      pinch = d;
    } else if (mode === 'orbit') {
      o.yawT -= dx * 0.008;
      o.pitchT = THREE.MathUtils.clamp(o.pitchT + dy * 0.006, -0.25, 1.25);
    } else if (mode === 'drag' && model) model.dragTo(rayAt(e.clientX, e.clientY));
  });
  const up = (e: PointerEvent) => {
    if (!ptrs.delete(e.pointerId)) return;
    if (mode === 'drag') model?.endDrag();
    else if (mode === 'orbit' && moved < 6 && editable && model) { model.select(null); onSelect(null); }
    mode = ptrs.size ? 'orbit' : 'none';
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => {
    if (!active) return;
    e.preventDefault();
    o.idle = 0;
    o.distT = THREE.MathUtils.clamp(o.distT * (1 + Math.sign(e.deltaY) * 0.1), o.fit * 0.45, o.fit * 1.5);
  }, { passive: false });

  const update = (dt: number, time: number, spin: boolean) => {
    o.idle += dt;
    if (spin && o.idle > 2.5 && mode === 'none') o.yawT += dt * 0.4; // gallery: slow turntable when left alone
    const k = 1 - Math.exp(-dt * 10);
    o.yaw += (o.yawT - o.yaw) * k; o.pitch += (o.pitchT - o.pitch) * k; o.dist += (o.distT - o.dist) * k;
    cam.position.set(Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, FOCUS_Y + Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
    cam.lookAt(0, FOCUS_Y, 0);
    model?.update(dt, time);
  };
  const setActive = (on: boolean) => { active = on; ptrs.clear(); mode = 'none'; };
  // Screen pixel of a piece, for scripted tests.
  const screenOf = (s: NonNullable<Selection>) => {
    if (!model) return null;
    const p = model.centreOf(s).project(cam), r = canvas.getBoundingClientRect();
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
  };
  return { show, update, resize, setActive, screenOf, get model() { return model; }, orbit: o };
}
