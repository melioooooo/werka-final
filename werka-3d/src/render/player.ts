// Werka: chibi low-poly figure with a trailing scarf and a basket that fills with picked colours.
import * as THREE from 'three';
import { MAX_INVENTORY } from '../world/data.ts';
import { toon, addOutlines, bakeChildren } from './toon.ts';

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

export function buildPlayer() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs and leans while walking
  root.add(body);

  const legs = [-0.14, 0.14].map(x => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.42, 0);
    leg.add(mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.36, 6).translate(0, -0.2, 0), '#3b3a4a'));
    leg.add(mesh(new THREE.IcosahedronGeometry(0.09, 0).scale(1, 0.6, 1.4), '#5a3a28', 0, -0.4, 0.04));
    body.add(leg);
    return leg;
  });
  const dress = mesh(new THREE.ConeGeometry(0.5, 0.78, 9), '#e58fa8', 0, 0.74, 0);
  const hem = mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.08, 9), '#c96d8a', 0, 0.39, 0);
  const torso = mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.36, 8), '#f3dc8a', 0, 1.15, 0);
  body.add(dress, hem, torso);

  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, 1.27, 0);
    arm.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.36, 5).translate(0, -0.18, 0), '#f3dc8a'));
    arm.add(mesh(new THREE.IcosahedronGeometry(0.07, 0), '#f2c9a0', 0, -0.38, 0));
    arm.rotation.z = side * 0.25;
    body.add(arm);
    return arm;
  });

  // Big head, TUNIC-style proportions.
  const head = new THREE.Group();
  head.position.y = 1.62;
  head.add(mesh(new THREE.IcosahedronGeometry(0.4, 1), '#f2c9a0'));
  head.add(mesh(new THREE.IcosahedronGeometry(0.43, 1).scale(1, 0.92, 0.95), '#5a3a28', 0, 0.06, -0.07));
  head.add(mesh(new THREE.IcosahedronGeometry(0.2, 0).scale(1.3, 0.5, 0.6), '#5a3a28', 0, 0.26, 0.24)); // bangs
  const bun = mesh(new THREE.IcosahedronGeometry(0.17, 0), '#5a3a28', 0, 0.38, -0.3);
  head.add(bun);
  head.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8), '#e58fa8', 0, 0.36, -0.22)); // hair tie
  for (const x of [-0.14, 0.14]) {
    const tiny = [
      mesh(new THREE.SphereGeometry(0.055, 6, 4).scale(0.8, 1.15, 0.4), '#23211d', x, -0.02, 0.37),
      mesh(new THREE.SphereGeometry(0.018, 4, 3), '#ffffff', x + 0.015, 0.02, 0.4),
      mesh(new THREE.SphereGeometry(0.05, 6, 3).scale(1, 0.55, 0.3), '#f0a0a8', x * 1.55, -0.12, 0.33),
    ];
    for (const t of tiny) { t.castShadow = false; t.userData.noOutline = true; head.add(t); }
  }
  body.add(head);

  // Scarf: neck ring + 4 trailing segments that wave with speed and wind.
  body.add(mesh(new THREE.TorusGeometry(0.22, 0.07, 5, 10).rotateX(Math.PI / 2), '#e0574f', 0, 1.36, 0));
  const scarf: THREE.Object3D[] = [];
  let parent: THREE.Object3D = body;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.set(i === 0 ? 0.1 : 0, i === 0 ? 1.34 : 0, i === 0 ? -0.2 : -0.18);
    seg.add(mesh(new THREE.BoxGeometry(0.15 - i * 0.015, 0.05, 0.2).translate(0, 0, -0.09), i % 2 ? '#c9463f' : '#e0574f'));
    parent.add(seg);
    scarf.push(seg);
    parent = seg;
  }

  // Basket on her right hand, filled with one bead per picked flower.
  const basket = new THREE.Group();
  basket.add(mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.24, 9, 1, true), '#b07c45'));
  (basket.children[0] as THREE.Mesh).material = toon({ color: '#b07c45', side: THREE.DoubleSide });
  basket.add(mesh(new THREE.CircleGeometry(0.19, 9).rotateX(-Math.PI / 2), '#8a5a2e', 0, -0.11, 0));
  basket.add(mesh(new THREE.TorusGeometry(0.23, 0.022, 4, 12, Math.PI), '#8a5a2e', 0, 0.1, 0));
  basket.position.set(0.5, 0.92, 0.12);
  body.add(basket);
  const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 0), toon({}), MAX_INVENTORY);
  beads.count = 0;
  basket.add(beads);

  // Fewer draw calls: merge each rigid part's meshes by material (torso stays separate: it breathes).
  torso.userData.keep = true;
  bun.userData.keep = true;
  for (const g of [head, body, basket, ...legs, ...arms]) bakeChildren(g);
  addOutlines(body, 0.022);

  // Soft contact shadow so she stays grounded even where the shadow map is coarse.
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#1c3340', transparent: true, opacity: 0.38, depthWrite: false }));
  blob.position.y = 0.05;
  blob.renderOrder = 1;
  root.add(blob);

  // Footstep dust puffs live in world space (main adds `dust` to the outdoor scene).
  const dust = new THREE.Group();
  const dustMat = () => new THREE.MeshBasicMaterial({ color: '#f3ead2', transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 14 }, () => {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), dustMat());
    p.visible = false;
    dust.add(p);
    return { m: p, t: 9 };
  });
  let nextPuff = 0;
  const puff = (at: THREE.Vector3) => {
    for (let k = 0; k < 2; k++) {
      const p = puffs[nextPuff++ % puffs.length];
      p.m.position.set(at.x + (Math.random() - 0.5) * 0.4, at.y + 0.1, at.z + (Math.random() - 0.5) * 0.4);
      p.t = 0; p.m.visible = true;
    }
  };

  let phase = 0, lean = 0, hopT = 9;
  const hop = () => { hopT = 0; };
  const animate = (dt: number, speed: number, time: number) => {
    phase += dt * Math.max(speed, 0.0001) * 1.5;
    const s = Math.min(1, speed / 5);
    hopT += dt;
    const hopY = hopT < 0.38 ? Math.sin((hopT / 0.38) * Math.PI) * 0.45 : 0;
    body.position.y = Math.abs(Math.sin(phase)) * 0.1 * s + Math.sin(time * 2) * 0.012 * (1 - s) + hopY;
    // Idle breathing and hair that lags a beat behind the body.
    torso.scale.set(1 + Math.sin(time * 2.2) * 0.02 * (1 - s), 1 + Math.sin(time * 2.2) * 0.035 * (1 - s), 1);
    bun.position.y = 0.38 + Math.sin(phase * 2 - 0.9) * 0.035 * s + Math.sin(time * 2.2 - 0.8) * 0.01 + (hopT < 0.38 ? -hopY * 0.12 : 0);
    bun.position.z = -0.3 - 0.05 * s;
    blob.scale.setScalar(1 - hopY * 0.5);
    (blob.material as THREE.MeshBasicMaterial).opacity = 0.38 - hopY * 0.3;
    for (const p of puffs) {
      if (p.t > 0.55) { p.m.visible = false; continue; }
      p.t += dt;
      const k = p.t / 0.55;
      p.m.scale.setScalar(0.6 + k * 1.6);
      p.m.position.y += dt * 0.6;
      (p.m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    }
    lean += (s * 0.18 - lean) * Math.min(1, dt * 8);
    body.rotation.x = lean;
    legs[0].rotation.x = Math.sin(phase) * 0.7 * s;
    legs[1].rotation.x = -Math.sin(phase) * 0.7 * s;
    arms[0].rotation.x = -Math.sin(phase) * 0.6 * s;
    arms[1].rotation.x = Math.sin(phase) * 0.3 * s - 0.2;
    basket.rotation.z = Math.sin(phase) * 0.1 * s;
    head.rotation.z = Math.sin(time * 1.3) * 0.03;
    scarf.forEach((seg, i) => {
      // Hangs down at rest, streams out behind her when she runs.
      seg.rotation.x = (i === 0 ? -1.15 : -0.22) * (1 - s * 0.85) + Math.sin(time * 6 - i * 0.9) * (0.08 + 0.22 * s);
      seg.rotation.y = Math.sin(time * 3.1 - i * 0.7) * 0.25;
    });
  };

  const m = new THREE.Matrix4(), col = new THREE.Color();
  const setBasket = (colors: string[]) => {
    colors.forEach((cl, i) => {
      const a = i * 2.4, r = 0.05 + (i % 3) * 0.05;
      beads.setMatrixAt(i, m.makeTranslation(Math.cos(a) * r, 0.06 + Math.floor(i / 6) * 0.06, Math.sin(a) * r));
      beads.setColorAt(i, col.set(cl));
    });
    beads.count = colors.length;
    beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
  };
  const basketWorld = (out: THREE.Vector3) => basket.getWorldPosition(out);

  return { root, animate, setBasket, basketWorld, dust, puff, hop };
}
