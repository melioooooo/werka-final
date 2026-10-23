// Game loop and state machine: menu -> intro -> outdoor <-> house -> craft -> gallery.
import * as THREE from 'three';
import { generateWorld, blocked, steep, walkY, SPAWN, HOUSE } from './world/generate.ts';
import { DAY_CYCLE_DURATION, MAX_INVENTORY, START_TIME, timeLabel } from './world/data.ts';
import { state, load, save, today } from './state.ts';
import { buildOutdoor } from './render/outdoor.ts';
import { buildPlayer } from './render/player.ts';
import { buildInterior, buildGallery, interiorBlocked, TABLE, EXIT } from './render/house.ts';
import { flowerGeometry } from './render/flowers.ts';
import { buildPost } from './render/post.ts';
import { flowerIcon } from './render/icons.ts';
import { PRESETS, savedQuality, saveQuality, pickQuality, nextQuality, type Quality } from './quality.ts';
import { U } from './render/toon.ts';
import { initInput, readMove, consumeAction } from './input/input.ts';
import { startAudio, ambience, sfx, isMuted, toggleMute } from './audio.ts';
import * as ui from './ui/ui.ts';

type Mode = 'menu' | 'intro' | 'outdoor' | 'house' | 'craft' | 'gallery';

load();
const world = generateWorld(state.date);
const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
// Quality: saved choice, else probe at 'med' on the title screen and pick from measured frame time.
const stored = savedQuality();
let quality: Quality = stored ?? 'med';
let probe = stored ? -1 : 0, probeSum = 0; // frames measured so far (-1 = done)
let PR = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;

// TUNIC-style camera: long lens, high fixed angle, damped follow. Werka is ~1/14 of the frame height.
const CAM = { fov: 20, pitch: THREE.MathUtils.degToRad(50), dist: 80 };
const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 5, 600);
let post = buildPost(renderer, PRESETS[quality].msaa);
const outdoor = buildOutdoor(world);
const interior = buildInterior();
const galleryView = buildGallery();
const player = buildPlayer();
outdoor.scene.add(player.root, player.dust);
for (const id of state.picked) outdoor.hideFlower(id);

const resize = () => {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  post.setSize(w, h, PR);
  camera.aspect = galleryView.camera.aspect = w / h;
  // Portrait phones see less width: widen a little so the play area stays similar.
  camera.fov = w < h ? CAM.fov * 1.1 : CAM.fov;
  galleryView.camera.position.set(0, 1.2, w < h ? 8.8 : 5.2);
  galleryView.camera.lookAt(0, 0.2, 0);
  camera.updateProjectionMatrix();
  galleryView.camera.updateProjectionMatrix();
};
addEventListener('resize', resize);

function applyQuality(q: Quality) {
  const p = PRESETS[q];
  if (PRESETS[quality].msaa !== p.msaa) { post.dispose(); post = buildPost(renderer, p.msaa); }
  quality = q;
  PR = Math.min(devicePixelRatio, p.pr);
  renderer.setPixelRatio(PR);
  post.setEnabled(p.post);
  outdoor.setQuality(p.shadow, p.grass);
  (outdoor.particles.material as THREE.ShaderMaterial).uniforms.uPx.value = PR;
  resize();
}
applyQuality(quality);
const QUALITY_LABEL: Record<Quality, string> = { low: 'Low', med: 'Medium', high: 'High' };
initInput(canvas, ui.stick, ui.knob, ui.actBtn);
ui.initMute(isMuted(), toggleMute);

let mode: Mode = 'menu';
let busy = false; // true during fades so input can't double-trigger
let dayT = START_TIME, day = 1, golden = 0;
const pos = new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
const camTarget = new THREE.Vector3();
const basketPos = new THREE.Vector3();
let facing = 0;
let galleryReturn: Mode = 'menu';
let stepClock = 0;

const playing = () => mode === 'outdoor' || mode === 'house';
const refreshBasket = () => {
  player.setBasket(state.inventory.map(i => i.color));
  ui.setHud(playing() ? state.inventory : null);
  ui.setTime(timeLabel(dayT));
};

