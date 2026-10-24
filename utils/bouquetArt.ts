import { FlowerType } from '../types';
import { FLOWER_COLORS, POCKET_INFO } from '../constants';

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

const heartPath = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy + r}C${cx - r * 1.6} ${cy - r * 0.2} ${cx - r * 0.8} ${cy - r * 1.4} ${cx} ${cy - r * 0.5}C${cx + r * 0.8} ${cy - r * 1.4} ${cx + r * 1.6} ${cy - r * 0.2} ${cx} ${cy + r}Z`;

// Trinket charms as small vector drawings centred on (0,0), about 40px, hung from the tie by a string at y=-22.
const CHARMS: Record<string, string> = {
  shell: `<path d="M-18 8 Q-20 -20 0 -20 Q20 -20 18 8 Z" fill="#fcd5ce" stroke="#b4655e" stroke-width="3"/>
<path d="M0 8 L0 -18 M0 8 L-9 -16 M0 8 L9 -16 M0 8 L-15 -6 M0 8 L15 -6" stroke="#e0928a" stroke-width="2" fill="none"/>
<path d="M-7 8 L-5 16 L5 16 L7 8 Z" fill="#f4a6a0" stroke="#b4655e" stroke-width="3"/>`,
  key: `<circle cx="-9" cy="-8" r="9" fill="none" stroke="#a16207" stroke-width="7"/><circle cx="-9" cy="-8" r="9" fill="none" stroke="#facc15" stroke-width="3"/>
<path d="M-2 -1 L16 17 M10 11 L5 16 M15 16 L11 20" stroke="#a16207" stroke-width="7" fill="none"/><path d="M-2 -1 L16 17 M10 11 L5 16 M15 16 L11 20" stroke="#facc15" stroke-width="3" fill="none"/>`,
  ring: `<circle cy="4" r="13" fill="none" stroke="#6b7280" stroke-width="8"/><circle cy="4" r="13" fill="none" stroke="#e5e7eb" stroke-width="4"/>
<path d="M0 -20 L8 -12 L0 -5 L-8 -12 Z" fill="#f472b6" stroke="#9d174d" stroke-width="2.5"/><path d="M-3 -14 L0 -17" stroke="#fff" stroke-width="2"/>`,
  star: `<path d="M0 -21 L6 -7 L21 -6 L9 4 L13 19 L0 11 L-13 19 L-9 4 L-21 -6 L-6 -7 Z" fill="#fde047" stroke="#a16207" stroke-width="3"/><circle cx="-4" cy="-5" r="2.5" fill="#fff"/>`,
  feather: `<path d="M12 -20 Q22 2 -6 16 Q-14 -6 12 -20 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="3"/>
<path d="M-12 22 L10 -16 M2 -4 L10 -2 M-2 4 L5 7 M5 -10 L12 -10" stroke="#e0f2fe" stroke-width="2" fill="none"/>`,
  acorn: `<ellipse cy="5" rx="11" ry="14" fill="#b45309" stroke="#451a03" stroke-width="3"/><path d="M-6 0 Q-6 12 -1 15" stroke="#f59e0b" stroke-width="2.5" fill="none"/>
<path d="M-15 -3 Q0 -20 15 -3 Q0 1 -15 -3 Z" fill="#713f12" stroke="#451a03" stroke-width="3"/><path d="M0 -12 L2 -20" stroke="#451a03" stroke-width="3"/>`,
  marble: `<circle r="16" fill="#818cf8" stroke="#312e81" stroke-width="3"/><path d="M-10 6 Q-2 -10 10 -4 Q2 4 -4 12" stroke="#4f46e5" stroke-width="3" fill="none"/>
<circle cx="-6" cy="-7" r="4" fill="#fff" opacity="0.9"/>`,
  button: `<circle r="16" fill="#94a3b8" stroke="#475569" stroke-width="3"/><circle r="11" fill="none" stroke="#cbd5e1" stroke-width="2"/>
<circle cx="-4" cy="-4" r="2.5" fill="#334155"/><circle cx="4" cy="-4" r="2.5" fill="#334155"/><circle cx="-4" cy="4" r="2.5" fill="#334155"/><circle cx="4" cy="4" r="2.5" fill="#334155"/>`,
  pebble: `<path d="${'M0 16C-26 -3 -13 -22 0 -8C13 -22 26 -3 0 16Z'}" fill="#a8a29e" stroke="#44403c" stroke-width="3"/><ellipse cx="-7" cy="-6" rx="3" ry="2" fill="#e7e5e4"/>`,
  butterfly: `<path d="M0 -2 Q-14 -24 -20 -10 Q-22 2 0 2 Z M0 -2 Q14 -24 20 -10 Q22 2 0 2 Z" fill="#a78bfa" stroke="#4c1d95" stroke-width="2.5"/>
