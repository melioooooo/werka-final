import React, { useState, useEffect } from 'react';
import { GameEngine } from './components/GameEngine';
import { CraftingTable } from './components/CraftingTable';
import { Gallery } from './components/Gallery';
import { GameState, Flower, Bouquet, FlowerType } from './types';
import { generateBouquetImage } from './services/geminiService';

// Styled Start Menu Component
const StartMenu: React.FC<{
  onStart: () => void;
  onReset: () => void;
  bouquets: Bouquet[];
}> = ({ onStart, onReset, bouquets }) => (
  <div className="w-[800px] h-[600px] bg-amber-900 flex flex-col items-center justify-center p-8 rounded-xl border-[16px] border-amber-950 relative overflow-hidden shadow-2xl">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10 pointer-events-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
    </div>

    {/* Title */}
    <div className="z-10 text-center mb-12 relative">
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-amber-300/40 font-bold tracking-[0.5em] text-sm w-full whitespace-nowrap">THE FLOWER GATHERING GAME</div>
      <h1 className="text-7xl text-amber-100 font-bold pixel-text drop-shadow-[8px_8px_0_rgba(0,0,0,0.6)] leading-tight stroke-black">
        WERKA'S<br />BOUQUET
      </h1>
      {/* Decorative divider */}
      <div className="flex items-center justify-center gap-4 mt-6 opacity-80">
        <div className="h-1 w-16 bg-amber-400 rounded-full"></div>
        <div className="w-4 h-4 rotate-45 bg-green-500 border-2 border-green-700"></div>
        <div className="h-1 w-16 bg-amber-400 rounded-full"></div>
      </div>
    </div>

    {/* Start Button */}
    <button
      onClick={onStart}
      className="group relative px-12 py-6 bg-green-600 text-green-100 text-2xl rounded border-b-[6px] border-green-800 hover:bg-green-500 hover:border-green-700 active:border-b-0 active:mt-[6px] active:mb-0 transition-all mb-12 z-10 pixel-text font-bold shadow-[0_10px_20px_rgba(0,0,0,0.3)]"
    >
      START NEW DAY
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-2xl">🌻</div>
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-2xl">🌻</div>
    </button>

    {/* Reset Button */}
    <button
      onClick={onReset}
      className="mb-8 text-amber-500/50 text-xs font-mono hover:text-amber-400 hover:underline transition-colors"
    >
      [RESET PROGRESS]
    </button>

    {/* Past Collections */}
    <div className="w-full max-w-2xl z-10 bg-amber-950/40 p-4 rounded-lg border border-amber-900/50 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-amber-200 pixel-text text-sm tracking-wider">PREVIOUS COLLECTIONS</h3>
        <span className="text-amber-400/60 text-xs font-mono">{bouquets.length} BOUQUETS</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {bouquets.length === 0 ? (
          <div className="w-full py-4 text-center text-amber-500/50 font-mono text-sm italic">
            No bouquets crafted yet...
          </div>
        ) : (
          bouquets.slice(0, 5).map(b => (
            <div key={b.id} className="flex-shrink-0 w-20 h-20 bg-amber-100 p-1 rounded border border-amber-800/30 shadow-md hover:scale-110 transition-transform duration-200" title={b.date}>
              <img src={b.imageUrl} alt="Bouquet" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

// Intro Sequence Component
const Intro: React.FC<{ date: string; onComplete: () => void }> = ({ date, onComplete }) => {
  const [text, setText] = useState("");
  const fullText = `Hey Werka, today's date is ${date}... Have fun crafting today's bouquet!`;

  useEffect(() => {
    let idx = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, idx + 1));
      idx++;
      if (idx >= fullText.length) {
        clearInterval(timer);
        setTimeout(onComplete, 2000); // Wait 2 seconds then start
      }
    }, 50); // Typing speed
    return () => clearInterval(timer);
  }, [date, onComplete, fullText]);

  return (
    <div className="w-[800px] h-[600px] bg-black flex items-center justify-center p-12 rounded-xl border-4 border-stone-800">
      <p className="text-green-400 font-mono text-2xl md:text-3xl leading-relaxed typing-cursor">
        {text}
      </p>
      <style>{`
        .typing-cursor::after {
          content: '▋';
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START_MENU);
  const [inventory, setInventory] = useState<Flower[]>([]);
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    // Set current date on mount
    const d = new Date();
    setCurrentDate(d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

    // Load state from localStorage
    const savedInventory = localStorage.getItem('werka_inventory');
    const savedBouquets = localStorage.getItem('werka_bouquets');

    if (savedInventory) {
      try {
        setInventory(JSON.parse(savedInventory));
      } catch (e) {
        console.error("Failed to load inventory", e);
      }
    }

    if (savedBouquets) {
      try {
        setBouquets(JSON.parse(savedBouquets));
      } catch (e) {
        console.error("Failed to load bouquets", e);
      }
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    localStorage.setItem('werka_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('werka_bouquets', JSON.stringify(bouquets));
  }, [bouquets]);

  const handleResetProgress = () => {
    if (confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
      localStorage.removeItem('werka_inventory');
      localStorage.removeItem('werka_bouquets');
      setInventory([]);
      setBouquets([]);
      alert("Progress reset.");
    }
  };

  const handleStartGame = () => {
    setGameState(GameState.INTRO);
  };

  const handleIntroComplete = () => {
    setGameState(GameState.EXPLORING);
  };

  const handleEnterHouse = (currentInventory: Flower[]) => {
    setInventory(currentInventory);
    setGameState(GameState.CRAFTING);
  };

  const handleCraftBouquet = async (selectedTypes: FlowerType[]) => {
    setIsGenerating(true);
    try {
      const imageUrl = await generateBouquetImage(selectedTypes);

      const newBouquet: Bouquet = {
        id: Date.now().toString(),
        date: currentDate,
        flowers: selectedTypes,
        imageUrl: imageUrl,
        description: `A lovely arrangement of ${selectedTypes.join(', ')}.`
      };

      setBouquets(prev => [newBouquet, ...prev]);

      // Clear crafted items from inventory
      const newInventory = [...inventory];
      selectedTypes.forEach(type => {
        const idx = newInventory.findIndex(f => f.type === type);
        if (idx !== -1) {
          newInventory.splice(idx, 1);
        }
      });
      setInventory(newInventory);
      setGameState(GameState.GALLERY);
    } catch (e) {
      console.error(e);
      alert("Failed to craft bouquet. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">

      <div className="max-w-4xl w-full flex flex-col items-center">

        <div className="transition-all duration-500 transform shadow-2xl rounded-xl">
          {gameState === GameState.START_MENU && (
            <StartMenu onStart={handleStartGame} onReset={handleResetProgress} bouquets={bouquets} />
          )}

          {gameState === GameState.INTRO && (
            <Intro date={currentDate} onComplete={handleIntroComplete} />
          )}

          {gameState === GameState.EXPLORING && (
            <GameEngine
              onEnterHouse={handleEnterHouse}
              onInventoryChange={setInventory}
              initialInventory={inventory}
              dateSeed={currentDate}
            />
          )}

          {gameState === GameState.CRAFTING && (
            <CraftingTable
              inventory={inventory}
              onCraft={handleCraftBouquet}
              onCancel={() => setGameState(GameState.EXPLORING)}
              isGenerating={isGenerating}
            />
          )}

          {gameState === GameState.GALLERY && (
            <Gallery
              bouquets={bouquets}
              onBack={() => setGameState(GameState.START_MENU)}
            />
          )}
        </div>

        <div className="mt-8 text-neutral-500 text-xs font-mono">
          Powered by Google Gemini • React • Tailwind CSS
        </div>
      </div>
    </div>
  );
};

export default App;