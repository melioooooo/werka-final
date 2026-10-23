import { FlowerType } from '../types';
import { FLOWER_COLORS } from '../constants';

// Deterministic 0..1 from (index, salt): same flowers => same bouquet.
const h = (i: number, salt: number) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const head = (cx: number, cy: number, r: number, color: string, i: number) => {
  const n = 5 + Math.floor(h(i, 3) * 3);
  const rot = h(i, 4) * 360;
  const petals = Array.from({ length: n }, (_, k) =>
    `<ellipse cx="${cx}" cy="${cy - r * 0.7}" rx="${r * 0.42}" ry="${r * 0.7}" fill="${color}" stroke="#00000033" stroke-width="2" transform="rotate(${rot + (k * 360) / n} ${cx} ${cy})"/>`
  ).join('');
  return `${petals}<circle cx="${cx}" cy="${cy}" r="${r * 0.38}" fill="#fcd34d" stroke="#92400e" stroke-width="2"/>`;
};

export const bouquetSvgUrl = (flowers: FlowerType[]): string => {
  const n = Math.max(flowers.length, 1);
  const tie = { x: 256, y: 380 };
  const stems: string[] = [];
  const heads: string[] = [];
  flowers.forEach((type, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5 fan
    const ang = t * 110 + (h(i, 1) - 0.5) * 14;
    const len = 150 + h(i, 2) * 60 - Math.abs(t) * 40;
    const x = tie.x + Math.sin((ang * Math.PI) / 180) * len;
    const y = tie.y - Math.cos((ang * Math.PI) / 180) * len;
    stems.push(`<path d="M${tie.x} ${tie.y} Q${(tie.x + x) / 2} ${(tie.y + y) / 2 + 20} ${x} ${y}" stroke="#15803d" stroke-width="7" fill="none" stroke-linecap="round"/>`);
    heads.push(head(Math.round(x), Math.round(y), 34 + h(i, 5) * 10, FLOWER_COLORS[type] ?? '#f472b6', i));
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#fef3c7"/>
<rect y="400" width="512" height="112" fill="#92400e"/><rect y="400" width="512" height="8" fill="#78350f"/>
<ellipse cx="256" cy="420" rx="90" ry="14" fill="#00000033"/>
${stems.join('')}
<path d="M${tie.x - 40} 455 L${tie.x - 18} 360 L${tie.x + 18} 360 L${tie.x + 40} 455 Z" fill="#fde68a" stroke="#b45309" stroke-width="3"/>
<rect x="${tie.x - 22}" y="368" width="44" height="12" rx="4" fill="#e11d48" stroke="#9f1239" stroke-width="2"/>
${heads.join('')}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// Free anonymous image API (no key). Limit: 1 image / 45 s / IP, so callers must tolerate failure.
const PIXEL = 96;

const pixelate = async (blob: Blob): Promise<string> => {
  const bmp = await createImageBitmap(blob);
  const k = bmp.width / 512;
  const c = document.createElement('canvas');
  c.width = c.height = PIXEL;
  const ctx = c.getContext('2d')!;
  // crop square, dropping the bottom strip where the provider watermark sits
  ctx.drawImage(bmp, 22 * k, 0, 468 * k, 468 * k, 0, 0, PIXEL, PIXEL);
  const img = ctx.getImageData(0, 0, PIXEL, PIXEL);
  for (let i = 0; i < img.data.length; i += 4)
    for (let j = 0; j < 3; j++) img.data[i + j] = Math.min(255, Math.round(img.data[i + j] / 36) * 36); // ~8 levels/channel
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
};

// Returns a small pixel-art PNG data URL, or null (caller keeps the SVG fallback).
export const generateBouquetImage = async (flowers: FlowerType[], seed: string): Promise<string | null> => {
  const counts: Record<string, number> = {};
  flowers.forEach(f => (counts[f] = (counts[f] || 0) + 1));
  const list = Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(', ');
  const prompt = `16-bit pixel art sprite, chunky visible pixels, limited palette, no photo, no text. Small hand-tied flower bouquet: ${list}, brown paper, red ribbon, wooden table`;
  const url = `/api/bouquet?prompt=${encodeURIComponent(prompt)}&seed=${Number(seed) % 2147483647}`;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url);
      if (res.ok) return await pixelate(await res.blob());
      if (res.status !== 402) return null;
      await new Promise(r => setTimeout(r, 46000)); // the advertised retry-after is unreliable
    }
  } catch (e) {
    console.warn('Bouquet image generation failed, using SVG', e);
  }
  return null;
};

// Bouquet picture (generated PNG or SVG fallback) -> JPEG blob, for the Gallery SAVE button.
export const bouquetJpegBlob = (flowers: FlowerType[], imageUrl?: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1024;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = !imageUrl; // keep pixels crisp for the pixel-art PNG
      ctx.drawImage(img, 0, 0, 1024, 1024);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = imageUrl ?? bouquetSvgUrl(flowers);
  });
