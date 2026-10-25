# v4 spec — shells, living biomes, sandbox bouquets

Shared contract for the 2D game (repo root) and the 3D game (`werka-3d/`). Builds on `docs/v3-spec.md` (still valid unless overridden here). Both versions must use the same ids, names and emoji so they feel like the same game.

## 1. Seashell family (new)
Shells are their own trinket family. Found mostly on river banks, pond edges, swamp and tropical shores (on land next to water, never in deep water).

| id | name | emoji | colour | rarity | biomes |
|---|---|---|---|---|---|
| shell | Seashell (existing) | 🐚 | #fcd5ce | common | RIVER, TROPICAL, SWAMP |
| pink_shell | Pink Conch | 🐚 | #f9a8d4 | uncommon | RIVER, TROPICAL |
| scallop | Scallop Shell | 🐚 | #fdba74 | common | RIVER, SWAMP, TROPICAL |
| spiral_shell | Spiral Shell | 🐚 | #e7d3b0 | uncommon | SWAMP, RIVER |
| pearl | Pearl | ⚪ | #f8fafc | rare (iridescent) | RIVER, TROPICAL |
| black_pearl | Black Pearl | ⚫ | #475569 | very rare | TROPICAL, SWAMP |

- Rarity weights when a slot picks a trinket: common 1, uncommon 0.5, rare 0.2, very rare 0.07 (existing `star` = rare).
- Rare/very rare pickups get a stronger glint and a special toast ("A rare Pearl!").

## 2. More trinkets (new, non-shell)
| id | name | emoji | colour | rarity | biomes |
|---|---|---|---|---|---|
| clover | Four-leaf Clover | 🍀 | #4ade80 | uncommon | GRASS, MEADOW |
| crystal | Ice Crystal | 💎 | #a5f3fc | uncommon | TUNDRA, MOUNTAIN |
| amber | Amber Drop | 🟠 | #f59e0b | uncommon | FOREST, DESERT |
| moon_charm | Moon Charm | 🌙 | #c4b5fd | rare | ENCHANTED |
| ladybug | Ladybug Pin | 🐞 | #ef4444 | common | MEADOW, GRASS, FOREST |
| bell | Tiny Bell | 🔔 | #facc15 | uncommon | MOUNTAIN, GRASS |

- Daily count goes from 6–9 to **9–13** trinkets (still own RNG stream, so flowers/trees for a date never move). Shells get extra slots near water: 2–4 of the daily trinkets are placed on shore spots.
- Each version draws every trinket in its own style (pixel sprite 2D, small toon mesh 3D), in the world, the pocket HUD, the house shelf (3D) and on bouquets.

## 3. Pocket + sandbox bouquets
- Pocket grows from 8 to **16** slots. Golden kiss still free.
- `MAX_EXTRAS` goes from 2 to **6** pocket items per bouquet.
- Sandbox: in crafting the player can **place** each extra where they want on the bouquet (drag on 2D canvas/SVG; drag/click on 3D wrap or stems) and rotate/scale it a bit. Flowers can be rearranged too (at least: drag to reorder/reposition within the bouquet; randomise button "Shuffle"). Positions saved with the bouquet.
- Save format: bouquet record keeps `extras: string[]` and adds optional `layout?: { flowers?: {x:number,y:number,r?:number}[]; extras?: {x:number,y:number,r?:number,s?:number}[] }` in normalised bouquet coordinates (x,y in -1..1). Old bouquets without `layout` still load and render with the default auto layout.
- Gallery shows bouquets with their layout and all extras.

## 4. Living biomes (critters)
Ambient animals, purely visual (no collisions with Werka, never block pickups), deterministic spawn per date from their own RNG stream (`${seed}-critters`), animated in the loop, cheap (pool / instancing, nothing per frame allocated).

| critter | where | idle | reacts to Werka (within ~3 tiles 2D / ~6 units 3D) |
|---|---|---|---|
| birds (small flock, 3–6) | GRASS, MEADOW, FOREST, ENCHANTED | hop + peck on ground | flutter up, fly away in an arc, land again later elsewhere |
| frogs | pond / river edge, SWAMP | sit, throat pulse, occasional ribbit | hop into the water (splash ring), resurface later |
| fish | river, ponds | swim slow loops under the surface, shadow | dart away fast, then calm down |
| butterflies | MEADOW, ENCHANTED, TROPICAL | flutter between flowers | circle around Werka briefly then leave |
| fireflies | any biome at NIGHT/DUSK | drift, blink | drift a bit toward Werka |
| optional: rabbit (MEADOW/GRASS), crab (TROPICAL shore), owl (FOREST at night) | | | |

- Soft sounds where an audio system exists (wing flap, ribbit, plop), quiet and rate-limited.
- Mobile perf: cap total critters (≈40 2D, ≈60 3D), cull off-screen.

## 5. 3D-only: bouquet screen v2
- Higher-quality flower models for the bouquet close-up (more petals/segments than the world LOD, still flat-shaded low-poly TUNIC style; the world keeps the cheap LOD).
- Proper arrangement: stems gathered into a cone, heads spread on a dome without intersecting (sphere-packing / relaxation on head radii), wrap paper + ribbon tie, extras placed on wrap/stems.
- Interactive: orbit drag to rotate, pinch/wheel zoom, click a flower/extra to select, drag to move it on the dome/wrap (surface constrained, no interpenetration: push neighbours apart), soft wobble when touched.
- Same model is used for gallery previews; layout saved per spec §3.
- No z-fighting, no flower clipping through wrap or other flowers.

## 6. Done means
- 2D: `npm run typecheck` + `npm run build` pass. 3D: `npm run build` + `npm run check` pass (extend `check` for new trinkets/shore placement/critters determinism).
- Headless playthrough: pick a shell and a pearl, see critters react, craft a bouquet with ≥3 extras placed by hand, see it in the gallery, reload and keep it. Old saves (v3 bouquets, 8-slot pocket) still load.
- Screenshots reviewed: desktop, phone portrait, phone landscape.
