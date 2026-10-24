import React from 'react';
import { Flower } from '../types';
import { MAX_INVENTORY, MAX_POCKET, POCKET_INFO } from '../constants';

interface InventoryHUDProps {
    inventory: Flower[];
    pocket: string[];
    kisses: number;
    timeLabel: string;
    layout?: 'desktop' | 'strip' | 'side';
}

const Basket: React.FC<{ inventory: Flower[]; size: string }> = ({ inventory, size }) => (
    <>
        {Array.from({ length: MAX_INVENTORY }).map((_, idx) => {
            const item = inventory[idx];
            return (
                <div
                    key={idx}
                    className={`${size} rounded-full border flex-shrink-0 ${item ? 'border-white/60 shadow-[0_0_4px_rgba(255,255,255,0.5)]' : 'border-white/20 bg-white/5'}`}
                    style={item ? { backgroundColor: item.color } : undefined}
                    title={item?.type}
                />
            );
        })}
    </>
);

// Trinkets and kisses; the golden kiss gets its own slot past the 8.
const Pocket: React.FC<{ pocket: string[]; size: string }> = ({ pocket, size }) => {
    const normal = pocket.filter(k => k !== 'golden_kiss');
    const golden = pocket.filter(k => k === 'golden_kiss');
    const slot = (k: string | undefined, key: string, gold = false) => (
        <div
            key={key}
            className={`${size} rounded-md border flex items-center justify-center flex-shrink-0 leading-none
                ${gold ? 'border-yellow-300 bg-yellow-400/30 shadow-[0_0_6px_rgba(250,204,21,0.8)]' : k ? 'border-white/50 bg-white/15' : 'border-white/15 bg-white/5'}`}
            title={k ? POCKET_INFO[k]?.name : undefined}
        >
            {k ? POCKET_INFO[k]?.emoji : ''}
        </div>
    );
    return (
        <>
            {Array.from({ length: MAX_POCKET }).map((_, i) => slot(normal[i], `p${i}`))}
            {golden.map((k, i) => slot(k, `g${i}`, true))}
        </>
    );
};

const Kisses: React.FC<{ kisses: number; className?: string }> = ({ kisses, className = '' }) => (
    <span className={`text-pink-300 font-bold whitespace-nowrap ${className}`} title="Elio's kisses, all time">💋 {kisses}</span>
);

export const InventoryHUD: React.FC<InventoryHUDProps> = ({ inventory, pocket, kisses, timeLabel, layout = 'desktop' }) => {
    // Phone portrait: strip between the game and the controls
    if (layout === 'strip') {
        return (
            <div className="w-full bg-stone-900 border-t-2 border-stone-600 px-3 py-1.5 flex flex-col gap-1.5 select-none">
                <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1 flex-1"><Basket inventory={inventory} size="w-[22px] h-[22px]" /></div>
                    <span className="text-yellow-400 text-base font-bold leading-none">{inventory.length}/{MAX_INVENTORY}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1 flex-1 text-[15px]"><Pocket pocket={pocket} size="w-[26px] h-[26px]" /></div>
                    <div className="flex flex-col items-end leading-none text-base">
                        <Kisses kisses={kisses} />
                        <span className="text-gray-400 text-sm">{timeLabel}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Phone/iPad landscape: small panel floating top-left, over the gutter beside the game
    if (layout === 'side') {
        return (
            <div className="absolute top-2 left-2 z-40 bg-black/65 rounded-lg border border-white/15 p-2 pointer-events-none select-none w-[148px]"
                style={{ marginLeft: 'env(safe-area-inset-left)' }}>
                <div className="flex flex-wrap gap-1"><Basket inventory={inventory} size="w-[18px] h-[18px]" /></div>
                <div className="flex flex-wrap gap-1 mt-1.5 text-[13px]"><Pocket pocket={pocket} size="w-[22px] h-[22px]" /></div>
                <div className="flex justify-between items-center mt-1.5 text-sm leading-none">
                    <Kisses kisses={kisses} />
                    <span className="text-yellow-400 font-bold">{inventory.length}/{MAX_INVENTORY}</span>
                    <span className="text-gray-400">{timeLabel}</span>
                </div>
            </div>
        );
    }

    // Desktop: overlay on game screen
    return (
        <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg text-white font-mono border border-white/20 pointer-events-none select-none z-10">
            <h2 className="text-xl text-yellow-400 mb-2 pixel-text">Inventory</h2>
            <div className="flex gap-1 flex-wrap max-w-[200px]"><Basket inventory={inventory} size="w-6 h-6" /></div>
            <h2 className="text-sm text-pink-300 mt-3 mb-1.5 pixel-text">Pocket</h2>
            <div className="flex gap-1 flex-wrap max-w-[200px] text-base"><Pocket pocket={pocket} size="w-7 h-7" /></div>
            <div className="mt-3 flex justify-between items-center text-xs text-gray-300 font-bold gap-3">
                <span className="opacity-70">{timeLabel}</span>
                <Kisses kisses={kisses} className="text-sm" />
                <span className="opacity-70">{inventory.length}/{MAX_INVENTORY}</span>
            </div>
        </div>
    );
};
