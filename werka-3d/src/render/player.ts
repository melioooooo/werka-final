// Werka: chibi low-poly figure with a trailing scarf and a basket that fills with picked colours.
import * as THREE from 'three';
import { MAX_INVENTORY } from '../world/data.ts';
import { toon, addOutlines, bakeColors } from './toon.ts';
import { TOPS, BOTTOMS, SCARVES, GLASSES, HATS, DEFAULT_OUTFIT, type Outfit } from '../world/outfits.ts';

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

// Rigid part -> one outlined mesh plus one mesh of its tiny unoutlined details (eyes, glasses),
// via bakeColors. Sub-groups, instanced and userData.keep meshes stay as they are.
export function flatten(g: THREE.Object3D) {
  const parts = g.children.filter(c => (c as THREE.Mesh).isMesh && !(c as THREE.InstancedMesh).isInstancedMesh && !c.userData.keep);
  for (const tiny of [false, true]) {
    const set = parts.filter(c => !!c.userData.noOutline === tiny);
    if (set.length < 2) continue;
    const tmp = new THREE.Group();
    tmp.add(...set);
    for (const c of [...bakeColors(tmp).children]) {
      if (tiny) { c.userData.noOutline = true; c.castShadow = false; }
      g.add(c);
    }
  }
}

const SKIN = '#f2c9a0';
const tiny = (m: THREE.Mesh) => { m.castShadow = false; m.userData.noOutline = true; return m; };

const rounded = (w: number, h: number, r: number) => {
  const q = new THREE.Shape(), x = -w / 2, y = -h / 2;
  q.moveTo(x + r, y); q.lineTo(x + w - r, y); q.quadraticCurveTo(x + w, y, x + w, y + r);
  q.lineTo(x + w, y + h - r); q.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  q.lineTo(x + r, y + h); q.quadraticCurveTo(x, y + h, x, y + h - r);
  q.lineTo(x, y + r); q.quadraticCurveTo(x, y, x + r, y);
  return q;
};
const heartShape = (k: number) => {
  const q = new THREE.Shape();
  q.moveTo(0, -k); q.bezierCurveTo(-k * 0.4, -k * 0.6, -k * 1.15, -k * 0.2, -k * 1.05, k * 0.38);
  q.bezierCurveTo(-k * 0.95, k * 1.0, -k * 0.2, k * 1.0, 0, k * 0.5);
  q.bezierCurveTo(k * 0.2, k * 1.0, k * 0.95, k * 1.0, k * 1.05, k * 0.38);
  q.bezierCurveTo(k * 1.15, k * -0.2, k * 0.4, -k * 0.6, 0, -k);
  return q;
};
const plate = (q: THREE.Shape, d: number) => new THREE.ExtrudeGeometry(q, { depth: d, bevelEnabled: false, curveSegments: 6 });

