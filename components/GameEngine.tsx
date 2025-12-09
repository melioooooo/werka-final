import React, { useRef, useEffect, useState } from 'react';
import { Player, Flower, FlowerType, Biome, Obstacle, Season } from '../types';
import { InventoryHUD } from './InventoryHUD';
import { SoundManager } from '../utils/SoundManager';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SPEED,
  FLOWER_COLORS,
  HOUSE_RECT,
  MAX_INVENTORY,
  BIOME_BG_COLORS,
  HOUSE_SCREEN,
  PLAYER_SPRITE_URL,
  PLAYER_SPRITES,
  SPRITE_SIZE,
  SPRITE_SCALE,
  SPRITE_COUNTS,
  SPRITE_COLS,
  ANIMATION_SPEED,
  SEASON_DURATION,
  SEASON_COLORS,
  SEASON_FLOWERS,
  DAY_CYCLE_DURATION
} from '../constants';

interface GameEngineProps {
  onEnterHouse: (inventory: Flower[]) => void;
  onInventoryChange: (inventory: Flower[]) => void;
  initialInventory: Flower[];
  dateSeed: string; // Format: YYYY-MM-DD
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'LEAF' | 'SPORE' | 'FIREFLY' | 'RIPPLE' | 'SMOKE' | 'WIND' | 'BIRD';
  color: string;
  size: number;
}

// Simple seeded random generator (LCG)
class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    let h = 0xdeadbeef;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
    }
    h = (h ^ h >>> 16) >>> 0;
    this.seed = h;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

