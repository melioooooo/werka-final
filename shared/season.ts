// Season from the real date, northern hemisphere (spec v5 §4). ?season=winter forces one for testing.
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];
export const seasonOfMonth = (m: number): Season => SEASONS[Math.floor(((m + 1) % 12) / 3)];
export function currentSeason(date = new Date()): Season {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('season');
  return SEASONS.includes(q as Season) ? (q as Season) : seasonOfMonth(date.getMonth());
}
