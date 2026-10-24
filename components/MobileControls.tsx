import React, { useEffect, useRef, useState } from 'react';
import { POCKET_INFO } from '../constants';

interface MobileControlsProps {
  keys: React.MutableRefObject<Set<string>>;
  prompt: string | null; // e.g. "Press E to Pick Rose"
  onAction: () => void;
}

// Touch layout for coarse pointers (phones, iPads in any orientation) and narrow windows.
const query = '(pointer: coarse), (max-width: 1023px)';
export const useIsTouch = () => {
  const [touch, setTouch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setTouch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return touch;
};

// Landscape: controls float over the game so it keeps the whole screen.
export const useIsLandscape = () => {
  const [land, setLand] = useState(() => window.matchMedia('(orientation: landscape)').matches);
  useEffect(() => {
    const m = window.matchMedia('(orientation: landscape)');
    const on = () => setLand(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return land;
};

const RADIUS = 56; // joystick travel in px
const DEAD = 0.3; // fraction of RADIUS ignored
const RUN = 0.85; // fraction of RADIUS past which Werka runs

const ICONS: Record<string, string> = { Pick: '🌼', Enter: '🚪', Craft: '💐', Exit: '🚪', Talk: '💬', Next: '▶️' };

// Floating joystick: touch anywhere on the left zone, the stick appears under the thumb.
// Writes arrow keys (and a 'Run' pseudo-key) into the game's key set, so desktop and touch share one input path.
export const MobileControls: React.FC<MobileControlsProps> = ({ keys, prompt, onAction }) => {
  const overlay = useIsLandscape();
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const setDir = (dx: number, dy: number) => {
    const t = RADIUS * DEAD;
    const set = (k: string, on: boolean) => (on ? keys.current.add(k) : keys.current.delete(k));
    set('ArrowLeft', dx < -t);
    set('ArrowRight', dx > t);
    set('ArrowUp', dy < -t);
    set('ArrowDown', dy > t);
    set('Run', Math.hypot(dx, dy) > RADIUS * RUN);
  };

  const release = () => {
    pointer.current = null;
    setStick(null);
    setDir(0, 0);
  };

  const move = (e: React.PointerEvent) => {
    if (pointer.current !== e.pointerId || !stick) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS; }
    setStick({ ...stick, dx, dy });
    setDir(dx, dy);
  };

  const rect = () => zone.current!.getBoundingClientRect();
  const verb = prompt?.replace('Press E to ', '').split(' ')[0] ?? '';
  const rest = prompt?.replace('Press E to ', '').split(' ').slice(1).join(' ');
  const pickUp = prompt?.match(/Pick up (.+)/)?.[1];
  const icon = pickUp ? Object.values(POCKET_INFO).find(i => i.name === pickUp)?.emoji ?? '✨' : ICONS[verb] ?? '✋';
  const running = !!stick && Math.hypot(stick.dx, stick.dy) > RADIUS * RUN;

  return (
    <div className={overlay
      ? 'absolute inset-0 z-30 flex select-none pointer-events-none'
      : 'flex-none h-[27dvh] min-h-36 bg-stone-800 border-t-2 border-stone-600 flex select-none'}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Joystick zone */}
      <div
        ref={zone}
        className="relative flex-[3] touch-none pointer-events-auto"
        onPointerDown={(e) => {
          if (pointer.current !== null) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          setStick({ ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 });
        }}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!stick && (overlay
          ? <div className="absolute left-10 bottom-10 w-28 h-28 rounded-full border-4 border-white/20 bg-white/5 pointer-events-none" />
          : <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-28 h-28 rounded-full border-4 border-white/15 bg-white/5 flex flex-col items-center justify-center text-center text-stone-400">
                <span className="text-[9px] pixel-text leading-tight">TOUCH<br />TO MOVE</span>
              </div>
              <span className="absolute bottom-2 inset-x-0 text-center text-xs font-mono text-stone-500">push all the way to run</span>
            </div>)}
        {stick && (
          <div className="fixed pointer-events-none" style={{ left: stick.ox - RADIUS, top: stick.oy - RADIUS, width: RADIUS * 2, height: RADIUS * 2 }}>
            <div className={`absolute inset-0 rounded-full border-4 transition-colors ${running ? 'border-yellow-300 bg-yellow-200/25 shadow-[0_0_18px_rgba(253,224,71,0.6)]' : 'border-white/30 bg-white/10'}`} />
            {running && <div className="absolute -top-7 inset-x-0 text-center pixel-text text-[10px] text-yellow-300 drop-shadow">RUN</div>}
            <div className="absolute w-14 h-14 rounded-full bg-white/70 border-2 border-white shadow-lg"
              style={{ left: RADIUS - 28 + stick.dx, top: RADIUS - 28 + stick.dy }} />
          </div>
        )}
      </div>

      {/* Contextual action button */}
      <div className={`flex flex-col items-center gap-2 touch-none pointer-events-auto ${overlay ? 'absolute right-8 bottom-8' : 'flex-[2] justify-center'}`}>
        <button
          disabled={!prompt}
          onPointerDown={(e) => { e.preventDefault(); onAction(); }}
          className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-xl transition-all select-none
            ${prompt ? 'bg-yellow-500 border-yellow-300 active:scale-95 animate-pulse' : 'bg-stone-700 border-stone-600 opacity-60'}`}
          aria-label={prompt ?? 'No action available'}
        >
          <span className="text-3xl leading-none">{prompt ? icon : '·'}</span>
          <span className="pixel-text text-[10px] text-white mt-1 uppercase">{prompt ? verb : ''}</span>
        </button>
        <span className="text-[11px] text-amber-100/80 font-mono h-4 text-center px-1 truncate max-w-full">{rest}</span>
      </div>
    </div>
  );
};