function goMenu() {
  mode = 'menu';
  ui.setHud(null); ui.setAction(null); ui.setPlaying(false);
  ui.menu({
    bouquets: state.bouquets.length,
    quality: QUALITY_LABEL[quality],
    onQuality: () => {
      probe = -1;
      const q = nextQuality(quality);
      applyQuality(q);
      saveQuality(q);
      return QUALITY_LABEL[q];
    },
    onStart: () => {
      startAudio();
      sfx.ui();
      if (today() !== state.date) return location.reload(); // new day: fresh world + reset inventory
      mode = 'intro';
      ui.intro(state.date, () => {
        run(() => enterOutdoor(SPAWN.x, SPAWN.z, true));
        setTimeout(() => ui.tutorial(() => {}), 700);
      });
    },
    onGallery: () => { startAudio(); openGallery('menu'); },
    onReset: () => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('werka3d_')) localStorage.removeItem(k);
      location.reload();
    },
  });
}

function enterOutdoor(x: number, z: number, snap = false) {
  mode = 'outdoor';
  outdoor.scene.add(player.root);
  pos.set(x, walkY(world, x, z), z);
  facing = 0;
  if (snap) camTarget.copy(pos);
  ui.setPlaying(true);
  refreshBasket();
}

function enterHouse() {
  mode = 'house';
  interior.scene.add(player.root);
  pos.set(EXIT.x, 0, EXIT.z - 1);
  facing = Math.PI;
  camTarget.copy(pos);
  ui.setPlaying(true);
  refreshBasket();
}

function openCraft() {
  mode = 'craft';
  ui.setAction(null); ui.setPlaying(false);
  ui.craft(state.inventory, flowerIcon, picked => {
    const items = picked.map(i => state.inventory[i]);
    const b = { id: Date.now().toString(), date: state.date, flowers: items.map(i => i.type), colors: items.map(i => i.color) };
    state.bouquets.unshift(b);
    state.inventory = state.inventory.filter((_, i) => !picked.includes(i));
    save();
    refreshBasket();
    sfx.craft();
    ui.fade(() => openGallery('house'));
  }, () => { mode = 'house'; ui.setPlaying(true); refreshBasket(); });
}

function openGallery(back: Mode) {
  galleryReturn = back;
  mode = 'gallery';
  ui.setHud(null); ui.setAction(null); ui.setPlaying(false);
  ui.gallery(state.bouquets, b => galleryView.show(b ? b.flowers : null), () =>
    ui.fade(() => (galleryReturn === 'house' ? enterHouse() : goMenu())));
}

const run = (action: () => void) => {
  if (busy) return;
  busy = true;
  ui.fade(action).then(() => (busy = false));
};

// Screen-relative movement (camera looks toward -z), sliding along obstacles.
function walk(dt: number, isBlocked: (x: number, z: number) => boolean, speed: number, time: number) {
  const m = readMove();
  const dx = m.x * speed * dt, dz = -m.y * speed * dt;
  if (dx && !isBlocked(pos.x + dx, pos.z)) pos.x += dx;
  if (dz && !isBlocked(pos.x, pos.z + dz)) pos.z += dz;
  const moving = Math.hypot(m.x, m.y);
  if (moving > 0.05) {
    let d = Math.atan2(dx, dz) - facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    facing += d * Math.min(1, dt * 12);
    stepClock += dt * moving;
    if (stepClock > 0.3) { stepClock = 0; sfx.step(); if (mode === 'outdoor') player.puff(pos); }
  }
  player.animate(dt, moving * speed, time);
  player.root.rotation.y = facing;
  return moving;
}

const DOOR = { x: HOUSE.door.x, z: HOUSE.door.z + 0.8 };
const outdoorBlocked = (x: number, z: number) => blocked(world, x, z) || steep(world, pos.x, pos.z, x, z);
type Spot = (typeof world.flowers)[number];

function followCamera(dt: number, dist: number, pitch: number) {
  camTarget.lerp(pos, 1 - Math.exp(-dt * 5));
  camera.position.set(camTarget.x, camTarget.y + 1 + Math.sin(pitch) * dist, camTarget.z + Math.cos(pitch) * dist);
  camera.lookAt(camTarget.x, camTarget.y + 1, camTarget.z);
}

