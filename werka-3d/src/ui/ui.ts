// Plain DOM overlay: title, intro, HUD, contextual action, crafting picker, gallery list, touch controls.
import './style.css';
import { MAX_INVENTORY, MAX_BOUQUET_SIZE } from '../world/data.ts';
import type { Item, Bouquet } from '../state.ts';

const root = document.getElementById('ui')!;
const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const node = t.content.firstElementChild as HTMLElement;
  root.appendChild(node);
  return node;
};
const $ = <T extends HTMLElement = HTMLElement>(parent: HTMLElement, sel: string) => parent.querySelector(sel) as T;

export const touch = matchMedia('(pointer: coarse)').matches;

const SUN = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.4" fill="currentColor"/><g stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"/></g></svg>`;
const MOON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.8 1.6a6.4 6.4 0 1 0 3.6 10.9A5.6 5.6 0 0 1 10.8 1.6z" fill="currentColor"/></svg>`;
const SOUND_ON = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor"/><path d="M13 7a4 4 0 0 1 0 6M15.2 4.8a7 7 0 0 1 0 10.4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
const SOUND_OFF = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor"/><path d="M13.5 7.5l5 5M18.5 7.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const hud = el(`<div class="hud" hidden aria-live="polite">
  <div class="dots"></div>
  <div class="meta"><span class="time"></span><span class="n"></span></div></div>`);
const prompt = el(`<div class="prompt" hidden></div>`);
const toastEl = el(`<div class="toast" role="status" hidden></div>`);
export const stick = el(`<div class="stick" hidden aria-hidden="true"><div class="knob"></div></div>`);
export const knob = $(stick, '.knob');
export const actBtn = el(`<button class="act" hidden></button>`);
const muteBtn = el(`<button class="mute" aria-label="Mute sound"></button>`) as HTMLButtonElement;
const fadeEl = el(`<div class="fade"></div>`);
const compass = el(`<div class="compass" hidden aria-hidden="true"><span class="arrow"></span><span>Home</span></div>`);

// Points toward the cottage when it is off screen-ish far away; null hides it.
export function setCompass(angle: number | null) {
  compass.hidden = angle === null || !playing;
  if (angle !== null) ($(compass, '.arrow')).style.transform = `rotate(${angle}rad)`;
}

// First-visit tutorial card, shown once.
export function tutorial(done: () => void) {
  let seen = false;
  try { seen = localStorage.getItem('werka3d_tutorial') === '1'; } catch { /* ignore */ }
  if (seen) return done();
  const steps = touch
    ? ['Drag anywhere on the left side to walk.', 'Walk up to a flower and tap the pink button to pick it.', 'Carry up to 12, then craft a bouquet at the table in the cottage.']
    : ['Walk with WASD or the arrow keys.', 'Walk up to a flower and press E or Space to pick it.', 'Carry up to 12, then craft a bouquet at the table in the cottage.'];
  const t = el(`<div class="tutorial" role="dialog" aria-label="How to play"><div class="card">
    <h2>How to play</h2><ol>${steps.map(x => `<li>${x}</li>`).join('')}</ol>
    <button class="btn petal ok">Let's go</button></div></div>`);
  const key = (e: KeyboardEvent) => { if (['Escape', 'Enter', 'KeyE', 'Space'].includes(e.code)) close(); };
  const close = () => {
    try { localStorage.setItem('werka3d_tutorial', '1'); } catch { /* ignore */ }
    removeEventListener('keydown', key);
    t.remove();
    done();
  };
  addEventListener('keydown', key);
  $(t, '.ok').onclick = close;
  $<HTMLButtonElement>(t, '.ok').focus();
}

export function initMute(isMuted: boolean, toggle: () => boolean) {
  const paint = (m: boolean) => {
    muteBtn.innerHTML = m ? SOUND_OFF : SOUND_ON;
    muteBtn.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    muteBtn.setAttribute('aria-pressed', String(m));
  };
  paint(isMuted);
  muteBtn.onclick = () => paint(toggle());
}

let playing = false;
export function setPlaying(on: boolean) {
  playing = on;
  if (!on) { actBtn.hidden = true; stick.hidden = true; }
}

let lastInv = -1;
export function setHud(inv: Item[] | null) {
  hud.hidden = !inv;
  if (!inv) return;
  const popIndex = inv.length > lastInv && lastInv >= 0 ? inv.length - 1 : -1;
  lastInv = inv.length;
  $(hud, '.dots').innerHTML = Array.from({ length: MAX_INVENTORY }, (_, i) =>
    inv[i] ? `<span class="dot full${i === popIndex ? ' pop' : ''}" style="--c:${inv[i].color}" title="${inv[i].type}"></span>` : `<span class="dot"></span>`).join('');
  $(hud, '.n').textContent = `${inv.length} / ${MAX_INVENTORY}`;
}

let lastTime = '';
export function setTime(label: string) {
  if (label === lastTime) return;
  lastTime = label;
  const night = label === 'NIGHT' || label === 'DUSK';
  $(hud, '.time').innerHTML = `${night ? MOON : SUN}<span>${label[0] + label.slice(1).toLowerCase()}</span>`;
}

// Contextual action: prompt pill on desktop, big button label on touch.
let lastAction: string | null = null;
export function setAction(text: string | null) {
  if (text === lastAction) return;
  lastAction = text;
  if (touch) {
    actBtn.hidden = !text || !playing;
    if (text) actBtn.textContent = text;
    prompt.hidden = true;
  } else {
    prompt.hidden = !text;
    if (text) prompt.innerHTML = `<kbd>E</kbd>${text}`;
  }
}

