import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

// Touch layouts draw the 1024x768 screen offscreen, then blit a zoomed crop that follows Werka.
// Nearest-neighbour scaling keeps the pixel art crisp.
export interface Camera { x: number; y: number; vh: number; snap: boolean; last: number }
export const newCamera = (): Camera => ({ x: 0, y: 0, vh: CANVAS_HEIGHT, snap: true, last: 0 });

export const makeScene = () => {
  const c = document.createElement('canvas');
  c.width = CANVAS_WIDTH;
  c.height = CANVAS_HEIGHT;
  return c;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const blitCamera = (ctx: CanvasRenderingContext2D, scene: HTMLCanvasElement, cam: Camera, fx: number, fy: number, now: number) => {
  const c = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const W = Math.max(1, Math.round(c.clientWidth * dpr)), H = Math.max(1, Math.round(c.clientHeight * dpr));
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  // ~520 game px across the short side (about 1.8-2x on a phone in portrait), never more than one screen.
  // Snap to a whole number of device pixels per game pixel when close, so the pixels stay even.
  const minK = Math.max(W / CANVAS_WIDTH, H / CANVAS_HEIGHT);
  let k = Math.max(minK, Math.min(W, H) / 520);
  const r = Math.round(k);
  if (Math.abs(k - r) < 0.2 && r >= minK) k = r;
  const vw = W / k, vh = H / k;
  cam.vh = vh;
  const tx = clamp(fx - vw / 2, 0, CANVAS_WIDTH - vw), ty = clamp(fy - vh / 2, 0, CANVAS_HEIGHT - vh);
  const dt = Math.min(now - cam.last, 100);
  cam.last = now;
  if (cam.snap) { cam.x = tx; cam.y = ty; cam.snap = false; }
  else {
    const a = 1 - Math.exp(-dt / 140); // smooth follow, frame-rate independent
    cam.x += (tx - cam.x) * a;
    cam.y += (ty - cam.y) * a;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene, Math.round(cam.x), Math.round(cam.y), vw, vh, 0, 0, W, H);
};
