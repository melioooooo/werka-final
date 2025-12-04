import React from 'react';
import { Bouquet } from '../types';

interface GalleryProps {
  bouquets: Bouquet[];
  onBack: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({ bouquets, onBack }) => {
  return (
    <div className="w-[800px] h-[600px] bg-slate-900 relative rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl flex flex-col p-8">
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl text-purple-200 font-bold pixel-text">My Collection</h2>
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
               <div key={b.id} className="bg-white p-3 rounded shadow-xl rotate-1 hover:rotate-0 transition-transform duration-300">
                 <div className="aspect-square bg-slate-100 mb-3 overflow-hidden rounded-sm border border-slate-200">
                   <img src={b.imageUrl} alt="Bouquet" className="w-full h-full object-cover" />
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