export const GameEngine: React.FC<GameEngineProps> = ({ onEnterHouse, onInventoryChange, initialInventory, dateSeed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game State
  const [player, setPlayer] = useState<Player>({
    x: CANVAS_WIDTH / 2,
    y: 300,
    direction: 'DOWN',
    isMoving: false,
    inventory: initialInventory
  });

  const [currentScreen, setCurrentScreen] = useState({ x: 1, y: 1 });
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [worldMap, setWorldMap] = useState<Biome[][]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [timeLabel, setTimeLabel] = useState("DAY");
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);

  // Sprite Logic
  const spriteImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const [areSpritesLoaded, setAreSpritesLoaded] = useState(false);

  // Refs
  const playerRef = useRef(player);
  const screenRef = useRef(currentScreen);
  const obstaclesRef = useRef(obstacles);
  const worldMapRef = useRef(worldMap);
  const timeRef = useRef(0); // 0.0 to 1.0 representing 24h cycle
  const particlesRef = useRef<Particle[]>([]);
  const lastStepTime = useRef(0);
  const keysPressed = useRef<Set<string>>(new Set());

  // Seasonal State
  const [currentSeason, setCurrentSeason] = useState<Season>(Season.SPRING);
  const seasonTimeRef = useRef(0);

  useEffect(() => {
    SoundManager.getInstance().playBGM();

    // Load Save
    const saved = localStorage.getItem('werka-bouquet-save-v1');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Force spawn at house, but keep inventory and other progress
        setPlayer(prev => ({
          ...prev,
          inventory: data.player.inventory,
          // Reset position to house
          x: CANVAS_WIDTH / 2,
          y: 300,
          direction: 'DOWN'
        }));
        // Force screen to house
        setCurrentScreen(HOUSE_SCREEN);

        setFlowers(data.flowers);
        // We don't restore worldMap directly as it's deterministic from seed,
        // but we should ensure seed is consistent if we were saving it.
        // For now, we assume dateSeed prop drives the world generation.
      } catch (e) {
        console.error("Failed to load save", e);
      }
    } else {
      // No save, ensure correct start pos
      setPlayer(prev => ({
        ...prev,
        x: CANVAS_WIDTH / 2,
        y: 300
      }));
      setCurrentScreen(HOUSE_SCREEN);
    }

    // Real-time Season
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) setCurrentSeason(Season.SPRING);
    else if (month >= 5 && month <= 7) setCurrentSeason(Season.SUMMER);
    else if (month >= 8 && month <= 10) setCurrentSeason(Season.AUTUMN);
    else setCurrentSeason(Season.WINTER);

  }, []);

  // Auto-Save
  useEffect(() => {
    const saveGame = () => {
      const data = {
        player: playerRef.current,
        currentScreen: screenRef.current,
        flowers: flowers, // This might be large, but necessary for picked status
        dateSeed: dateSeed
      };
      localStorage.setItem('werka-bouquet-save-v1', JSON.stringify(data));
    };

    const interval = setInterval(saveGame, 5000); // Auto-save every 5s
    window.addEventListener('beforeunload', saveGame);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', saveGame);
    };
  }, [flowers, dateSeed]);

  // Sync refs - Removed playerRef sync to avoid overwriting the loop's updates
  // useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { screenRef.current = currentScreen; }, [currentScreen]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { worldMapRef.current = worldMap; }, [worldMap]);

  // Load Sprites
  useEffect(() => {
    const loadSprites = async () => {
      const loadedImages: { [key: string]: HTMLImageElement } = {};
      const promises = Object.entries(PLAYER_SPRITES).map(([key, url]) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => {
            loadedImages[key] = img;
            resolve();
          };
          img.onerror = () => {
            console.error(`Failed to load sprite: ${url}`);
            resolve(); // Resolve anyway to avoid hanging
          };
        });
      });

      await Promise.all(promises);
      spriteImagesRef.current = loadedImages;
      setAreSpritesLoaded(true);
    };

    loadSprites();
  }, []);

  // Helper to get consistent river position across screens
  const getRiverY = (globalX: number) => {
    // Combine multiple sines for organic flow
    const seedNum = dateSeed.length; // simple constant from seed
    return (CANVAS_HEIGHT / 2) +
      Math.sin((globalX + seedNum * 100) / 300) * 80 +
      Math.sin((globalX + seedNum * 50) / 100) * 20;
  };

  // Initialize World
  useEffect(() => {
    const rng = new SeededRandom(dateSeed);

    // Determine Daily Theme
    // This ensures the map looks distinct each day (e.g., more forests, or more deserts)
    const themeRoll = rng.next();
    let biomeWeights: Biome[] = [];

    if (themeRoll < 0.25) {
      // Forest Heavy Day
      biomeWeights = [Biome.FOREST, Biome.FOREST, Biome.FOREST, Biome.GRASS, Biome.RIVER];
    } else if (themeRoll < 0.5) {
      // Desert Heavy Day
      biomeWeights = [Biome.DESERT, Biome.DESERT, Biome.DESERT, Biome.GRASS, Biome.RIVER];
    } else if (themeRoll < 0.75) {
      // River/Wetland Day
      biomeWeights = [Biome.RIVER, Biome.RIVER, Biome.RIVER, Biome.GRASS, Biome.FOREST];
    } else {
      // Balanced/Grassy Day
      biomeWeights = [Biome.GRASS, Biome.GRASS, Biome.FOREST, Biome.DESERT, Biome.RIVER];
    }

    const newMap: Biome[][] = [];
    for (let y = 0; y < 3; y++) {
      const row: Biome[] = [];
      for (let x = 0; x < 3; x++) {
        if (x === HOUSE_SCREEN.x && y === HOUSE_SCREEN.y) {
          row.push(Biome.GRASS);
        } else {
          row.push(rng.choice(biomeWeights));
        }
      }
      newMap.push(row);
    }
    setWorldMap(newMap);
    worldMapRef.current = newMap;

    const newFlowers: Flower[] = [];
    // Content Generation
    for (let sy = 0; sy < 3; sy++) {
      for (let sx = 0; sx < 3; sx++) {
        const biome = newMap[sy][sx];
        let flowerTypes: FlowerType[] = [];
        let density = 0;

        switch (biome) {
          case Biome.FOREST:
            flowerTypes = [
              FlowerType.ROSE, FlowerType.ORCHID, FlowerType.BLUEBELL,
              FlowerType.PEONY, FlowerType.JASMINE, FlowerType.CHERRY_BLOSSOM
            ];
            density = 25;
            break;
          case Biome.DESERT:
            flowerTypes = [FlowerType.SUNFLOWER, FlowerType.CACTUS, FlowerType.POPPY, FlowerType.MARIGOLD];
            density = 10;
            break;
          case Biome.RIVER:
            flowerTypes = [FlowerType.LILY, FlowerType.HYDRANGEA, FlowerType.HIBISCUS, FlowerType.LOTUS];
            density = 15;
            break;
          case Biome.GRASS:
          default:
            flowerTypes = [
              FlowerType.DAISY, FlowerType.TULIP, FlowerType.LAVENDER,
              FlowerType.DAFFODIL, FlowerType.MARIGOLD
            ];
            density = 18;
            break;
        }

        // Flowers
        for (let i = 0; i < density; i++) {
          const fX = rng.range(20, CANVAS_WIDTH - 20);
          const fY = rng.range(20, CANVAS_HEIGHT - 20);

          // Avoid house on center screen
          if (sx === HOUSE_SCREEN.x && sy === HOUSE_SCREEN.y) {
            if (fX > HOUSE_RECT.x - 30 && fX < HOUSE_RECT.x + HOUSE_RECT.width + 30 &&
              fY > HOUSE_RECT.y - 30 && fY < HOUSE_RECT.y + HOUSE_RECT.height + 30) continue;
          }

          // Avoid river center or place properly
          if (biome === Biome.RIVER) {
            const globalX = sx * CANVAS_WIDTH + fX;
            const riverY = getRiverY(globalX);
            const type = rng.choice(flowerTypes);

            // Lotus and Lily on water
            if (type === FlowerType.LOTUS || type === FlowerType.LILY) {
              if (Math.abs(fY - riverY) > 30) continue; // Must be near water center
            } else {
              if (Math.abs(fY - riverY) < 45) continue; // Must be on bank
            }

            newFlowers.push({
              id: `f-${sx}-${sy}-${i}`,
              type: type,
              x: fX, y: fY, screenX: sx, screenY: sy,
              color: FLOWER_COLORS[type], isPicked: false
            });
          } else {
            const availableFlowers = SEASON_FLOWERS[currentSeason];
            const type = availableFlowers[Math.floor(rng.next() * availableFlowers.length)];
            newFlowers.push({
              id: `f-${sx}-${sy}-${i}`,
              type: type,
              x: fX, y: fY, screenX: sx, screenY: sy,
              color: FLOWER_COLORS[type],
              isPicked: false
            });
          }
        }
      }
    }
    setFlowers(newFlowers);
  }, [dateSeed, currentSeason]); // Added currentSeason to dependencies

  // Obstacles and Decor Generator
  useEffect(() => {
    const rng = new SeededRandom(`${dateSeed}-${currentScreen.x}-${currentScreen.y}`);
    const biome = worldMap[currentScreen.y]?.[currentScreen.x];
    if (!biome) return;

    const localObstacles: Obstacle[] = [];

    if (currentScreen.x === HOUSE_SCREEN.x && currentScreen.y === HOUSE_SCREEN.y) {
      localObstacles.push({
        x: HOUSE_RECT.x,
        y: HOUSE_RECT.y,
        width: HOUSE_RECT.width,
        height: HOUSE_RECT.height,
        type: 'HOUSE'
      });
    }

    const isCollidingWithHouseOrPath = (x: number, y: number) => {
      if (currentScreen.x !== HOUSE_SCREEN.x || currentScreen.y !== HOUSE_SCREEN.y) return false;
      if (x > HOUSE_RECT.x - 50 && x < HOUSE_RECT.x + HOUSE_RECT.width + 50 &&
        y > HOUSE_RECT.y - 50 && y < HOUSE_RECT.y + HOUSE_RECT.height + 50) return true;
      if (Math.abs(x - CANVAS_WIDTH / 2) < 60 && y > HOUSE_RECT.y) return true;
      // Spawn Protection
      if (Math.abs(x - CANVAS_WIDTH / 2) < 50 && Math.abs(y - 300) < 50) return true;
      return false;
    };

    const isCollidingWithRiver = (x: number, y: number) => {
      if (biome !== Biome.RIVER) return false;
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const riverY = getRiverY(globalX);
      return Math.abs(y - riverY) < 80;
    };

    // Clusters
    const numClusters = Math.floor(rng.range(1, 4));
    for (let i = 0; i < numClusters; i++) {
      const clusterX = rng.range(50, CANVAS_WIDTH - 50);
      const clusterY = rng.range(50, CANVAS_HEIGHT - 50);
      const clusterRadius = rng.range(60, 120);
      const clusterCount = Math.floor(rng.range(4, 9));
      const clusterType: 'TREE' | 'ROCK' = biome === Biome.DESERT ? 'ROCK' :
        (biome === Biome.FOREST ? 'TREE' : (rng.next() > 0.4 ? 'TREE' : 'ROCK'));

      if (isCollidingWithHouseOrPath(clusterX, clusterY)) continue;
      if (isCollidingWithRiver(clusterX, clusterY)) continue;

      for (let j = 0; j < clusterCount; j++) {
        const angle = rng.next() * Math.PI * 2;
        const dist = rng.next() * clusterRadius * 0.8;
        const ox = clusterX + Math.cos(angle) * dist;
        const oy = clusterY + Math.sin(angle) * dist;

        if (ox < 20 || ox > CANVAS_WIDTH - 40 || oy < 20 || oy > CANVAS_HEIGHT - 40) continue;
        if (isCollidingWithHouseOrPath(ox, oy)) continue;
        if (isCollidingWithRiver(ox, oy)) continue;

        localObstacles.push({
          x: ox, y: oy, width: 40, height: 40,
          type: clusterType
        });
      }
    }

    // Scattered
    let scatterDensity = biome === Biome.FOREST ? 12 : (biome === Biome.DESERT ? 5 : 4);
    if (biome === Biome.RIVER) scatterDensity = 6;

    for (let i = 0; i < scatterDensity; i++) {
      const ox = rng.range(20, CANVAS_WIDTH - 40);
      const oy = rng.range(20, CANVAS_HEIGHT - 40);

      if (isCollidingWithHouseOrPath(ox, oy)) continue;
      if (isCollidingWithRiver(ox, oy)) continue;

      const overlaps = localObstacles.some(o => Math.abs(o.x - ox) < 30 && Math.abs(o.y - oy) < 30);
      if (overlaps) continue;

      localObstacles.push({
        x: ox, y: oy, width: 40, height: 40,
        type: biome === Biome.DESERT ? 'ROCK' : 'TREE'
      });
    }

    setObstacles(localObstacles);
    // Do not reset particles completely, let them persist or reset only type dependent ones
    // particlesRef.current = [];
  }, [currentScreen, dateSeed, worldMap]);

  // Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      // Update Time
      timeRef.current = (timeRef.current + dt / DAY_CYCLE_DURATION) % 1.0;

      // Update Season (Real-time override, but keep cycle for effect if desired, or disable)
      // For now, let's disable the automatic fast cycling since we want real-time seasons
      /*
      if (now - seasonTimeRef.current > SEASON_DURATION) {
        setCurrentSeason(prev => {
          const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
          const idx = seasons.indexOf(prev);
          const next = seasons[(idx + 1) % seasons.length];
          setNotification(`Season changed to ${next}!`);
          setTimeout(() => setNotification(null), 3000);
          return next;
        });
        seasonTimeRef.current = now;
      }
      */

      // Update Particles
      update(dt);
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [flowers, player, currentScreen, obstacles, areSpritesLoaded, currentSeason]); // Added currentSeason to dependencies

  const update = (dt: number) => {
    const isNight = timeRef.current > 0.8 || timeRef.current < 0.2;

    // --- PARTICLE SPAWNING ---

    // Wind (White pixels/streaks) - Frequent      // Spawn particles
    if (Math.random() < 0.1) { // Increased spawn rate
      let type: 'WIND' | 'LEAF' | 'SPORE' | 'FIREFLY' | 'BIRD';
      const rand = Math.random();

      if (rand > 0.995) type = 'BIRD'; // Rare
      else if (rand > 0.8) type = 'WIND';
      else if (rand > 0.6) type = 'LEAF';
      else if (rand > 0.4) type = 'SPORE';
      else type = 'FIREFLY';

      if (type === 'WIND') {
        const windSpeed = 3 + Math.random() * 4;
        particlesRef.current.push({
          x: -50, // Spawn off screen left
          y: Math.random() * CANVAS_HEIGHT,
          vx: windSpeed,
          vy: (Math.random() - 0.5) * 0.5, // Slight drift up/down
          life: 0,
          maxLife: CANVAS_WIDTH / windSpeed + 20,
          type: 'WIND',
          color: 'rgba(255, 255, 255, 0.15)', // Subtle white
          size: Math.random() * 20 + 10 // Length of streak
        });
      } else if (type === 'BIRD') {
        const isRight = Math.random() > 0.5;
        particlesRef.current.push({
          x: isRight ? -20 : CANVAS_WIDTH + 20,
          y: Math.random() * (CANVAS_HEIGHT / 2), // High up
          vx: isRight ? (2 + Math.random()) : -(2 + Math.random()),
          vy: (Math.random() - 0.5) * 0.5,
          life: 0,
          maxLife: 400,
          type: 'BIRD',
          color: '#000', // Silhouette
          size: 3
        });
      } else {
        const biome = worldMapRef.current[screenRef.current.y]?.[screenRef.current.x];

        // Seasonal Particle Logic
        if (currentSeason === Season.WINTER) {
          // Snow
          particlesRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: -10,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2 + 1,
            life: 0, maxLife: 200, type: 'SPORE', // Reusing SPORE type for generic circle
            color: '#ffffff',
            size: Math.random() * 2 + 1
          });
        } else if (currentSeason === Season.AUTUMN && Math.random() > 0.5) {
          // Falling Leaves
          particlesRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: -10,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 1 + 1,
            life: 0, maxLife: 200, type: 'LEAF',
            color: Math.random() > 0.5 ? '#d97706' : '#b45309',
            size: Math.random() * 4 + 2
          });
        } else if (isNight || type !== 'SPORE') { // Only spawn spores during day
          particlesRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 0, maxLife: 150, type: type as any,
            color: type === 'FIREFLY' ? '#facc15' : (type === 'LEAF' ? '#a16207' : '#f0fdf4'),
            size: Math.random() * 3 + 1
          });
        }
      }
    }

    if (Math.random() < 0.1) {
      const biome = worldMapRef.current[screenRef.current.y]?.[screenRef.current.x];

      if (biome === Biome.RIVER && Math.random() > 0.5) {
        particlesRef.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: getRiverY(screenRef.current.x * CANVAS_WIDTH + Math.random() * CANVAS_WIDTH) + (Math.random() - 0.5) * 20,
          vx: 0.2, vy: 0, life: 0, maxLife: 60, type: 'RIPPLE', color: '#ffffff', size: 1
        });
      }

      // Chimney Smoke
      if (screenRef.current.x === HOUSE_SCREEN.x && screenRef.current.y === HOUSE_SCREEN.y) {
        particlesRef.current.push({
          x: HOUSE_RECT.x + HOUSE_RECT.width - 30, // Chimney pos
          y: HOUSE_RECT.y - 20,
          vx: 0.2 + Math.random() * 0.2,
          vy: -0.5 - Math.random() * 0.5,
          life: 0, maxLife: 200, type: 'SMOKE', color: '#ffffff', size: 2 + Math.random() * 4
        });
      }

      // Ambient
      const type = isNight ? 'FIREFLY' : (biome === Biome.FOREST ? 'LEAF' : 'SPORE');
      if (isNight || type !== 'SPORE') {
        particlesRef.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 0, maxLife: 150, type: type as any,
          color: type === 'FIREFLY' ? '#facc15' : (type === 'LEAF' ? '#a16207' : '#f0fdf4'),
          size: Math.random() * 3 + 1
        });
      }
    }

    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.type === 'SMOKE') { p.size += 0.05; p.x += Math.sin(p.life / 20) * 0.5; }
      if (p.type === 'FIREFLY') { p.x += Math.sin(Date.now() / 200) * 0.5; p.y += Math.cos(Date.now() / 200) * 0.5; }
      if (p.type === 'BIRD') {
        p.y += Math.sin(Date.now() / 200) * 0.2;
        // Interactive: Scatter if player is close
        const dx = p.x - playerRef.current.x;
        const dy = p.y - playerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.vx += dx / dist * 0.5;
          p.vy += dy / dist * 0.5;
        }
      }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);


    // Movement Logic using Ref for immediate updates (fixes flicker/lag)
    let { x, y, direction, isMoving, inventory } = playerRef.current;
    let dx = 0, dy = 0;

    if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) dy -= PLAYER_SPEED;
    if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) dy += PLAYER_SPEED;
    if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) dx -= PLAYER_SPEED;
    if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) dx += PLAYER_SPEED;

    if (dx !== 0 || dy !== 0) {
      isMoving = true;
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * PLAYER_SPEED;
        dy = (dy / length) * PLAYER_SPEED;
      }

      if (dy < 0) direction = 'UP';
      if (dy > 0) direction = 'DOWN';
      if (dx < 0) direction = 'LEFT';
      if (dx > 0) direction = 'RIGHT';

      let nextX = x + dx;
      let nextY = y + dy;

      let nextScreen = { ...screenRef.current };
      let screenChanged = false;

      if (nextX < 0) {
        if (nextScreen.x > 0) { nextScreen.x--; nextX = CANVAS_WIDTH - 20; screenChanged = true; } else nextX = 0;
      } else if (nextX > CANVAS_WIDTH) {
        if (nextScreen.x < 2) { nextScreen.x++; nextX = 20; screenChanged = true; } else nextX = CANVAS_WIDTH;
      }
      if (nextY < 0) {
        if (nextScreen.y > 0) { nextScreen.y--; nextY = CANVAS_HEIGHT - 20; screenChanged = true; } else nextY = 0;
      } else if (nextY > CANVAS_HEIGHT) {
        if (nextScreen.y < 2) { nextScreen.y++; nextY = 20; screenChanged = true; } else nextY = CANVAS_HEIGHT;
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
              onEnterHouse(inventory);
              return; // Stop update
            }
          }
          blocked = true; break;
        }
      }

      // River Collision with Continuity
      if (!screenChanged && !blocked) {
        const biome = worldMapRef.current[nextScreen.y]?.[nextScreen.x];
        if (biome === Biome.RIVER) {
          const globalX = nextScreen.x * CANVAS_WIDTH + nextX;
          const riverY = getRiverY(globalX);
          const riverDist = Math.abs(nextY - riverY);
          // If already stuck (current pos in river), allow moving OUT (increasing distance)
          const currentGlobalX = screenRef.current.x * CANVAS_WIDTH + x;
          const currentRiverY = getRiverY(currentGlobalX);
          const currentDist = Math.abs(y - currentRiverY);

          if (riverDist < 35) {
            if (currentDist < 35 && riverDist > currentDist) {
              // Allow moving away from center if already stuck
              blocked = false;
            } else {
              blocked = true;
            }
          }
        }
      }

      if (!blocked) {
        x = nextX; y = nextY;
        if (screenChanged) setCurrentScreen(nextScreen);
      }
    } else {
      isMoving = false;
    }

    // Update Ref IMMEDIATELY
    playerRef.current = { ...playerRef.current, x, y, direction, isMoving };

    // Sync React State (throttled or every frame, React handles batching)
    setPlayer(playerRef.current);

    // Footstep sounds
    if (isMoving && Date.now() - lastStepTime.current > 300) {
      SoundManager.getInstance().playSFX('STEP');
      lastStepTime.current = Date.now();
    }

    if (keysPressed.current.has('Space') || keysPressed.current.has('KeyE')) {
      pickFlower();
      keysPressed.current.delete('Space');
      keysPressed.current.delete('KeyE');
    }

    // Check for interactions
    let prompt: string | null = null;

    // Check House
    if (screenRef.current.x === HOUSE_SCREEN.x && screenRef.current.y === HOUSE_SCREEN.y) {
      const distToDoor = Math.sqrt(Math.pow(playerRef.current.x - (HOUSE_RECT.doorX + HOUSE_RECT.doorWidth / 2), 2) + Math.pow(playerRef.current.y - HOUSE_RECT.doorY, 2));
      if (distToDoor < 50) {
        prompt = "Press E to Enter";
        if (keysPressed.current.has('KeyE')) {
          SoundManager.getInstance().playSFX('ENTER');
          onEnterHouse(playerRef.current.inventory);
          keysPressed.current.delete('KeyE');
        }
      }
    }

    // Check Flowers
    if (!prompt) {
      const nearbyFlower = flowers.find(f =>
        !f.isPicked &&
        f.screenX === screenRef.current.x &&
        f.screenY === screenRef.current.y &&
        Math.sqrt(Math.pow(playerRef.current.x - f.x, 2) + Math.pow(playerRef.current.y - f.y, 2)) < 30
      );
      if (nearbyFlower) {
        prompt = `Press E to Pick ${nearbyFlower.type}`;
        if (keysPressed.current.has('KeyE')) {
          pickFlower();
          keysPressed.current.delete('KeyE');
        }
      }
    }

    setInteractionPrompt(prompt);
  };

  const pickFlower = () => {
    // 1. Find candidate based on current state
    const candidate = flowers.find(f =>
      !f.isPicked &&
      f.screenX === screenRef.current.x &&
      f.screenY === screenRef.current.y &&
      Math.sqrt(Math.pow(playerRef.current.x - f.x, 2) + Math.pow(playerRef.current.y - f.y, 2)) < 30
    );

    if (!candidate) return;

    // 2. Check inventory space
    if (playerRef.current.inventory.length >= MAX_INVENTORY) {
      setNotification("Basket full!");
      setTimeout(() => setNotification(null), 2000);
      return;
    }

    // 3. Update Flowers State (Mark as picked)
    setFlowers(prev => prev.map(f =>
      (f.x === candidate.x && f.y === candidate.y && f.screenX === candidate.screenX && f.screenY === candidate.screenY)
        ? { ...f, isPicked: true }
        : f
    ));

    // 4. Update Player Inventory
    const newInventory = [...playerRef.current.inventory, candidate];
    playerRef.current.inventory = newInventory; // Sync ref immediately to prevent loop overwrite

    setPlayer(prev => {
      onInventoryChange(newInventory); // Notify parent
      return {
        ...prev,
        inventory: newInventory
      };
    });

    // 5. Feedback
    SoundManager.getInstance().playSFX('PICK');
    setNotification(`Picked ${candidate.type}`);
    setTimeout(() => setNotification(null), 1000);
  };

  // --- DRAWING ---

  // --- BACKGROUND BUFFERING ---
  useEffect(() => {
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement('canvas');
      backgroundCanvasRef.current.width = CANVAS_WIDTH;
      backgroundCanvasRef.current.height = CANVAS_HEIGHT;
    }
    const bgCtx = backgroundCanvasRef.current.getContext('2d');
    if (!bgCtx) return;

    const biome = worldMapRef.current[screenRef.current.y]?.[screenRef.current.x] || Biome.GRASS;
    const seasonPalette = SEASON_COLORS[currentSeason];

    // Draw everything static to the background buffer
    bgCtx.fillStyle = seasonPalette[biome];
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawTerrainPatches(bgCtx, biome, seasonPalette);
    drawGroundDetails(bgCtx, biome, seasonPalette);

    if (biome === Biome.RIVER) drawContinuousRiver(bgCtx);

    if (screenRef.current.x === HOUSE_SCREEN.x && screenRef.current.y === HOUSE_SCREEN.y) {
      drawDetailedPath(bgCtx);
    }
  }, [currentScreen, currentSeason, dateSeed, worldMap]); // Re-render background only when these change

  // --- DRAWING ---

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Cached Background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    } else {
      // Fallback if buffer not ready (shouldn't happen)
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    const renderList = [
      ...obstaclesRef.current.map(o => ({ type: 'OBSTACLE', obj: o, y: o.y + o.height })),
      ...flowers.filter(f => !f.isPicked && f.screenX === screenRef.current.x && f.screenY === screenRef.current.y)
        .map(f => ({ type: 'FLOWER', obj: f, y: f.y })),
      { type: 'PLAYER', obj: playerRef.current, y: playerRef.current.y }
    ];

    renderList.sort((a, b) => a.y - b.y);

    renderList.forEach(item => {
      if (item.type === 'OBSTACLE') {
        const obs = item.obj as Obstacle;
        if (obs.type === 'HOUSE') drawDetailedHouse(ctx);
        else if (obs.type === 'TREE') drawTree(ctx, obs.x, obs.y);
        else if (obs.type === 'ROCK') drawRock(ctx, obs.x, obs.y);
      } else if (item.type === 'FLOWER') {
        drawFlower(ctx, item.obj as Flower);
      } else if (item.type === 'PLAYER') {
        drawPlayer(ctx, item.obj as Player);
      }
    });

    drawParticles(ctx);
    drawClouds(ctx);
    drawDayNightCycle(ctx);
  };

  const drawTerrainPatches = (ctx: CanvasRenderingContext2D, biome: Biome, seasonPalette: Record<Biome, string>) => {
    const rng = new SeededRandom(`${dateSeed}-${screenRef.current.x}-${screenRef.current.y}-terrain`);
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
    const rng = new SeededRandom(`${dateSeed}-${currentScreen.x}-${currentScreen.y}-ground`);
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
    // Bank
    ctx.fillStyle = '#eecfa1';
    ctx.beginPath();
    // Top bank
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const y = getRiverY(globalX);
      ctx.lineTo(x, y - 48);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.fill();

    // Overdraw bottom with background color to create the strip
    ctx.fillStyle = BIOME_BG_COLORS[Biome.RIVER];
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Bank again properly
    ctx.fillStyle = '#eecfa1';
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const y = getRiverY(globalX);
      ctx.lineTo(x, y - 45);
    }
    for (let x = CANVAS_WIDTH; x >= 0; x -= 10) {
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const y = getRiverY(globalX);
      ctx.lineTo(x, y + 45);
    }
    ctx.fill();

    // Water
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const y = getRiverY(globalX);
      ctx.lineTo(x, y - 38);
    }
    for (let x = CANVAS_WIDTH; x >= 0; x -= 10) {
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const y = getRiverY(globalX);
      ctx.lineTo(x, y + 38);
    }
    ctx.fill();

    // Details (Lily pads)
    const rng = new SeededRandom(`river-decor-${currentScreen.x}-${currentScreen.y}`);
    for (let i = 0; i < 5; i++) {
      const x = rng.range(20, CANVAS_WIDTH - 20);
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const cy = getRiverY(globalX);
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
      const globalX = currentScreen.x * CANVAS_WIDTH + x;
      const cy = getRiverY(globalX);
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
  };

  const drawDetailedHouse = (ctx: CanvasRenderingContext2D) => {
    const x = HOUSE_RECT.x;
    const y = HOUSE_RECT.y;
    const w = HOUSE_RECT.width;
    const h = HOUSE_RECT.height;
    const lightsOn = timeRef.current < 0.25 || timeRef.current > 0.75;

    // Shadow
    const shadowOffX = (timeRef.current - 0.5) * 180;
    ctx.fillStyle = lightsOn ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(x + shadowOffX, y + h);
    ctx.lineTo(x + w + shadowOffX, y + h);
    ctx.lineTo(x + w, y + h - 10);
    ctx.lineTo(x, y + h - 10);
    ctx.fill();

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
        const shade = Math.random() > 0.5 ? '#991b1b' : '#7f1d1d';
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
  };

  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const sway = Math.sin(Date.now() / 1000 + x) * 2;
    const shadowOffX = (timeRef.current - 0.5) * 120;
    const isNight = timeRef.current < 0.2 || timeRef.current > 0.8;

    ctx.fillStyle = `rgba(0,0,0,${isNight ? 0 : 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x + 20 + shadowOffX, y + 38, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#451a03';
    ctx.fillRect(x + 15, y + 20, 10, 20);

    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    // More complex tree shape
    ctx.arc(x + 20 + sway, y + 10, 20, 0, Math.PI * 2);
    ctx.arc(x + 10 + sway, y + 20, 15, 0, Math.PI * 2);
    ctx.arc(x + 30 + sway, y + 20, 15, 0, Math.PI * 2);
    ctx.arc(x + 20 + sway, y - 5, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(x + 20 + sway, y + 5, 12, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const shadowOffX = (timeRef.current - 0.5) * 80;
    const isNight = timeRef.current < 0.2 || timeRef.current > 0.8;
    ctx.fillStyle = `rgba(0,0,0,${isNight ? 0 : 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x + 20 + shadowOffX, y + 28, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

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

  const drawFlower = (ctx: CanvasRenderingContext2D, f: Flower) => {
    const sway = Math.sin(Date.now() / 300 + f.x) * 2;
    const shadowOffX = (timeRef.current - 0.5) * 10;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(f.x + shadowOffX, f.y, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stem (Common)
    ctx.fillStyle = '#166534';
    if (f.type !== FlowerType.LOTUS && f.type !== FlowerType.CACTUS) {
      ctx.fillRect(f.x - 1, f.y - 10, 2, 10);
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

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
    if (isNaN(p.x) || isNaN(p.y)) return; // Safety check

    // Always draw a shadow/base so the player is never fully invisible
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const { direction, isMoving } = p;
    const img = areSpritesLoaded ? spriteImagesRef.current[direction] : null;

    if (!img || !img.complete || img.naturalWidth === 0) {
      // Fallback if sprites not loaded OR specific sprite missing OR broken
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // DYNAMIC SPRITE SHEET CALCULATION
    // Ignore hardcoded SPRITE_COLS and calculate based on actual image dimensions
    let imgCols = Math.floor(img.width / SPRITE_SIZE);
    let imgRows = Math.floor(img.height / SPRITE_SIZE);

    // Fallback for small images (e.g. 48x48 when expecting 52x52)
    // Treat them as a single frame
    if (imgCols === 0) imgCols = 1;
    if (imgRows === 0) imgRows = 1;

    const maxFrames = imgCols * imgRows;
    // Removed early return for maxFrames === 0 since we force it to at least 1 now

    // Adjust frame count if image has fewer frames than config
    const configFrameCount = SPRITE_COUNTS[direction as keyof typeof SPRITE_COUNTS] || 4;
    const effectiveFrameCount = Math.min(configFrameCount, maxFrames);

    let frameIndex = isMoving
      ? Math.floor(Date.now() / ANIMATION_SPEED) % effectiveFrameCount
      : 0; // Idle frame

    // Calculate source x/y dynamically
    // If imgCols is 1 (vertical strip), col will always be 0, row will increment
    // If imgCols is N (horizontal strip), row will be 0, col will increment
    // If grid, both will change
    let col = frameIndex % imgCols;
    let row = Math.floor(frameIndex / imgCols);

    let sx = col * SPRITE_SIZE;
    let sy = row * SPRITE_SIZE;

    const drawWidth = SPRITE_SIZE * SPRITE_SCALE;
    const drawHeight = SPRITE_SIZE * SPRITE_SCALE;
    const drawX = Math.floor(p.x - drawWidth / 2);
    const drawY = Math.floor(p.y - drawHeight + 15); // Anchor at feet

    ctx.save();

    // Flip logic: Assuming side.png faces RIGHT by default
    if (direction === 'LEFT') {
      // Flip horizontally
      ctx.translate(p.x, p.y);
      ctx.scale(-1, 1);
      ctx.translate(-p.x, -p.y);
    }

    // Draw with safety for small images
    // Calculate remaining space from current position to avoid reading out of bounds
    const srcWidth = Math.min(SPRITE_SIZE, img.width - sx);
    const srcHeight = Math.min(SPRITE_SIZE, img.height - sy);

    // Ensure we always draw to the same destination position/size
    // even if source is smaller (will scale the partial image)
    ctx.drawImage(
      img,
      sx, sy, srcWidth, srcHeight, // Source (what we can safely read)
      drawX, drawY, drawWidth, drawHeight // Destination (always full size)
    );

    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(p => {
      if (p.type === 'WIND') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.size, p.y + p.vy * 5);
        ctx.stroke();
        return;
      }

      if (p.type === 'BIRD') {
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        // Simple V shape
        const wingY = Math.sin(Date.now() / 100) * 2;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 3, p.y - 2 + wingY);
        ctx.lineTo(p.x + 3, p.y - 2 + wingY);
        ctx.fill();
        return;
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
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
    });
  };

  const drawClouds = (ctx: CanvasRenderingContext2D) => {
    const t = Date.now() / 20000; // Slow drift
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';

    // Procedural cloud shadows
    for (let i = 0; i < 5; i++) {
      const x = ((t * (50 + i * 20)) + i * 200) % (CANVAS_WIDTH + 400) - 200;
      const y = (i * 150 + Math.sin(t) * 50) % CANVAS_HEIGHT;

      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.arc(x + 40, y + 20, 70, 0, Math.PI * 2);
      ctx.arc(x - 40, y + 20, 50, 0, Math.PI * 2);
      ctx.fill();
    }
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
      ctx.fillStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${a})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Vignette
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 3,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${0.3 + a * 0.5})`); // Stronger at night
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  // --- RESPONSIVE SCALING ---
  const [scale, setScale] = useState(1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect touch device - use multiple methods for better iOS compatibility
    const checkTouch = () => {
      const hasTouchEvents = 'ontouchstart' in window;
      const hasPointerEvents = navigator.maxTouchPoints > 0;
      const isMobileWidth = window.innerWidth <= 1024;
      const isMobileUserAgent = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Show controls if ANY of these are true
      setIsTouchDevice(hasTouchEvents || hasPointerEvents || (isMobileWidth && isMobileUserAgent));
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);

    // Calculate scale to fit viewport
    const updateScale = () => {
      const padding = 20; // Padding around game
      const controlsHeight = isTouchDevice ? 180 : 0; // Space for mobile controls

      const availableWidth = window.innerWidth - padding * 2;
      const availableHeight = window.innerHeight - padding * 2 - controlsHeight;

      const scaleX = availableWidth / CANVAS_WIDTH;
      const scaleY = availableHeight / CANVAS_HEIGHT;

      // Use the smaller scale to maintain aspect ratio, max 1 to not upscale
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, [isTouchDevice]);

  // Mobile control handlers with better touch handling
  const handleMobileControl = (key: string, isPressed: boolean) => {
    if (isPressed) {
      keysPressed.current.add(key);
    } else {
      keysPressed.current.delete(key);
    }
  };

  const handleActionButton = () => {
    keysPressed.current.add('KeyE');
    // Clear after a short delay to ensure the game loop catches it
    setTimeout(() => keysPressed.current.delete('KeyE'), 250);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black/50">
      {/* Responsive Game Container */}
      <div
        ref={containerRef}
        className="game-container relative bg-black rounded-xl overflow-hidden border-4 border-stone-700 shadow-2xl"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block bg-stone-800"
        />

        <InventoryHUD inventory={player.inventory} timeLabel={timeLabel} />

        {interactionPrompt && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-16 bg-black/80 text-white px-4 py-2 rounded border border-white/30 pixel-text text-sm animate-pulse pointer-events-none z-20">
            {interactionPrompt}
          </div>
        )}

        {notification && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 text-black px-6 py-2 rounded-full font-bold border-2 border-yellow-500 shadow-lg z-50 transition-all duration-300">
            {notification}
          </div>
        )}
      </div>

      {/* Mobile Controls - CSS-only approach, hidden on large screens */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-between items-end px-4 pb-6 z-[9999]"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* D-Pad Controls */}
        <div className="grid grid-cols-3 gap-1" style={{ width: '180px' }}>
          <div /> {/* Empty cell */}
          <button
            className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}
            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}
          >
            ▲
          </button>
          <div /> {/* Empty cell */}

          <button
            className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}
            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}
          >
            ◀
          </button>
          <button
            className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}
            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}
          >
            ▼
          </button>
          <button
            className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}
            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}
          >
            ▶
          </button>
        </div>

        {/* Action Button */}
        <button
          className="w-20 h-20 bg-yellow-500 rounded-full border-4 border-yellow-300 active:bg-yellow-400 flex items-center justify-center text-white font-bold shadow-xl"
          onTouchStart={(e) => { e.preventDefault(); handleActionButton(); }}
        >
          <span className="text-sm pixel-text">ACTION</span>
        </button>
      </div>
    </div>
  );
};

