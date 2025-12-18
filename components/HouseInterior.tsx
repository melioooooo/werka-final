import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SoundManager } from '../utils/SoundManager';
import { Flower, Player } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, PLAYER_SPRITES, SPRITE_SIZE, SPRITE_SCALE, SPRITE_COUNTS, ANIMATION_SPEED } from '../constants';
import { InventoryHUD } from './InventoryHUD';

interface HouseInteriorProps {
    inventory: Flower[];
    onExit: () => void;
    onCraft: () => void;
}

const FURNITURE_COLLISIONS = [
    // === TOP WALL / BACKGROUND AREA ===
    { x: 0, y: 0, width: CANVAS_WIDTH, height: 280, name: 'back_wall' },

    // === FIREPLACE (centered at top) ===
    { x: 420, y: 250, width: 185, height: 60, name: 'fireplace' },

    // === FURNITURE ON TOP WALL ===
    { x: 610, y: 200, width: 100, height: 140, name: 'bookshelf' },
    { x: 715, y: 200, width: 45, height: 140, name: 'grandfather_clock' },
    { x: 335, y: 275, width: 65, height: 50, name: 'side_table_left' },
    { x: 415, y: 295, width: 45, height: 40, name: 'small_stand' },

    // === CENTER FURNITURE ===
    { x: 550, y: 360, width: 90, height: 80, name: 'armchair' },

    // === RIGHT SIDE FURNITURE ===
    { x: 635, y: 440, width: 70, height: 130, name: 'display_table' },

    // === LEFT WALL AREA (Outer bounds) ===
    { x: 0, y: 0, width: 330, height: CANVAS_HEIGHT, name: 'left_wall' },
    // === RIGHT WALL AREA (Outer bounds) ===
    { x: 730, y: 0, width: CANVAS_WIDTH - 730, height: CANVAS_HEIGHT, name: 'right_wall' },
];

const DOOR_RECT = { x: 470, y: 650, width: 85, height: 50 };
const CRAFTING_TABLE_RECT = { x: 550, y: 360, width: 90, height: 80 }; // Armchair as crafting spot? Or the table?

