import { FlowerType, BouquetLayout } from '../types';
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
  ammonite: `<circle r="20" fill="#b08d57" stroke="#5c4526" stroke-width="3"/><path d="M0 -20 Q17 -18 17 0 Q16 14 0 14 Q-12 13 -12 1 Q-12 -8 -2 -8 Q6 -8 6 0 Q5 5 0 5" stroke="#5c4526" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M-14 -14 L-9 -9 M14 -14 L10 -10 M-18 6 L-12 4" stroke="#8a6b3d" stroke-width="2"/>`,
  trilobite: `<path d="M0 -21 Q18 -20 16 -6 Q15 12 0 22 Q-15 12 -16 -6 Q-18 -20 0 -21 Z" fill="#8d8378" stroke="#3f3a34" stroke-width="3"/>
<path d="M-15 -6 L15 -6 M-14 1 L14 1 M-11 8 L11 8 M-6 14 L6 14" stroke="#3f3a34" stroke-width="2"/><path d="M-5 -6 L-3 16 M5 -6 L3 16" stroke="#b8afa3" stroke-width="2"/>`,
  fern_fossil: `<rect x="-19" y="-21" width="38" height="42" rx="6" fill="#9a9a86" stroke="#56564a" stroke-width="3"/><path d="M0 16 L0 -16 M0 10 L-11 2 M0 10 L11 2 M0 3 L-10 -5 M0 3 L10 -5 M0 -4 L-8 -11 M0 -4 L8 -11" stroke="#5f6f4f" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  shark_tooth: `<path d="M-17 -16 Q0 -22 17 -16 L2 22 Q0 24 -2 22 Z" fill="#f1ead6" stroke="#6b6248" stroke-width="3" stroke-linejoin="round"/><path d="M-15 -11 Q0 -17 15 -11" stroke="#8a7a58" stroke-width="4" fill="none"/>`,
  nautilus: `<path d="M-6 -20 Q20 -20 20 2 Q19 20 -2 20 Q-20 18 -20 2 Q-19 -6 -11 -6 Q-3 -6 -3 2 Q-4 6 -8 6" fill="#f4e3cf" stroke="#7c5a3c" stroke-width="3" stroke-linecap="round"/>
<path d="M2 -19 L1 -8 M11 -15 L6 -5 M18 -6 L8 1 M17 8 L6 7" stroke="#c8814a" stroke-width="3" stroke-linecap="round"/>`,
  cowrie: `<ellipse rx="20" ry="15" fill="#d9a066" stroke="#6b3f1f" stroke-width="3"/><path d="M-15 1 Q0 -3 15 1" stroke="#3b2110" stroke-width="3" fill="none"/><path d="M-8 -7 h.1 M2 -9 h.1 M10 -6 h.1 M-6 8 h.1 M6 8 h.1" stroke="#fbe3c0" stroke-width="4" stroke-linecap="round"/>`,
  whelk: `<path d="M-9 -22 Q4 -14 13 2 Q17 15 2 20 Q-12 20 -11 4 Q-11 -10 -9 -22 Z" fill="#c9b79c" stroke="#6e5d45" stroke-width="3" stroke-linejoin="round"/><path d="M-9 -12 L1 -12 M-10 -3 L8 -5 M-10 6 L13 3" stroke="#94826a" stroke-width="2.5"/><path d="M-3 10 Q3 15 9 9" stroke="#e6dac6" stroke-width="3" fill="none"/>`,
  urchin: `<path d="M0 -24 L0 24 M-24 0 L24 0 M-17 -17 L17 17 M17 -17 L-17 17 M-9 -22 L9 22 M9 -22 L-9 22 M-22 -9 L22 9 M22 -9 L-22 9" stroke="#6d28d9" stroke-width="2.5" stroke-linecap="round"/><circle r="14" fill="#8b5cf6" stroke="#3b1a78" stroke-width="3"/><circle cx="-4" cy="-5" r="3" fill="#c4b5fd"/>`,
  sand_dollar: `<circle r="20" fill="#efe6d2" stroke="#a08f6e" stroke-width="3"/><g fill="#c8b894"><ellipse cy="-10" rx="2.5" ry="6"/><ellipse cy="-10" rx="2.5" ry="6" transform="rotate(72)"/><ellipse cy="-10" rx="2.5" ry="6" transform="rotate(144)"/><ellipse cy="-10" rx="2.5" ry="6" transform="rotate(216)"/><ellipse cy="-10" rx="2.5" ry="6" transform="rotate(288)"/></g>`,
  pink_shell: `<path d="M-4 -21 Q16 -14 18 4 Q16 18 0 20 Q-14 18 -17 6 Q-18 -6 -4 -21 Z" fill="#f9a8d4" stroke="#9d174d" stroke-width="3"/>