<path d="M0 2 Q-16 4 -12 16 Q-4 16 0 4 Z M0 2 Q16 4 12 16 Q4 16 0 4 Z" fill="#c4b5fd" stroke="#4c1d95" stroke-width="2.5"/>
<path d="M0 -8 L0 12 M0 -8 L-4 -16 M0 -8 L4 -16" stroke="#4c1d95" stroke-width="3" fill="none"/>`,
};

// Pocket decorations: ribbon => big bow at the tie, kisses => heart stickers on the paper, trinkets => charms on strings.
const decorations = (extras: string[], tie: { x: number; y: number }) => {
  const out: string[] = [];
  let hearts = 0, charms = 0;
  extras.forEach(k => {
    const info = POCKET_INFO[k];
    if (!info) return;
    if (k === 'ribbon') {
      out.push(`<g stroke="#9d174d" stroke-width="3" fill="${info.color}">
<path d="M${tie.x} ${tie.y} L${tie.x - 22} ${tie.y + 50} L${tie.x - 8} ${tie.y + 44} Z"/><path d="M${tie.x} ${tie.y} L${tie.x + 22} ${tie.y + 50} L${tie.x + 8} ${tie.y + 44} Z"/>
<ellipse cx="${tie.x - 30}" cy="${tie.y - 4}" rx="30" ry="17" transform="rotate(-18 ${tie.x - 30} ${tie.y - 4})"/><ellipse cx="${tie.x + 30}" cy="${tie.y - 4}" rx="30" ry="17" transform="rotate(18 ${tie.x + 30} ${tie.y - 4})"/>
<circle cx="${tie.x}" cy="${tie.y}" r="11" fill="#be185d"/></g>`);
    } else if (k === 'kiss' || k === 'golden_kiss') {
      const cy = 428 - hearts++ * 34;
      const gold = k === 'golden_kiss';
      out.push(`<path d="${heartPath(tie.x, cy, 16)}" fill="${gold ? '#facc15' : '#f472b6'}" stroke="#fff" stroke-width="5" paint-order="stroke"/>
<path d="${heartPath(tie.x, cy, 16)}" fill="none" stroke="${gold ? '#a16207' : '#9d174d'}" stroke-width="2"/>${gold ? `<circle cx="${tie.x - 6}" cy="${cy - 5}" r="3" fill="#fff"/>` : ''}`);
    } else {
      const side = charms++ % 2 === 0 ? 1 : -1;
      const cx = tie.x + side * 66, cy = 440;
      out.push(`<path d="M${tie.x + side * 10} ${tie.y + 2} Q${tie.x + side * 50} ${tie.y + 20} ${cx} ${cy - 28}" stroke="#78350f" stroke-width="3" fill="none"/>
<g transform="translate(${cx} ${cy}) scale(1.35)" stroke-linejoin="round" stroke-linecap="round">${CHARMS[k] ?? `<circle r="16" fill="${info.color}" stroke="#451a03" stroke-width="3"/>`}</g>`);
    }
  });
  return out.join('');
};

export const bouquetSvgUrl = (flowers: FlowerType[], extras: string[] = []): string => {
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
${decorations(extras, tie)}
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
export const generateBouquetImage = async (flowers: FlowerType[], seed: string, extras: string[] = []): Promise<string | null> => {
  const counts: Record<string, number> = {};
  flowers.forEach(f => (counts[f] = (counts[f] || 0) + 1));
  const list = Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(', ');
  const deco = extras.filter(k => k !== 'ribbon').map(k => (k === 'kiss' ? 'a pink heart sticker' : k === 'golden_kiss' ? 'a shiny golden heart sticker' : `a little ${POCKET_INFO[k]?.name.toLowerCase()} charm`)).join(' and ');
  const ribbon = extras.includes('ribbon') ? 'a big pink silk bow' : 'red ribbon';
  const prompt = `16-bit pixel art sprite, chunky visible pixels, limited palette, no photo, no text. Small hand-tied flower bouquet: ${list}, brown paper, ${ribbon}${deco ? `, decorated with ${deco}` : ''}, wooden table`;
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
export const bouquetJpegBlob = (flowers: FlowerType[], imageUrl?: string, extras?: string[]): Promise<Blob> =>
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
    img.src = imageUrl ?? bouquetSvgUrl(flowers, extras);
  });
