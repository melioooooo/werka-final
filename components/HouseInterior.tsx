import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Flower, Player } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, PLAYER_SPRITES, SPRITE_SIZE, SPRITE_SCALE, SPRITE_COUNTS, ANIMATION_SPEED } from '../constants';
import { InventoryHUD } from './InventoryHUD';

interface HouseInteriorProps {
    inventory: Flower[];
    onExit: () => void;
    onCraft: () => void;
}

// Define collision boxes for furniture (based on the image layout)
const FURNITURE_COLLISIONS = [
    // Fireplace area (top center)
    { x: 280, y: 0, width: 200, height: 180, name: 'fireplace' },
    // Bookshelf (top right)
    { x: 520, y: 50, width: 120, height: 100, name: 'bookshelf' },
    // Grandfather clock (right wall)
    { x: 680, y: 50, width: 60, height: 150, name: 'clock' },
    // Armchair (center)
    { x: 380, y: 220, width: 80, height: 80, name: 'armchair' },
    // Crafting table (lower right) - interactive!
    { x: 580, y: 350, width: 150, height: 100, name: 'crafting_table', interactive: true },
    // Left wall decorations
    { x: 0, y: 0, width: 150, height: 350, name: 'left_wall' },
    // Plants bottom left
    { x: 80, y: 520, width: 120, height: 80, name: 'plants_left' },
    // Plants bottom right  
    { x: 720, y: 480, width: 100, height: 100, name: 'plants_right' },
    // Top wall
    { x: 0, y: 0, width: CANVAS_WIDTH, height: 50, name: 'top_wall' },
    // Left side wall extension
    { x: 0, y: 350, width: 80, height: 250, name: 'left_extension' },
    // Right wall
    { x: 750, y: 200, width: 100, height: 400, name: 'right_wall' },
    // Rug (walkable, no collision)
];

// Door area for exiting
const DOOR_RECT = { x: 360, y: 580, width: 80, height: 50 };

// Crafting table interaction area
const CRAFTING_TABLE_RECT = { x: 580, y: 350, width: 150, height: 120 };