let toastTimer = 0;
export function toast(msg: string, ms = 1400) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastEl.classList.remove('in');
  void toastEl.offsetWidth;
  toastEl.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.hidden = true), ms);
}

// Fade to black, run the switch, fade back in.
export async function fade(swap: () => void) {
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
  fadeEl.classList.add('on');
  await wait(450);
  swap();
  await wait(80);
  fadeEl.classList.remove('on');
}

export function menu(opts: { bouquets: number; quality: string; onStart: () => void; onGallery: () => void; onReset: () => void; onQuality: () => string }) {
  const m = el(`<div class="menu"><div class="title-block">
    <h1>Werka's<br>Bouquet</h1>
    <div class="row"><button class="btn petal start">Start today's walk</button>
    <button class="btn ghost gal">Gallery · ${opts.bouquets}</button></div>
    <div class="row small"><button class="link qual">Graphics: ${opts.quality}</button><button class="link reset">Reset progress</button></div></div>
    <p class="hint">${touch ? 'Drag on the left to walk. Tap the button to pick.' : 'WASD or arrows to walk. E or Space to pick.'}</p></div>`);
  const close = () => m.remove();
  $(m, '.start').onclick = () => { close(); opts.onStart(); };
  $(m, '.gal').onclick = () => { close(); opts.onGallery(); };
  $(m, '.qual').onclick = () => { $(m, '.qual').textContent = `Graphics: ${opts.onQuality()}`; };
  $(m, '.reset').onclick = () => {
    if (confirm('Reset all 3D progress? Your bouquets will be deleted.')) { close(); opts.onReset(); }
  };
  $<HTMLButtonElement>(m, '.start').focus();
}

// Typed intro line, as in the 2D game. Any key or tap skips.
export function intro(date: string, done: () => void) {
  const text = `Hey Werka, today's date is ${date}... Have fun crafting today's bouquet!`;
  const o = el(`<div class="intro" role="dialog" aria-label="Intro"><p><span class="typed"></span><span class="caret"></span></p><span class="skip">${touch ? 'Tap' : 'Press any key'} to begin</span></div>`);
  const typed = $(o, '.typed');
  let i = 0, finished = false;
  const timer = setInterval(() => {
    typed.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(timer); setTimeout(finish, 1600); }
  }, 42);
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    removeEventListener('keydown', finish);
    o.classList.add('out');
    setTimeout(() => o.remove(), 600);
    done();
  };
  addEventListener('keydown', finish);
  o.addEventListener('pointerdown', finish);
}

export function craft(inv: Item[], icon: (type: string) => string | null, onCraft: (picked: number[]) => void, onCancel: () => void) {
  const p = el(`<div class="panel"><div class="card" role="dialog" aria-label="Crafting table">
    <h2>Crafting table</h2><p class="sub">Choose up to ${MAX_BOUQUET_SIZE} flowers for today's bouquet.</p>
    <div class="grid"></div>
    <div class="row"><button class="btn ghost back">Back</button><span class="count"></span>
    <button class="btn petal make">Tie the bouquet</button></div></div></div>`);
  const sel = new Set<number>();
  const grid = $(p, '.grid');
  const pic = (it: Item) => {
    const url = icon(it.type);
    return url ? `<img class="pic" src="${url}" alt="">` : `<span class="bloom" style="--c:${it.color}"></span>`;
  };
  const render = () => {
    grid.innerHTML = Array.from({ length: MAX_INVENTORY }, (_, i) => inv[i]
      ? `<button class="slot" data-i="${i}" aria-pressed="${sel.has(i)}">${pic(inv[i])}${inv[i].type}</button>`
      : `<div class="slot empty"></div>`).join('');
    $(p, '.count').textContent = `${sel.size} / ${MAX_BOUQUET_SIZE}`;
    $<HTMLButtonElement>(p, '.make').disabled = sel.size === 0;
  };
  grid.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (sel.has(i)) sel.delete(i); else if (sel.size < MAX_BOUQUET_SIZE) sel.add(i);
    render();
    grid.querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus();
  };
  $(p, '.back').onclick = () => { p.remove(); onCancel(); };
  $(p, '.make').onclick = () => { p.remove(); onCraft([...sel].sort((a, b) => a - b)); };
  render();
  if (!inv.length) $(p, '.sub').textContent = 'Your basket is empty. Go pick some flowers first.';
}

export function gallery(list: Bouquet[], onShow: (b: Bouquet | null) => void, onClose: () => void) {
  const g = el(`<div class="gallery" role="region" aria-label="Gallery"><h2>Gallery</h2><ul></ul>
    <div class="row"><button class="btn close">Back</button></div></div>`);
  const ul = $(g, 'ul');
  let cur = 0;
  const render = () => {
    ul.innerHTML = list.map((b, i) => `<li><button data-i="${i}" aria-current="${i === cur}">
      <span class="date">${b.date}</span><span class="strip">${b.colors.map(c => `<i style="--c:${c}"></i>`).join('')}</span></button></li>`).join('');
    onShow(list[cur] ?? null);
  };
  ul.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (b) { cur = Number(b.dataset.i); render(); }
  };
  if (!list.length) ul.outerHTML = `<p class="empty-note">No bouquets yet. Pick flowers, then use the crafting table in the house.</p>`;
  $(g, '.close').onclick = () => { g.remove(); onClose(); };
  render();
}
