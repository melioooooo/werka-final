# Werka's Bouquet

Daily generated flower-gathering game, in 2D pixel art (this folder) and 3D (`werka-3d/`), one button apart. Pick flowers, find trinkets, fossils and Elio's kisses, find Elio himself (he hides somewhere new every day), then craft a bouquet at the house table and keep it in your gallery. Seasons follow the real date. No API or key needed.

```
npm install
npm run dev        # http://localhost:3000
npm run build      # the whole site in dist/: 2D at /, 3D at /3d/
npm run typecheck
npm run check      # relief reachability, 2D and 3D data in step
```

Controls: WASD/arrows to walk, hold Shift to run, E/Space to interact (pick up, talk, next line).
Touch: drag anywhere on the left to walk, push the stick all the way to run, big button to act.
Crafting: tap flowers and up to 6 pocket items to add them, drag them on the bouquet (arrow keys move the selected piece), ↺ ↻ to turn, − + to resize a trinket, Shuffle / Tidy.

Code: `utils/world.ts` (seeded world: biomes, flowers, trees, trinkets, kisses, Elio), `utils/draw.ts` (static layers and sprites, cached in offscreen canvases), `utils/critters.ts` (birds, frogs, fish, butterflies, fireflies, rabbits, crabs: one fixed pool per screen), `utils/camera.ts` (touch layouts: zoomed crop following Werka), `components/GameEngine.tsx` (loop, input, HUD overlays).
`shared/`: what both worlds use: `sky.ts` (day table), `season.ts`, `save.ts`, `jump.ts`.
Saves: `werka_shared` (basket, pocket, kisses, Elio's gift, bouquets, each with a `layout2d` and a `layout3d`), `werka_last_date` and `werka-bouquet-save-v1` (picked ids for the day, 2D only). The 3D world adds `werka3d_picked`, `werka3d_last_date`, `werka3d_outfit`.
