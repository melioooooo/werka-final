import React, { useState } from 'react';
import { Flower, FlowerType } from '../types';
import { MAX_BOUQUET_SIZE, MAX_EXTRAS, POCKET_INFO } from '../constants';

interface CraftingTableProps {
  inventory: Flower[];
  pocket: string[];
  onCraft: (selectedFlowers: FlowerType[], extras: string[]) => void;
  onCancel: () => void;
}

export const CraftingTable: React.FC<CraftingTableProps> = ({ inventory, pocket, onCraft, onCancel }) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [extras, setExtras] = useState<number[]>([]); // pocket indices

  const toggleExtra = (i: number) =>
    setExtras(prev => (prev.includes(i) ? prev.filter(x => x !== i) : prev.length < MAX_EXTRAS ? [...prev, i] : prev));

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      if (newSet.size < MAX_BOUQUET_SIZE) {
        newSet.add(index);
      }
    }
    setSelectedIndices(newSet);
  };

  const handleCraft = () => {
    if (selectedIndices.size === 0) return;
    const selectedFlowers = Array.from(selectedIndices).map((idx) => inventory[idx as number].type);
    onCraft(selectedFlowers, extras.map(i => pocket[i]));
  };

  return (
    <div className="w-full max-w-[800px] h-full sm:h-auto sm:min-h-[70%] sm:aspect-[4/3] [@media(max-height:500px)]:h-full [@media(max-height:500px)]:aspect-auto [@media(max-height:500px)]:justify-start [@media(max-height:500px)]:py-2 bg-amber-900 relative rounded-xl overflow-x-hidden overflow-y-auto border-4 border-amber-950 shadow-2xl flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}>
      </div>

      <h2 className="text-2xl sm:text-4xl [@media(max-height:500px)]:text-lg [@media(max-height:500px)]:mb-1 text-amber-100 font-bold mb-2 sm:mb-4 pixel-text z-10 drop-shadow-md">Crafting Station</h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 [@media(max-height:500px)]:grid-cols-8 [@media(max-height:500px)]:mb-2 [@media(max-height:500px)]:max-h-none gap-2 sm:gap-3 mb-4 sm:mb-8 bg-amber-950/50 p-2 sm:p-4 rounded-lg border border-amber-700/50 max-h-[300px] sm:max-h-[40vh] overflow-y-auto w-full">
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

      <div className="text-amber-200 mb-2 sm:mb-4 text-base sm:text-lg font-mono">
        Flowers: {selectedIndices.size} / {MAX_BOUQUET_SIZE}
      </div>

      {pocket.length > 0 && (
        <div className="z-10 w-full mb-4 sm:mb-6">
          <div className="text-pink-200 text-base sm:text-lg font-mono mb-1 text-center">Decorate with up to {MAX_EXTRAS} from your pocket: {extras.length} / {MAX_EXTRAS}</div>
          <div className="flex flex-wrap justify-center gap-2">
            {pocket.map((k, i) => {
              const on = extras.includes(i);
              const info = POCKET_INFO[k];
              return (
                <button
                  key={i}
                  onClick={() => toggleExtra(i)}
                  title={info?.name}
                  aria-pressed={on}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-2xl sm:text-3xl flex items-center justify-center transition-all
                    ${on ? 'bg-pink-500/70 ring-4 ring-yellow-400 scale-105' : 'bg-black/40 border border-white/10 hover:bg-black/60'}`}
                >
                  {info?.emoji ?? '?'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 z-10">
        <button
          onClick={onCancel}
          className="px-4 sm:px-8 py-2 sm:py-3 bg-stone-600 text-stone-200 rounded border-b-4 border-stone-800 hover:bg-stone-500 active:border-b-0 active:mt-1 font-bold pixel-text disabled:opacity-50 text-sm sm:text-base"
        >
          BACK
        </button>
        <button
          onClick={handleCraft}
          disabled={selectedIndices.size === 0}
          className={`
            px-4 sm:px-8 py-2 sm:py-3 rounded border-b-4 font-bold pixel-text transition-all text-sm sm:text-base
            bg-green-600 text-white border-green-800 hover:bg-green-500 active:border-b-0 active:mt-1
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          CRAFT
        </button>
      </div>
    </div>
  );
};