// Real frames: each eye has a frame plate, a lens set in it and a glint, angled to wrap around the face;
// a bridge joins them and the arms run back to the ears.
function addGlasses(head: THREE.Group, g: (typeof GLASSES)[number]) {
  if (g.id === 'none') return;
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * 0.158, -0.012, 0.372);
    eye.rotation.y = sx * 0.26;
    if (g.id === 'shades') {
      eye.add(tiny(mesh(plate(rounded(0.215, 0.158, 0.05), 0.016), g.color)));
      eye.add(tiny(mesh(plate(rounded(0.18, 0.124, 0.038), 0.006), '#2c3350', 0, 0, 0.016)));
      eye.add(tiny(mesh(new THREE.BoxGeometry(0.075, 0.016, 0.004).rotateZ(0.7), '#aebbe0', -0.035, 0.024, 0.024)));
      eye.add(tiny(mesh(new THREE.BoxGeometry(0.03, 0.012, 0.004).rotateZ(0.7), '#aebbe0', 0.008, -0.006, 0.024)));
    } else if (g.id === 'hearts') {
      eye.add(tiny(mesh(plate(heartShape(0.082), 0.016), g.color)));
      eye.add(tiny(mesh(plate(heartShape(0.062), 0.006), '#ff9dbb', 0, 0, 0.016)));
      eye.add(tiny(mesh(new THREE.BoxGeometry(0.04, 0.014, 0.004).rotateZ(0.6), '#ffe6ef', -0.035, 0.035, 0.024)));
    } else { // round: a thin metal ring, her eyes stay visible through it
      eye.add(tiny(mesh(new THREE.TorusGeometry(0.094, 0.011, 6, 20), g.color)));
      eye.add(tiny(mesh(new THREE.BoxGeometry(0.03, 0.008, 0.004).rotateZ(0.7), '#ffffff', -0.05, 0.05, 0.012)));
    }
    head.add(eye);
    // Arm, from the outer corner of the frame back into the hair.
    const arm = mesh(new THREE.BoxGeometry(0.014, 0.018, 0.36), g.color, sx * 0.325, 0.012, 0.19);
    arm.rotation.y = sx * -0.62;
    head.add(tiny(arm));
  }
  head.add(tiny(mesh(new THREE.BoxGeometry(0.1, 0.015, 0.014), g.color, 0, 0.018, 0.4)));
}

