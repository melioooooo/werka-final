import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Player, Flower, Biome, Obstacle, WorldItem } from '../types';
import { InventoryHUD } from './InventoryHUD';
import { MobileControls, useIsTouch, useIsLandscape } from './MobileControls';
import { SoundManager } from '../utils/SoundManager';
import { makeWorld, SeededRandom, BRIDGE_WIDTH, SPAWN, isHouseScreen } from '../utils/world';
import { drawBackground, drawHouse, drawTree, drawRock, drawFlower, drawItem, drawElio, drawElioPeek, elioHide, drawBang, drawHeart, elioPortrait } from '../utils/draw';
import { newCamera, makeScene, blitCamera } from '../utils/camera';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SPEED,
  HOUSE_RECT,
  MAX_INVENTORY,
  MAX_POCKET,
  POCKET_INFO,
  RUN_MULT,
  HOUSE_SCREEN,
  PLAYER_SPRITES,
  SPRITE_SIZE,
  SPRITE_SCALE,
  SPRITE_COUNTS,
  ANIMATION_SPEED,
  DAY_CYCLE_DURATION
} from '../constants';

interface GameEngineProps {
  onEnterHouse: (inventory: Flower[]) => void;
  onInventoryChange: (inventory: Flower[]) => void;
  initialInventory: Flower[];
  dateSeed: string;
  pocket: string[];
  onPocketChange: (pocket: string[]) => void;
  kisses: number;
  onKiss: (n: number) => void;
  elioGifted: boolean;
  onElioGift: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'LEAF' | 'SPORE' | 'FIREFLY' | 'RIPPLE' | 'SMOKE' | 'WIND' | 'BIRD' | 'DUST' | 'SPEED' | 'HEART';
  color: string;
  size: number;
}

interface Talk { lines: string[]; i: number; n: number; gift: boolean; top: boolean }
type RenderEntry = { y: number; k: number; o: any };

const SAVE_KEY = 'werka-bouquet-save-v1';
const PICK_RADIUS = 35;
const ELIO_RADIUS = 50;
const ELIO_LINES = [
  "I was hiding behind this tree all morning.",
  "Werka! I knew you'd come this way.",
  "Shh, don't tell the flowers I'm here.",
  "I counted the clouds while I waited. Eleven!",
  "You always find me. How do you do that?",
  "I picked this spot because it smelled like you.",
  "I've been practicing my hiding. Clearly not enough.",
  "Every path today led me to you.",
];

const byY = (a: RenderEntry, b: RenderEntry) => a.y - b.y;
const near = (px: number, py: number, x: number, y: number, r: number) => (px - x) * (px - x) + (py - y) * (py - y) < r * r;

// Vignette with edge alpha 1; drawn with globalAlpha so the night strength needs no new gradient each frame.
let vignette: HTMLCanvasElement | null = null;
const getVignette = () => {
  if (vignette) return vignette;
  vignette = document.createElement('canvas');
  vignette.width = CANVAS_WIDTH;
  vignette.height = CANVAS_HEIGHT;
  const v = vignette.getContext('2d')!;
  const g = v.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 3, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  v.fillStyle = g;
  v.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  return vignette;
};

// Cloud shadow shape (three overlapping circles), blitted at 15% alpha.
let cloud: HTMLCanvasElement | null = null;
const getCloud = () => {
  if (cloud) return cloud;
  cloud = document.createElement('canvas');
  cloud.width = 200;
  cloud.height = 150;
  const c = cloud.getContext('2d')!;
  c.beginPath();
  c.arc(90, 60, 60, 0, Math.PI * 2);
  c.arc(130, 80, 70, 0, Math.PI * 2);
  c.arc(50, 80, 50, 0, Math.PI * 2);
  c.fill();
  return cloud;
};

const loadPicked = (dateSeed: string) => {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (data?.dateSeed === dateSeed && Array.isArray(data.picked)) return new Set<string>(data.picked);
  } catch (e) {
    console.error("Failed to load save", e);
  }
  return new Set<string>();
};

