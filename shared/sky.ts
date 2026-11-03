// One table for the whole day, used by both games (spec v5 §3). Colours eased between keyframes.
type RGB = [number, number, number];
export type SkyKey = {
  t: number;
  mul: RGB; // 2D: multiply tint over the scene
  glow: RGB; glowA: number; // 2D: soft light added on top
  sky: RGB; sun: RGB; hemi: RGB; rim: RGB; ground: RGB; // 3D lights
  sunI: number; hemiI: number;
  day: number; golden: number; // 0..1, drive 3D grade, clouds and water
  stars: number; lights: number; // 0..1: stars on water, lit windows and lamps
  shadow: number; // ground shadow strength
};

const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const key = (t: number, mul: string, glow: string, glowA: number, sky: string, sun: string, sunI: number, hemi: string, hemiI: number, rim: string, ground: string,
  day: number, golden: number, stars: number, lights: number, shadow: number): SkyKey =>
  ({ t, mul: hex(mul), glow: hex(glow), glowA, sky: hex(sky), sun: hex(sun), sunI, hemi: hex(hemi), hemiI, rim: hex(rim), ground: hex(ground), day, golden, stars, lights, shadow });

const NIGHT = ['#4e5a96', '#283c82', 0.06, '#141b36', '#9fb4ff', 1.5, '#7f90d0', 1.35, '#8fa6ff', '#1a2140', 0, 0, 1, 1, 0.1] as const;
export const SKY_KEYS: SkyKey[] = [
  key(0, ...NIGHT),
  key(0.19, '#58629c', '#283c82', 0.06, '#26325e', '#9fb4ff', 1.5, '#7f90d0', 1.35, '#8fa6ff', '#1a2140', 0, 0, 0.9, 1, 0.1),
  key(0.235, '#be8caa', '#ff9678', 0.1, '#e8a3a0', '#ff8a6a', 1.8, '#d0a4c0', 1.5, '#ff9a8a', '#2a2a50', 0.25, 0.1, 0.15, 0.8, 0.12),
  key(0.27, '#f5cdaf', '#ffbe78', 0.12, '#f7c39a', '#ff9a5a', 2, '#ffc39a', 1.25, '#ffb27a', '#2f4a68', 0.6, 0.7, 0, 0.2, 0.24),
  key(0.34, '#fff6e6', '#ffe6b4', 0.03, '#bfe3ef', '#fff0d0', 2.6, '#9cc8ff', 1.3, '#ffe7b8', '#2f5f78', 1, 0.1, 0, 0, 0.28),
  key(0.5, '#ffffff', '#ffffff', 0, '#bfe3ef', '#fff4dc', 2.6, '#9cc8ff', 1.3, '#ffe7b8', '#2f5f78', 1, 0, 0, 0, 0.26),
  key(0.64, '#ffffff', '#ffffff', 0, '#bfe3ef', '#fff0d0', 2.6, '#9cc8ff', 1.3, '#ffe7b8', '#2f5f78', 1, 0, 0, 0, 0.28),
  key(0.71, '#ffe2b4', '#ffaa50', 0.12, '#ffc58e', '#ffa45a', 2.9, '#ffc49a', 1.45, '#ff9a5c', '#3a5570', 0.95, 1, 0, 0.15, 0.3),
  key(0.77, '#eba58c', '#ff6e50', 0.16, '#f08a7a', '#ff6a3a', 2, '#c98aa0', 1.15, '#ff8a6c', '#3a3a60', 0.6, 0.85, 0, 0.6, 0.22),
  key(0.82, '#9678af', '#8c5aaa', 0.1, '#6a4f8c', '#b898e8', 1.9, '#a494dc', 1.65, '#b08ad0', '#242450', 0.15, 0.1, 0.4, 1, 0.12),
  key(0.88, '#5c64a5', '#324696', 0.07, '#2b2d58', '#9fb4ff', 1.5, '#7f90d0', 1.35, '#8fa6ff', '#1a2140', 0, 0, 1, 1, 0.1),
  key(1, ...NIGHT),
];

const mixRGB = (o: RGB, a: RGB, b: RGB, u: number) => { o[0] = a[0] + (b[0] - a[0]) * u; o[1] = a[1] + (b[1] - a[1]) * u; o[2] = a[2] + (b[2] - a[2]) * u; };
const out: SkyKey = { ...SKY_KEYS[0], mul: [0, 0, 0], glow: [0, 0, 0], sky: [0, 0, 0], sun: [0, 0, 0], hemi: [0, 0, 0], rim: [0, 0, 0], ground: [0, 0, 0] };
let lastT = -1;
// Shared result object, recomputed only when t changes: no allocation per frame, safe to call per tree.
export function skyAt(time: number): SkyKey {
  const t = ((time % 1) + 1) % 1;
  if (t === lastT) return out;
  lastT = t;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && t > SKY_KEYS[i + 1].t) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], x = (t - a.t) / (b.t - a.t), u = x * x * (3 - 2 * x);
  mixRGB(out.mul, a.mul, b.mul, u); mixRGB(out.glow, a.glow, b.glow, u); mixRGB(out.sky, a.sky, b.sky, u); mixRGB(out.sun, a.sun, b.sun, u);
  mixRGB(out.hemi, a.hemi, b.hemi, u); mixRGB(out.rim, a.rim, b.rim, u); mixRGB(out.ground, a.ground, b.ground, u);
  const n = (k: 'glowA' | 'sunI' | 'hemiI' | 'day' | 'golden' | 'stars' | 'lights' | 'shadow') => a[k] + (b[k] - a[k]) * u;
  out.glowA = n('glowA'); out.sunI = n('sunI'); out.hemiI = n('hemiI'); out.day = n('day'); out.golden = n('golden');
  out.stars = n('stars'); out.lights = n('lights'); out.shadow = n('shadow');
  return out;
}