export const HouseInterior: React.FC<HouseInteriorProps> = ({ inventory, onExit, onCraft }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const spriteImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
    const [areSpritesLoaded, setAreSpritesLoaded] = useState(false);
    const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);

    // Player state for interior
    const [player, setPlayer] = useState<Player>({
        x: CANVAS_WIDTH / 2,
        y: 500, // Start near the door
        direction: 'UP',
        isMoving: false,
        inventory: inventory
    });

    const playerRef = useRef(player);
    const keysPressed = useRef<Set<string>>(new Set());
    const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);

    // Load background image
    useEffect(() => {
        const img = new Image();
        img.src = '/interior.jpg';
        img.onload = () => {
            backgroundImageRef.current = img;
            setIsBackgroundLoaded(true);
        };
        img.onerror = () => {
            console.error('Failed to load interior background');
        };
    }, []);

    // Load player sprites
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
                    img.onerror = () => resolve();
                });
            });
            await Promise.all(promises);
            spriteImagesRef.current = loadedImages;
            setAreSpritesLoaded(true);
        };
        loadSprites();
    }, []);

    // Keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.code);

            // Handle interaction
            if (e.code === 'KeyE' || e.code === 'Space') {
                const p = playerRef.current;

                // Check door
                if (p.x > DOOR_RECT.x && p.x < DOOR_RECT.x + DOOR_RECT.width &&
                    p.y > DOOR_RECT.y - 30) {
                    onExit();
                    return;
                }

                // Check crafting table
                const distToTable = Math.sqrt(
                    Math.pow(p.x - (CRAFTING_TABLE_RECT.x + CRAFTING_TABLE_RECT.width / 2), 2) +
                    Math.pow(p.y - (CRAFTING_TABLE_RECT.y + CRAFTING_TABLE_RECT.height / 2), 2)
                );
                if (distToTable < 100 && inventory.length > 0) {
                    onCraft();
                    return;
                }
            }

            if (e.code === 'Escape') {
                onExit();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onExit, onCraft, inventory.length]);

    // Check collision with furniture
    const checkCollision = useCallback((x: number, y: number): boolean => {
        const playerRadius = 15;

        for (const furniture of FURNITURE_COLLISIONS) {
            if (x + playerRadius > furniture.x &&
                x - playerRadius < furniture.x + furniture.width &&
                y + playerRadius > furniture.y &&
                y - playerRadius < furniture.y + furniture.height) {
                return true;
            }
        }

        // Bounds check
        if (x < 160 || x > 740 || y < 180 || y > 600) {
            // Allow door exit area
            if (x > DOOR_RECT.x && x < DOOR_RECT.x + DOOR_RECT.width && y > 550) {
                return false;
            }
            return true;
        }

        return false;
    }, []);

    // Game loop
    useEffect(() => {
        let animationFrameId: number;

        const update = () => {
            let { x, y, direction, isMoving } = playerRef.current;
            let dx = 0, dy = 0;

            if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) dy -= PLAYER_SPEED;
            if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) dy += PLAYER_SPEED;
            if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) dx -= PLAYER_SPEED;
            if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) dx += PLAYER_SPEED;

            if (dx !== 0 || dy !== 0) {
                isMoving = true;

                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    const length = Math.sqrt(dx * dx + dy * dy);
                    dx = (dx / length) * PLAYER_SPEED;
                    dy = (dy / length) * PLAYER_SPEED;
                }

                // Update direction
                if (dy < 0) direction = 'UP';
                if (dy > 0) direction = 'DOWN';
                if (dx < 0) direction = 'LEFT';
                if (dx > 0) direction = 'RIGHT';

                // Try movement
                const nextX = x + dx;
                const nextY = y + dy;

                if (!checkCollision(nextX, y)) x = nextX;
                if (!checkCollision(x, nextY)) y = nextY;
            } else {
                isMoving = false;
            }

            // Update interaction prompts
            let prompt: string | null = null;

            // Door prompt
            if (x > DOOR_RECT.x && x < DOOR_RECT.x + DOOR_RECT.width && y > DOOR_RECT.y - 50) {
                prompt = 'Press E to Exit';
            }

            // Crafting table prompt
            const distToTable = Math.sqrt(
                Math.pow(x - (CRAFTING_TABLE_RECT.x + CRAFTING_TABLE_RECT.width / 2), 2) +
                Math.pow(y - (CRAFTING_TABLE_RECT.y + CRAFTING_TABLE_RECT.height / 2), 2)
            );
            if (distToTable < 100) {
                if (inventory.length > 0) {
                    prompt = 'Press E to Craft Bouquet';
                } else {
                    prompt = 'Gather flowers first!';
                }
            }

            setInteractionPrompt(prompt);
            playerRef.current = { ...playerRef.current, x, y, direction, isMoving };
            setPlayer(playerRef.current);
        };

        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw background
            if (backgroundImageRef.current && isBackgroundLoaded) {
                ctx.drawImage(backgroundImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }

            // Draw player
            drawPlayer(ctx, playerRef.current);

            // Draw fireplace glow effect
            const time = Date.now() / 100;
            const glowIntensity = 0.15 + Math.sin(time) * 0.05;
            const gradient = ctx.createRadialGradient(390, 120, 20, 390, 120, 200);
            gradient.addColorStop(0, `rgba(255, 150, 50, ${glowIntensity})`);
            gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(200, 0, 400, 300);
        };

        const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 5, 15, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            const { direction, isMoving } = p;
            const img = areSpritesLoaded ? spriteImagesRef.current[direction] : null;

            if (!img || !img.complete || img.naturalWidth === 0) {
                // Fallback circle
                ctx.fillStyle = '#f43f5e';
                ctx.beginPath();
                ctx.arc(p.x, p.y - 10, 15, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            let imgCols = Math.floor(img.width / SPRITE_SIZE) || 1;
            let imgRows = Math.floor(img.height / SPRITE_SIZE) || 1;
            const maxFrames = imgCols * imgRows;
            const configFrameCount = SPRITE_COUNTS[direction as keyof typeof SPRITE_COUNTS] || 4;
            const effectiveFrameCount = Math.min(configFrameCount, maxFrames);

            let frameIndex = isMoving
                ? Math.floor(Date.now() / ANIMATION_SPEED) % effectiveFrameCount
                : 0;

            let col = frameIndex % imgCols;
            let row = Math.floor(frameIndex / imgCols);
            let sx = col * SPRITE_SIZE;
            let sy = row * SPRITE_SIZE;

            const drawWidth = SPRITE_SIZE * SPRITE_SCALE;
            const drawHeight = SPRITE_SIZE * SPRITE_SCALE;
            const drawX = Math.floor(p.x - drawWidth / 2);
            const drawY = Math.floor(p.y - drawHeight + 15);

            ctx.save();
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

        const loop = () => {
            update();
            draw();
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isBackgroundLoaded, areSpritesLoaded, checkCollision, inventory.length]);

    // Mobile controls
    const handleMobileControl = (key: string, isPressed: boolean) => {
        if (isPressed) {
            keysPressed.current.add(key);
        } else {
            keysPressed.current.delete(key);
        }
    };

    const handleMobileAction = () => {
        keysPressed.current.add('KeyE');
        setTimeout(() => keysPressed.current.delete('KeyE'), 100);

        const p = playerRef.current;
        // Check door
        if (p.x > DOOR_RECT.x && p.x < DOOR_RECT.x + DOOR_RECT.width && p.y > DOOR_RECT.y - 30) {
            onExit();
            return;
        }
        // Check crafting table
        const distToTable = Math.sqrt(
            Math.pow(p.x - (CRAFTING_TABLE_RECT.x + CRAFTING_TABLE_RECT.width / 2), 2) +
            Math.pow(p.y - (CRAFTING_TABLE_RECT.y + CRAFTING_TABLE_RECT.height / 2), 2)
        );
        if (distToTable < 100 && inventory.length > 0) {
            onCraft();
        }
    };

    const [isTouchDevice] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-black/50">
            <div className="relative bg-black rounded-xl overflow-hidden border-4 border-stone-700 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="block"
                />

                <InventoryHUD inventory={player.inventory} timeLabel="INSIDE" />

                {interactionPrompt && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-16 bg-black/80 text-white px-4 py-2 rounded border border-white/30 pixel-text text-sm animate-pulse pointer-events-none z-20">
                        {interactionPrompt}
                    </div>
                )}
            </div>

            {/* Mobile Controls */}
            {isTouchDevice && (
                <div
                    className="fixed bottom-0 left-0 right-0 flex justify-between items-end px-4 pb-6 pointer-events-none z-50"
                    style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
                >
                    {/* D-Pad Controls */}
                    <div className="pointer-events-auto grid grid-cols-3 gap-1" style={{ width: '180px' }}>
                        <div />
                        <button
                            className="mobile-control-btn w-14 h-14 bg-white/30 rounded-xl border-2 border-white/60 active:bg-white/60 flex items-center justify-center text-2xl text-white font-bold shadow-lg backdrop-blur-sm"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', true); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}
                        >
                            ▲
                        </button>
                        <div />

                        <button
                            className="mobile-control-btn w-14 h-14 bg-white/30 rounded-xl border-2 border-white/60 active:bg-white/60 flex items-center justify-center text-2xl text-white font-bold shadow-lg backdrop-blur-sm"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', true); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}
                        >
                            ◀
                        </button>
                        <button
                            className="mobile-control-btn w-14 h-14 bg-white/30 rounded-xl border-2 border-white/60 active:bg-white/60 flex items-center justify-center text-2xl text-white font-bold shadow-lg backdrop-blur-sm"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', true); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}
                        >
                            ▼
                        </button>
                        <button
                            className="mobile-control-btn w-14 h-14 bg-white/30 rounded-xl border-2 border-white/60 active:bg-white/60 flex items-center justify-center text-2xl text-white font-bold shadow-lg backdrop-blur-sm"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', true); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}
                        >
                            ▶
                        </button>
                    </div>

                    {/* Action Button */}
                    <button
                        className="mobile-control-btn pointer-events-auto w-20 h-20 bg-yellow-500/80 rounded-full border-4 border-yellow-300 active:bg-yellow-400 flex items-center justify-center text-white font-bold shadow-xl backdrop-blur-sm"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileAction(); }}
                    >
                        <span className="text-sm pixel-text">ACTION</span>
                    </button>
                </div>
            )}
        </div>
    );
};
