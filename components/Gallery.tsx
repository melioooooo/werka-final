import React from 'react';
import { Bouquet } from '../types';

interface GalleryProps {
  bouquets: Bouquet[];
  onBack: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({ bouquets, onBack }) => {
  // Download function to save image as JPG with proper filename
  const downloadImage = async (bouquet: Bouquet) => {
    try {
      // Format the filename: "Werka's Bouquet - December 9, 2024.jpg"
      const filename = `Werka's Bouquet - ${bouquet.date}.jpg`;

      let blob: Blob;

      if (bouquet.imageUrl.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(bouquet.imageUrl);
        blob = await response.blob();
      } else {
        // Fetch from URL
        const response = await fetch(bouquet.imageUrl);
        blob = await response.blob();
      }

      // Ensure it's JPG format
      const jpgBlob = new Blob([blob], { type: 'image/jpeg' });
      const url = window.URL.createObjectURL(jpgBlob);

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
      window.open(bouquet.imageUrl, '_blank');
    }
  };

  return (
    <div className="w-full max-w-[800px] h-auto max-h-[90vh] aspect-[4/3] bg-slate-900 relative rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl flex flex-col p-4 sm:p-8">
      <div className="flex justify-between items-center mb-3 sm:mb-6">
        <h2 className="text-xl sm:text-3xl text-purple-200 font-bold pixel-text">My Collection</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 pixel-text text-sm border-b-4 border-slate-950 active:border-b-0 active:mt-1"
        >
          EXIT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-2 gap-6">
          {bouquets.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center h-64 text-slate-500">
              <p className="text-xl mb-2">No bouquets yet.</p>
              <p className="text-sm">Gather flowers and craft your first one!</p>
            </div>
          ) : (
            bouquets.map((b) => (
              <div key={b.id} className="bg-white p-3 rounded shadow-xl rotate-1 hover:rotate-0 transition-transform duration-300 group">
                <div className="aspect-square bg-slate-100 mb-3 overflow-hidden rounded-sm border border-slate-200 relative">
                  <img src={b.imageUrl} alt="Bouquet" className="w-full h-full object-cover" />
                  {/* Download button overlay */}
                  <button
                    onClick={() => downloadImage(b)}
                    className="absolute bottom-2 right-2 px-3 py-2 bg-green-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-green-500 flex items-center gap-2 text-sm font-bold"
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
                  <p className="leading-tight">{b.flowers.join(', ')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};