export const GameEngine: React.FC<GameEngineProps> = ({ onEnterHouse, onInventoryChange, initialInventory, dateSeed, pocket, onPocketChange, kisses, onKiss, elioGifted, onElioGift }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const touch = useIsTouch();
  const landscape = useIsLandscape();
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const world = useMemo(() => makeWorld(dateSeed), [dateSeed]);
  const [picked] = useState(() => loadPicked(dateSeed));
  const [flowers, setFlowers] = useState<Flower[]>(() => world.flowers.map(f => (picked.has(f.id) ? { ...f, isPicked: true } : f)));
  const [items, setItems] = useState<WorldItem[]>(() => world.items.map(t => (picked.has(t.id) ? { ...t, isPicked: true } : t)));
  const [inventory, setInventory] = useState<Flower[]>(initialInventory);
  // Always spawn at the house
  const [currentScreen, setCurrentScreen] = useState(HOUSE_SCREEN);
  const [notification, setNotification] = useState<string | null>(null);
  const [timeLabel, setTimeLabel] = useState("DAY");
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [talk, setTalk] = useState<Talk | null>(null);
  const [showHelp, setShowHelp] = useState(true);

  // Sprite Logic
  const spriteImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  // Refs (the loop reads these, React state only drives the overlays)
  const playerRef = useRef<Player>({ x: SPAWN.x, y: SPAWN.y, direction: 'DOWN', isMoving: false, inventory: initialInventory });
  const runningRef = useRef(false);
  const screenRef = useRef(currentScreen);
  const obstaclesRef = useRef<Obstacle[]>(world.obstacles[HOUSE_SCREEN.y][HOUSE_SCREEN.x]);
  const timeRef = useRef(0.35); // 0.0 to 1.0 representing 24h cycle, start at mid-morning (day)
  const particlesRef = useRef<Particle[]>([]);
  const lastStepTime = useRef(0);
  const lastDust = useRef(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const enteringRef = useRef(false);
  const promptRef = useRef<string | null>(null);
  const talkRef = useRef<Talk | null>(null);
  const pocketRef = useRef(pocket);
  pocketRef.current = pocket;
  const noteTimer = useRef<number>();
  const renderPool = useRef<RenderEntry[]>([]);
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef(newCamera());
  // 0 = hiding behind his cover, otherwise the time he popped out (1 = long ago)
  const elioPopRef = useRef(elioGifted || !world.elio.cover ? 1 : 0);
  const renderList = useRef<RenderEntry[]>([]);
  const latest = useRef<{ update: (dt: number) => void; draw: () => void; advance: () => void }>({ update: () => {}, draw: () => {}, advance: () => {} });

  const screenFlowers = useMemo(() => flowers.filter(f => !f.isPicked && f.screenX === currentScreen.x && f.screenY === currentScreen.y), [flowers, currentScreen]);
  const screenItems = useMemo(() => items.filter(t => !t.isPicked && t.screenX === currentScreen.x && t.screenY === currentScreen.y), [items, currentScreen]);
  const elioHere = world.elio.screenX === currentScreen.x && world.elio.screenY === currentScreen.y;

  // One timer for notifications so an older one can't clear a newer message
  const flash = (msg: string, ms: number) => {
    setNotification(msg);
    clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNotification(null), ms);
  };

  useEffect(() => {
    SoundManager.getInstance().playBGM();
    const t = setTimeout(() => setShowHelp(false), 7000);
    return () => clearTimeout(t);
  }, []);

  // Auto-Save: picked flower ids plus 't:'/'k:' item ids. Inventory and pocket are owned by App.
  useEffect(() => {
    const saveGame = () => {
      const data = {
        picked: [...flowers.filter(f => f.isPicked).map(f => f.id), ...items.filter(t => t.isPicked).map(t => t.id)],
        dateSeed
      };
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { console.error("Save failed", e); }
    };
    saveGame();
    window.addEventListener('beforeunload', saveGame);
    return () => window.removeEventListener('beforeunload', saveGame);
  }, [flowers, items, dateSeed]);

  useEffect(() => {
    screenRef.current = currentScreen;
    obstaclesRef.current = world.obstacles[currentScreen.y][currentScreen.x];
  }, [currentScreen, world]);

  // Load Sprites
  useEffect(() => {
    Object.entries(PLAYER_SPRITES).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      img.onload = () => { spriteImagesRef.current[key] = img; };
      img.onerror = () => console.error(`Failed to load sprite: ${url}`);
    });
  }, []);

  // Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (talkRef.current && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (!e.repeat) latest.current.advance();
        return;
      }
      keysPressed.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    const clearKeys = () => keysPressed.current.clear(); // keyup never fires after alt-tab
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', clearKeys);
    };
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const t = timeRef.current;
      if (t < 0.2 || t > 0.85) setTimeLabel("NIGHT");
      else if (t < 0.3) setTimeLabel("DAWN");
      else if (t < 0.7) setTimeLabel("DAY");
      else setTimeLabel("DUSK");
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Typewriter
  useEffect(() => {
    if (!talk || talk.n >= talk.lines[talk.i].length) return;
    const t = setTimeout(() => {
      const cur = talkRef.current;
      if (cur) setTalk(talkRef.current = { ...cur, n: cur.n + 1 });
    }, 28);
    return () => clearTimeout(t);
  }, [talk]);

  // Dev-only hook for headless tests: teleport around and inspect the day.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__werka = {
      world,
      teleport: (sx: number, sy: number, x: number, y: number) => {
        playerRef.current = { ...playerRef.current, x, y };
        camRef.current.snap = true;
        setCurrentScreen({ x: sx, y: sy });
      },
      player: () => ({ ...playerRef.current, screen: screenRef.current, running: runningRef.current }),
      setTime: (t: number) => { timeRef.current = t; },
    };
  }, [world]);

  // Game Loop: runs once; always calls the latest update/draw (fresh state closures)
  useEffect(() => { latest.current = { update, draw, advance }; });

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      timeRef.current = (timeRef.current + dt / DAY_CYCLE_DURATION) % 1.0;
      latest.current.update(dt);
      latest.current.draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const setPrompt = (p: string | null) => {
    if (promptRef.current === p) return;
    promptRef.current = p;
    setInteractionPrompt(p);
  };

  const spawn = (p: Particle) => particlesRef.current.push(p);

  const update = (dt: number) => {
    const isNight = timeRef.current > 0.8 || timeRef.current < 0.2;
    const now = Date.now();

    // --- PARTICLE SPAWNING ---
    if (Math.random() < 0.1) {
      let type: 'WIND' | 'LEAF' | 'SPORE' | 'FIREFLY' | 'BIRD';
      const rand = Math.random();

      if (rand > 0.995) type = 'BIRD'; // Rare
      else if (rand > 0.8) type = 'WIND';
      else if (rand > 0.6) type = 'LEAF';
      else if (rand > 0.4) type = 'SPORE';
      else type = 'FIREFLY';

      if (type === 'WIND') {
        const windSpeed = 3 + Math.random() * 4;
        spawn({
          x: -50, y: Math.random() * CANVAS_HEIGHT,
          vx: windSpeed, vy: (Math.random() - 0.5) * 0.5,
          life: 0, maxLife: CANVAS_WIDTH / windSpeed + 20,
          type: 'WIND', color: 'rgba(255, 255, 255, 0.15)', size: Math.random() * 20 + 10
        });
      } else if (type === 'BIRD') {
        const isRight = Math.random() > 0.5;
        spawn({
          x: isRight ? -20 : CANVAS_WIDTH + 20, y: Math.random() * (CANVAS_HEIGHT / 2),
          vx: isRight ? (2 + Math.random()) : -(2 + Math.random()), vy: (Math.random() - 0.5) * 0.5,
          life: 0, maxLife: 400, type: 'BIRD', color: '#000', size: 3
        });
      } else if (isNight || type !== 'SPORE') { // Only spawn spores during day
        spawn({
          x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          life: 0, maxLife: 150, type,
          color: type === 'FIREFLY' ? '#facc15' : (type === 'LEAF' ? '#a16207' : '#f0fdf4'),
          size: Math.random() * 3 + 1
        });
      }
    }

    if (Math.random() < 0.1) {
      const biome = world.map[screenRef.current.y]?.[screenRef.current.x];

      if (biome === Biome.RIVER && Math.random() > 0.5) {
        spawn({
          x: Math.random() * CANVAS_WIDTH,
          y: world.riverY(screenRef.current.x * CANVAS_WIDTH + Math.random() * CANVAS_WIDTH) + (Math.random() - 0.5) * 20,
          vx: 0.2, vy: 0, life: 0, maxLife: 60, type: 'RIPPLE', color: '#ffffff', size: 1
        });
      }

      // Chimney Smoke
      if (isHouseScreen(screenRef.current.x, screenRef.current.y)) {
        spawn({
          x: HOUSE_RECT.x + HOUSE_RECT.width - 30, y: HOUSE_RECT.y - 20,
          vx: 0.2 + Math.random() * 0.2, vy: -0.5 - Math.random() * 0.5,
          life: 0, maxLife: 200, type: 'SMOKE', color: '#ffffff', size: 2 + Math.random() * 4
        });
      }

      // Ambient
      const type = isNight ? 'FIREFLY' : (biome === Biome.FOREST ? 'LEAF' : 'SPORE');
      if (isNight || type !== 'SPORE') {
        spawn({
          x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          life: 0, maxLife: 150, type,
          color: type === 'FIREFLY' ? '#facc15' : (type === 'LEAF' ? '#a16207' : '#f0fdf4'),
          size: Math.random() * 3 + 1
        });
      }
    }

    // Update in place and compact (no new array per frame)
    const ps = particlesRef.current;
    const wob = Math.sin(now / 200);
    const wobC = Math.cos(now / 200);
    let alive = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.type === 'SMOKE') { p.size += 0.05; p.x += Math.sin(p.life / 20) * 0.5; }
      else if (p.type === 'FIREFLY') { p.x += wob * 0.5; p.y += wobC * 0.5; }
      else if (p.type === 'HEART') { p.vy += 0.02; p.vx *= 0.98; }
      else if (p.type === 'DUST') { p.size += 0.15; }
      else if (p.type === 'BIRD') {
        p.y += wob * 0.2;
        // Interactive: Scatter if player is close
        const dx = p.x - playerRef.current.x;
        const dy = p.y - playerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.vx += dx / dist * 0.5;
          p.vy += dy / dist * 0.5;
        }
      }
      if (p.life < p.maxLife) ps[alive++] = p;
    }
    ps.length = alive;

    const player = playerRef.current;
    const keys = keysPressed.current;

    if (talkRef.current) {
      keys.delete('Space');
      keys.delete('KeyE');
      player.isMoving = false;
      runningRef.current = false;
      setPrompt(null);
      return;
    }

    // Movement Logic using Ref for immediate updates (fixes flicker/lag)
    let { x, y, direction, isMoving } = player;
    let dx = 0, dy = 0;
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Run');
    const speed = PLAYER_SPEED * (running ? RUN_MULT : 1) * Math.min(dt, 50) / 16.67; // same speed on any refresh rate

    if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= speed;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dy += speed;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= speed;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += speed;

    if (dx !== 0 || dy !== 0) {
      isMoving = true;
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * speed;
        dy = (dy / length) * speed;
      }

      if (dy < 0) direction = 'UP';
      if (dy > 0) direction = 'DOWN';
      if (dx < 0) direction = 'LEFT';
      if (dx > 0) direction = 'RIGHT';

      let nextX = x + dx;
      let nextY = y + dy;

      let nsx = screenRef.current.x, nsy = screenRef.current.y;
      let screenChanged = false;

      if (nextX < 0) {
        if (nsx > 0) { nsx--; nextX = CANVAS_WIDTH - 20; screenChanged = true; } else nextX = 0;
      } else if (nextX > CANVAS_WIDTH) {
        if (nsx < 2) { nsx++; nextX = 20; screenChanged = true; } else nextX = CANVAS_WIDTH;
      }
      if (nextY < 0) {
        if (nsy > 0) { nsy--; nextY = CANVAS_HEIGHT - 20; screenChanged = true; } else nextY = 0;
      } else if (nextY > CANVAS_HEIGHT) {
        if (nsy < 2) { nsy++; nextY = 20; screenChanged = true; } else nextY = CANVAS_HEIGHT;
      }

      let blocked = false;
      // Obstacles
      for (const obs of obstaclesRef.current) {
        if (nextX > obs.x - 8 && nextX < obs.x + obs.width + 8 &&
          nextY > obs.y - 8 && nextY < obs.y + obs.height + 8) {
          if (obs.type === 'HOUSE') {
            // Check Door
            if (nextX > HOUSE_RECT.doorX && nextX < HOUSE_RECT.doorX + HOUSE_RECT.doorWidth &&
              nextY >= HOUSE_RECT.doorY - 15) {
              if (!enteringRef.current) { enteringRef.current = true; onEnterHouse(player.inventory); }
              return; // Stop update
            }
          }
          blocked = true; break;
        }
      }

      // River Collision with Continuity
      if (!screenChanged && !blocked && world.map[nsy]?.[nsx] === Biome.RIVER) {
        const riverDist = Math.abs(nextY - world.riverY(nsx * CANVAS_WIDTH + nextX));
        const onBridge = Math.abs(nextX - world.bridgeX(nsx, nsy)) < BRIDGE_WIDTH / 2;
        if (!onBridge && riverDist < 35) {
          // If already stuck (current pos in river), allow moving OUT (increasing distance)
          const currentDist = Math.abs(y - world.riverY(screenRef.current.x * CANVAS_WIDTH + x));
          blocked = !(currentDist < 35 && riverDist > currentDist);
        }
      }

      if (!blocked) {
        x = nextX; y = nextY;
        if (screenChanged) {
          screenRef.current = { x: nsx, y: nsy };
          camRef.current.snap = true;
          obstaclesRef.current = world.obstacles[nsy][nsx];
          setCurrentScreen(screenRef.current);
        }
      }
    } else {
      isMoving = false;
    }

    player.x = x; player.y = y; player.direction = direction; player.isMoving = isMoving;
    runningRef.current = running && isMoving;

    // Footsteps, and dust + speed streaks while running
    if (isMoving && now - lastStepTime.current > (running ? 190 : 300)) {
      SoundManager.getInstance().playSFX('STEP');
      lastStepTime.current = now;
    }
    if (runningRef.current && now - lastDust.current > 70) {
      lastDust.current = now;
      const mx = dx / speed, my = dy / speed;
      spawn({ x: x - mx * 8 + (Math.random() - 0.5) * 8, y: y - 2, vx: -mx * 0.4, vy: -0.25, life: 0, maxLife: 24, type: 'DUST', color: '#f5f5f4', size: 4 });
      spawn({ x: x - mx * 18 + (Math.random() - 0.5) * 20, y: y - 20 - my * 18 + (Math.random() - 0.5) * 30, vx: -mx * 1.5, vy: -my * 1.5, life: 0, maxLife: 10, type: 'SPEED', color: 'rgba(255,255,255,0.55)', size: 10 });
    }

    // Interactions (Space or KeyE)
    let prompt: string | null = null;
    const isInteracting = keys.has('Space') || keys.has('KeyE');
    const consume = () => { keys.delete('Space'); keys.delete('KeyE'); };

    // 1. House Entrance
    if (isHouseScreen(screenRef.current.x, screenRef.current.y) &&
      near(x, y, HOUSE_RECT.doorX + HOUSE_RECT.doorWidth / 2, HOUSE_RECT.doorY, 50)) {
      prompt = "Press E to Enter";
      if (isInteracting) {
        if (enteringRef.current) return;
        enteringRef.current = true;
        SoundManager.getInstance().playSFX('ENTER');
        onEnterHouse(player.inventory);
        consume();
        return; // Exit game loop since we are changing scenes
      }
    }

    // 2. Elio: pops out of hiding when Werka comes close
    if (elioHere && elioPopRef.current === 0 && near(x, y, world.elio.x, world.elio.y, 120)) {
      elioPopRef.current = now;
      SoundManager.getInstance().playSFX('PICK');
    }
    if (!prompt && elioHere && near(x, y, world.elio.x, world.elio.y, ELIO_RADIUS)) {
      prompt = "Press E to Talk to Elio";
      if (isInteracting) { consume(); startTalk(); }
    }

    // 3. Trinkets and kisses
    if (!prompt) {
      const item = screenItems.find(t => near(x, y, t.x, t.y, PICK_RADIUS));
      if (item) {
        prompt = `Press E to Pick up ${POCKET_INFO[item.kind].name}`;
        if (isInteracting) { consume(); pickItem(item); }
      }
    }

    // 4. Flowers
    if (!prompt) {
      const flower = screenFlowers.find(f => near(x, y, f.x, f.y, PICK_RADIUS));
      if (flower) {
        prompt = `Press E to Pick ${flower.type}`;
        if (isInteracting) { consume(); pickFlower(flower); }
      }
    }

    setPrompt(prompt);
  };

  const pickFlower = (candidate: Flower) => {
    if (playerRef.current.inventory.length >= MAX_INVENTORY) {
      flash("Basket full!", 2000);
      return;
    }
    setFlowers(prev => prev.map(f => (f.id === candidate.id ? { ...f, isPicked: true } : f)));
    const newInventory = [...playerRef.current.inventory, candidate];
    playerRef.current.inventory = newInventory; // Sync ref immediately to prevent loop overwrite
    setInventory(newInventory);
    onInventoryChange(newInventory);
    SoundManager.getInstance().playSFX('PICK');
    flash(`Picked ${candidate.type}`, 1000);
  };

  const pickItem = (item: WorldItem) => {
    const cur = pocketRef.current;
    if (cur.filter(k => k !== 'golden_kiss').length >= MAX_POCKET) {
      flash("Pocket full! Use some in a bouquet.", 2000);
      return;
    }
    setItems(prev => prev.map(t => (t.id === item.id ? { ...t, isPicked: true } : t)));
    pocketRef.current = [...cur, item.kind];
    onPocketChange(pocketRef.current);
    const info = POCKET_INFO[item.kind];
    if (item.kind === 'kiss') {
      onKiss(1);
      SoundManager.getInstance().playSFX('CHIME');
      burst(item.x, item.y - 20, 6);
      flash(`${info.emoji} ${info.name}! (${kisses + 1} total)`, 1600);
    } else {
      SoundManager.getInstance().playSFX('PICK');
      flash(`${info.emoji} Found ${info.name}`, 1400);
    }
  };

  const burst = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 1.5 + Math.random() * 2;
      spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, maxLife: 60 + Math.random() * 30, type: 'HEART', color: '', size: 1 });
    }
  };

  const startTalk = () => {
    const line = new SeededRandom(`${dateSeed}-elio`).choice(ELIO_LINES);
    const t: Talk = elioGifted
      ? { lines: ["See you tomorrow, somewhere else!"], i: 0, n: 0, gift: false, top: false }
      : { lines: ["Ahah! You found me!", line, "Here, this is for you."], i: 0, n: 0, gift: true, top: false };
    const cam = camRef.current; // keep the two of them visible: box goes on the other half of the view
    t.top = touch ? playerRef.current.y - cam.y > cam.vh / 2 : world.elio.y > CANVAS_HEIGHT / 2;
    talkRef.current = t;
    setTalk(t);
    const pl = playerRef.current, ex = world.elio.x - pl.x, ey = world.elio.y - pl.y;
    pl.direction = Math.abs(ex) > Math.abs(ey) ? (ex < 0 ? 'LEFT' : 'RIGHT') : (ey < 0 ? 'UP' : 'DOWN'); // face him
  };

  // Tap/E/Space: finish the line, then go to the next one, then close.
  const advance = () => {
    const t = talkRef.current;
    if (!t) return;
    const len = t.lines[t.i].length;
    let next: Talk | null;
    if (t.n < len) next = { ...t, n: len };
    else if (t.i < t.lines.length - 1) next = { ...t, i: t.i + 1, n: 0 };
    else next = null;
    talkRef.current = next;
    setTalk(next);
    if (!next && t.gift) {
      pocketRef.current = [...pocketRef.current, 'golden_kiss'];
      onPocketChange(pocketRef.current);
      onKiss(3);
      onElioGift();
      SoundManager.getInstance().playSFX('CHIME');
      SoundManager.getInstance().playSFX('CRAFT');
      burst(world.elio.x, world.elio.y - 50, 18);
      flash("💖 Elio's Golden Kiss! +3 kisses", 2600);
    }
  };

  // --- BACKGROUND BUFFERING ---
  useEffect(() => {
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement('canvas');
      backgroundCanvasRef.current.width = CANVAS_WIDTH;
      backgroundCanvasRef.current.height = CANVAS_HEIGHT;
    }
    const bgCtx = backgroundCanvasRef.current.getContext('2d');
    if (!bgCtx) return;
    const { x, y } = currentScreen;
    drawBackground(bgCtx, world.map[y]?.[x] || Biome.GRASS, dateSeed, x, y, isHouseScreen(x, y), world.riverY, world.bridgeX);
  }, [currentScreen, dateSeed, world]);

  // --- DRAWING ---
  let overlayKey = -1;
  let overlayStyle = '';

  const draw = () => {
    if (!ctxRef.current) ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
    const view = ctxRef.current;
    if (!view) return;
    // touch: draw offscreen, then blit a zoomed crop; desktop: draw straight to the canvas
    if (touch && !sceneRef.current) sceneRef.current = makeScene();
    const ctx = touch ? sceneRef.current!.getContext('2d')! : view;
    if (!touch && view.canvas.width !== CANVAS_WIDTH) { view.canvas.width = CANVAS_WIDTH; view.canvas.height = CANVAS_HEIGHT; }
    const now = Date.now();
    const time = timeRef.current;
    const player = playerRef.current;

    if (backgroundCanvasRef.current) ctx.drawImage(backgroundCanvasRef.current, 0, 0);

    // Depth-sorted scene, entries reused from a pool
    const pool = renderPool.current;
    const list = renderList.current;
    list.length = 0;
    const add = (y: number, k: number, o: any) => {
      const e = pool[list.length] ?? (pool[list.length] = { y: 0, k: 0, o: null });
      e.y = y; e.k = k; e.o = o;
      list.push(e);
    };
    for (const o of obstaclesRef.current) add(o.y + o.height, 0, o);
    for (const f of screenFlowers) add(f.y, 1, f);
    for (const t of screenItems) add(t.y, 2, t);
    if (elioHere) add(elioPopRef.current === 0 ? elioHide(world.elio.cover!, world.elio.x).sortY : world.elio.y, 3, world.elio);
    add(player.y, 4, player);
    list.sort(byY);

    for (const e of list) {
      if (e.k === 0) {
        const obs = e.o as Obstacle;
        if (obs.type === 'HOUSE') drawHouse(ctx, time);
        else if (obs.type === 'TREE') drawTree(ctx, obs.x, obs.y, now, time);
        else if (obs.type === 'ROCK') drawRock(ctx, obs.x, obs.y, time);
      } else if (e.k === 1) drawFlower(ctx, e.o, now, time);
      else if (e.k === 2) drawItem(ctx, e.o.kind, e.o.x, e.o.y, now, near(player.x, player.y, e.o.x, e.o.y, 90));
      else if (e.k === 3) drawElioNow(ctx, now, time);
      else drawPlayer(ctx, player, now);
    }

    drawParticles(ctx, now);
    drawClouds(ctx, now);
    drawDayNightCycle(ctx);
    if (touch) blitCamera(view, sceneRef.current!, camRef.current, player.x, player.y - 30, now);
  };

  const drawElioNow = (ctx: CanvasRenderingContext2D, now: number, time: number) => {
    const el = world.elio, pop = elioPopRef.current;
    if (pop === 0) return drawElioPeek(ctx, el.cover!, el.x, now);
    let x = el.x, y = el.y;
    const u = (now - pop) / 450;
    if (u < 1 && el.cover) {
      // hop out from behind the cover
      const h = elioHide(el.cover, el.x);
      const sx = h.cx + h.side * 26;
      x = sx + (el.x - sx) * u;
      y = h.y + (el.y - h.y) * u - Math.sin(u * Math.PI) * 26;
    }
    drawElio(ctx, x, y, now, time);
    if (now - pop < 2000) drawBang(ctx, x + 14, y - 74 - Math.round(Math.abs(Math.sin((now - pop) / 120)) * 3));
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, now: number) => {
    if (isNaN(p.x) || isNaN(p.y)) return; // Safety check

    // Always draw a shadow/base so the player is never fully invisible
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const { direction, isMoving } = p;
    const img = spriteImagesRef.current[direction];

    if (!img || !img.complete || img.naturalWidth === 0) {
      // Fallback if sprites not loaded OR specific sprite missing OR broken
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Frame grid from the actual image size (small images count as a single frame)
    const imgCols = Math.floor(img.width / SPRITE_SIZE) || 1;
    const imgRows = Math.floor(img.height / SPRITE_SIZE) || 1;
    const configFrameCount = SPRITE_COUNTS[direction as keyof typeof SPRITE_COUNTS] || 4;
    const effectiveFrameCount = Math.min(configFrameCount, imgCols * imgRows);

    const running = runningRef.current;
    const frameIndex = isMoving
      ? Math.floor(now / (running ? ANIMATION_SPEED / RUN_MULT : ANIMATION_SPEED)) % effectiveFrameCount
      : 0; // Idle frame

    const sx = (frameIndex % imgCols) * SPRITE_SIZE;
    const sy = Math.floor(frameIndex / imgCols) * SPRITE_SIZE;

    const drawWidth = SPRITE_SIZE * SPRITE_SCALE;
    const drawHeight = SPRITE_SIZE * SPRITE_SCALE;
    const bob = running ? Math.round(Math.abs(Math.sin(now / 70)) * 3) : 0;
    const drawX = Math.floor(p.x - drawWidth / 2);
    const drawY = Math.floor(p.y - drawHeight + 15) - bob; // Anchor at feet

    ctx.save();
    // side.png faces RIGHT
    if (direction === 'LEFT') {
      ctx.translate(p.x, p.y);
      ctx.scale(-1, 1);
      ctx.translate(-p.x, -p.y);
    }
    const srcWidth = Math.min(SPRITE_SIZE, img.width - sx);
    const srcHeight = Math.min(SPRITE_SIZE, img.height - sy);
    ctx.drawImage(img, sx, sy, srcWidth, srcHeight, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, now: number) => {
    const wingY = Math.sin(now / 100) * 2;
    for (const p of particlesRef.current) {
      if (p.type === 'WIND' || p.type === 'SPEED') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.type === 'SPEED' ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        if (p.type === 'WIND') ctx.lineTo(p.x + p.size, p.y + p.vy * 5);
        else ctx.lineTo(p.x + p.vx * 5, p.y + p.vy * 5);
        ctx.stroke();
        continue;
      }

      if (p.type === 'BIRD') {
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 3, p.y - 2 + wingY);
        ctx.lineTo(p.x + 3, p.y - 2 + wingY);
        ctx.fill();
        continue;
      }

      if (p.type === 'HEART') {
        drawHeart(ctx, p.x, p.y, 1 - p.life / p.maxLife);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife < 0.2 ? p.life / p.maxLife : 0.8 - (p.life / p.maxLife) * 0.8;

      if (p.type === 'FIREFLY') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'SMOKE') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'RIPPLE') {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.life / 5, p.life / 10, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'DUST') {
        ctx.globalAlpha = 0.8 * (1 - p.life / p.maxLife);
        const s = Math.round(p.size);
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
    }
  };

  const drawClouds = (ctx: CanvasRenderingContext2D, now: number) => {
    const t = now / 20000; // Slow drift
    const img = getCloud();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 5; i++) {
      const x = ((t * (50 + i * 20)) + i * 200) % (CANVAS_WIDTH + 400) - 200;
      const y = (i * 150 + Math.sin(t) * 50) % CANVAS_HEIGHT;
      ctx.drawImage(img, x - 90, y - 60);
    }
    ctx.globalAlpha = 1;
  };

  const drawDayNightCycle = (ctx: CanvasRenderingContext2D) => {
    const t = timeRef.current;
    let r = 0, g = 0, b = 0, a = 0;

    if (t < 0.2) {
      r = 15; g = 23; b = 42; a = 0.7;
    } else if (t < 0.25) {
      const progress = (t - 0.2) / 0.05;
      r = 15 + (253 - 15) * progress;
      g = 23 + (186 - 23) * progress;
      b = 42 + (116 - 42) * progress;
      a = 0.7 - 0.4 * progress;
    } else if (t < 0.35) {
      const progress = (t - 0.25) / 0.1;
      r = 253; g = 186; b = 116;
      a = 0.3 - 0.3 * progress;
    } else if (t < 0.7) {
      a = 0;
    } else if (t < 0.85) {
      const progress = (t - 0.7) / 0.15;
      r = 253; g = 160; b = 80;
      a = 0.0 + 0.5 * progress;
    } else {
      const progress = (t - 0.85) / 0.15;
      r = 253 + (15 - 253) * progress;
      g = 160 + (23 - 160) * progress;
      b = 80 + (42 - 80) * progress;
      a = 0.5 + 0.2 * progress;
    }

    if (a > 0) {
      // only build a new colour string when the tint actually changes
      const key = ((Math.floor(r) * 256 + Math.floor(g)) * 256 + Math.floor(b)) * 1000 + Math.round(a * 1000);
      if (key !== overlayKey) { overlayKey = key; overlayStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${Math.round(a * 1000) / 1000})`; }
      ctx.fillStyle = overlayStyle;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Vignette, stronger at night
    ctx.globalAlpha = 0.3 + a * 0.5;
    ctx.drawImage(getVignette(), 0, 0);
    ctx.globalAlpha = 1;
  };

  const handleActionButton = () => {
    if (talkRef.current) { advance(); return; }
    keysPressed.current.add('KeyE');
    // Clear after a short delay to ensure the game loop catches it
    setTimeout(() => keysPressed.current.delete('KeyE'), 250);
  };

  const hud = (layout: 'desktop' | 'strip' | 'side') =>
    <InventoryHUD inventory={inventory} pocket={pocket} kisses={kisses} timeLabel={timeLabel} layout={layout} />;
  const promptText = interactionPrompt && touch ? interactionPrompt.replace('Press E to ', '') : interactionPrompt;
  const line = talk ? talk.lines[talk.i] : '';

  return (
    <div className="flex flex-col h-full w-full bg-stone-900 overflow-hidden relative">
      {/* GAME SCREEN AREA - Top section */}
      <div className={`flex-1 flex items-center justify-center min-h-0 ${touch ? 'p-0.5' : 'p-1 sm:p-2'}`}>
        <div
          className={`game-container relative bg-black rounded-lg overflow-hidden border-4 border-stone-700 shadow-2xl ${touch ? 'w-full h-full' : 'max-w-full max-h-full'}`}
          style={touch ? undefined : { aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block w-full h-full"
          />

          {!touch && hud('desktop')}

          {showHelp && !talk && !notification && !(touch && !landscape) && (
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[94%] text-center bg-black/70 text-amber-100 px-3 py-1 rounded font-mono text-sm sm:text-lg leading-tight pointer-events-none z-20">
              {touch ? 'Drag to walk · push the stick all the way to run' : 'WASD to walk · hold Shift to run · E to pick up'}
            </div>
          )}

          {promptText && !talk && !touch && (
            <div className={`absolute left-1/2 transform -translate-x-1/2 ${touch ? 'top-3' : 'top-1/2 -translate-y-16'} bg-black/80 text-white px-3 sm:px-4 py-2 rounded border border-white/30 pixel-text text-[11px] sm:text-sm whitespace-nowrap animate-pulse pointer-events-none z-20`}>
              {promptText}
            </div>
          )}

          {notification && (
            <div className={`absolute ${touch && !landscape ? 'top-16' : 'bottom-4 sm:bottom-8'} left-1/2 transform -translate-x-1/2 bg-white/90 text-black px-4 sm:px-6 py-1 sm:py-2 rounded-full font-bold border-2 border-yellow-500 shadow-lg z-50 whitespace-nowrap text-lg`}>
              {notification}
            </div>
          )}

          {talk && (
            <div
              className={`absolute inset-x-2 sm:inset-x-6 ${talk.top ? 'top-2 sm:top-6' : 'bottom-2 sm:bottom-6'} z-40 flex gap-3 items-start bg-stone-950/90 border-4 border-amber-200/80 rounded-lg p-2 sm:p-4 cursor-pointer select-none touch-none`}
              onPointerDown={(e) => { e.preventDefault(); advance(); }}
              role="dialog"
              aria-label="Elio"
            >
              <img src={elioPortrait()} alt="" className="w-12 h-12 sm:w-20 sm:h-20 rounded bg-sky-200 border-2 border-amber-200/60 object-cover object-top flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
              <div className="flex-1 min-w-0">
                <div className="pixel-text text-[10px] sm:text-xs text-amber-300 mb-1">ELIO</div>
                <p className="text-white text-xl sm:text-3xl leading-tight min-h-[2.5em]">{line.slice(0, talk.n)}</p>
              </div>
              <span className={`self-end text-amber-200 text-lg ${talk.n >= line.length ? 'animate-bounce' : 'opacity-0'}`}>▼</span>
            </div>
          )}
        </div>
      </div>

      {touch && !landscape && <div className="flex-shrink-0">{hud('strip')}</div>}
      {touch && landscape && hud('side')}

      {touch && <MobileControls keys={keysPressed} prompt={talk ? 'Press E to Next' : interactionPrompt} onAction={handleActionButton} />}
    </div>
  );
};