// Everything that changes with the outfit, rebuilt whole when she gets dressed.
function buildBody(o: Outfit) {
  const top = TOPS.find(t => t.id === o.top)!, bottom = BOTTOMS.find(b => b.id === o.bottom)!;
  const body = new THREE.Group(); // bobs and leans while walking

  const legs = [-0.14, 0.14].map(x => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.42, 0);
    leg.add(mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.36, 6).translate(0, -0.2, 0), bottom.legs));
    if (bottom.kind === 'shorts') leg.add(mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.13, 7).translate(0, -0.03, 0), bottom.color));
    leg.add(mesh(new THREE.IcosahedronGeometry(0.09, 0).scale(1, 0.6, 1.4), bottom.kind === 'pants' || bottom.kind === 'overalls' ? '#e8e2d6' : '#5a3a28', 0, -0.4, 0.04));
    body.add(leg);
    return leg;
  });
  if (bottom.kind === 'dress') {
    body.add(mesh(new THREE.ConeGeometry(0.5, 0.78, 9), bottom.color, 0, 0.74, 0), mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.08, 9), bottom.accent, 0, 0.39, 0));
  } else if (bottom.kind === 'long') {
    body.add(mesh(new THREE.ConeGeometry(0.54, 1.06, 10), bottom.color, 0, 0.6, 0), mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.08, 10), bottom.accent, 0, 0.11, 0));
  } else if (bottom.kind === 'mini') {
    body.add(mesh(new THREE.CylinderGeometry(0.25, 0.42, 0.42, 10), bottom.color, 0, 0.8, 0), mesh(new THREE.CylinderGeometry(0.41, 0.43, 0.05, 10), bottom.accent, 0, 0.58, 0));
  } else { // pants, shorts, overalls: hips down to the legs
    body.add(mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.56, 9), bottom.color, 0, 0.7, 0));
    if (bottom.kind === 'overalls') {
      body.add(mesh(new THREE.BoxGeometry(0.28, 0.3, 0.05), bottom.color, 0, 1.1, 0.205));
      body.add(tiny(mesh(new THREE.BoxGeometry(0.13, 0.1, 0.012), bottom.accent, 0, 1.08, 0.235)));
      for (const sx of [-1, 1]) {
        body.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.42), bottom.color, sx * 0.1, 1.27, 0));
        body.add(tiny(mesh(new THREE.SphereGeometry(0.022, 5, 4), bottom.accent, sx * 0.1, 1.22, 0.235)));
      }
    }
  }
  const torso = mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.36, 8), top.color, 0, 1.15, 0);
  body.add(torso);
  if (top.kind === 'stripes') for (const y of [1.03, 1.13, 1.23]) body.add(tiny(mesh(new THREE.CylinderGeometry(0.2 + (1.33 - y) * 0.2 + 0.006, 0.2 + (1.33 - y) * 0.2 + 0.012, 0.035, 8), top.accent, 0, y, 0)));
  if (top.kind === 'knit') body.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 8), top.accent, 0, 1.33, 0), mesh(new THREE.CylinderGeometry(0.275, 0.285, 0.06, 8), top.accent, 0, 0.98, 0));
  if (top.kind === 'cardigan') {
    body.add(tiny(mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), top.accent, 0, 1.15, 0.235)));
    for (const y of [1.06, 1.15, 1.24]) body.add(tiny(mesh(new THREE.SphereGeometry(0.018, 5, 4), '#b4607a', 0.07, y, 0.245)));
  }
  if (top.kind === 'blouse') body.add(mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.04, 8), top.accent, 0, 1.325, 0));

  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, 1.27, 0);
    if (top.kind === 'tee') {
      arm.add(mesh(new THREE.CylinderGeometry(0.068, 0.064, 0.15, 5).translate(0, -0.075, 0), top.color));
      arm.add(mesh(new THREE.CylinderGeometry(0.054, 0.05, 0.22, 5).translate(0, -0.25, 0), SKIN));
    } else {
      arm.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.36, 5).translate(0, -0.18, 0), top.color));
      if (top.kind === 'stripes') for (const y of [-0.09, -0.2, -0.3]) arm.add(tiny(mesh(new THREE.CylinderGeometry(0.063, 0.062, 0.03, 5), top.accent, 0, y, 0)));
    }
    arm.add(mesh(new THREE.IcosahedronGeometry(0.07, 0), SKIN, 0, -0.38, 0));
    arm.rotation.z = side * 0.25;
    body.add(arm);
    return arm;
  });

  // Big head, TUNIC-style proportions.
  const head = new THREE.Group();
  head.position.y = 1.62;
  head.add(mesh(new THREE.IcosahedronGeometry(0.4, 1), '#f2c9a0'));
  head.add(mesh(new THREE.IcosahedronGeometry(0.43, 1).scale(1, 0.92, 0.95), '#5a3a28', 0, 0.06, -0.07));
  // Cap over the crown, so no skin shows between the hair and the fringe.
  head.add(mesh(new THREE.IcosahedronGeometry(0.425, 2).scale(1.02, 0.72, 0.98), '#5a3a28', 0, 0.13, -0.015));
  // Soft fringe across the forehead, parted a little to one side.
  for (const [x, y, z, r, rz] of [[-0.2, 0.17, 0.31, 0.13, 0.55], [-0.05, 0.2, 0.345, 0.14, 0.2], [0.12, 0.2, 0.335, 0.13, -0.2], [0.26, 0.13, 0.28, 0.1, -0.7]]) {
    const lock = mesh(new THREE.IcosahedronGeometry(r, 1).scale(1.25, 0.62, 0.55), '#5a3a28', x, y, z);
    lock.rotation.set(-0.3, 0, rz);
    head.add(lock);
  }
  // Under a hat the bun drops to the nape, so it never pokes through the crown.
  const bunY = o.hat === 'none' ? 0.38 : 0.02, bunZ = o.hat === 'none' ? -0.3 : -0.42;
  const bun = mesh(new THREE.IcosahedronGeometry(0.17, 0), '#5a3a28', 0, bunY, bunZ);
  head.add(bun);
  head.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8), '#e58fa8', 0, bunY - 0.02, bunZ + 0.08)); // hair tie
  for (const x of [-0.14, 0.14]) {
    const tinyParts = [
      mesh(new THREE.SphereGeometry(0.055, 6, 4).scale(0.8, 1.15, 0.4), '#23211d', x, -0.02, 0.37),
      mesh(new THREE.SphereGeometry(0.018, 4, 3), '#ffffff', x + 0.015, 0.02, 0.4),
      mesh(new THREE.SphereGeometry(0.05, 6, 3).scale(1, 0.55, 0.3), '#f0a0a8', x * 1.55, -0.12, 0.33),
    ];
    for (const t of tinyParts) { t.castShadow = false; t.userData.noOutline = true; head.add(t); }
  }
  // A small smile, under the eyes.
  head.add(tiny(mesh(new THREE.TorusGeometry(0.05, 0.011, 4, 10, Math.PI * 0.8).rotateZ(Math.PI * 1.1), '#a8524a', 0, -0.135, 0.365)));
  // Glasses and hats sit on the head group, so they follow its tilt.
  addGlasses(head, GLASSES.find(g => g.id === o.glasses)!);
  const hatOf = HATS.find(h => h.id === o.hat)!;
  if (hatOf.id === 'straw') {
    head.add(mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.04, 14), hatOf.color, 0, 0.27, -0.03));
    head.add(mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.24, 12), hatOf.color, 0, 0.4, -0.03));
    head.add(mesh(new THREE.CylinderGeometry(0.365, 0.37, 0.07, 12), '#e58fa8', 0, 0.32, -0.03));
  } else if (hatOf.id === 'beret') {
    const b = mesh(new THREE.IcosahedronGeometry(0.42, 2).scale(1.08, 0.36, 1.08), hatOf.color, 0.05, 0.36, -0.02);
    b.rotation.z = -0.2;
    head.add(b, mesh(new THREE.SphereGeometry(0.035, 5, 4), hatOf.color, 0.02, 0.52, -0.02));
  } else if (hatOf.id === 'beanie') {
    head.add(mesh(new THREE.IcosahedronGeometry(0.42, 2).scale(1.02, 0.78, 1.02), hatOf.color, 0, 0.2, -0.04));
    head.add(mesh(new THREE.CylinderGeometry(0.435, 0.44, 0.11, 12), '#5a7a9a', 0, 0.2, -0.04));
    head.add(mesh(new THREE.IcosahedronGeometry(0.1, 1), '#f6efe0', 0, 0.56, -0.04));
  } else if (hatOf.id === 'bucket') {
    head.add(mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.26, 12), hatOf.color, 0, 0.36, -0.03));
    head.add(mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.11, 12), '#b39e76', 0, 0.21, -0.03));
  }
  body.add(head);

  // Scarf: neck ring + 4 trailing segments that wave with speed and wind.
  const scarfOf = SCARVES.find(c => c.id === o.scarf)!;
  const scarf: THREE.Object3D[] = [];
  if (scarfOf.colors.length) {
    const [c0, c1] = scarfOf.colors;
    body.add(mesh(new THREE.TorusGeometry(0.235, 0.065, 5, 12).rotateX(Math.PI / 2), c0, 0, 1.25, 0)); // sits under the chin, clear of the face
    let parent: THREE.Object3D = body;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Group();
      seg.position.set(i === 0 ? 0.1 : 0, i === 0 ? 1.23 : 0, i === 0 ? -0.2 : -0.18);
      seg.add(mesh(new THREE.BoxGeometry(0.15 - i * 0.015, 0.05, 0.2).translate(0, 0, -0.09), i % 2 ? c1 : c0));
      parent.add(seg);
      scarf.push(seg);
      parent = seg;
    }
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
  for (const g of [head, body, basket, ...legs, ...arms]) flatten(g);
  addOutlines(body, 0.022);

  return { body, legs, arms, torso, head, bun, bunY, bunZ, scarf, basket, beads };
}

