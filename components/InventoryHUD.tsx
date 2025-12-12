import React from 'react';
import { Flower } from '../types';
import { MAX_INVENTORY } from '../constants';

interface InventoryHUDProps {
    inventory: Flower[];
    timeLabel: string;
    isMobile?: boolean;
}

export const InventoryHUD: React.FC<InventoryHUDProps> = ({ inventory, timeLabel, isMobile = false }) => {
    // Mobile: horizontal strip layout
    if (isMobile) {
        return (
            <div className="w-full bg-stone-900 border-t-2 border-stone-600 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-xs font-bold pixel-text">INVENTORY</span>
                    <div className="flex gap-1">
                        {inventory.map((item, idx) => (
                            <div
                                key={idx}
                                className="w-5 h-5 rounded-full border border-white/50 shadow-[0_0_3px_rgba(255,255,255,0.5)]"
                                style={{ backgroundColor: item.color }}
                                title={item.type}
                            />
                        ))}
                        {Array.from({ length: Math.max(0, Math.min(5, MAX_INVENTORY - inventory.length)) }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="w-5 h-5 rounded-full border border-white/20 bg-white/5" />
                        ))}
                        {inventory.length < MAX_INVENTORY && MAX_INVENTORY - inventory.length > 5 && (
                            <span className="text-xs text-gray-400">+{MAX_INVENTORY - inventory.length - 5}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
                    <span>{timeLabel}</span>
                    <span className="text-yellow-400">{inventory.length}/{MAX_INVENTORY}</span>
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
