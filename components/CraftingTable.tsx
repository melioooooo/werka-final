import React, { useMemo, useRef, useState } from 'react';
import { Flower, FlowerType, BouquetLayout } from '../types';
import { MAX_BOUQUET_SIZE, MAX_EXTRAS, POCKET_INFO } from '../constants';
import { ItemIcon } from './InventoryHUD';
import { flowerIcon } from '../utils/draw';
import {
  Place, autoFlower, autoExtras, headMarkup, headRadius, stemMarkup, extraMarkup, placeTransform,
  BOUQUET_BACK, BOUQUET_WRAP, toPx,
} from '../utils/bouquetArt';

interface CraftingTableProps {
  inventory: Flower[];
  pocket: string[];
  onCraft: (selectedFlowers: FlowerType[], extras: string[], layout: BouquetLayout) => void;
  onCancel: () => void;
}

type P = Place & { moved?: boolean };
type Sel = { kind: 'f' | 'e'; i: number } | null;

const clamp = (v: number, lo = -0.94, hi = 0.94) => Math.max(lo, Math.min(hi, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;
// Hand-moved pieces stay put; the others follow the auto layout for the new count.
const relayoutFlowers = (ps: P[]) => ps.map((p, i) => (p.moved ? p : autoFlower(i, ps.length)));
const relayoutExtras = (ps: P[], kinds: string[]) => {
  const auto = autoExtras(kinds);
  return ps.map((p, i) => (p.moved ? p : auto[i]));
};

export const CraftingTable: React.FC<CraftingTableProps> = ({ inventory, pocket, onCraft, onCancel }) => {
  // One state object so quick taps always build on the latest arrangement.
  const [st, setSt] = useState<{ sel: number[]; fl: P[]; ex: number[]; exP: P[] }>({ sel: [], fl: [], ex: [], exP: [] });
  const { sel, fl, ex, exP } = st;
  const [active, setActive] = useState<Sel>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const types = sel.map(i => inventory[i].type);
  const kinds = ex.map(i => pocket[i]);

  const toggleFlower = (idx: number) => setSt(s => {
    const at = s.sel.indexOf(idx);
    if (at >= 0) { setActive(null); return { ...s, sel: s.sel.filter((_, j) => j !== at), fl: relayoutFlowers(s.fl.filter((_, j) => j !== at)) }; }
    if (s.sel.length >= MAX_BOUQUET_SIZE) return s;
    setActive({ kind: 'f', i: s.sel.length });
    return { ...s, sel: [...s.sel, idx], fl: relayoutFlowers([...s.fl, { x: 0, y: 0 }]) };
  });
  const toggleExtra = (idx: number) => setSt(s => {
    const at = s.ex.indexOf(idx);
    if (at >= 0) {
      setActive(null);
      const nx = s.ex.filter((_, j) => j !== at);
      return { ...s, ex: nx, exP: relayoutExtras(s.exP.filter((_, j) => j !== at), nx.map(i => pocket[i])) };
    }
    if (s.ex.length >= MAX_EXTRAS) return s;
    setActive({ kind: 'e', i: s.ex.length });
    const nx = [...s.ex, idx];
    return { ...s, ex: nx, exP: relayoutExtras([...s.exP, { x: 0, y: 0 }], nx.map(i => pocket[i])) };
  });

  const shuffle = () => {
    setSt(s => ({
      ...s,
      fl: s.fl.map(() => {
        const ang = (Math.random() - 0.5) * 2.2, len = 120 + Math.random() * 110;
        return { x: clamp(Math.sin(ang) * len / 256), y: clamp((380 - Math.cos(ang) * len) / 256 - 1), r: Math.round((Math.random() - 0.5) * 50), moved: true };
      }),
      exP: s.exP.map((p, i) => {
        if (pocket[s.ex[i]] === 'ribbon') return { ...p, x: 0, y: 124 / 256, r: Math.round((Math.random() - 0.5) * 20), moved: true };
        const a = Math.random() * Math.PI * 2, d = 0.25 + Math.random() * 0.45;
        return { x: clamp(Math.cos(a) * d * 1.2), y: clamp(Math.sin(a) * d * 0.7 + 0.15), r: Math.round((Math.random() - 0.5) * 40), s: p.s, moved: true };
      }),
    }));
    setActive(null);
  };
  const reset = () => {
    setSt(s => ({ ...s, fl: relayoutFlowers(s.fl.map(() => ({ x: 0, y: 0 }))), exP: relayoutExtras(s.exP.map(() => ({ x: 0, y: 0 })), s.ex.map(i => pocket[i])) }));
    setActive(null);
  };

  const update = (a: NonNullable<Sel>, f: (p: P) => P) =>
    setSt(s => (a.kind === 'f' ? { ...s, fl: s.fl.map((p, j) => (j === a.i ? f(p) : p)) } : { ...s, exP: s.exP.map((p, j) => (j === a.i ? f(p) : p)) }));

  const svgPoint = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
  };
  const startDrag = (e: React.PointerEvent, s: NonNullable<Sel>) => {
    e.stopPropagation();
    e.preventDefault();
    const p = (s.kind === 'f' ? fl : exP)[s.i];
    const pt = svgPoint(e);
    drag.current = { id: e.pointerId, dx: p.x - pt.x, dy: p.y - pt.y };
    svgRef.current?.setPointerCapture(e.pointerId);
    setActive(s);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !active) return;
    const pt = svgPoint(e);
    update(active, p => ({ ...p, x: clamp(pt.x + d.dx), y: clamp(pt.y + d.dy), moved: true }));
  };
  const endDrag = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!active) return;
    const step = e.shiftKey ? 0.08 : 0.02;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = mv[e.key];
    if (!m) return;
    e.preventDefault();
    update(active, p => ({ ...p, x: clamp(p.x + m[0]), y: clamp(p.y + m[1]), moved: true }));
  };
  const rotate = (deg: number) => active && update(active, p => ({ ...p, r: ((p.r ?? 0) + deg) % 360, moved: true }));
  const scale = (k: number) => active && update(active, p => ({ ...p, s: Math.max(0.6, Math.min(1.7, (p.s ?? 1) * k)), moved: true }));

  const handleCraft = () => {
    if (sel.length === 0) return;
    const layout: BouquetLayout = {
      flowers: fl.map(p => ({ x: r3(p.x), y: r3(p.y), ...(p.r ? { r: Math.round(p.r) } : {}) })),
      extras: exP.map(p => ({ x: r3(p.x), y: r3(p.y), ...(p.r ? { r: Math.round(p.r) } : {}), ...(p.s && p.s !== 1 ? { s: r3(p.s) } : {}) })),
    };
    onCraft(types, kinds, layout);
  };

  const stems = useMemo(() => fl.map(stemMarkup).join(''), [fl]);
  // Draw order: flowers, then trinkets; the piece being handled goes on top.
  const order = (n: number, kind: 'f' | 'e') => {
    const idx = Array.from({ length: n }, (_, i) => i);
    if (kind === 'e') idx.sort((a, b) => Number(kinds[b] === 'ribbon') - Number(kinds[a] === 'ribbon')); // the bow sits under the charms
    if (active?.kind === kind) { idx.splice(active.i, 1); idx.push(active.i); }
    return idx;
  };
  const act = active ? (active.kind === 'f' ? fl : exP)[active.i] : null;
  const actR = active ? (active.kind === 'f' ? headRadius(active.i) + 6 : 34 * (act?.s ?? 1)) : 0;
  const tool = 'w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg bg-amber-950/70 border border-amber-600/50 text-amber-100 font-bold hover:bg-amber-800 active:scale-95 disabled:opacity-30 flex items-center justify-center';

  return (
    <div className="w-full max-w-[900px] h-full sm:h-auto sm:max-h-full [@media(max-height:500px)]:h-full [@media(max-height:500px)]:max-h-none bg-amber-900 relative rounded-xl overflow-x-hidden overflow-y-auto border-4 border-amber-950 shadow-2xl flex flex-col p-3 sm:p-6 [@media(max-height:500px)]:p-2">
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}>
      </div>

      <h2 className="text-xl sm:text-3xl [@media(max-height:500px)]:hidden text-amber-100 font-bold mb-2 sm:mb-4 pixel-text z-10 drop-shadow-md text-center">Crafting Station</h2>

      <div className="z-10 flex flex-col sm:flex-row [@media(max-height:500px)]:flex-row gap-3 sm:gap-5 min-h-0">
        {/* Bouquet preview: drag pieces around */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 sm:w-[46%] [@media(max-height:500px)]:w-auto [@media(max-height:500px)]:h-[calc(100dvh-1.5rem)]">
          <div className="relative w-full max-w-[320px] sm:max-w-none aspect-square [@media(max-height:500px)]:h-[calc(100%-3rem)] [@media(max-height:500px)]:w-auto rounded-lg overflow-hidden border-4 border-amber-950 shadow-inner bg-amber-50">
            <svg
              ref={svgRef}
              viewBox="0 0 512 512"
              className="block w-full h-full touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-yellow-400"
              tabIndex={0}
              role="application"
              aria-label="Bouquet arrangement: drag flowers and trinkets, arrow keys move the selected piece"
              onPointerDown={() => setActive(null)}
              onPointerMove={onMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKey}
            >
              <g dangerouslySetInnerHTML={{ __html: BOUQUET_BACK }} />
              <g dangerouslySetInnerHTML={{ __html: stems }} />
              <g dangerouslySetInnerHTML={{ __html: BOUQUET_WRAP }} />
              {order(sel.length, 'f').map(i => (
                <g key={`f${sel[i]}`} data-piece={`f${i}`} transform={placeTransform(fl[i])} className="cursor-grab" onPointerDown={e => startDrag(e, { kind: 'f', i })}
                  dangerouslySetInnerHTML={{ __html: headMarkup(types[i], i) }} />
              ))}
              {order(ex.length, 'e').map(i => (
                <g key={`e${ex[i]}`} data-piece={`e${i}`} transform={placeTransform(exP[i])} className="cursor-grab" onPointerDown={e => startDrag(e, { kind: 'e', i })}>
                  <circle r="30" fill="transparent" />
                  <g dangerouslySetInnerHTML={{ __html: extraMarkup(kinds[i]) }} />
                </g>
              ))}
              {act && (
                <circle cx={toPx(act.x)} cy={toPx(act.y)} r={actR} fill="none" stroke="#facc15" strokeWidth="4" strokeDasharray="10 8" pointerEvents="none">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${toPx(act.x)} ${toPx(act.y)}`} to={`360 ${toPx(act.x)} ${toPx(act.y)}`} dur="8s" repeatCount="indefinite" />
                </circle>
              )}
              {sel.length === 0 && (
                <text x="256" y="200" textAnchor="middle" fontSize="26" fill="#92400e" fontFamily="monospace">Pick flowers to start</text>
              )}
            </svg>
          </div>
          <div className="flex gap-1 sm:gap-1.5 items-center justify-center flex-nowrap">
            <button className={`${tool} text-xl`} onClick={() => rotate(-15)} disabled={!active} title="Rotate left" aria-label="Rotate left">↺</button>
            <button className={`${tool} text-xl`} onClick={() => rotate(15)} disabled={!active} title="Rotate right" aria-label="Rotate right">↻</button>
            <button className={`${tool} text-xl`} onClick={() => scale(1 / 1.15)} disabled={active?.kind !== 'e'} title="Smaller" aria-label="Smaller">−</button>
            <button className={`${tool} text-xl`} onClick={() => scale(1.15)} disabled={active?.kind !== 'e'} title="Bigger" aria-label="Bigger">+</button>
            <button className={`${tool} w-auto sm:w-auto px-2 sm:px-2.5 text-[10px] pixel-text`} onClick={shuffle} disabled={sel.length + ex.length === 0} title="Shuffle the arrangement">Shuffle</button>
            <button className={`${tool} w-auto sm:w-auto px-2 sm:px-2.5 text-[10px] pixel-text`} onClick={reset} disabled={sel.length + ex.length === 0} title="Back to the tidy layout">Tidy</button>
          </div>
        </div>

        {/* Ingredients */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 sm:gap-3 [@media(max-height:500px)]:overflow-y-auto [@media(max-height:500px)]:h-[calc(100dvh-1.5rem)]">
          <p className="text-amber-200/90 text-sm sm:text-base font-mono leading-tight text-center">
            Tap to add, then drag them on the bouquet. Tap a piece to turn or resize it.
          </p>
          <div className="text-amber-200 text-base sm:text-lg font-mono text-center">Flowers: {sel.length} / {MAX_BOUQUET_SIZE}</div>
          <div className="grid grid-cols-6 sm:grid-cols-4 [@media(max-height:500px)]:grid-cols-6 gap-1.5 sm:gap-2 bg-amber-950/50 p-2 rounded-lg border border-amber-700/50 w-full">
            {inventory.map((flower, idx) => {
              const on = sel.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleFlower(idx)}
                  aria-pressed={on}
                  className={`relative aspect-square w-full rounded-lg flex flex-col items-center justify-center transition-all duration-200 p-1 overflow-hidden
                    ${on ? 'bg-green-600 ring-4 ring-yellow-400 z-10' : 'bg-black/40 hover:bg-black/60 border border-white/10'}`}
                >
                  <img src={flowerIcon(flower)} alt="" className="w-full h-3/4 object-cover scale-[1.6] origin-[50%_70%]" style={{ imageRendering: 'pixelated' }} draggable={false} />
                  <span className="relative z-10 text-[7px] sm:text-[9px] bg-black/80 text-white px-0.5 rounded w-full truncate text-center">{flower.type}</span>
                </button>
              );
            })}
            {Array.from({ length: Math.max(0, 12 - inventory.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square w-full rounded-lg bg-black/20 border border-white/5" />
            ))}
          </div>

          {pocket.length > 0 && (
            <div className="w-full">
              <div className="text-pink-200 text-base sm:text-lg font-mono mb-1 text-center">Trinkets: {ex.length} / {MAX_EXTRAS}</div>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 p-1">
                {pocket.map((k, i) => {
                  const on = ex.includes(i);
                  const info = POCKET_INFO[k];
                  return (
                    <button
                      key={i}
                      onClick={() => toggleExtra(i)}
                      title={info?.name}
                      aria-label={info?.name}
                      aria-pressed={on}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-all
                        ${on ? 'bg-pink-500/70 ring-4 ring-yellow-400' : 'bg-black/40 border border-white/10 hover:bg-black/60'}`}
                    >
                      <ItemIcon kind={k} className="w-8 h-8" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center mt-1 pb-1">
            <button
              onClick={onCancel}
              className="px-4 sm:px-8 py-2 sm:py-3 bg-stone-600 text-stone-200 rounded border-b-4 border-stone-800 hover:bg-stone-500 active:border-b-0 active:mt-1 font-bold pixel-text text-sm sm:text-base"
            >
              BACK
            </button>
            <button
              onClick={handleCraft}
              disabled={sel.length === 0}
              className="px-4 sm:px-8 py-2 sm:py-3 rounded border-b-4 font-bold pixel-text transition-all text-sm sm:text-base bg-green-600 text-white border-green-800 hover:bg-green-500 active:border-b-0 active:mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CRAFT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