export function buildPlayer(outfit: Outfit = DEFAULT_OUTFIT) {
  const root = new THREE.Group();
  let parts = buildBody(outfit);
  root.add(parts.body);

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
  const puff = (at: THREE.Vector3, n = 2) => {
    for (let k = 0; k < n; k++) {
      const p = puffs[nextPuff++ % puffs.length];
      p.m.position.set(at.x + (Math.random() - 0.5) * 0.4, at.y + 0.1, at.z + (Math.random() - 0.5) * 0.4);
      p.t = 0; p.m.visible = true;
    }
  };

  let phase = 0, lean = 0, hopT = 9;
  const hop = () => { hopT = 0; };
  const animate = (dt: number, speed: number, time: number) => {
    const { body, legs, arms, torso, head, bun, bunY, bunZ, scarf, basket } = parts;
    phase += dt * Math.max(speed, 0.0001) * 1.5;
    const s = Math.min(1, speed / 5);
    const r = Math.min(1, Math.max(0, (speed - 7.5) / 4)); // 0 walk .. 1 full run
    hopT += dt;
    const hopY = hopT < 0.38 ? Math.sin((hopT / 0.38) * Math.PI) * 0.45 : 0;
    body.position.y = Math.abs(Math.sin(phase)) * (0.1 + 0.08 * r) * s + Math.sin(time * 2) * 0.012 * (1 - s) + hopY;
    // Idle breathing and hair that lags a beat behind the body.
    torso.scale.set(1 + Math.sin(time * 2.2) * 0.02 * (1 - s), 1 + Math.sin(time * 2.2) * 0.035 * (1 - s), 1);
    bun.position.y = bunY + Math.sin(phase * 2 - 0.9) * 0.035 * s + Math.sin(time * 2.2 - 0.8) * 0.01 + (hopT < 0.38 ? -hopY * 0.12 : 0);
    bun.position.z = bunZ - 0.05 * s;
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
    lean += (s * (0.18 + 0.16 * r) - lean) * Math.min(1, dt * 8);
    body.rotation.x = lean;
    legs[0].rotation.x = Math.sin(phase) * (0.7 + 0.35 * r) * s;
    legs[1].rotation.x = -Math.sin(phase) * (0.7 + 0.35 * r) * s;
    arms[0].rotation.x = -Math.sin(phase) * (0.6 + 0.5 * r) * s;
    arms[1].rotation.x = Math.sin(phase) * (0.3 + 0.15 * r) * s - 0.2 - 0.3 * r;
    basket.rotation.z = Math.sin(phase) * 0.1 * s;
    head.rotation.z = Math.sin(time * 1.3) * 0.03;
    scarf.forEach((seg, i) => {
      // Hangs down at rest, streams out behind her when she runs.
      seg.rotation.x = (i === 0 ? -1.15 : -0.22) * (1 - s * 0.85 - r * 0.1) + Math.sin(time * (6 + 4 * r) - i * 0.9) * (0.08 + 0.22 * s);
      seg.rotation.y = Math.sin(time * 3.1 - i * 0.7) * 0.25;
    });
  };

  const m = new THREE.Matrix4(), col = new THREE.Color();
  let basketColors: string[] = [];
  const setBasket = (colors: string[]) => {
    basketColors = colors;
    const { beads } = parts;
    colors.forEach((cl, i) => {
      const a = i * 2.4, r = 0.05 + (i % 3) * 0.05;
      beads.setMatrixAt(i, m.makeTranslation(Math.cos(a) * r, 0.06 + Math.floor(i / 6) * 0.06, Math.sin(a) * r));
      beads.setColorAt(i, col.set(cl));
    });
    beads.count = colors.length;
    beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
  };
  const basketWorld = (out: THREE.Vector3) => parts.basket.getWorldPosition(out);
  const dress = (o: Outfit) => {
    root.remove(parts.body);
    parts.body.traverse(n => (n as THREE.Mesh).geometry?.dispose());
    parts = buildBody(o);
    root.add(parts.body);
    setBasket(basketColors);
  };

  return { root, animate, setBasket, basketWorld, dust, puff, hop, dress };
}
