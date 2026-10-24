// Keyboard (WASD/arrows, E/Space) and touch: a floating joystick wherever a finger lands on the
// left half of the screen, plus the contextual action button.
export const input = { action: false };

const keys = new Set<string>();
const joy = { x: 0, y: 0 };

export function consumeAction() {
  const a = input.action;
  input.action = false;
  return a;
}

// Move vector: x right, y forward (up the screen), length <= 1.
const move = { x: 0, y: 0 };
const k = (c: string) => (keys.has(c) ? 1 : 0);
export function readMove() {
  let x = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft') + joy.x;
  let y = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown') + joy.y;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  move.x = x; move.y = y;
  return move;
}

// Run: hold Shift, or push the stick past 85% of its radius.
export const RUN_AT = 0.85;
export const running = () => keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(joy.x, joy.y) > RUN_AT;

export function initInput(canvas: HTMLCanvasElement, stick: HTMLElement, knob: HTMLElement, actionBtn: HTMLElement) {
  window.addEventListener('keydown', e => {
    if ((e.target as HTMLElement).closest?.('button') && (e.code === 'Space' || e.code === 'Enter')) return; // let buttons click
    keys.add(e.code);
    if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat) input.action = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  const clear = () => { keys.clear(); joy.x = joy.y = 0; };
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);

  const R = 52;
  let id = -1, ox = 0, oy = 0;
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || id !== -1 || e.clientX > innerWidth * 0.6) return;
    id = e.pointerId; ox = e.clientX; oy = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    stick.style.transform = `translate(${ox}px, ${oy}px)`;
    knob.style.transform = '';
    stick.hidden = false;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R; joy.y = -dy / R;
    stick.classList.toggle('run', len > R * RUN_AT);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1; joy.x = joy.y = 0; stick.hidden = true; stick.classList.remove('run');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  actionBtn.addEventListener('pointerdown', e => { e.preventDefault(); input.action = true; });
}
