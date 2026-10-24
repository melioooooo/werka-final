import { Flower, FlowerType, Biome, Obstacle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, HOUSE_RECT, BIOME_COLORS } from '../constants';
import { SeededRandom, BRIDGE_WIDTH } from './world';

// Static ground layer for one screen; drawn once into an offscreen canvas when the screen changes.
export const drawBackground = (ctx: CanvasRenderingContext2D, biome: Biome, dateSeed: string, sx: number, sy: number, house: boolean,
  riverY: (globalX: number) => number, getBridgeX: (sx: number, sy: number) => number, flowers: Flower[] = []) => {
  const now = Date.now();
  const drawTerrainPatches = (ctx: CanvasRenderingContext2D, biome: Biome, seasonPalette: Record<Biome, string>) => {
    const rng = new SeededRandom(`${dateSeed}-${sx}-${sy}-terrain`);
    const numPatches = 5;
    for (let i = 0; i < numPatches; i++) {
      const x = rng.range(0, CANVAS_WIDTH);
      const y = rng.range(0, CANVAS_HEIGHT);
      const rx = rng.range(50, 200);
      const ry = rng.range(30, 120);
      const rotation = rng.next() * Math.PI;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      ctx.fillStyle = seasonPalette[biome];
      ctx.globalAlpha = rng.next() > 0.5 ? 0.25 : 0.15;

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  };

  const drawGroundDetails = (ctx: CanvasRenderingContext2D, biome: Biome, seasonPalette: Record<Biome, string>) => {
    const rng = new SeededRandom(`${dateSeed}-${sx}-${sy}-ground`);
    // Reduced from 250 to 80 for performance
    const detailCount = 80;

    // Pre-calculate darker color once instead of using filter
    const baseColor = seasonPalette[biome];

    if (biome === Biome.GRASS || biome === Biome.FOREST || biome === Biome.RIVER) {
      ctx.strokeStyle = '#2d5a3d';
      ctx.fillStyle = '#2d5a3d';
      ctx.lineWidth = 2;

      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);

        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y - 4);
          ctx.moveTo(x, y);
          ctx.lineTo(x + 2, y - 4);
          ctx.stroke();
        } else {
          ctx.fillRect(x, y, 2, 3);
        }
      }
    } else if (biome === Biome.DESERT) {
      ctx.fillStyle = '#d4a574';
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        ctx.fillRect(x, y, 2, 2);
        if (i % 10 === 0) {
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d4a574';
        }
      }
    } else if (biome === Biome.TROPICAL) {
      // Tropical: dense foliage, vibrant undergrowth
      ctx.fillStyle = '#047857';
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        ctx.fillStyle = rng.next() > 0.5 ? '#059669' : '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 2 + rng.next() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome === Biome.MOUNTAIN) {
      // Mountain: rocks, pebbles, sparse vegetation
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        if (i % 5 === 0) {
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.ellipse(x, y, 4 + rng.next() * 4, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = rng.next() > 0.5 ? '#a8a29e' : '#d6d3d1';
          ctx.fillRect(x, y, 2, 2);
        }
      }
    } else if (biome === Biome.MEADOW) {
      // Meadow: tall swaying grass, colorful dots
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 1;
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 10);
        ctx.stroke();
        if (i % 4 === 0) {
          const colors = ['#fbbf24', '#ec4899', '#3b82f6', '#f472b6'];
          ctx.fillStyle = colors[Math.floor(rng.next() * colors.length)];
          ctx.beginPath();
          ctx.arc(x, y - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (biome === Biome.SWAMP) {
      // Swamp: murky pools, fog, twisted roots
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        if (i % 6 === 0) {
          // Murky water pools
          ctx.fillStyle = 'rgba(50, 80, 50, 0.4)';
          ctx.beginPath();
          ctx.ellipse(x, y, 15 + rng.next() * 20, 8 + rng.next() * 10, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (i % 8 === 0) {
          // Twisted roots
          ctx.strokeStyle = '#422006';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + rng.range(-10, 10), y - 10, x + rng.range(-15, 15), y - 5);
          ctx.stroke();
        } else {
          // Moss and muck
          ctx.fillStyle = rng.next() > 0.5 ? '#3f6212' : '#1a2e05';
          ctx.fillRect(x, y, 3, 2);
        }
      }
      // Fog effect
      ctx.fillStyle = 'rgba(150, 170, 150, 0.1)';
      for (let i = 0; i < 5; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(CANVAS_HEIGHT / 2, CANVAS_HEIGHT);
        ctx.beginPath();
        ctx.ellipse(x, y, 80, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome === Biome.TUNDRA) {
      // Tundra: snow patches, ice, sparse vegetation
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        if (i % 4 === 0) {
          // Snow drifts
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(x, y, 12 + rng.next() * 15, 5 + rng.next() * 5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (i % 10 === 0) {
          // Ice crystals
          ctx.fillStyle = '#bfdbfe';
          ctx.beginPath();
          ctx.moveTo(x, y - 6);
          ctx.lineTo(x - 3, y);
          ctx.lineTo(x, y + 6);
          ctx.lineTo(x + 3, y);
          ctx.fill();
        } else {
          // Frozen ground texture
          ctx.fillStyle = rng.next() > 0.5 ? '#e0f2fe' : '#cbd5e1';
          ctx.fillRect(x, y, 2, 2);
        }
      }
    } else if (biome === Biome.ENCHANTED) {
      // Enchanted: glowing particles, magical sparkles, mushrooms
      for (let i = 0; i < detailCount; i++) {
        const x = rng.range(0, CANVAS_WIDTH);
        const y = rng.range(0, CANVAS_HEIGHT);
        const pulse = Math.sin(now / 500 + i) * 0.3 + 0.7;
        if (i % 8 === 0) {
          // Glowing mushrooms
          ctx.fillStyle = `rgba(147, 51, 234, ${pulse})`;
          ctx.beginPath();
          ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI);
          ctx.fill();
          ctx.fillStyle = '#fdf4ff';
          ctx.fillRect(x - 1, y, 2, 5);
        } else if (i % 5 === 0) {
          // Floating sparkles
          const sparkleY = y + Math.sin(now / 300 + x) * 3;
          ctx.fillStyle = `rgba(250, 240, 137, ${pulse})`;
          ctx.beginPath();
          ctx.arc(x, sparkleY, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Magical ground particles
          ctx.fillStyle = rng.next() > 0.5 ? '#c4b5fd' : '#a855f7';
          ctx.beginPath();
          ctx.arc(x, y, 1 + rng.next(), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Floating orbs
      for (let i = 0; i < 3; i++) {
        const ox = rng.range(50, CANVAS_WIDTH - 50);
        const oy = rng.range(50, CANVAS_HEIGHT - 100);
        const float = Math.sin(now / 400 + i * 2) * 8;
        const glow = 0.3 + Math.sin(now / 300 + i) * 0.2;
        ctx.fillStyle = `rgba(192, 132, 252, ${glow})`;
        ctx.beginPath();
        ctx.arc(ox, oy + float, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fdf4ff';
        ctx.beginPath();
        ctx.arc(ox, oy + float, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawDetailedPath = (ctx: CanvasRenderingContext2D) => {
    const doorX = CANVAS_WIDTH / 2;
    const doorY = HOUSE_RECT.doorY;
    ctx.fillStyle = '#d6d3d1'; // Light Stones
    const rng = new SeededRandom('path');

    for (let y = doorY; y < CANVAS_HEIGHT; y += 6) {
      const width = 50 + Math.sin(y / 40) * 15;
      const offsetX = Math.sin(y / 70) * 25;

      for (let dx = -width / 2; dx < width / 2; dx += 8) {
        if (rng.next() > 0.2) {
          // Randomize stone shade
          const shade = Math.floor(rng.range(200, 240));
          ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 10})`;
          ctx.fillRect(doorX + offsetX + dx, y, 7, 5);
        }
      }
    }
  };

  const drawContinuousRiver = (ctx: CanvasRenderingContext2D) => {
    // Bank (the grass texture under it is kept)
    ctx.fillStyle = '#eecfa1';
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
      const globalX = sx * CANVAS_WIDTH + x;
      const y = riverY(globalX);
      ctx.lineTo(x, y - 45);
    }
    for (let x = CANVAS_WIDTH; x >= 0; x -= 10) {
      const globalX = sx * CANVAS_WIDTH + x;
      const y = riverY(globalX);
      ctx.lineTo(x, y + 45);
    }
    ctx.fill();

    // Water
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
      const globalX = sx * CANVAS_WIDTH + x;
      const y = riverY(globalX);
      ctx.lineTo(x, y - 38);
    }
    for (let x = CANVAS_WIDTH; x >= 0; x -= 10) {
      const globalX = sx * CANVAS_WIDTH + x;
      const y = riverY(globalX);
      ctx.lineTo(x, y + 38);
    }
    ctx.fill();

    // Details (Lily pads)
    const rng = new SeededRandom(`river-decor-${sx}-${sy}`);
    for (let i = 0; i < 5; i++) {
      const x = rng.range(20, CANVAS_WIDTH - 20);
      const globalX = sx * CANVAS_WIDTH + x;
      const cy = riverY(globalX);
      const y = cy + rng.range(-20, 20);

      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#86efac'; // highlight
      ctx.beginPath();
      ctx.arc(x + 2, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      // Cutout
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y - 5);
      ctx.lineTo(x + 10, y + 5);
      ctx.fill();
    }

    // Cattails
    for (let i = 0; i < 8; i++) {
      const x = rng.range(0, CANVAS_WIDTH);
      const globalX = sx * CANVAS_WIDTH + x;
      const cy = riverY(globalX);
      const bankY = cy - 40 - rng.range(0, 10);

      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, bankY);
      ctx.lineTo(x, bankY - 20);
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 2, bankY - 20, 4, 10);
    }

    // === BRIDGE ===
    const bridgeX = getBridgeX(sx, sy);
    const bridgeCenterGlobalX = sx * CANVAS_WIDTH + bridgeX;
    const bridgeCenterY = riverY(bridgeCenterGlobalX);
    const bridgeTopY = bridgeCenterY - 55;
    const bridgeBottomY = bridgeCenterY + 55;

    // Bridge support posts (dark wood)
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(bridgeX - BRIDGE_WIDTH / 2 - 5, bridgeTopY - 10, 10, bridgeBottomY - bridgeTopY + 20);
    ctx.fillRect(bridgeX + BRIDGE_WIDTH / 2 - 5, bridgeTopY - 10, 10, bridgeBottomY - bridgeTopY + 20);

    // Bridge planks (lighter wood)
    ctx.fillStyle = '#a0826d';
    for (let py = bridgeTopY; py < bridgeBottomY; py += 8) {
      ctx.fillRect(bridgeX - BRIDGE_WIDTH / 2 + 5, py, BRIDGE_WIDTH - 10, 6);
    }

    // Bridge plank outlines for depth
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 1;
    for (let py = bridgeTopY; py < bridgeBottomY; py += 8) {
      ctx.strokeRect(bridgeX - BRIDGE_WIDTH / 2 + 5, py, BRIDGE_WIDTH - 10, 6);
    }

    // Bridge railings
    ctx.fillStyle = '#8b7355';
    // Left railing
    ctx.fillRect(bridgeX - BRIDGE_WIDTH / 2 + 2, bridgeTopY - 5, 4, bridgeBottomY - bridgeTopY + 10);
    // Right railing  
    ctx.fillRect(bridgeX + BRIDGE_WIDTH / 2 - 6, bridgeTopY - 5, 4, bridgeBottomY - bridgeTopY + 10);

    // Railing posts
    ctx.fillStyle = '#6b4423';
    for (let py = bridgeTopY; py <= bridgeBottomY; py += 25) {
      ctx.fillRect(bridgeX - BRIDGE_WIDTH / 2, py - 3, 8, 10);
      ctx.fillRect(bridgeX + BRIDGE_WIDTH / 2 - 8, py - 3, 8, 10);
    }
  };

  ctx.fillStyle = BIOME_COLORS[biome];
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const tex = new SeededRandom(`${dateSeed}-${sx}-${sy}-texture`); // own stream: older layers stay identical
  drawGroundTexture(ctx, biome, tex, flowers);
  drawTerrainPatches(ctx, biome, BIOME_COLORS);
  drawGroundDetails(ctx, biome, BIOME_COLORS);
  if (biome === Biome.RIVER) drawContinuousRiver(ctx);
  if (house) { drawDetailedPath(ctx); drawPathEdges(ctx, biome, tex); }
};

// --- Ground texture: pixel dithering, tonal patches, tufts, clover, pebbles, petals. Baked once per screen. ---
const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
// Shadows lean cool, lights lean warm, as in most cosy pixel-art palettes.
const tone = (c: string, t: number) => (t < 0 ? mix(c, '#24304a', -t) : mix(c, '#fff3c4', t));
const GRASSY = new Set([Biome.GRASS, Biome.RIVER, Biome.MEADOW, Biome.FOREST, Biome.TROPICAL, Biome.SWAMP, Biome.ENCHANTED]);
const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w = 2, h = 2) => ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h);

const tuft = (ctx: CanvasRenderingContext2D, x: number, y: number, dark: string, light: string, v: number) => {
  ctx.fillStyle = dark;
  const blades = v === 0 ? [[-2, 4], [0, 6], [2, 4]] : v === 1 ? [[-4, 4], [-2, 6], [2, 8], [4, 4]] : [[0, 6], [2, 4]];
  for (const [dx, h] of blades) px(ctx, x + dx, y - h, 2, h);
  ctx.fillStyle = light;
  px(ctx, x + blades[1][0], y - blades[1][1]);
};

const drawGroundTexture = (ctx: CanvasRenderingContext2D, biome: Biome, rng: SeededRandom, flowers: Flower[]) => {
  const base = BIOME_COLORS[biome];
  const W = CANVAS_WIDTH, H = CANVAS_HEIGHT;
  // big ragged tonal patches on a 4px grid
  const tones = [tone(base, -0.1), tone(base, 0.09), tone(base, -0.16)];
  for (let i = 0; i < 18; i++) {
    const cx = rng.range(0, W), cy = rng.range(0, H), r = rng.range(30, 95);
    ctx.fillStyle = tones[i % 3];
    for (let y = cy - r; y < cy + r; y += 4) for (let x = cx - r * 1.4; x < cx + r * 1.4; x += 4) {
      const d = Math.hypot((x - cx) / 1.4, y - cy) / r;
      if (d + rng.next() * 0.3 < 1) ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 4, 4);
    }
  }
  // fine dithering
  const dl = tone(base, 0.14), dd = tone(base, -0.14);
  for (let i = 0; i < 3200; i++) { ctx.fillStyle = i % 2 ? dl : dd; px(ctx, rng.range(0, W), rng.range(0, H)); }

  const dark = tone(base, -0.38), light = tone(base, 0.25);
  if (GRASSY.has(biome)) {
    // tufts, half of them in little clumps
    for (let i = 0; i < 70; i++) {
      const cx = rng.range(0, W), cy = rng.range(0, H);
      for (let j = 0; j < 4; j++) tuft(ctx, cx + rng.range(-10, 10), cy + rng.range(-5, 5), dark, light, Math.floor(rng.next() * 3));
    }
    for (let i = 0; i < 140; i++) tuft(ctx, rng.range(0, W), rng.range(0, H), dark, light, Math.floor(rng.next() * 3));
    // clover patches
    const clover = tone(base, -0.2);
    for (let i = 0; i < 10; i++) {
      const cx = rng.range(0, W), cy = rng.range(0, H);
      for (let j = 0; j < 7; j++) {
        const x = cx + rng.range(-18, 18), y = cy + rng.range(-10, 10);
        ctx.fillStyle = clover;
        px(ctx, x, y); px(ctx, x + 2, y + 2); px(ctx, x - 2, y + 2);
        if (rng.next() < 0.25) { ctx.fillStyle = '#fdfbf0'; px(ctx, x, y - 2); }
      }
    }
  } else if (biome === Biome.DESERT) {
    // wind ripples
    for (let i = 0; i < 160; i++) {
      const x = rng.range(0, W), y = rng.range(0, H), w = 6 + Math.floor(rng.next() * 4) * 2;
      ctx.fillStyle = light; px(ctx, x, y, w, 2);
      ctx.fillStyle = tone(base, -0.12); px(ctx, x + 2, y + 2, w, 2);
    }
    for (let i = 0; i < 40; i++) tuft(ctx, rng.range(0, W), rng.range(0, H), '#a3814f', '#d6b47a', Math.floor(rng.next() * 3));
  } else if (biome === Biome.MOUNTAIN) {
    // cracks and moss
    ctx.fillStyle = dark;
    for (let i = 0; i < 40; i++) {
      let x = rng.range(0, W), y = rng.range(0, H);
      for (let j = 0; j < 6; j++) { px(ctx, x, y); x += rng.range(-1, 3) * 2; y += 2; }
    }
    ctx.fillStyle = '#6f8a4e';
    for (let i = 0; i < 120; i++) px(ctx, rng.range(0, W), rng.range(0, H));
  } else if (biome === Biome.TUNDRA) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 300; i++) px(ctx, rng.range(0, W), rng.range(0, H));
    for (let i = 0; i < 40; i++) tuft(ctx, rng.range(0, W), rng.range(0, H), '#8aa39a', '#c9dbd3', Math.floor(rng.next() * 3));
  }
  // pebbles everywhere, a few more on rocky ground
  const pebbles = biome === Biome.MOUNTAIN || biome === Biome.DESERT ? 90 : 35;
  for (let i = 0; i < pebbles; i++) {
    const x = rng.range(0, W), y = rng.range(0, H), g = rng.next() < 0.5 ? '#9b948c' : '#b7aea2';
    ctx.fillStyle = tone(g, -0.25); px(ctx, x, y + 2, 4, 2);
    ctx.fillStyle = g; px(ctx, x, y, 4, 2);
    ctx.fillStyle = '#e7e2d8'; px(ctx, x, y);
  }
  // fallen petals around each flower
  for (const f of flowers) {
    ctx.fillStyle = f.color;
    for (let j = 0; j < 3; j++) {
      const a = rng.next() * Math.PI * 2, d = rng.range(7, 16);
      px(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.5, 2, 2);
    }
  }
};

// Grass tufts creeping over both edges of the stone path to the door.
const drawPathEdges = (ctx: CanvasRenderingContext2D, biome: Biome, rng: SeededRandom) => {
  const base = BIOME_COLORS[biome];
  const dark = tone(base, -0.3), light = tone(base, 0.22);
  for (let y = HOUSE_RECT.doorY + 8; y < CANVAS_HEIGHT; y += 7) {
    const width = 50 + Math.sin(y / 40) * 15, cx = CANVAS_WIDTH / 2 + Math.sin(y / 70) * 25;
    for (const side of [-1, 1]) if (rng.next() < 0.7) tuft(ctx, cx + side * (width / 2 + rng.range(-6, 2)), y, dark, light, Math.floor(rng.next() * 3));
  }
};

// The cottage only changes with the lights, so both versions are cached; its shadow moves with the sun and is drawn live.
const HOUSE_OX = HOUSE_RECT.x - 30;
const houseCache: Record<string, HTMLCanvasElement> = {};
const houseBody = (lightsOn: boolean) => {
  const key = String(lightsOn);
  if (houseCache[key]) return houseCache[key];
  const c = document.createElement('canvas');
  c.width = HOUSE_RECT.width + 60;
  c.height = HOUSE_RECT.y + HOUSE_RECT.height + 10;
  const ctx = c.getContext('2d')!;
  ctx.translate(-HOUSE_OX, 0);
  const x = HOUSE_RECT.x;
  const y = HOUSE_RECT.y;
  const w = HOUSE_RECT.width;
  const h = HOUSE_RECT.height;
  // --- PORCH (Foundation) ---
  ctx.fillStyle = '#44403c'; // Dark stone
  ctx.fillRect(x - 10, y + h - 20, w + 20, 25);
  ctx.fillStyle = '#78716c'; // lighter stone tops
  for (let i = 0; i < 12; i++) ctx.fillRect(x - 10 + i * 20, y + h - 20, 10, 10);

  // --- WALLS ---
  ctx.fillStyle = '#f5f5f4'; // Plaster
  ctx.fillRect(x, y + 20, w, h - 20);

  // --- TIMBER FRAMING ---
  ctx.fillStyle = '#451a03';
  const beamW = 10;
  ctx.fillRect(x, y + 20, beamW, h - 20); // Left
  ctx.fillRect(x + w - beamW, y + 20, beamW, h - 20); // Right
  ctx.fillRect(x, y + h - beamW, w, beamW); // Bottom
  ctx.fillRect(x, y + 20, w, beamW); // Top
  // Crosses
  ctx.beginPath();
  ctx.moveTo(x, y + 20); ctx.lineTo(x + w / 4, y + h);
  ctx.moveTo(x + w, y + 20); ctx.lineTo(x + w * 0.75, y + h);
  ctx.strokeStyle = '#451a03'; ctx.lineWidth = 6; ctx.stroke();

  // --- ROOF ---
  // Roof outline shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.moveTo(x - 25, y + 30);
  ctx.lineTo(x + w / 2, y - 70);
  ctx.lineTo(x + w + 25, y + 30);
  ctx.fill();

  // Main Roof base - darker red
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 25);
  ctx.lineTo(x + w / 2, y - 65);
  ctx.lineTo(x + w + 20, y + 25);
  ctx.closePath();
  ctx.fill();

  // Roof shingle layers - create depth with multiple rows
  const roofStartY = y - 60;
  const roofEndY = y + 25;
  const roofHeight = roofEndY - roofStartY;
  const shingleRows = 8;

  for (let row = 0; row < shingleRows; row++) {
    const rowY = roofStartY + (row / shingleRows) * roofHeight;
    const progress = row / shingleRows;
    const halfWidth = progress * (w / 2 + 20);

    // Alternate shingle colors for depth
    ctx.fillStyle = row % 2 === 0 ? '#991b1b' : '#7f1d1d';
    ctx.strokeStyle = '#581c1c';
    ctx.lineWidth = 1;

    // Draw individual shingles in this row
    const shingleWidth = 18;
    const startX = x + w / 2 - halfWidth;
    const endX = x + w / 2 + halfWidth;

    for (let sx = startX; sx < endX; sx += shingleWidth) {
      // Vary shingle shade slightly
      const shade = Math.sin(sx * 7.1 + row * 13.3) > 0 ? '#991b1b' : '#7f1d1d';
      ctx.fillStyle = shade;

      ctx.beginPath();
      ctx.moveTo(sx, rowY);
      ctx.lineTo(sx + shingleWidth / 2, rowY + roofHeight / shingleRows);
      ctx.lineTo(sx + shingleWidth, rowY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Roof ridge cap (top edge highlight)
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 65);
  ctx.lineTo(x + w / 2, y - 65);
  ctx.stroke();

  // Roof edge trim - left side
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 25);
  ctx.lineTo(x + w / 2, y - 65);
  ctx.stroke();

  // Roof edge trim - right side
  ctx.beginPath();
  ctx.moveTo(x + w + 20, y + 25);
  ctx.lineTo(x + w / 2, y - 65);
  ctx.stroke();

  // Roof bottom edge highlight
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 22, y + 27);
  ctx.lineTo(x + w + 22, y + 27);
  ctx.stroke();

  // --- CHIMNEY (positioned better with roof) ---
  // Chimney back (shadow)
  ctx.fillStyle = '#44403c';
  ctx.fillRect(x + w - 45, y - 45, 30, 55);
  // Chimney front
  ctx.fillStyle = '#57534e';
  ctx.fillRect(x + w - 42, y - 50, 25, 55);
  // Chimney bricks pattern
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 1;
  for (let by = y - 48; by < y + 5; by += 8) {
    ctx.beginPath();
    ctx.moveTo(x + w - 42, by);
    ctx.lineTo(x + w - 17, by);
    ctx.stroke();
  }
  // Chimney cap
  ctx.fillStyle = '#292524';
  ctx.fillRect(x + w - 47, y - 55, 35, 6);
  // Chimney inner
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x + w - 37, y - 55, 15, 3);

  // --- WINDOWS ---
  const drawWindow = (wx: number, wy: number) => {
    // Frame
    ctx.fillStyle = '#451a03';
    ctx.fillRect(wx, wy, 36, 40);
    // Glass
    ctx.fillStyle = lightsOn ? '#fde047' : '#1e3a8a';
    ctx.fillRect(wx + 3, wy + 3, 13, 15);
    ctx.fillRect(wx + 20, wy + 3, 13, 15);
    ctx.fillRect(wx + 3, wy + 22, 13, 15);
    ctx.fillRect(wx + 20, wy + 22, 13, 15);

    // Flower Box
    ctx.fillStyle = '#78350f';
    ctx.fillRect(wx - 2, wy + 35, 40, 12);
    // Flowers in box
    ctx.fillStyle = '#22c55e'; // Leaves
    ctx.fillRect(wx, wy + 32, 36, 5);
    ctx.fillStyle = '#f472b6'; // Petals
    ctx.beginPath(); ctx.arc(wx + 10, wy + 32, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(wx + 26, wy + 32, 3, 0, Math.PI * 2); ctx.fill();
  };

  drawWindow(x + 30, y + 50);
  drawWindow(x + w - 66, y + 50);

  // --- DORMER WINDOW (Roof) ---
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 50);
  ctx.lineTo(x + w / 2 - 20, y - 20);
  ctx.lineTo(x + w / 2 + 20, y - 20);
  ctx.fill();
  ctx.fillStyle = lightsOn ? '#fde047' : '#1e3a8a';
  ctx.beginPath();
  ctx.arc(x + w / 2, y - 28, 8, 0, Math.PI * 2);
  ctx.fill();

  // --- DOOR ---
  ctx.fillStyle = '#3f2c22';
  ctx.fillRect(HOUSE_RECT.doorX, HOUSE_RECT.doorY - 50, HOUSE_RECT.doorWidth, 50);
  // Frame
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3;
  ctx.strokeRect(HOUSE_RECT.doorX, HOUSE_RECT.doorY - 50, HOUSE_RECT.doorWidth, 50);
  // Knob
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(HOUSE_RECT.doorX + 8, HOUSE_RECT.doorY - 25, 3, 0, Math.PI * 2); ctx.fill();

  // Lantern by door
  ctx.fillStyle = '#18181b';
  ctx.fillRect(HOUSE_RECT.doorX - 15, HOUSE_RECT.doorY - 40, 8, 12);
  ctx.fillStyle = lightsOn ? '#facc15' : '#52525b';
  ctx.fillRect(HOUSE_RECT.doorX - 13, HOUSE_RECT.doorY - 38, 4, 8);

  // --- PILLARS ---
  ctx.fillStyle = '#fff';
  const pillarW = 8;
  // Left
  ctx.fillRect(x - 5, y + 20, pillarW, h - 20);
  // Right
  ctx.fillRect(x + w - 3, y + 20, pillarW, h - 20);

  return (houseCache[key] = c);
};

export const drawHouse = (ctx: CanvasRenderingContext2D, time: number) => {
  const x = HOUSE_RECT.x;
  const y = HOUSE_RECT.y;
  const w = HOUSE_RECT.width;
  const h = HOUSE_RECT.height;
  const lightsOn = time < 0.25 || time > 0.75;
  const shadowOffX = (time - 0.5) * 180;
  ctx.fillStyle = lightsOn ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.moveTo(x + shadowOffX, y + h);
  ctx.lineTo(x + w + shadowOffX, y + h);
  ctx.lineTo(x + w, y + h - 10);
  ctx.lineTo(x, y + h - 10);
  ctx.fill();
  ctx.drawImage(houseBody(lightsOn), HOUSE_OX, 0);
};

// Canopy is the same for every tree, so it is drawn once and blitted with the sway offset.
let canopy: HTMLCanvasElement | null = null;
const getCanopy = () => {
  if (canopy) return canopy;
  canopy = document.createElement('canvas');
  canopy.width = 52;
  canopy.height = 60;
  const ctx = canopy.getContext('2d')!;
  const x = 6, y = 24;
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(x + 20, y + 10, 20, 0, Math.PI * 2);
  ctx.arc(x + 10, y + 20, 15, 0, Math.PI * 2);
  ctx.arc(x + 30, y + 20, 15, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 5, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(x + 20, y + 5, 12, 0, Math.PI * 2);
  ctx.fill();
  return canopy;
};

export const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, now: number, time: number) => {
  const sway = Math.sin(now / 1000 + x) * 2;
  const shadowOffX = (time - 0.5) * 120;
  const isNight = time < 0.2 || time > 0.8;

  if (!isNight) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 20 + shadowOffX, y + 38, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#451a03';
  ctx.fillRect(x + 15, y + 20, 10, 20);
  ctx.drawImage(getCanopy(), x + sway - 6, y - 24);
};

export const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  const shadowOffX = (time - 0.5) * 80;
  const isNight = time < 0.2 || time > 0.8;
  if (!isNight) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 20 + shadowOffX, y + 28, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#57534e';
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 30);
  ctx.lineTo(x + 10, y + 10);
  ctx.lineTo(x + 25, y + 5);
  ctx.lineTo(x + 35, y + 15);
  ctx.lineTo(x + 40, y + 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 12);
  ctx.lineTo(x + 25, y + 8);
  ctx.lineTo(x + 20, y + 20);
  ctx.fill();
};

// Flower heads that only move with the sway are drawn once per type and blitted; the rest (glowing,
// floating or with a fixed base) are drawn live.
const LIVE_FLOWERS = new Set<FlowerType>([FlowerType.CACTUS, FlowerType.LOTUS, FlowerType.WATER_LILY, FlowerType.CATTAIL, FlowerType.MOSS_CAMPION,
  FlowerType.SNOW_CROCUS, FlowerType.VIOLET, FlowerType.MOONFLOWER, FlowerType.STARBLOOM, FlowerType.GLOWSHROOM]);
const HEAD_W = 32, HEAD_H = 36, HEAD_OX = 16, HEAD_OY = 32;
const headCache: Partial<Record<FlowerType, HTMLCanvasElement>> = {};
const flowerHead = (f: Flower) => {
  let c = headCache[f.type];
  if (c) return c;
  c = document.createElement('canvas');
  c.width = HEAD_W;
  c.height = HEAD_H;
  drawFlowerLive(c.getContext('2d')!, { ...f, x: HEAD_OX, y: HEAD_OY }, 0, 0.5, true);
  return (headCache[f.type] = c);
};

export const drawFlower = (ctx: CanvasRenderingContext2D, f: Flower, now: number, time: number) => {
  if (LIVE_FLOWERS.has(f.type)) return drawFlowerLive(ctx, f, now, time);
  const shadowOffX = (time - 0.5) * 10;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(f.x + shadowOffX, f.y, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#166534';
  ctx.fillRect(f.x - 1, f.y - 10, 2, 10);
  ctx.drawImage(flowerHead(f), f.x + Math.sin(now / 300 + f.x) * 2 - HEAD_OX, f.y - HEAD_OY);
};

const drawFlowerLive = (ctx: CanvasRenderingContext2D, f: Flower, now: number, time: number, headOnly = false) => {
  const sway = headOnly ? 0 : Math.sin(now / 300 + f.x) * 2;
  if (!headOnly) {
    const shadowOffX = (time - 0.5) * 10;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(f.x + shadowOffX, f.y, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stem (Common)
    ctx.fillStyle = '#166534';
    if (f.type !== FlowerType.LOTUS && f.type !== FlowerType.CACTUS) {
      ctx.fillRect(f.x - 1, f.y - 10, 2, 10);
    }
  }

  // Specific Drawing Logic
  switch (f.type) {
    case FlowerType.CACTUS:
      ctx.fillStyle = '#15803d';
      ctx.beginPath(); ctx.ellipse(f.x, f.y - 8, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y - 18, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.SUNFLOWER:
      ctx.fillStyle = f.color;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 6, f.y - 15 + Math.sin(ang) * 6, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#451a03';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 15, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.LOTUS:
      // Floating
      ctx.fillStyle = '#16a34a'; // Pad
      ctx.beginPath(); ctx.ellipse(f.x, f.y, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(f.x - 5, f.y); ctx.lineTo(f.x, f.y - 8); ctx.lineTo(f.x + 5, f.y);
      ctx.fill();
      ctx.beginPath(); ctx.arc(f.x, f.y - 2, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.JASMINE:
      // Small stars
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(f.x + sway, f.y - 15); ctx.lineTo(f.x - 3 + sway, f.y - 12); ctx.lineTo(f.x + 3 + sway, f.y - 12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x + sway, f.y - 9); ctx.lineTo(f.x - 3 + sway, f.y - 12); ctx.lineTo(f.x + 3 + sway, f.y - 12);
      ctx.fill();
      break;
    case FlowerType.HIBISCUS:
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef3c7'; // Stamen
      ctx.fillRect(f.x + sway, f.y - 14, 6, 2);
      break;
    case FlowerType.CHERRY_BLOSSOM:
      // Cluster
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + sway - 2, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + sway + 2, f.y - 16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 12, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.VIOLET:
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 10);
      ctx.lineTo(f.x - 4, f.y - 15);
      ctx.lineTo(f.x + 4, f.y - 15);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 10);
      ctx.lineTo(f.x - 3, f.y - 5);
      ctx.lineTo(f.x + 3, f.y - 5);
      ctx.fill();
      break;
    case FlowerType.BUTTERCUP:
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.SNAPDRAGON:
      ctx.fillStyle = f.color;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(f.x + sway, f.y - 10 - i * 5, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case FlowerType.CAMELLIA:
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fecdd3';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      break;
    // --- NEW FLOWER TYPES ---
    case FlowerType.IRIS:
      // Tall sword-like petals
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(f.x + sway, f.y - 20);
      ctx.lineTo(f.x - 4 + sway, f.y - 10);
      ctx.lineTo(f.x + 4 + sway, f.y - 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x - 5 + sway, f.y - 14);
      ctx.lineTo(f.x - 8 + sway, f.y - 8);
      ctx.lineTo(f.x - 2 + sway, f.y - 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x + 5 + sway, f.y - 14);
      ctx.lineTo(f.x + 8 + sway, f.y - 8);
      ctx.lineTo(f.x + 2 + sway, f.y - 10);
      ctx.fill();
      // Yellow center detail
      ctx.fillStyle = '#fde047';
      ctx.fillRect(f.x - 1 + sway, f.y - 13, 2, 4);
      break;
    case FlowerType.MAGNOLIA:
      // Large white/pink bloom with layered petals
      ctx.fillStyle = f.color;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 5, 3, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fce7f3'; // Lighter center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.CHRYSANTHEMUM:
      // Dense many-petaled fall flower
      ctx.fillStyle = f.color;
      for (let ring = 0; ring < 3; ring++) {
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + ring * 0.2;
          const dist = 3 + ring * 2;
          ctx.beginPath();
          ctx.ellipse(f.x + sway + Math.cos(ang) * dist, f.y - 14 + Math.sin(ang) * dist, 2, 1.5, ang, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#78350f'; // Dark center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.WISTERIA:
      // Cascading purple clusters
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const yOff = i * 4;
        const size = 3 - i * 0.4;
        ctx.beginPath(); ctx.arc(f.x + sway + (i % 2 === 0 ? -2 : 2), f.y - 18 + yOff, size, 0, Math.PI * 2); ctx.fill();
      }
      // Darker accent
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 18, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.FOXGLOVE:
      // Tall bell-shaped flowers stacked
      ctx.fillStyle = f.color;
      for (let i = 0; i < 4; i++) {
        const yOff = i * 5;
        const side = i % 2 === 0 ? -3 : 3;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + side, f.y - 22 + yOff, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner spots
        ctx.fillStyle = '#fce7f3';
        ctx.beginPath(); ctx.arc(f.x + sway + side, f.y - 22 + yOff, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = f.color;
      }
      break;
    case FlowerType.COSMOS:
      // Delicate 8-petal star flower
      ctx.fillStyle = f.color;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 3, 1.5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a'; // Yellow center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.ZINNIA:
      // Layered colorful petals
      ctx.fillStyle = f.color;
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + ring * 0.3;
          const dist = 4 + ring * 2;
          ctx.beginPath();
          ctx.ellipse(f.x + sway + Math.cos(ang) * dist, f.y - 14 + Math.sin(ang) * dist, 2.5, 1.5, ang, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#fbbf24'; // Golden center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.ANEMONE:
      // Windflower with dark center
      ctx.fillStyle = f.color;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 3.5, 2, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1e293b'; // Dark blue center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      break;

    // === TROPICAL BIOME FLOWERS ===
    case FlowerType.BIRD_OF_PARADISE:
      // Exotic spiky orange/purple flower
      ctx.fillStyle = '#f97316'; // Orange
      ctx.beginPath();
      ctx.moveTo(f.x + sway - 8, f.y - 10);
      ctx.lineTo(f.x + sway + 8, f.y - 20);
      ctx.lineTo(f.x + sway + 5, f.y - 12);
      ctx.fill();
      ctx.fillStyle = '#7c3aed'; // Purple accent
      ctx.beginPath();
      ctx.moveTo(f.x + sway - 5, f.y - 12);
      ctx.lineTo(f.x + sway + 3, f.y - 22);
      ctx.lineTo(f.x + sway + 0, f.y - 15);
      ctx.fill();
      break;
    case FlowerType.PLUMERIA:
      // 5 rounded white-pink petals
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 4, 2.5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a'; // Yellow center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.PASSION_FLOWER:
      // Complex circular purple flower
      ctx.fillStyle = f.color;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(f.x + sway, f.y - 14);
        ctx.lineTo(f.x + sway + Math.cos(ang) * 8, f.y - 14 + Math.sin(ang) * 8);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.FRANGIPANI:
      // Cream/yellow spiral petals
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 4, f.y - 14 + Math.sin(ang) * 4, 4, 2, ang + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fbbf24'; // Golden center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;

    // === MOUNTAIN BIOME FLOWERS ===
    case FlowerType.EDELWEISS:
      // White star-shaped alpine flower
      ctx.fillStyle = f.color;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 3, 1.5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef9c3'; // Fuzzy center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.ALPINE_ROSE:
      // Pink cluster
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + sway - 3, f.y - 16, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + sway + 3, f.y - 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 12, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.GENTIAN:
      // Deep blue bell-shaped
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(f.x + sway - 5, f.y - 10);
      ctx.quadraticCurveTo(f.x + sway, f.y - 20, f.x + sway + 5, f.y - 10);
      ctx.lineTo(f.x + sway + 3, f.y - 8);
      ctx.quadraticCurveTo(f.x + sway, f.y - 14, f.x + sway - 3, f.y - 8);
      ctx.fill();
      break;
    case FlowerType.COLUMBINE:
      // Unique spurred petals
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(f.x + sway, f.y - 14);
        ctx.lineTo(f.x + sway + Math.cos(ang) * 8, f.y - 14 + Math.sin(ang) * 8);
        ctx.lineTo(f.x + sway + Math.cos(ang + 0.3) * 5, f.y - 14 + Math.sin(ang + 0.3) * 5);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;

    // === MEADOW BIOME FLOWERS ===
    case FlowerType.BLACK_EYED_SUSAN:
      // Yellow petals with brown center
      ctx.fillStyle = f.color;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 6, f.y - 14 + Math.sin(ang) * 6, 3, 1.5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#78350f'; // Brown center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.CORNFLOWER:
      // Blue spiky petals
      ctx.fillStyle = f.color;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(f.x + sway, f.y - 14);
        ctx.lineTo(f.x + sway + Math.cos(ang) * 7, f.y - 14 + Math.sin(ang) * 7);
        ctx.lineTo(f.x + sway + Math.cos(ang + 0.15) * 4, f.y - 14 + Math.sin(ang + 0.15) * 4);
        ctx.fill();
      }
      ctx.fillStyle = '#1e3a8a'; // Darker center
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.CLOVER:
      // Pink/purple round ball cluster
      ctx.fillStyle = f.color;
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2;
        const r = 3 + (i % 3);
        ctx.beginPath();
        ctx.arc(f.x + sway + Math.cos(ang) * r * 0.5, f.y - 14 + Math.sin(ang) * r * 0.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case FlowerType.WILDFLOWER:
      // Generic colorful multi-petal
      ctx.fillStyle = f.color;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 4, f.y - 14 + Math.sin(ang) * 4, 3, 2, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;

    // === SWAMP BIOME FLOWERS ===
    case FlowerType.WATER_LILY:
      // Floating on water pad
      ctx.fillStyle = '#16a34a'; // Green pad
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + Math.cos(ang) * 4, f.y - 3 + Math.sin(ang) * 2, 4, 2, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(f.x, f.y - 3, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.SWAMP_ROSE:
      // Wild rose with thorny stem
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.MARSH_MARIGOLD:
      // Bright yellow marsh flower
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 4, 2.5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.CATTAIL:
      // Tall brown spike
      ctx.fillStyle = '#166534';
      ctx.fillRect(f.x - 1, f.y - 25, 2, 25);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 20, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    // === TUNDRA BIOME FLOWERS ===
    case FlowerType.ARCTIC_POPPY:
      // Delicate yellow poppy
      ctx.fillStyle = f.color;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 4, f.y - 14 + Math.sin(ang) * 4, 4, 3, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#422006';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.MOSS_CAMPION:
      // Low cushion of pink flowers
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = f.color;
      for (let i = 0; i < 8; i++) {
        const px = f.x + Math.sin(f.x * 12.9898 + i * 78.233) * 8;
        const py = f.y - 4 + Math.cos(f.y * 4.1 + i * 3.7) * 2;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case FlowerType.PURPLE_SAXIFRAGE:
      // Purple star-shaped alpine flower
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(f.x + sway, f.y - 14);
        ctx.lineTo(f.x + sway + Math.cos(ang) * 6, f.y - 14 + Math.sin(ang) * 6);
        ctx.lineTo(f.x + sway + Math.cos(ang + 0.3) * 3, f.y - 14 + Math.sin(ang + 0.3) * 3);
        ctx.fill();
      }
      break;
    case FlowerType.SNOW_CROCUS:
      // Pale purple emerging from snow
      ctx.fillStyle = '#f8fafc'; // Snow base
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(f.x - 3 + sway, f.y - 2);
      ctx.lineTo(f.x + sway, f.y - 12);
      ctx.lineTo(f.x + 3 + sway, f.y - 2);
      ctx.fill();
      break;

    // === ENCHANTED BIOME FLOWERS ===
    case FlowerType.MOONFLOWER:
      // Glowing white night flower
      const moonGlow = 0.5 + Math.sin(now / 400) * 0.3;
      ctx.fillStyle = `rgba(224, 231, 255, ${moonGlow})`;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.color;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(ang) * 5, f.y - 14 + Math.sin(ang) * 5, 4, 2, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case FlowerType.STARBLOOM:
      // Golden star-shaped magical flower
      const starGlow = 0.7 + Math.sin(now / 300) * 0.3;
      ctx.fillStyle = `rgba(254, 240, 138, ${starGlow})`;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(f.x + sway, f.y - 14);
        ctx.lineTo(f.x + sway + Math.cos(ang) * 8, f.y - 14 + Math.sin(ang) * 8);
        ctx.lineTo(f.x + sway + Math.cos(ang + 0.6) * 4, f.y - 14 + Math.sin(ang + 0.6) * 4);
        ctx.fill();
      }
      break;
    case FlowerType.CRYSTAL_ROSE:
      // Crystalline translucent rose
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#fdf4ff';
      ctx.beginPath(); ctx.arc(f.x + sway - 1, f.y - 16, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
    case FlowerType.FAIRY_BELLS:
      // Dangling bell-shaped flowers
      ctx.fillStyle = f.color;
      for (let i = 0; i < 3; i++) {
        const bellX = f.x + sway + (i - 1) * 5;
        const bellY = f.y - 10 - i * 3;
        ctx.beginPath();
        ctx.ellipse(bellX, bellY, 3, 4, 0, 0, Math.PI);
        ctx.fill();
      }
      break;
    case FlowerType.GLOWSHROOM:
      // Bioluminescent mushroom
      const shroomGlow = 0.6 + Math.sin(now / 350) * 0.4;
      ctx.fillStyle = `rgba(74, 222, 128, ${shroomGlow})`;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 8, 8, 5, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fdf4ff';
      ctx.fillRect(f.x - 2, f.y - 4, 4, 8);
      // Glow effect
      ctx.fillStyle = `rgba(74, 222, 128, ${shroomGlow * 0.3})`;
      ctx.beginPath(); ctx.arc(f.x, f.y - 6, 12, 0, Math.PI * 2); ctx.fill();
      break;

    default:
      // Generic 3-petal
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x + sway - 3, f.y - 12, 3.5, 0, Math.PI * 2);
      ctx.arc(f.x + sway + 3, f.y - 12, 3.5, 0, Math.PI * 2);
      ctx.arc(f.x + sway, f.y - 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath(); ctx.arc(f.x + sway, f.y - 12, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
  }
};

// --- Pixel sprites (trinkets, kisses, Elio): string maps rendered once to small canvases ---
type Pix = { rows: string[]; pal: Record<string, string> };

const SPRITES: Record<string, Pix> = {
  ribbon: { pal: { o: '#831843', P: '#f472b6', p: '#fbcfe8', k: '#be185d' }, rows: [
    'oo.....oo', 'oPPo.oPPo', 'oPpPoPpPo', 'oPPPkPPPo', 'oPpPoPpPo', 'oPPo.oPPo', 'oo.oPo.oo', '..oP.Po..', '..oo.oo..'] },
  button: { pal: { o: '#475569', B: '#94a3b8', L: '#e2e8f0', h: '#334155' }, rows: [
    '..oooo..', '.oBBBBo.', 'oBLBBBBo', 'oBhBBhBo', 'oBBBBBBo', 'oBhBBhBo', '.oBBBBo.', '..oooo..'] },
  shell: { pal: { o: '#b4655e', S: '#fcd5ce', s: '#f4a6a0' }, rows: [
    '...ooo...', '..oSsSo..', '.oSsSsSo.', 'oSsSsSsSo', 'oSsSsSsSo', '.oSsSsSo.', '..ooSoo..', '...oSo...', '....o....'] },
  marble: { pal: { o: '#312e81', M: '#818cf8', m: '#4f46e5', W: '#ffffff' }, rows: [
    '..ooo..', '.oMMMo.', 'oMWMMmo', 'oMMMmmo', 'oMMmmmo', '.ommmo.', '..ooo..'] },
  feather: { pal: { o: '#0369a1', F: '#38bdf8', f: '#e0f2fe' }, rows: [
    '......oo.', '.....oFFo', '....oFfFo', '...oFfFo.', '..oFfFo..', '.oFfFo...', '.oFFo....', '.ooo.....', 'o........'] },
  key: { pal: { o: '#713f12', K: '#d4a017', k: '#fde68a' }, rows: [
    '.ooo......', 'oKkKo.....', 'oK.KKKKKKo', 'oKkKooKoKo', '.ooo..o.o.'] },
  ring: { pal: { o: '#6b7280', R: '#e5e7eb', D: '#f472b6', d: '#fbcfe8' }, rows: [
    '...oo...', '..oDdo..', '...oo...', '.oRRRRo.', 'oRo..oRo', 'oRo..oRo', '.oRRRRo.', '..oooo..'] },
  acorn: { pal: { o: '#451a03', C: '#713f12', c: '#92400e', A: '#b45309', a: '#f59e0b' }, rows: [
    '...o...', '..oCo..', '.oCcCo.', 'oCCCCCo', 'oAAAAAo', 'oAaAAAo', 'oAaAAAo', '.oAAAo.', '..ooo..'] },
  pebble: { pal: { o: '#44403c', G: '#a8a29e', w: '#e7e5e4', g: '#78716c' }, rows: [
    '.oo..oo.', 'oGGooGGo', 'oGwGGGGo', 'oGGGGGgo', '.oGGGgo.', '..oGgo..', '...oo...'] },
  butterfly: { pal: { o: '#4c1d95', V: '#a78bfa', v: '#ede9fe', b: '#4c1d95' }, rows: [
    'oo.....oo', 'oVVo.oVVo', 'oVvVoVvVo', '.oVVbVVo.', '.oVvbvVo.', '..oo.oo..'] },
  star: { pal: { o: '#a16207', Y: '#fde047', w: '#ffffff' }, rows: [
    '....o....', '...oYo...', 'ooooYoooo', 'oYYYwYYYo', '.oYYYYYo.', '..oYYYo..', '.oYYoYYo.', '.oYo.oYo.', '.oo...oo.'] },
  bang: { pal: { o: '#3f2a1d', W: '#ffffff', r: '#e11d48' }, rows: [
    '.ooooo.', 'oWWrWWo', 'oWWrWWo', 'oWWrWWo', 'oWWWWWo', 'oWWrWWo', '.oooooo', '....oo.', '.....o.'] },
  kiss: { pal: { o: '#9d174d', H: '#f472b6', w: '#ffffff' }, rows: [
    '.oo...oo.', 'oHHo.oHHo', 'oHwHoHHHo', 'oHHHHHHHo', '.oHHHHHo.', '..oHHHo..', '...oHo...', '....o....'] },
};

// Elio: brown hair, round glasses, green sweater. Built from mirrored half-rows; frame 0 looks left, 1 right.
const ELIO_PAL = { o: '#2a1a10', h: '#6b3f1d', H: '#9a6233', d: '#4a2a12', s: '#f5c9a0', S: '#e3ad84', r: '#f4a5a5', g: '#2b2b2b', l: '#dbeafe', L: '#ffffff', e: '#1f2937',
  m: '#a14848', w: '#f8fafc', c: '#2f7d5b', C: '#23614a', k: '#45a879', p: '#3b4a6b', P: '#2c3752', b: '#3f2a1d', B: '#6b4a33' };
const elioRows = (look: number) => {
  const mir = (l: string) => l + [...l].reverse().join('');
  const lens = (row: number) => (row === 0 || row === 4 ? 'sggggs' : row === 1 ? 'gLlllg' : look ? 'gllelg' : 'glellg');
  const r = [
    '..........oo', '........oohH', '......oohhHH', '.....ohhhhhH', '....ohhhhhhh', '...ohhhhhhhh', '...ohhhhhhhh', '', '',
    '...ohsssssss', '', '', '', '', '', '...osrrsssss', '....oSssssms', '.....oSsssSm',
    '......oSssss', '.......ooSSS', '.........oSS', '.....oocccww', '....ockccccw', '...ockcccccc', '...ockcccccc', '...occcccccc',
    '...osCcccccc', '...ossCccccc', '....ooCCCCCC', '.....opppppp', '.....opppppP', '.....oppppPo', '.....opppPo.', '....obbBbbo.', '....obbbbbo.', '....oooooo..',
  ].map(mir);
  for (let i = 0; i < 5; i++) r[10 + i] = '...o' + lens(i) + (i === 0 ? 'sggs' : 'ssss') + lens(i) + 'o...';
  r[7] = '...ohhhhhhhhhhsssshho...';
  r[8] = '...ohhsshhhhsssssshho...';
  const set = (y: number, x: number, ch: string) => (r[y] = r[y].slice(0, x) + ch + r[y].slice(x + 1));
  set(5, 15, 'd'); set(6, 14, 'd'); set(6, 7, 'd'); set(3, 13, 'H'); set(2, 14, 'H');
  return r;
};
SPRITES.elio0 = { pal: ELIO_PAL, rows: elioRows(0) };
SPRITES.elio1 = { pal: ELIO_PAL, rows: elioRows(1) };

const pixCache: Record<string, HTMLCanvasElement> = {};
const sprite = (key: string, scale: number, recolor?: Record<string, string>) => {
  const ck = `${key}${scale}${recolor ? JSON.stringify(recolor) : ''}`;
  if (pixCache[ck]) return pixCache[ck];
  const { rows, pal } = SPRITES[key];
  const p = { ...pal, ...recolor };
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)) * scale;
  c.height = rows.length * scale;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const col = p[ch as keyof typeof p];
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  return (pixCache[ck] = c);
};
const GOLD = { o: '#a16207', H: '#facc15' };

// Small 4-point glint, the "something's here" cue on trinkets.
const glint = (ctx: CanvasRenderingContext2D, x: number, y: number, k: number) => {
  if (k <= 0) return;
  const r = Math.round(2 + k * 4);
  ctx.globalAlpha = Math.min(1, k * 1.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - r, y - 1, r * 2 + 1, 2);
  ctx.fillRect(x - 1, y - r, 2, r * 2 + 1);
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.globalAlpha = 1;
};

// Soft light disc under pickups so they read at phone zoom.
let halo: HTMLCanvasElement | null = null;
const getHalo = () => {
  if (halo) return halo;
  halo = document.createElement('canvas');
  halo.width = halo.height = 48;
  const c = halo.getContext('2d')!;
  const g = c.createRadialGradient(24, 24, 2, 24, 24, 24);
  g.addColorStop(0, 'rgba(255,255,240,0.9)');
  g.addColorStop(1, 'rgba(255,255,240,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 48, 48);
  return halo;
};

// near: Werka is close, so the item hops a little and its halo brightens.
export const drawItem = (ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, now: number, near = false) => {
  const phase = x * 0.37 + y * 0.11;
  const kiss = kind === 'kiss' || kind === 'golden_kiss';
  const hop = near ? Math.round(Math.abs(Math.sin(now / 160)) * 4) : 0;
  ctx.globalAlpha = (near ? 0.55 : 0.28) + Math.sin(now / 500 + phase) * 0.1;
  ctx.drawImage(getHalo(), Math.round(x - 24), Math.round(y - (kiss ? 46 : 34)));
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kiss) {
    const img = sprite('kiss', 2, kind === 'golden_kiss' ? GOLD : undefined);
    const bob = Math.round(Math.sin(now / 400 + phase) * 3);
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 22 - img.height / 2 + bob - hop));
    return;
  }
  const img = sprite(kind, 2);
  const top = Math.round(y - img.height - 1 - hop);
  ctx.drawImage(img, Math.round(x - img.width / 2), top);
  // glint every ~1.8s (offset per item so they don't flash together), plus a smaller twinkle half a beat later
  const t = ((now / 1800 + phase) % 1) * 4;
  glint(ctx, Math.round(x + img.width / 2 - 2), top + 1, t < 1 ? Math.sin(t * Math.PI) : 0);
  glint(ctx, Math.round(x - img.width / 2 + 1), Math.round(top + img.height / 2), t > 2 && t < 2.6 ? Math.sin((t - 2) / 0.6 * Math.PI) * 0.5 : 0);
};

// Where Elio crouches behind his cover: clipped at the cover's base, sorted just behind it.
export const elioHide = (cover: Obstacle, ex: number) => {
  const cx = cover.x + 20;
  const clipY = cover.y + (cover.type === 'TREE' ? 38 : 28);
  return { cx, side: ex >= cx ? 1 : -1, clipY, y: clipY + 22, sortY: cover.y + cover.height - 1 };
};

// Korok-style: half hidden, sliding out to peek every couple of seconds.
export const drawElioPeek = (ctx: CanvasRenderingContext2D, cover: Obstacle, ex: number, now: number) => {
  const h = elioHide(cover, ex);
  const u = Math.max(0, Math.min(1, 0.5 + Math.sin(now / 900) * 0.8));
  const x = Math.round(h.cx + h.side * (4 + u * u * (3 - 2 * u) * 22));
  const img = sprite(h.side > 0 ? 'elio1' : 'elio0', 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - img.width, h.clipY - img.height, img.width * 2, img.height);
  ctx.clip();
  ctx.drawImage(img, x - img.width / 2, h.y - img.height + 4);
  ctx.restore();
};

export const drawBang = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const img = sprite('bang', 3);
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height));
};

export const drawElio = (ctx: CanvasRenderingContext2D, x: number, y: number, now: number, time: number) => {
  const shadowOffX = (time - 0.5) * 10;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + shadowOffX, y, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const look = Math.floor(now / 1400 + x) % 3; // left, right, right: he glances around
  const img = sprite(look === 0 ? 'elio0' : 'elio1', 2);
  const bob = Math.floor(now / 500) % 2;
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 4 + bob));
};

export const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) => {
  const img = sprite('kiss', 2);
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  ctx.globalAlpha = 1;
};

let portrait = '';
export const elioPortrait = () => portrait || (portrait = sprite('elio1', 4).toDataURL());
