// Elio (docs/elio-design.md): same chibi build as Werka (player.ts). Messy near-black hair with a
// heavy fringe and short faded sides, thin silver-gold hexagon glasses, moustache and a smirk,
// black tee with a small green mark, backpack straps. Hides behind his cover and peeks out;
// steps out, turns and waves when Werka comes close.
import * as THREE from 'three';
import { toon, addOutlines } from './toon.ts';
import { flatten } from './player.ts';
import type { Elio } from '../world/generate.ts';

const mats = new Map<string, THREE.Material>();
const mat = (color: string) => {
  let m = mats.get(color);
  if (!m) { m = toon({ color, rim: 0.45 }); mats.set(color, m); }
  return m;
};
const mesh = (g: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(g, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};
const tinyMesh = (g: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
  const m = mesh(g, color, x, y, z);
  m.castShadow = false;
  m.userData.noOutline = true;
  return m;
};

const HAIR = '#2a1d17', HAIR_HI = '#4a3427', FADE = '#5a4436', SKIN = '#e8b896', SKIN_D = '#c98f6e';
const TEE = '#1c1c1f', PANTS = '#2b2f3a', STRAP = '#16161a', BLUE = '#2563eb', FRAME = '#d6c9a8';

export function buildElio(spot: Elio) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const legs = [-0.14, 0.14].map(x => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.5, 0);
    leg.add(mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.44, 6).translate(0, -0.24, 0), PANTS));
    leg.add(mesh(new THREE.IcosahedronGeometry(0.1, 0).scale(1, 0.6, 1.4), '#e5e1da', 0, -0.47, 0.04)); // light sneakers
    body.add(leg);
    return leg;
  });
  const torso = mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.62, 9), TEE, 0, 0.82, 0);
  body.add(torso);
  body.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 9), '#26262b', 0, 0.53, 0)); // tee hem
  body.add(mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.06, 8), SKIN_D, 0, 1.13, 0)); // neck
  // Small green squiggle on his left chest (+x, he faces +z).
  body.add(tinyMesh(new THREE.TorusGeometry(0.035, 0.012, 4, 8, Math.PI * 1.4).rotateZ(0.6), '#4ade80', 0.11, 0.98, 0.262));
  // Backpack straps (black with a blue strip, grey buckles) and the pack on his back.
  for (const sx of [-1, 1]) {
    const strap = mesh(new THREE.BoxGeometry(0.08, 0.5, 0.03), STRAP, sx * 0.14, 0.86, 0.255);
    strap.rotation.x = -0.12;
    body.add(strap);
    body.add(tinyMesh(new THREE.BoxGeometry(0.025, 0.46, 0.012), BLUE, sx * 0.14, 0.87, 0.275));
    body.add(tinyMesh(new THREE.BoxGeometry(0.1, 0.045, 0.03), '#9ca3af', sx * 0.14, 0.72, 0.285));
    body.add(mesh(new THREE.BoxGeometry(0.09, 0.08, 0.36), STRAP, sx * 0.15, 1.08, 0.04)); // over the shoulder
  }
  body.add(mesh(new THREE.BoxGeometry(0.46, 0.5, 0.2), '#22252c', 0, 0.86, -0.32));
  body.add(mesh(new THREE.BoxGeometry(0.36, 0.2, 0.06), BLUE, 0, 0.76, -0.43));
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.3, 1.06, 0);
    arm.add(mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.16, 6).translate(0, -0.08, 0), TEE)); // short sleeve
    arm.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.3, 5).translate(0, -0.27, 0), SKIN));
    arm.add(mesh(new THREE.IcosahedronGeometry(0.075, 0), SKIN, 0, -0.44, 0));
    arm.rotation.z = side * 0.2;
    body.add(arm);
    return arm;
  });

  const head = new THREE.Group();
  head.position.y = 1.5;
  head.add(mesh(new THREE.IcosahedronGeometry(0.4, 1), SKIN));
  // Short faded sides and back: a thin dark shell hugging the skull, narrow at the ears.
  head.add(mesh(new THREE.IcosahedronGeometry(0.415, 1).scale(1, 0.62, 1).translate(0, 0.1, -0.06), FADE));
  // Big messy top: a wide crown plus tufts sticking up and out.
  head.add(mesh(new THREE.IcosahedronGeometry(0.42, 1).scale(1.05, 0.6, 1.02).translate(0, 0.26, -0.03), HAIR));
  const TUFTS: [number, number, number, number, number, number][] = [
    [-0.24, 0.42, 0.08, 0.15, 0.5, -0.6], [-0.05, 0.52, 0.12, 0.16, 0.2, -0.2], [0.18, 0.47, 0.1, 0.15, -0.3, 0.5],
    [0.3, 0.36, -0.02, 0.13, -0.5, 0.9], [-0.33, 0.33, -0.05, 0.13, 0.4, -0.9], [0.05, 0.5, -0.18, 0.15, 0.6, 0.1],
    [-0.18, 0.44, -0.24, 0.13, 0.8, -0.4], [0.2, 0.42, -0.24, 0.13, 0.7, 0.5], [0.02, 0.6, -0.02, 0.12, 0, 0.3],
  ];
  // Soft rounded tufts (squashed, tipped blobs) rather than spikes: messy volume on top.
  TUFTS.forEach(([x, y, z, r, rx, rz], i) => {
    const t = mesh(new THREE.IcosahedronGeometry(r * 1.1, 0).scale(1.35, 0.5, 0.8).translate(r * 0.3, r * 0.15, 0), i % 3 ? HAIR : HAIR_HI, x, y - 0.04, z);
    t.rotation.set(rx * 0.7, i * 1.3, rz * 0.8 + (i % 2 ? 0.35 : -0.35));
    head.add(t);
  });
  // Heavy fringe falling over the forehead, swept a little to one side.
  for (const [x, y, z, r, rz] of [[-0.2, 0.25, 0.3, 0.12, 0.5], [-0.05, 0.22, 0.34, 0.13, 0.2], [0.11, 0.23, 0.33, 0.12, -0.15], [0.25, 0.27, 0.27, 0.1, -0.5]]) {
    const f = mesh(new THREE.IcosahedronGeometry(r, 0).scale(1.15, 0.75, 0.6), HAIR, x, y - 0.02, z);
    f.rotation.set(-0.35, 0, rz);
    head.add(f);
  }
  head.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), SKIN, -0.4, -0.02, 0), mesh(new THREE.SphereGeometry(0.07, 6, 4), SKIN, 0.4, -0.02, 0)); // ears
  head.add(tinyMesh(new THREE.SphereGeometry(0.018, 5, 4), '#e5e7eb', 0.45, -0.07, 0.03)); // stud, left ear
  // Thin silver-gold rounded-hexagon glasses, clear lenses with a glint.
  for (const x of [-0.155, 0.155]) {
    head.add(tinyMesh(new THREE.TorusGeometry(0.118, 0.013, 4, 6).rotateZ(Math.PI / 6).scale(1, 0.88, 1), FRAME, x, -0.01, 0.385));
    // Small almond whites, dark irises glancing to his left, a lid line above: no googly eyes.
    head.add(tinyMesh(new THREE.SphereGeometry(0.04, 8, 5).scale(1.15, 0.62, 0.3), '#f6efe6', x, -0.02, 0.378));
    head.add(tinyMesh(new THREE.SphereGeometry(0.026, 6, 4).scale(0.9, 1, 0.35), '#2a1d17', x + 0.018, -0.022, 0.388));
    head.add(tinyMesh(new THREE.BoxGeometry(0.1, 0.014, 0.012).rotateZ(x > 0 ? -0.12 : 0.12), '#3a2a20', x, 0.012, 0.39)); // lid / brow line
    head.add(tinyMesh(new THREE.BoxGeometry(0.035, 0.012, 0.005).rotateZ(0.7), '#ffffff', x - 0.055, 0.045, 0.4)); // lens glint
    head.add(tinyMesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), FRAME, x * 1.95, 0.01, 0.33)); // temples
  }
  head.add(tinyMesh(new THREE.BoxGeometry(0.08, 0.014, 0.014), FRAME, 0, 0.01, 0.395));
  // Thin moustache and a cheeky half smile.
  for (const sx of [-1, 1]) head.add(tinyMesh(new THREE.BoxGeometry(0.075, 0.016, 0.02).rotateZ(sx * 0.12), HAIR, sx * 0.042, -0.13, 0.385));
  head.add(tinyMesh(new THREE.TorusGeometry(0.05, 0.012, 4, 8, Math.PI * 0.7).rotateZ(Math.PI * 1.22), '#7a3b2e', 0.035, -0.17, 0.372)); // smirk, up on his left
  head.add(tinyMesh(new THREE.SphereGeometry(0.012, 4, 3), '#7a3b2e', 0.095, -0.165, 0.36));
  head.add(tinyMesh(new THREE.SphereGeometry(0.05, 6, 3).scale(1, 0.55, 0.3), '#e09a8a', 0.27, -0.13, 0.32));
  body.add(head);

  torso.userData.keep = true;
  for (const g of [head, body, ...legs, ...arms]) flatten(g);
  addOutlines(body, 0.022);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#1c3340', transparent: true, opacity: 0.35, depthWrite: false }));
  blob.position.y = 0.05;
  root.add(blob);

  let yaw = spot.face, out = 0, cheerT = 9;
  const cheer = () => { cheerT = 0; };
  // near: 0 far away .. 1 right next to Werka.
  const update = (dt: number, time: number, werka: THREE.Vector3, ground: number) => {
    const d = Math.hypot(werka.x - spot.x, werka.z - spot.z);
    const near = 1 - Math.min(1, Math.max(0, (d - 3) / 9));
    out += (near - out) * Math.min(1, dt * 3);
    // Peeking: lean out from cover every few seconds; once Werka is close, step out and stay out.
    const peek = Math.max(0, Math.sin(time * 0.9) * 1.6 - 0.6) * (1 - out);
    const e = out * out * (3 - 2 * out);
    root.position.set(spot.x + spot.peek * peek * 1.1 + (spot.ox - spot.x) * e, ground, spot.z + (spot.oz - spot.z) * e);
    body.rotation.z = -spot.peek * 0.4 * peek;
    // Face Werka once she is close, else look around.
    const want = out > 0.2 ? Math.atan2(werka.x - root.position.x, werka.z - root.position.z) : spot.face + Math.sin(time * 0.6) * 0.7;
    let dy = want - yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    yaw += dy * Math.min(1, dt * 4);
    root.rotation.y = yaw;
    head.rotation.y = out > 0.2 ? 0 : Math.sin(time * 1.3) * 0.4;
    head.rotation.z = Math.sin(time * 1.1) * 0.05;
    cheerT += dt;
    const hop = cheerT < 1.2 ? Math.abs(Math.sin(cheerT * Math.PI * 2.5)) * 0.35 * (1 - cheerT / 1.2) : 0;
    body.position.y = Math.sin(time * 2.4) * 0.025 + hop;
    torso.scale.set(1 + Math.sin(time * 2.2) * 0.02, 1 + Math.sin(time * 2.2) * 0.03, 1);
    // Wave with the right arm when Werka is near (both arms up while cheering).
    const wave = Math.max(out, cheerT < 1.2 ? 1 : 0);
    arms[1].rotation.z = 0.2 + wave * (2.5 + Math.sin(time * 9) * 0.35);
    arms[0].rotation.z = -0.2 - (cheerT < 1.2 ? 2.5 : 0);
  };
  return { root, update, cheer };
}
