// Little clothes drawings for the wardrobe tiles, in the item's own colours.
const INK = 'stroke="#13262b" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"';
const svg = (body: string) => `<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
const TEE = 'M11 5 6 8 3 14l4 2 2-3v14h14V13l2 3 4-2-3-6-5-3q-5 4-10 0z';
const NONE = svg(`<circle cx="16" cy="16" r="10" fill="none" stroke="#8a9a9d" stroke-width="2"/><path d="M9 23 23 9" stroke="#8a9a9d" stroke-width="2"/>`);

type Item = { id: string; kind?: string; color?: string; accent?: string; colors?: string[] };

const top = (i: Item) => svg(`<path d="${TEE}" fill="${i.color}" ${INK}/>` + (
  i.kind === 'stripes' ? `<path d="M9 15h14M9 19h14M9 23h14" stroke="${i.accent}" stroke-width="2"/>`
  : i.kind === 'cardigan' ? `<path d="M16 8v19" stroke="${i.accent}" stroke-width="2.4"/><circle cx="19" cy="14" r="1" fill="#b4607a"/><circle cx="19" cy="20" r="1" fill="#b4607a"/>`
  : i.kind === 'knit' ? `<path d="M9 24h14M11 7q5 4 10 0" stroke="${i.accent}" stroke-width="2.4" fill="none"/>` : ''));

const bottom = (i: Item) => {
  const skirt = (y0: number, y1: number, half: number) => `<path d="M11 ${y0}h10l${half - 5} ${y1 - y0}H${16 - half}z" fill="${i.color}" ${INK}/><path d="M${16 - half + 1} ${y1 - 2.5}H${16 + half - 1}" stroke="${i.accent}" stroke-width="2"/>`;
  const pants = (y1: number) => `<path d="M10 5h12l2 ${y1 - 5}h-6l-2-${y1 - 12}-2 ${y1 - 12}H8z" fill="${i.color}" ${INK}/>`;
  return svg(i.kind === 'dress' ? skirt(6, 25, 11) : i.kind === 'long' ? skirt(4, 29, 11) : i.kind === 'mini' ? skirt(8, 21, 10)
    : i.kind === 'shorts' ? pants(20) : i.kind === 'overalls'
      ? `<path d="M11 3v9M21 3v9" stroke="${i.color}" stroke-width="2"/><rect x="11" y="6" width="10" height="7" fill="${i.color}" ${INK}/><rect x="14" y="8" width="4" height="3" fill="${i.accent}"/>` + pants(29).replace('M10 5', 'M10 12').replace('l2 24', 'l2 17')
      : pants(29));
};

const scarf = (i: Item) => i.colors?.length ? svg(
  `<path d="M6 8q10 7 20 0l1 5q-11 7-22 0z" fill="${i.colors[0]}" ${INK}/><path d="M18 16l6-1 2 13-6 1z" fill="${i.colors[1]}" ${INK}/><path d="M21 21l4-.6" stroke="${i.colors[0]}" stroke-width="1.6"/>`) : NONE;

const HEART = 'M0 3.6C-3.8.8-4.4-1.2-3.4-2.6-2.2-4-.6-3.2 0-2c.6-1.2 2.2-2 3.4-.6C4.4-1.2 3.8.8 0 3.6z';
const glasses = (i: Item) => {
  const c = i.color!, bridge = `<path d="M14 15q2-1.6 4 0" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M2 13l3 1M30 13l-3 1" stroke="${c}" stroke-width="1.6"/>`;
  if (i.id === 'shades') return svg(`<rect x="4" y="12" width="10" height="8" rx="2.6" fill="${c}"/><rect x="18" y="12" width="10" height="8" rx="2.6" fill="${c}"/><path d="M6.5 15.5l2-2M20.5 15.5l2-2" stroke="#fff" stroke-width="1.2"/>${bridge}`);
  if (i.id === 'hearts') return svg(`<path d="${HEART}" transform="translate(9 16) scale(1.5)" fill="${c}"/><path d="${HEART}" transform="translate(23 16) scale(1.5)" fill="${c}"/>${bridge}`);
  if (i.id === 'round') return svg(`<circle cx="9" cy="16" r="4.8" fill="#fff8" stroke="${c}" stroke-width="1.8"/><circle cx="23" cy="16" r="4.8" fill="#fff8" stroke="${c}" stroke-width="1.8"/>${bridge}`);
  return NONE;
};

const hat = (i: Item) => {
  const c = i.color!;
  if (i.id === 'straw') return svg(`<ellipse cx="16" cy="21" rx="14" ry="4.5" fill="${c}" ${INK}/><path d="M9 20q0-11 7-11t7 11q-7 2.4-14 0z" fill="${c}" ${INK}/><path d="M9 18q7 2.4 14 0v2.4q-7 2.4-14 0z" fill="#e58fa8"/>`);
  if (i.id === 'beret') return svg(`<path d="M4 17q2-8 13-8t11 7q-1 5-12 5T4 17z" fill="${c}" ${INK}/><path d="M16 9V6" stroke="${c}" stroke-width="2.4"/>`);
  if (i.id === 'beanie') return svg(`<path d="M6 21q0-13 10-13t10 13z" fill="${c}" ${INK}/><rect x="5" y="19" width="22" height="6" rx="2" fill="#5a7a9a" stroke="#13262b" stroke-width="1.4"/><circle cx="16" cy="7" r="3.2" fill="#f6efe0" ${INK}/>`);
  if (i.id === 'bucket') return svg(`<path d="M10 9h12l2 11H8z" fill="${c}" ${INK}/><path d="M8 20h16l5 5H3z" fill="#b39e76" ${INK}/>`);
  return NONE;
};

export const wardrobeIcon: Record<string, (i: Item) => string> = { top, bottom, scarf, glasses, hat };