<path d="M-4 -21 Q2 -4 -10 10 M-4 -21 Q10 -2 4 16 M-4 -21 Q16 -6 14 8" stroke="#ec4899" stroke-width="2" fill="none"/><path d="M-12 4 Q-6 10 2 8" stroke="#fdf2f8" stroke-width="2.5" fill="none"/>`,
  scallop: `<path d="M0 16 L-20 -4 Q-14 -22 0 -22 Q14 -22 20 -4 Z" fill="#fdba74" stroke="#9a3412" stroke-width="3"/>
<path d="M0 16 L-12 -18 M0 16 L-4 -21 M0 16 L4 -21 M0 16 L12 -18 M0 16 L-18 -8 M0 16 L18 -8" stroke="#fb923c" stroke-width="2" fill="none"/>
<path d="M-8 14 L-10 21 L10 21 L8 14 Z" fill="#fdba74" stroke="#9a3412" stroke-width="3"/>`,
  spiral_shell: `<path d="M2 -20 Q20 -18 19 2 Q18 18 0 19 Q-17 18 -18 2 Q-18 -12 -4 -14 Q8 -14 8 -2 Q8 8 -1 8 Q-8 8 -8 1" fill="#e7d3b0" stroke="#6b5a3a" stroke-width="3" stroke-linecap="round"/>
<path d="M-12 12 Q-2 17 10 11" stroke="#fbf5ea" stroke-width="2.5" fill="none"/>`,
  pearl: `<path d="M-20 8 Q0 26 20 8 Q12 18 0 18 Q-12 18 -20 8 Z" fill="#cbd5e1" stroke="#475569" stroke-width="3"/>
<circle cy="-2" r="13" fill="#f8fafc" stroke="#64748b" stroke-width="2.5"/><circle cx="4" cy="2" r="7" fill="#fbcfe8" opacity="0.55"/><circle cx="-3" cy="-4" r="5" fill="#a5f3fc" opacity="0.5"/><circle cx="-5" cy="-7" r="3" fill="#fff"/>`,
  black_pearl: `<path d="M-20 8 Q0 26 20 8 Q12 18 0 18 Q-12 18 -20 8 Z" fill="#cbd5e1" stroke="#475569" stroke-width="3"/>
<circle cy="-2" r="13" fill="#334155" stroke="#0f172a" stroke-width="2.5"/><circle cx="4" cy="2" r="7" fill="#a78bfa" opacity="0.45"/><circle cx="-3" cy="-4" r="5" fill="#5eead4" opacity="0.35"/><circle cx="-5" cy="-7" r="3" fill="#e2e8f0"/>`,
  clover: `<g fill="#4ade80" stroke="#14532d" stroke-width="2.5"><path d="${'M0 0C-4 -18 -20 -14 -10 -2Z'}" transform="rotate(10)"/><path d="M0 0C-4 -18 -20 -14 -10 -2Z" transform="rotate(100)"/><path d="M0 0C-4 -18 -20 -14 -10 -2Z" transform="rotate(190)"/><path d="M0 0C-4 -18 -20 -14 -10 -2Z" transform="rotate(280)"/></g>
<path d="M0 0 Q4 12 -2 22" stroke="#15803d" stroke-width="3.5" fill="none"/><circle cx="-6" cy="-8" r="2" fill="#bbf7d0"/>`,
  crystal: `<path d="M-10 -18 L10 -18 L20 -6 L0 22 L-20 -6 Z" fill="#a5f3fc" stroke="#0e7490" stroke-width="3" stroke-linejoin="round"/>