function tickOutdoor(dt: number, time: number) {
  walk(dt, outdoorBlocked, 7, time);
  pos.y += (walkY(world, pos.x, pos.z) - pos.y) * Math.min(1, dt * 14);
  player.root.position.copy(pos);
  // Behind the cottage: dissolve it so Werka stays visible.
  const behind = pos.z < HOUSE.d / 2 + 0.3 && pos.z > -HOUSE.d / 2 - 9 && Math.abs(pos.x) < HOUSE.w / 2 + 3;
  U.uCut.value += ((behind ? 1 : 0) - U.uCut.value) * Math.min(1, dt * 6);

  // Closest unpicked flower in reach.
  let best: Spot | null = null, bestD = 2.1;
  for (const f of world.flowers) {
    if (state.picked.has(f.id)) continue;
    const dx = f.x - pos.x, dz = f.z - pos.z;
    if (Math.abs(dx) > bestD || Math.abs(dz) > bestD) continue;
    const d = Math.hypot(dx, dz);
    if (d < bestD) { bestD = d; best = f; }
  }
  const atDoor = Math.hypot(pos.x - DOOR.x, pos.z - DOOR.z) < 2.3;
  outdoor.fx.highlight(best ? flowerGeometry(best.type) : null, best ? outdoor.flowerPose.get(best.id)! : null, time);
  ui.setAction(best ? `Pick ${best.type}` : atDoor ? 'Enter the house' : null);

  player.basketWorld(basketPos);
  if (consumeAction() && !busy) {
    if (best) {
      if (state.inventory.length >= MAX_INVENTORY) { ui.toast('Basket full! Craft a bouquet in the house.', 2200); sfx.full(); }
      else {
        state.inventory.push({ id: best.id, type: best.type, color: best.color });
        state.picked.add(best.id);
        outdoor.fx.pick(flowerGeometry(best.type), outdoor.flowerPose.get(best.id)!, best.color, basketPos);
        outdoor.hideFlower(best.id);
        player.hop();
        save();
        refreshBasket();
        sfx.pick();
        ui.toast(`Picked ${best.type}`);
      }
    } else if (atDoor) { sfx.door(); run(enterHouse); }
  }
  outdoor.fx.update(dt, basketPos);

  dayT = (dayT + (dt * 1000) / DAY_CYCLE_DURATION) % 1;
  ui.setTime(timeLabel(dayT));
  ({ day, golden } = outdoor.setTime(dayT, pos, time));
  followCamera(dt, CAM.dist, CAM.pitch);
  // Home compass once the cottage is well out of view.
  const hx = -pos.x, hz = -pos.z;
  ui.setCompass(Math.hypot(hx, hz) > 26 ? Math.atan2(hx, -hz) : null);
}

function tickHouse(dt: number, time: number) {
  walk(dt, interiorBlocked, 4.5, time);
  pos.y = 0;
  player.root.position.copy(pos);
  const atTable = Math.hypot(pos.x - TABLE.x, pos.z - TABLE.z) < 1.8;
  const atExit = Math.hypot(pos.x - EXIT.x, pos.z - EXIT.z) < 1.4;
  ui.setAction(atTable ? 'Craft a bouquet' : atExit ? 'Go outside' : null);
  ui.setCompass(null);
  if (consumeAction() && !busy) {
    if (atTable) { sfx.ui(); openCraft(); }
    else if (atExit) { sfx.door(); run(() => enterOutdoor(DOOR.x, DOOR.z + 1.5, true)); }
  }
  // Same high angle indoors, closer, drifting only a little with Werka.
  camTarget.lerp(pos, 1 - Math.exp(-dt * 4));
  // Long lens: back off 1.5x versus a 30 degree lens; portrait backs off more so the room fits.
  const k = (camera.aspect < 1 ? 1.45 : 1) * 1.5;
  camera.position.set(camTarget.x * 0.35, 19 * k, 16.5 * k + camTarget.z * 0.3);
  camera.lookAt(camTarget.x * 0.45, 0.6, camTarget.z * 0.45 - 0.6);
}

