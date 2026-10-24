// Elio: same chibi build as Werka (player.ts), brown hair, round glasses, green jumper.
// Hides behind his cover and peeks out; steps out, turns and waves when Werka comes close.
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

const HAIR = '#6b4226', SKIN = '#f0c39a', JUMPER = '#5f9e6e';

export function buildElio(spot: Elio) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const legs = [-0.14, 0.14].map(x => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.5, 0);
    leg.add(mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.44, 6).translate(0, -0.24, 0), '#34445e'));
    leg.add(mesh(new THREE.IcosahedronGeometry(0.1, 0).scale(1, 0.6, 1.4), '#3a2a20', 0, -0.47, 0.04));
    body.add(leg);
    return leg;
  });
  const torso = mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.62, 9), JUMPER, 0, 0.82, 0);
  body.add(torso);
  body.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 9), '#4a8159', 0, 0.53, 0)); // jumper hem
  body.add(mesh(new THREE.BoxGeometry(0.03, 0.24, 0.02), '#f4e7c4', 0, 0.95, 0.27)); // little stripe
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.3, 1.06, 0);
    arm.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.42, 5).translate(0, -0.21, 0), JUMPER));
    arm.add(mesh(new THREE.IcosahedronGeometry(0.075, 0), SKIN, 0, -0.44, 0));
    arm.rotation.z = side * 0.2;
    body.add(arm);
    return arm;
  });

  const head = new THREE.Group();
  head.position.y = 1.5;
  head.add(mesh(new THREE.IcosahedronGeometry(0.4, 1), SKIN));
  // Short, tousled brown hair: cap + a few tufts.
  head.add(mesh(new THREE.IcosahedronGeometry(0.43, 1).scale(1, 0.75, 1).translate(0, 0.14, -0.05), HAIR));
  for (const [x, y, z, s] of [[-0.18, 0.32, 0.22, 0.13], [0.04, 0.38, 0.25, 0.15], [0.22, 0.3, 0.2, 0.12], [0.05, 0.47, -0.05, 0.14]])
    head.add(mesh(new THREE.IcosahedronGeometry(s, 0).scale(1.2, 0.7, 1), HAIR, x, y, z));
  head.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), SKIN, -0.4, -0.02, 0), mesh(new THREE.SphereGeometry(0.07, 6, 4), SKIN, 0.4, -0.02, 0)); // ears
  // Slightly round glasses: two rings and a bridge, thin dark frames.
  for (const x of [-0.15, 0.15]) {
    head.add(tinyMesh(new THREE.TorusGeometry(0.105, 0.022, 5, 14).scale(1, 0.9, 1), '#2a2624', x, -0.01, 0.38));
    head.add(tinyMesh(new THREE.CircleGeometry(0.09, 12).scale(1, 0.9, 1), '#dff3ff', x, -0.01, 0.375));
    head.add(tinyMesh(new THREE.SphereGeometry(0.045, 6, 4).scale(0.8, 1.1, 0.4), '#23211d', x, -0.02, 0.39));
    head.add(tinyMesh(new THREE.SphereGeometry(0.05, 6, 3).scale(1, 0.55, 0.3), '#f0a0a8', x * 1.7, -0.15, 0.33));
  }
  head.add(tinyMesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), '#2a2624', 0, 0.0, 0.4));
  // Friendly smile.
  head.add(tinyMesh(new THREE.TorusGeometry(0.06, 0.014, 4, 8, Math.PI).rotateZ(Math.PI), '#7a3b2e', 0, -0.17, 0.37));
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