export const HouseInterior: React.FC<HouseInteriorProps> = ({ inventory, onExit, onCraft }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const spriteImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
    const [areSpritesLoaded, setAreSpritesLoaded] = useState(false);
    const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);

    const [player, setPlayer] = useState<Player>({
        x: CANVAS_WIDTH / 2,
        y: 500,
        direction: 'UP',
        isMoving: false,
        inventory: inventory
    });

    const playerRef = useRef(player);
    const keysPressed = useRef<Set<string>>(new Set());
    const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);

    useEffect(() => {
        const img = new Image();
        img.src = '/interior.jpg';
        img.onload = () => {
            backgroundImageRef.current = img;
            setIsBackgroundLoaded(true);
        };
    }, []);

    useEffect(() => {
        const loadSprites = async () => {
            const loadedImages: { [key: string]: HTMLImageElement } = {};
            const promises = Object.entries(PLAYER_SPRITES).map(([key, url]) => {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => { loadedImages[key] = img; resolve(); };
                    img.onerror = () => resolve();
                });
            });
            await Promise.all(promises);
            spriteImagesRef.current = loadedImages;
            setAreSpritesLoaded(true);
        };
        loadSprites();
    }, []);

    const handleInteraction = useCallback(() => {
        const p = playerRef.current;
        // Check Door Reach
        if (p.x > DOOR_RECT.x && p.x < DOOR_RECT.x + DOOR_RECT.width && p.y > DOOR_RECT.y - 30) {
            SoundManager.getInstance().playSFX('ENTER');
            onExit();
            return;
        }
        // Check Crafting Table
        const dist = Math.sqrt(Math.pow(p.x - (CRAFTING_TABLE_RECT.x + 75), 2) + Math.pow(p.y - (CRAFTING_TABLE_RECT.y + 60), 2));
        if (dist < 100 && inventory.length > 0) {
            SoundManager.getInstance().playSFX('PICK'); // Or a bespoke crafting sound if available
            onCraft();
        }
    }, [onExit, onCraft, inventory.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.code);
            if (e.code === 'KeyE' || e.code === 'Space') {
                handleInteraction();
            }
            if (e.code === 'Escape') onExit();
        };
        const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onExit, onCraft, inventory.length, handleInteraction]);

    const checkCollision = useCallback((x: number, y: number): boolean => {
        const r = 15; // Player collision radius

        // Check furniture collisions
        for (const f of FURNITURE_COLLISIONS) {
            if (x + r > f.x && x - r < f.x + f.width && y + r > f.y && y - r < f.y + f.height) return true;
        }

        // Room bounds - player must stay within these walls
        const ROOM_LEFT = 330;
        const ROOM_RIGHT = 730;
        const ROOM_TOP = 280;
        const ROOM_BOTTOM = 660;

        // Check if player is trying to go outside room bounds
        if (x - r < ROOM_LEFT) return true;  // Left wall
        if (x + r > ROOM_RIGHT) return true; // Right wall
        if (y - r < ROOM_TOP) return true;   // Top wall

        // Bottom wall - except for the door
        if (y + r > ROOM_BOTTOM) {
            // Only allow through the door area
            const inDoorX = x > DOOR_RECT.x && x < DOOR_RECT.x + DOOR_RECT.width;
            if (!inDoorX) return true; // Block if not at the door
        }

        return false;
    }, []);

    useEffect(() => {
        let animId: number;
        const loop = () => {
            let { x, y, direction, isMoving } = playerRef.current;
            let dx = 0, dy = 0;
            if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) dy -= PLAYER_SPEED;
            if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) dy += PLAYER_SPEED;
            if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) dx -= PLAYER_SPEED;
            if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) dx += PLAYER_SPEED;

            if (dx !== 0 || dy !== 0) {
                isMoving = true;
                if (dx !== 0 && dy !== 0) { const l = Math.sqrt(dx * dx + dy * dy); dx = (dx / l) * PLAYER_SPEED; dy = (dy / l) * PLAYER_SPEED; }
                if (dy < 0) direction = 'UP';
                if (dy > 0) direction = 'DOWN';
                if (dx < 0) direction = 'LEFT';
                if (dx > 0) direction = 'RIGHT';
                if (!checkCollision(x + dx, y)) x += dx;
                if (!checkCollision(x, y + dy)) y += dy;
            } else { isMoving = false; }

            let prompt: string | null = null;
            if (x > DOOR_RECT.x && x < DOOR_RECT.x + DOOR_RECT.width && y > DOOR_RECT.y - 50) prompt = 'Press E to Exit';
            const dist = Math.sqrt(Math.pow(x - (CRAFTING_TABLE_RECT.x + 75), 2) + Math.pow(y - (CRAFTING_TABLE_RECT.y + 60), 2));
            if (dist < 100) prompt = inventory.length > 0 ? 'Press E to Craft Bouquet' : 'Gather flowers first!';
            setInteractionPrompt(prompt);
            playerRef.current = { ...playerRef.current, x, y, direction, isMoving };
            setPlayer(playerRef.current);

            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    if (backgroundImageRef.current && isBackgroundLoaded) ctx.drawImage(backgroundImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                    const p = playerRef.current;
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y + 5, 15, 8, 0, 0, Math.PI * 2);
                    ctx.fill();

                    const img = areSpritesLoaded ? spriteImagesRef.current[p.direction] : null;
                    if (img && img.complete) {
                        const cols = Math.floor(img.width / SPRITE_SIZE) || 1;
                        const frames = SPRITE_COUNTS[p.direction as keyof typeof SPRITE_COUNTS] || 4;
                        const frame = p.isMoving ? Math.floor(Date.now() / ANIMATION_SPEED) % frames : 0;
                        const sx = (frame % cols) * SPRITE_SIZE;
                        const sy = Math.floor(frame / cols) * SPRITE_SIZE;
                        ctx.save();
                        if (p.direction === 'LEFT') { ctx.translate(p.x, p.y); ctx.scale(-1, 1); ctx.translate(-p.x, -p.y); }
                        ctx.drawImage(img, sx, sy, SPRITE_SIZE, SPRITE_SIZE, p.x - SPRITE_SIZE * SPRITE_SCALE / 2, p.y - SPRITE_SIZE * SPRITE_SCALE + 15, SPRITE_SIZE * SPRITE_SCALE, SPRITE_SIZE * SPRITE_SCALE);
                        ctx.restore();
                    } else {
                        ctx.fillStyle = '#f43f5e';
                        ctx.beginPath();
                        ctx.arc(p.x, p.y - 10, 15, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    const glow = 0.15 + Math.sin(Date.now() / 100) * 0.05;
                    const grad = ctx.createRadialGradient(390, 120, 20, 390, 120, 200);
                    grad.addColorStop(0, `rgba(255, 150, 50, ${glow})`);
                    grad.addColorStop(1, 'rgba(255, 150, 50, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(200, 0, 400, 300);
                    // --- DEBUG HITBOXES ---
                    const DRAW_DEBUG = false; // Set to true to see hitboxes
                    if (DRAW_DEBUG) {
                        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                        ctx.lineWidth = 2;
                        for (const f of FURNITURE_COLLISIONS) {
                            ctx.strokeRect(f.x, f.y, f.width, f.height);
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                            ctx.fillRect(f.x, f.y, f.width, f.height);
                            ctx.fillStyle = 'white';
                            ctx.font = '10px Arial';
                            ctx.fillText(f.name, f.x + 5, f.y + 15);
                        }

                        // Room bounds
                        const ROOM_LEFT = 330;
                        const ROOM_RIGHT = 730;
                        const ROOM_TOP = 280;
                        const ROOM_BOTTOM = 660;
                        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                        ctx.strokeRect(ROOM_LEFT, ROOM_TOP, ROOM_RIGHT - ROOM_LEFT, ROOM_BOTTOM - ROOM_TOP);

                        // Door
                        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
                        ctx.strokeRect(DOOR_RECT.x, DOOR_RECT.y, DOOR_RECT.width, DOOR_RECT.height);

                        // Crafting table
                        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                        ctx.strokeRect(CRAFTING_TABLE_RECT.x, CRAFTING_TABLE_RECT.y, CRAFTING_TABLE_RECT.width, CRAFTING_TABLE_RECT.height);
                    }
                }
            }
            animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isBackgroundLoaded, areSpritesLoaded, checkCollision, inventory.length]);

    const handleMobileControl = (key: string, isPressed: boolean) => {
        if (isPressed) keysPressed.current.add(key);
        else keysPressed.current.delete(key);
    };

    const handleMobileAction = () => {
        keysPressed.current.add('KeyE');
        // Trigger generic interaction logic
        handleInteraction();
        // Clear KeyE after a short delay
        setTimeout(() => keysPressed.current.delete('KeyE'), 200);
    };

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-stone-900">
            {/* GAME SCREEN AREA - Top section */}
            <div className="flex-1 flex items-center justify-center p-2 min-h-0">
                <div
                    className="relative bg-black rounded-lg overflow-hidden border-4 border-stone-700 shadow-2xl max-w-full max-h-full"
                    style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
                >
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="w-full h-full"
                    />
                    {/* Desktop Inventory Overlay - hidden on mobile */}
                    <div className="hidden lg:block">
                        <InventoryHUD inventory={player.inventory} timeLabel="INSIDE" />
                    </div>
                    {interactionPrompt && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-16 bg-black/80 text-white px-4 py-2 rounded border border-white/30 pixel-text text-sm animate-pulse pointer-events-none z-20">
                            {interactionPrompt}
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE INVENTORY STRIP - between game and controls (hidden on desktop) */}
            <div className="lg:hidden flex-shrink-0">
                <InventoryHUD inventory={player.inventory} timeLabel="INSIDE" isMobile={true} />
            </div>

            {/* CONTROLS AREA - Bottom section (hidden on desktop) */}
            <div className="lg:hidden flex-shrink-0 h-40 bg-stone-800 border-t-2 border-stone-600 flex justify-between items-center px-6"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* D-Pad */}
                <div className="grid grid-cols-3 gap-1" style={{ width: '150px' }}>
                    <div />
                    <button className="w-12 h-12 bg-stone-700 rounded-lg border-2 border-stone-500 active:bg-stone-600 flex items-center justify-center text-xl text-white font-bold shadow-lg touch-none select-none"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}
                        onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}>▲</button>
                    <div />
                    <button className="w-12 h-12 bg-stone-700 rounded-lg border-2 border-stone-500 active:bg-stone-600 flex items-center justify-center text-xl text-white font-bold shadow-lg touch-none select-none"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}
                        onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}>◀</button>
                    <button className="w-12 h-12 bg-stone-700 rounded-lg border-2 border-stone-500 active:bg-stone-600 flex items-center justify-center text-xl text-white font-bold shadow-lg touch-none select-none"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}
                        onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}>▼</button>
                    <button className="w-12 h-12 bg-stone-700 rounded-lg border-2 border-stone-500 active:bg-stone-600 flex items-center justify-center text-xl text-white font-bold shadow-lg touch-none select-none"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}
                        onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}>▶</button>
                </div>

                {/* Action Button */}
                <button className="w-20 h-20 bg-yellow-500 rounded-full border-4 border-yellow-300 active:bg-yellow-400 flex items-center justify-center text-white font-bold shadow-xl touch-none select-none"
                    onTouchStart={(e) => { e.preventDefault(); handleMobileAction(); }}>
                    <span className="text-sm pixel-text">ACTION</span>
                </button>
            </div>
        </div>
    );
};
