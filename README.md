# Werka's Bouquet

Daily generated 2D flower-gathering game. Pick flowers, find trinkets and Elio's kisses, find Elio himself (he hides somewhere new every day), then craft a bouquet at the house table and keep it in your gallery. No API or key needed.

```
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Controls: WASD/arrows to walk, hold Shift to run, E/Space to interact (pick up, talk, next line).
Touch: drag anywhere on the left to walk, push the stick all the way to run, big button to act.

Code: `utils/world.ts` (seeded world: biomes, flowers, trees, trinkets, kisses, Elio), `utils/draw.ts` (static layers and sprites, cached in offscreen canvases), `utils/camera.ts` (touch layouts: zoomed crop following Werka), `components/GameEngine.tsx` (loop, input, HUD overlays).
Saves: `werka_inventory`, `werka_pocket`, `werka_kisses_total`, `werka_elio_day`, `werka_bouquets`, and `werka-bouquet-save-v1` (picked flower ids plus `t:`/`k:` item ids for the day).
