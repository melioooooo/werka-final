# v5 spec — polish, seasons, jump between worlds

Shared contract for the 2D game (repo root) and the 3D game (`werka-3d/`). Builds on `docs/v4-spec.md`. User approved the design and waived the spec and plan review stops on 2026-11-03.

## 1. Jump 2D <-> 3D
- One site: 2D at `/`, 3D at `/3d/`. Button in the HUD and on the title screen, with a fade.
- Shared between worlds: basket, pocket, lifetime kisses, time of day, bouquet gallery. Flowers stay picked per world, so a basket fills faster when hopping (accepted).
- Werka reappears at the house door: the two maps do not share biomes.

## 2. 2D relief
- 1 or 2 plateaus per screen depending on the biome: drawn cliffs, collisions, ramps.
- Own RNG stream `${seed}-relief`: flowers and trees for a date do not move. Items and Elio may move.
- `npm run check` at the root proves every flower stays reachable.

## 3. Day/night
- Still 10 minutes. One keyframe table, same values in both versions: night, dawn, day, golden hour, dusk.
- 2D: graded tint, shadows that lengthen, lit windows, stars. 3D: sun, light and mist follow the table with no colour jump.

## 4. Seasons
- From the real date, northern hemisphere: Mar-May spring, Jun-Aug summer, Sep-Nov autumn, Dec-Feb winter.
- Changes ground and tree colours, adds particles (petals, pollen, falling leaves, snow). Winter has snow on the ground; flowers stay.
- `?season=winter|spring|summer|autumn` forces a season.

## 5. New trinkets
| id | name | emoji | colour | rarity | biomes |
|---|---|---|---|---|---|
| ammonite | Ammonite | 🐚 | #b08d57 | uncommon | MOUNTAIN, DESERT |
| trilobite | Trilobite | 🪲 | #8d8378 | rare | MOUNTAIN, DESERT |
| fern_fossil | Fern Fossil | 🌿 | #9a9a86 | uncommon | FOREST, MOUNTAIN |
| shark_tooth | Shark Tooth | 🦷 | #f1ead6 | rare | RIVER, TROPICAL, DESERT |
| nautilus | Nautilus | 🐚 | #f4e3cf | rare | TROPICAL, RIVER |
| cowrie | Cowrie | 🐚 | #d9a066 | common | TROPICAL, RIVER |
| whelk | Whelk | 🐚 | #c9b79c | common | RIVER, SWAMP |
| urchin | Sea Urchin | 🟣 | #8b5cf6 | uncommon | TROPICAL |
| sand_dollar | Sand Dollar | ⚪ | #efe6d2 | uncommon | TROPICAL, RIVER |

Shells keep their shore placement. Fossils prefer spots beside rocks.

## 6. Werka's outfit (3D only)
Wardrobe in the house with a live preview, everything unlocked. Tops, bottoms, scarf, glasses, hat. Saved in `werka3d_outfit`.

## 7. Elio
No backpack or straps in either version. Tidier hair: grouped locks and a clean fringe, no stray tufts.

## 8. Build
- Serverless route for `/api/bouquet` so "Pixel art" works online.
- Headless playthroughs, one Chrome at a time; captures per time of day, season and screen format.
- Push `v5` and make a preview. `master` and production stay untouched without the user's approval.

## Out of scope
Collection album, unlockable outfits.