<path d="M-20 -6 L20 -6 M-10 -18 L-5 -6 L0 22 L5 -6 L10 -18" stroke="#0891b2" stroke-width="2" fill="none"/><path d="M-12 -12 L-8 -8" stroke="#fff" stroke-width="3"/>`,
  amber: `<path d="M0 -20 Q16 0 14 8 Q12 20 0 20 Q-12 20 -14 8 Q-16 0 0 -20 Z" fill="#f59e0b" stroke="#78350f" stroke-width="3"/>
<path d="M-6 0 Q-8 8 -4 12" stroke="#fef3c7" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M2 6 l4 2 l-2 4 Z" fill="#451a03" opacity="0.7"/>`,
  moon_charm: `<path d="M6 -20 A20 20 0 1 0 18 10 A15 15 0 1 1 6 -20 Z" fill="#c4b5fd" stroke="#5b21b6" stroke-width="3"/>
<path d="M14 -12 l2 4 l4 1 l-4 1 l-2 4 l-1 -4 l-4 -1 l4 -1 Z" fill="#fff"/><circle cx="-8" cy="4" r="2" fill="#8b5cf6"/>`,
  ladybug: `<ellipse cy="3" rx="16" ry="17" fill="#ef4444" stroke="#450a0a" stroke-width="3"/><path d="M0 -12 L0 20" stroke="#1f2937" stroke-width="2.5"/>
<path d="M-11 -13 Q0 -22 11 -13 Q0 -8 -11 -13 Z" fill="#1f2937"/><circle cx="-7" cy="0" r="3" fill="#1f2937"/><circle cx="8" cy="2" r="3" fill="#1f2937"/><circle cx="-6" cy="11" r="2.5" fill="#1f2937"/><circle cx="7" cy="12" r="2.5" fill="#1f2937"/><circle cx="-9" cy="-5" r="2" fill="#fca5a5"/>`,
  bell: `<path d="M-16 12 Q-16 -16 0 -16 Q16 -16 16 12 L20 16 L-20 16 Z" fill="#facc15" stroke="#a16207" stroke-width="3" stroke-linejoin="round"/>
<circle cy="19" r="4" fill="#ca8a04" stroke="#a16207" stroke-width="2"/><path d="M-8 -8 Q-10 0 -9 8" stroke="#fef9c3" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M-6 -22 Q0 -16 6 -22 M0 -16 L0 -19" stroke="#e11d48" stroke-width="3" fill="none"/>`,
};

// --- Layout: pieces are drawn centred on (0,0) and placed with a transform, so the crafting table can drag them cheaply. ---
export interface Place { x: number; y: number; r?: number; s?: number } // normalised: x,y in -1..1 over the 512 square
const TIE = { x: 256, y: 380 };
export const toPx = (n: number) => 256 + n * 256;
export const toN = (px: number) => (px - 256) / 256;

// v3 fan, unchanged so old bouquets keep their look.
export const autoFlower = (i: number, n: number): Place => {
  const t = n <= 1 ? 0 : i / (n - 1) - 0.5;
  const ang = t * 110 + (h(i, 1) - 0.5) * 14;
  const len = 150 + h(i, 2) * 60 - Math.abs(t) * 40;
  return { x: toN(Math.round(TIE.x + Math.sin((ang * Math.PI) / 180) * len)), y: toN(Math.round(TIE.y - Math.cos((ang * Math.PI) / 180) * len)) };
};
// Trinkets and kisses are pinned on the wrap first, then tucked among the stems (never left on the table).
const SLOTS: [number, number, number][] = [[229, 433, 0.7], [283, 433, 0.7], [256, 452, 0.62], [206, 334, 0.8], [306, 330, 0.8], [256, 306, 0.8]];
export const autoExtras = (extras: string[]): Place[] => {
  let j = 0;
  return extras.map(k => {
    if (k === 'ribbon') return { x: toN(TIE.x), y: toN(TIE.y) };
    const [x, y, sc] = SLOTS[j++ % SLOTS.length];
    return { x: toN(x), y: toN(y), s: sc };
  });
};
export const resolveLayout = (flowers: FlowerType[], extras: string[], layout?: BouquetLayout) => {
  const ae = autoExtras(extras);
  return {
    fl: flowers.map((_, i) => layout?.flowers?.[i] ?? autoFlower(i, flowers.length)),
    ex: extras.map((_, i) => layout?.extras?.[i] ?? ae[i]),
  };
};