const clock = new THREE.Clock();
const tmpGold = new THREE.Color('#ffb070');
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  U.uTime.value = time;
  post.grade.uniforms.uTime.value = time;
  post.grade.uniforms.uRays.value = mode === 'outdoor' || mode === 'menu' ? day * (0.7 + golden) : 0;
  post.grade.uniforms.uHigh.value.set('#ffe2b0').lerp(tmpGold, golden * 0.8);
  post.grade.uniforms.uTilt.value = mode === 'outdoor' || mode === 'menu' ? 1 : 0;
  renderer.toneMappingExposure = 1.05 + (mode === 'outdoor' || mode === 'menu' ? golden * 0.45 : 0);
  // Quality probe: average 60 frames (after 30 warm-up) on the title screen at 'med'.
  if (probe >= 0 && mode === 'menu') {
    probe++;
    const now = performance.now();
    if (probe === 10) probeSum = now; // warm-up done: start timing
    // 60 timed frames, or stop after 3 s on very slow devices.
    if (probe === 70 || (probe > 10 && now - probeSum > 3000)) {
      const q = pickQuality((now - probeSum) / (probe - 10));
      probe = -1;
      applyQuality(q);
      saveQuality(q);
    }
  }
  U.uPlayer.value.copy(pos);
  if (mode === 'outdoor') {
    tickOutdoor(dt, time);
    U.uCam.value.copy(camera.position);
    ambience(day, false, dt);
    post.draw(outdoor.scene, camera);
  } else if (mode === 'house' || mode === 'craft') {
    if (mode === 'house') tickHouse(dt, time);
    else { consumeAction(); player.animate(dt, 0, time); }
    U.uCam.value.copy(camera.position);
    interior.update(time);
    ambience(day, true, dt);
    post.draw(interior.scene, camera);
  } else if (mode === 'gallery') {
    consumeAction();
    galleryView.update(time);
    ambience(day, true, dt);
    post.draw(galleryView.scene, galleryView.camera);
  } else {
    // Title backdrop: slow drift over the cottage at the gameplay angle.
    consumeAction();
    pos.set(Math.sin(time * 0.05) * 6, 0, SPAWN.z + 2 + Math.cos(time * 0.07) * 3);
    U.uPlayer.value.set(0, -100, 0); // nothing to see through on the title
    ({ day, golden } = outdoor.setTime(dayT, pos, time));
    player.root.position.set(SPAWN.x, walkY(world, SPAWN.x, SPAWN.z), SPAWN.z);
    player.animate(dt, 0, time);
    camTarget.copy(pos);
    camera.position.set(pos.x, 1 + Math.sin(CAM.pitch) * CAM.dist * 1.1, pos.z + Math.cos(CAM.pitch) * CAM.dist * 1.1);
    camera.lookAt(pos.x, 1, pos.z);
    U.uCam.value.copy(camera.position);
    ambience(day, false, dt);
    post.draw(outdoor.scene, camera);
  }
});

goMenu();

// Test hook for headless browser checks (teleport, read state). Dev server only.
if (import.meta.env.DEV) {
  Object.assign(window, {
    __werka: {
      get mode() { return mode; },
      pos, world, state,
      teleport: (x: number, z: number) => { pos.x = x; pos.z = z; camTarget.set(x, pos.y, z); },
      setDay: (t: number) => { dayT = t; },
      get quality() { return quality; },
      setQuality: (q: Quality) => applyQuality(q),
      // Draw calls / triangles for one plain render of the current outdoor view.
      info: () => {
        renderer.render(outdoor.scene, camera);
        const r = renderer.info.render;
        return { calls: r.calls, triangles: r.triangles, geometries: renderer.info.memory.geometries, quality };
      },
      sun: outdoor.sun,
      // Renderable objects in the camera frustum, grouped by geometry type (draw-call budget check).
      visible: () => {
        const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        const out: Record<string, number> = {};
        outdoor.scene.traverseVisible(o => {
          const m = o as THREE.Mesh;
          if (!m.isMesh && !(o as THREE.Points).isPoints) return;
          if (m.frustumCulled && m.geometry && !fr.intersectsObject(m)) return;
          const k = `${o.type}:${m.geometry?.type}`;
          out[k] = (out[k] ?? 0) + 1;
        });
        return out;
      },
    },
  });
}
