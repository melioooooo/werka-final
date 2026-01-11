import React, { useState } from 'react';
import { Flower, FlowerType } from '../types';

interface CraftingTableProps {
  inventory: Flower[];
  onCraft: (selectedFlowers: FlowerType[]) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export const CraftingTable: React.FC<CraftingTableProps> = ({ inventory, onCraft, onCancel, isGenerating }) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      if (newSet.size < 8) { // Increased visual max size
        newSet.add(index);
      }
    }
    setSelectedIndices(newSet);
  };

  const handleCraft = () => {
    if (selectedIndices.size === 0) return;
    const selectedFlowers = Array.from(selectedIndices).map((idx) => inventory[idx as number].type);
    onCraft(selectedFlowers);
  };

  return (
    <div className="w-full max-w-[800px] h-full sm:h-auto sm:min-h-[70%] sm:aspect-[4/3] bg-amber-900 relative rounded-xl overflow-hidden border-4 border-amber-950 shadow-2xl flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}>
      </div>

      <h2 className="text-2xl sm:text-4xl text-amber-100 font-bold mb-2 sm:mb-4 pixel-text z-10 drop-shadow-md">Crafting Station</h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-8 bg-amber-950/50 p-2 sm:p-4 rounded-lg border border-amber-700/50 max-h-[300px] sm:max-h-[40vh] overflow-y-auto w-full">
        {inventory.map((flower, idx) => (
          <button
            key={idx}
            onClick={() => toggleSelection(idx)}
            className={`
              relative aspect-square w-full rounded-lg flex flex-col items-center justify-center transition-all duration-200 p-1
              ${selectedIndices.has(idx)
                ? 'bg-green-600 ring-4 ring-yellow-400 scale-105 z-10'
                : 'bg-black/40 hover:bg-black/60 border border-white/10'}
            `}
          >
            <div
              className="w-2/3 h-2/3 rounded-full shadow-lg mb-1"
              style={{ backgroundColor: flower.color }}
            />
            <span className="text-[6px] sm:text-[8px] bg-black/80 text-white px-1 rounded w-full truncate text-center">{flower.type}</span>
          </button>
        ))}

        {/* Empty slots visualization */}
        {Array.from({ length: Math.max(0, 12 - inventory.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square w-full rounded-lg bg-black/20 border border-white/5" />
        ))}
      </div>

      <div className="text-amber-200 mb-4 sm:mb-8 text-sm sm:text-lg font-mono">
        Selected: {selectedIndices.size} / 8
      </div>

      <div className="flex gap-4 z-10">
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="px-4 sm:px-8 py-2 sm:py-3 bg-stone-600 text-stone-200 rounded border-b-4 border-stone-800 hover:bg-stone-500 active:border-b-0 active:mt-1 font-bold pixel-text disabled:opacity-50 text-sm sm:text-base"
        >
          BACK
        </button>
        <button
          onClick={handleCraft}
          disabled={selectedIndices.size === 0 || isGenerating}
          className={`
            px-4 sm:px-8 py-2 sm:py-3 rounded border-b-4 font-bold pixel-text transition-all text-sm sm:text-base
            ${isGenerating
              ? 'bg-yellow-700 text-yellow-200 border-yellow-900 cursor-wait'
              : 'bg-green-600 text-white border-green-800 hover:bg-green-500 active:border-b-0 active:mt-1'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isGenerating ? 'DREAMING...' : 'CRAFT'}
        </button>
      </div>
    </div>
  );
};