export const headRadius = (i: number) => 34 + h(i, 5) * 10;
export const headMarkup = (type: FlowerType, i: number) => head(0, 0, headRadius(i), FLOWER_COLORS[type] ?? '#f472b6', i);
export const stemMarkup = (p: Place) => {
  const x = toPx(p.x), y = toPx(p.y);
  return `<path d="M${TIE.x} ${TIE.y} Q${(TIE.x + x) / 2} ${(TIE.y + y) / 2 + 20} ${x} ${y}" stroke="#15803d" stroke-width="7" fill="none" stroke-linecap="round"/>`;
};
export const extraMarkup = (k: string) => {
  const info = POCKET_INFO[k];
  if (!info) return '';
  if (k === 'ribbon') return `<g stroke="#9d174d" stroke-width="3" fill="${info.color}">
<path d="M0 0 L-22 50 L-8 44 Z"/><path d="M0 0 L22 50 L8 44 Z"/>
<ellipse cx="-30" cy="-4" rx="30" ry="17" transform="rotate(-18 -30 -4)"/><ellipse cx="30" cy="-4" rx="30" ry="17" transform="rotate(18 30 -4)"/>
<circle r="11" fill="#be185d"/></g>`;
  if (k === 'kiss' || k === 'golden_kiss') {
    const gold = k === 'golden_kiss';
    return `<path d="${heartPath(0, 0, 16)}" fill="${gold ? '#facc15' : '#f472b6'}" stroke="#fff" stroke-width="5" paint-order="stroke"/>
<path d="${heartPath(0, 0, 16)}" fill="none" stroke="${gold ? '#a16207' : '#9d174d'}" stroke-width="2"/>${gold ? '<circle cx="-6" cy="-5" r="3" fill="#fff"/>' : ''}`;
  }
  return `<g transform="scale(1.35)" stroke-linejoin="round" stroke-linecap="round">${CHARMS[k] ?? `<circle r="16" fill="${info.color}" stroke="#451a03" stroke-width="3"/>`}</g>`;
};
export const placeTransform = (p: Place) => `translate(${toPx(p.x).toFixed(1)} ${toPx(p.y).toFixed(1)}) rotate(${(p.r ?? 0).toFixed(1)}) scale(${(p.s ?? 1).toFixed(2)})`;

export const BOUQUET_BACK = `<rect width="512" height="512" fill="#fef3c7"/>
<rect y="400" width="512" height="112" fill="#92400e"/><rect y="400" width="512" height="8" fill="#78350f"/>
<ellipse cx="256" cy="420" rx="90" ry="14" fill="#00000033"/>`;
export const BOUQUET_WRAP = `<path d="M${TIE.x - 40} 455 L${TIE.x - 18} 360 L${TIE.x + 18} 360 L${TIE.x + 40} 455 Z" fill="#fde68a" stroke="#b45309" stroke-width="3"/>
<rect x="${TIE.x - 22}" y="368" width="44" height="12" rx="4" fill="#e11d48" stroke="#9f1239" stroke-width="2"/>`;

export const bouquetSvgUrl = (flowers: FlowerType[], extras: string[] = [], layout?: BouquetLayout): string => {
  const { fl, ex } = resolveLayout(flowers, extras, layout);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
${BOUQUET_BACK}
${fl.map(stemMarkup).join('')}
${BOUQUET_WRAP}
${flowers.map((t, i) => `<g transform="${placeTransform(fl[i])}">${headMarkup(t, i)}</g>`).join('')}
${extras.map((k, i) => [k, i] as const).sort((a, b) => Number(b[0] === 'ribbon') - Number(a[0] === 'ribbon')).map(([k, i]) => `<g transform="${placeTransform(ex[i])}">${extraMarkup(k)}</g>`).join('')}
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
  const deco = [...new Set(extras)].filter(k => k !== 'ribbon').map(k => (k === 'kiss' ? 'a pink heart sticker' : k === 'golden_kiss' ? 'a shiny golden heart sticker' : `a little ${POCKET_INFO[k]?.name.toLowerCase()} charm`)).join(' and ');
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
export const bouquetJpegBlob = (flowers: FlowerType[], imageUrl?: string, extras?: string[], layout?: BouquetLayout): Promise<Blob> =>
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
    img.src = imageUrl ?? bouquetSvgUrl(flowers, extras, layout);
  });
