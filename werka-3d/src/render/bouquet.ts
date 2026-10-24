// 3D bouquet made from the same flower models as the world. Deterministic per index,
// so the same flowers always give the same bouquet.
import * as THREE from 'three';
import { flowerGeometry } from './flowers.ts';
import { toon, addOutlines } from './toon.ts';
import { pickupGeometry, pickupMat } from './pickups.ts';

const h = (i: number, salt: number) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const TIE = -0.15; // where stems meet, at the ribbon
const flowerMat = toon({ vertexColors: true, side: THREE.DoubleSide, rim: 0.4 });

// extras: pocket items pinned on the paper wrap (a ribbon is tied at the stems instead).
export function buildBouquet(types: string[], extras: string[] = []) {
  const grp = new THREE.Group();
  const n = Math.max(types.length, 1);
  types.forEach((type, i) => {
    const geo = flowerGeometry(type);
    if (!geo.boundingBox) geo.computeBoundingBox();
    const tall = geo.boundingBox!.max.y;
    const az = i * 2.4 + h(i, 1) * 0.5;
    const tilt = n === 1 ? 0.05 : 0.1 + (i / (n - 1)) * 0.42 + h(i, 2) * 0.06;
    const f = new THREE.Mesh(geo, flowerMat);
    // Short flowers (pads, cushions, cacti) sit on the rim; tall ones grow from the tie point.
    const s = tall < 0.6 ? 1.2 : 1.9 / Math.max(tall, 0.8);
    f.scale.setScalar(s * (0.95 + h(i, 3) * 0.2));
    f.position.y = tall < 0.6 ? 0.72 : TIE;
    f.rotation.set(0, az, 0);
    f.rotateX(tilt);
    f.castShadow = true;
    grp.add(f);
  });

  // Paper wrap (open cone, tip down), leaf collar and ribbon.
  const wrap = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 1.5, 9, 1, true).rotateX(Math.PI).translate(0, 0.1, 0),
    toon({ color: '#f6e7b0', side: THREE.DoubleSide }),
  );
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 14).rotateX(Math.PI / 2), toon({ color: '#e11d48' }));
  ribbon.position.y = TIE;
  const bow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0).scale(1.8, 0.8, 0.6), toon({ color: '#e11d48' }));
  bow.position.set(0, TIE, 0.28);
  grp.add(wrap, ribbon, bow);
  addOutlines(wrap, 0.02);
  const leafMat = toon({ color: '#4f8a3c', side: THREE.DoubleSide });
  const leafGeo = new THREE.IcosahedronGeometry(0.2, 0).scale(0.45, 0.12, 1.5).translate(0, 0, 0.3);
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = 0.8;
    leaf.rotation.set(-0.5, (k / 7) * Math.PI * 2, 0, 'YXZ');
    grp.add(leaf);
  }
  extras.forEach((id, i) => {
    const m = new THREE.Mesh(pickupGeometry(id), pickupMat);
    if (id === 'ribbon') { m.position.set(0, TIE - 0.02, 0.36); m.scale.setScalar(0.85); }
    else {
      // On the cone's surface, left/right of centre; wrap radius grows from 0 at the tip (y -0.65) to 0.75 (y 0.85).
      const a = (extras.length === 1 ? 0 : i ? 0.5 : -0.5), y = 0.36, r = (0.75 * (y + 0.65)) / 1.5 + 0.05;
      m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      m.rotation.set(-0.45, a, 0, 'YXZ');
      m.scale.setScalar(0.8);
    }
    addOutlines(m, 0.03);
    grp.add(m);
  });
  grp.traverse(o => { o.castShadow = true; });
  return grp;
}
