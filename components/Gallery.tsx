import React, { useState } from 'react';
import { Bouquet } from '../types';
import { bouquetSvgUrl, bouquetJpegBlob } from '../utils/bouquetArt';
import { POCKET_INFO } from '../constants';
import { ItemIcon } from './InventoryHUD';

interface GalleryProps {
  bouquets: Bouquet[];
  onBack: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({ bouquets, onBack }) => {
  // Hand-arranged bouquets show the arrangement first; the generated pixel picture is one tap away.
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const showPixel = (b: Bouquet) => !!b.imageUrl && (!b.layout || flipped.has(b.id));
  const flip = (id: string) => setFlipped(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // Download function to save image as JPG with proper filename
  const downloadImage = async (bouquet: Bouquet) => {
    try {
      // Format the filename: "Werka's Bouquet - December 9, 2024.jpg"
      const filename = `Werka's Bouquet - ${bouquet.date}.jpg`;

      const url = window.URL.createObjectURL(await bouquetJpegBlob(bouquet.flowers, showPixel(bouquet) ? bouquet.imageUrl : undefined, bouquet.extras, bouquet.layout));

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // This triggers the browser's download behavior
      // Users can configure their browser to "Ask where to save" for each download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback: open in new tab so user can right-click save
      window.open(showPixel(bouquet) ? bouquet.imageUrl : bouquetSvgUrl(bouquet.flowers, bouquet.extras, bouquet.layout), '_blank');
    }
  };

  return (
    <div className="w-full max-w-[800px] h-auto min-h-[70dvh] sm:aspect-[4/3] [@media(max-height:500px)]:h-full [@media(max-height:500px)]:min-h-0 [@media(max-height:500px)]:aspect-auto [@media(max-height:500px)]:p-3 bg-slate-900 relative rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl flex flex-col p-4 sm:p-8">
      <div className="flex justify-between items-center mb-3 sm:mb-6 [@media(max-height:500px)]:mb-2">
        <h2 className="text-xl sm:text-3xl text-purple-200 font-bold pixel-text">My Collection</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 pixel-text text-sm border-b-4 border-slate-950 active:border-b-0 active:mt-1"
        >
          EXIT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 [@media(max-height:500px)]:grid-cols-3 gap-6 [@media(max-height:500px)]:gap-3 pb-2">
          {bouquets.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center h-64 text-slate-500">
              <p className="text-xl mb-2">No bouquets yet.</p>
              <p className="text-sm">Gather flowers and craft your first one!</p>
            </div>
          ) : (
            bouquets.map((b) => (
              <div key={b.id} className="bg-white p-3 rounded shadow-xl rotate-1 hover:rotate-0 transition-transform duration-300 group">
                <div className="aspect-square bg-slate-100 mb-3 overflow-hidden rounded-sm border border-slate-200 relative">
                  <img src={showPixel(b) ? b.imageUrl : bouquetSvgUrl(b.flowers, b.extras, b.layout)} alt="Bouquet" style={{ imageRendering: 'pixelated' }} className="w-full h-full object-cover" />
                  {b.imageUrl && (
                    <button
                      onClick={() => flip(b.id)}
                      className="absolute bottom-2 left-2 px-2.5 py-1.5 bg-white/90 text-slate-800 rounded-lg shadow text-xs font-bold border border-slate-300 hover:bg-white"
                      title={showPixel(b) ? 'Show my arrangement' : 'Show the pixel-art picture'}
                    >
                      {showPixel(b) ? '💐 Mine' : '✨ Pixel art'}
                    </button>
                  )}
                  {/* Download button overlay */}
                  <button
                    onClick={() => downloadImage(b)}
                    className="absolute top-2 right-2 px-3 py-2 bg-green-600 text-white rounded-lg shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-green-500 flex items-center gap-2 text-sm font-bold"
                    title="Save to your device"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    SAVE
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <p className="font-bold text-slate-800 uppercase mb-1">{b.date}</p>
                  <p className="leading-tight line-clamp-2">{b.flowers.join(', ')}</p>
                  {b.extras && b.extras.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {b.extras.map((k, i) => (
                        <span key={i} title={POCKET_INFO[k]?.name ?? k} className="inline-flex items-center gap-0.5 pl-0.5 pr-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 whitespace-nowrap text-[10px] leading-4">
                          <ItemIcon kind={k} className="w-3.5 h-3.5" />{POCKET_INFO[k]?.name ?? k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};