import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Flower, Player } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, PLAYER_SPRITES, SPRITE_SIZE, SPRITE_SCALE, SPRITE_COUNTS, ANIMATION_SPEED } from '../constants';
import { InventoryHUD } from './InventoryHUD';

interface HouseInteriorProps {
    inventory: Flower[];
    onExit: () => void;
    onCraft: () => void;
}

const FURNITURE_COLLISIONS = [
    { x: 280, y: 0, width: 200, height: 180 },
    { x: 520, y: 50, width: 120, height: 100 },
    { x: 680, y: 50, width: 60, height: 150 },
    { x: 380, y: 220, width: 80, height: 80 },
    { x: 580, y: 350, width: 150, height: 100 },
    { x: 0, y: 0, width: 150, height: 350 },
    { x: 80, y: 520, width: 120, height: 80 },
    { x: 720, y: 480, width: 100, height: 100 },
    { x: 0, y: 0, width: CANVAS_WIDTH, height: 50 },
    { x: 0, y: 350, width: 80, height: 250 },
    { x: 750, y: 200, width: 100, height: 400 },
];

const DOOR_RECT = { x: 360, y: 580, width: 80, height: 50 };
const CRAFTING_TABLE_RECT = { x: 580, y: 350, width: 150, height: 120 };

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.code);
            if (e.code === 'KeyE' || e.code === 'Space') {
                const p = playerRef.current;
                if (p.x > DOOR_RECT.x && p.x < DOOR_RECT.x + DOOR_RECT.width && p.y > DOOR_RECT.y - 30) {
                    onExit();
                    return;
                }
                const dist = Math.sqrt(Math.pow(p.x - (CRAFTING_TABLE_RECT.x + 75), 2) + Math.pow(p.y - (CRAFTING_TABLE_RECT.y + 60), 2));
                if (dist < 100 && inventory.length > 0) onCraft();
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
    }, [onExit, onCraft, inventory.length]);

    const checkCollision = useCallback((x: number, y: number): boolean => {
        const r = 15;
        for (const f of FURNITURE_COLLISIONS) {
            if (x + r > f.x && x - r < f.x + f.width && y + r > f.y && y - r < f.y + f.height) return true;
        }
        if (x < 160 || x > 740 || y < 180 || y > 600) {
            if (x > DOOR_RECT.x && x < DOOR_RECT.x + DOOR_RECT.width && y > 550) return false;
            return true;
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
        setTimeout(() => keysPressed.current.delete('KeyE'), 100);
        const p = playerRef.current;
        if (p.x > DOOR_RECT.x && p.x < DOOR_RECT.x + DOOR_RECT.width && p.y > DOOR_RECT.y - 30) { onExit(); return; }
        const dist = Math.sqrt(Math.pow(p.x - (CRAFTING_TABLE_RECT.x + 75), 2) + Math.pow(p.y - (CRAFTING_TABLE_RECT.y + 60), 2));
        if (dist < 100 && inventory.length > 0) onCraft();
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-black/50">
            <div className="relative bg-black rounded-xl overflow-hidden border-4 border-stone-700 shadow-2xl">
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block" />
                <InventoryHUD inventory={player.inventory} timeLabel="INSIDE" />
                {interactionPrompt && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-16 bg-black/80 text-white px-4 py-2 rounded border border-white/30 pixel-text text-sm animate-pulse pointer-events-none z-20">
                        {interactionPrompt}
                    </div>
                )}
            </div>

            {/* Mobile Controls - CSS-only, hidden on lg screens */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-between items-end px-4 pb-6 z-[9999]" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
                <div className="grid grid-cols-3 gap-1" style={{ width: '180px' }}>
                    <div />
                    <button className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowUp', false); }}>▲</button>
                    <div />
                    <button className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowLeft', false); }}>◀</button>
                    <button className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowDown', false); }}>▼</button>
                    <button className="w-14 h-14 bg-slate-800 rounded-xl border-2 border-slate-500 active:bg-slate-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg"
                        onTouchStart={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', true); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleMobileControl('ArrowRight', false); }}>▶</button>
                </div>
                <button className="w-20 h-20 bg-yellow-500 rounded-full border-4 border-yellow-300 active:bg-yellow-400 flex items-center justify-center text-white font-bold shadow-xl"
                    onTouchStart={(e) => { e.preventDefault(); handleMobileAction(); }}>
                    <span className="text-sm pixel-text">ACTION</span>
                </button>
            </div>
        </div>
    );
};
