// Low / Med / High presets. Picked once from a short frame-time probe on the title screen,
// then remembered in werka3d_quality (the title screen button cycles it by hand).
export type Quality = 'low' | 'med' | 'high';

export const PRESETS: Record<Quality, { pr: number; shadow: number; post: boolean; msaa: number; grass: number }> = {
  low: { pr: 1, shadow: 512, post: false, msaa: 0, grass: 0.4 },
  med: { pr: 1.5, shadow: 1024, post: true, msaa: 0, grass: 0.7 },
  high: { pr: 2, shadow: 2048, post: true, msaa: 4, grass: 1 },
};

const KEY = 'werka3d_quality';
export function savedQuality(): Quality | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'low' || v === 'med' || v === 'high' ? v : null;
  } catch { return null; }
}
export function saveQuality(q: Quality) {
  try { localStorage.setItem(KEY, q); } catch { /* storage blocked: keep for this session */ }
}

// Average frame time (ms) measured at the medium preset -> preset that should hold ~60 fps.
export const pickQuality = (avgMs: number): Quality => (avgMs < 11 ? 'high' : avgMs < 24 ? 'med' : 'low');
export const nextQuality = (q: Quality): Quality => (q === 'low' ? 'med' : q === 'med' ? 'high' : 'low');
