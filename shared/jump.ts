// Hop between the 2D site (/) and the 3D site (/3d/). The time of day travels in the URL; the save is shared through localStorage.
const fade = (from: number, to: number, then?: () => void) => {
  const v = document.createElement('div');
  v.style.cssText = `position:fixed;inset:0;z-index:9999;background:#fbf3dc;opacity:${from};transition:opacity .35s ease;pointer-events:none`;
  document.body.appendChild(v);
  requestAnimationFrame(() => requestAnimationFrame(() => { v.style.opacity = String(to); }));
  setTimeout(() => { if (then) then(); else v.remove(); }, 380);
};

export function jumpTo(world: '2d' | '3d', time: number) {
  const dev = import.meta.env.DEV;
  const base = world === '3d' ? (dev ? 'http://localhost:3001/' : './3d/') : dev ? 'http://localhost:3000/' : '../';
  const q = new URLSearchParams(location.search);
  q.set('jump', time.toFixed(4));
  fade(0, 1, () => location.assign(`${base}?${q}`));
}

// Time of day if we just arrived by a jump, else null. Clears the URL, so a reload shows the title screen.
export function readJump(): number | null {
  const q = new URLSearchParams(location.search), v = Number(q.get('jump'));
  if (!q.has('jump') || !(v >= 0 && v <= 1)) return null;
  q.delete('jump');
  history.replaceState(null, '', location.pathname + (q.size ? `?${q}` : ''));
  fade(1, 0);
  return v;
}
