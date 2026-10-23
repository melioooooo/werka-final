import React from 'react';
import { Flower } from '../types';
import { MAX_INVENTORY } from '../constants';

interface InventoryHUDProps {
    inventory: Flower[];
    timeLabel: string;
    isMobile?: boolean;
}

export const InventoryHUD: React.FC<InventoryHUDProps> = ({ inventory, timeLabel, isMobile = false }) => {
    // Mobile: compact strip, every basket slot visible
    if (isMobile) {
        return (
            <div className="w-full bg-stone-900 border-t-2 border-stone-600 px-3 py-2 flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 flex-1">
                    {Array.from({ length: MAX_INVENTORY }).map((_, idx) => {
                        const item = inventory[idx];
                        return (
                            <div
                                key={idx}
                                className={`w-6 h-6 rounded-full border ${item ? 'border-white/60 shadow-[0_0_4px_rgba(255,255,255,0.5)]' : 'border-white/20 bg-white/5'}`}
                                style={item ? { backgroundColor: item.color } : undefined}
                                title={item?.type}
                            />
                        );
                    })}
                </div>
                <div className="flex flex-col items-end text-xs font-bold leading-tight">
                    <span className="text-yellow-400 text-sm">{inventory.length}/{MAX_INVENTORY}</span>
                    <span className="text-gray-400">{timeLabel}</span>
                </div>
            </div>
        );
    }

    // Desktop: overlay on game screen
    return (
        <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg text-white font-mono border border-white/20 pointer-events-none select-none z-10">
            <h2 className="text-xl text-yellow-400 mb-2 pixel-text">Inventory</h2>
            <div className="flex gap-1 flex-wrap max-w-[200px]">
                {inventory.map((item, idx) => (
                    <div
                        key={idx}
                        className="w-6 h-6 rounded-full border border-white/50 shadow-[0_0_5px_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-110 animate-[pulse_0.5s_ease-out]"
                        style={{ backgroundColor: item.color }}
                        title={item.type}
                    />
                ))}
                {Array.from({ length: Math.max(0, MAX_INVENTORY - inventory.length) }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-6 h-6 rounded-full border border-white/20 bg-white/5" />
                ))}
            </div>
            <div className="mt-4 flex justify-between items-center text-xs text-gray-300 font-bold opacity-70">
                <span>{timeLabel}</span>
                <span>{inventory.length}/{MAX_INVENTORY}</span>
            </div>
        </div>
    );
};
