# v3 spec — trinkets, kisses, Elio, run, polish

Shared contract for the 2D game (repo root) and the 3D game (`werka-3d/`). Both versions must follow it so they feel like the same game. Values here are defaults chosen by the orchestrator; the owner may tweak them later.

## 1. Collectibles

### Trinkets
Small objects found in the world. One list, same names/emoji/colour in both versions:

| id | name | emoji | colour | favourite biomes |
|---|---|---|---|---|
| ribbon | Silk Ribbon | 🎀 | #f472b6 | GRASS, MEADOW |
| button | Lost Button | 🔘 | #94a3b8 | GRASS, RIVER |
| shell | Seashell | 🐚 | #fcd5ce | RIVER, TROPICAL, SWAMP |
| marble | Glass Marble | 🔮 | #818cf8 | DESERT, ENCHANTED |
| feather | Blue Feather | 🪶 | #38bdf8 | FOREST, MOUNTAIN |
| key | Old Key | 🗝️ | #d4a017 | FOREST, DESERT |
| ring | Tin Ring | 💍 | #e5e7eb | RIVER, SWAMP |
| acorn | Lucky Acorn | 🌰 | #a16207 | FOREST, MEADOW |
| pebble | Heart Pebble | 🪨 | #a8a29e | MOUNTAIN, TUNDRA |
| butterfly | Butterfly Charm | 🦋 | #a78bfa | ENCHANTED, TROPICAL |
| star | Fallen Star | ⭐ | #fde047 | ENCHANTED, TUNDRA (rare) |

- Daily seeded: 6–9 trinkets per day across the whole map, placed from the date seed with their own RNG stream (do NOT change existing flower/tree placement for a given date).
- Each placed on a walkable, reachable spot, never in the house, never in deep water, never outside the map.
- Visually distinct from flowers: small sparkle/glint every few seconds so the player notices them.
- Pickup = same action button/E key, prompt "Pick up {name}".

### Kisses
- "Elio's kiss" pickups: pink floating hearts 💋 (3–5 per day), seeded and placed like trinkets. Gentle bob animation.
- Picking one plays a soft chime and increments a **lifetime kiss counter** (persists across days).

### Pocket (separate from the flower basket)
- Trinkets and kisses go into a **pocket**, NOT the 12-slot flower basket. Pocket holds up to 8 items. Full pocket => pick refused with a message.
- Pocket resets each new day like the basket (lifetime kiss counter does not).
- HUD shows pocket items next to the basket (compact on mobile).

## 2. Elio (NPC)
- Look: brown hair, slightly rounded glasses, friendly. Pixel sprite in 2D, toon model in 3D matching Werka's style.
- One Elio per day at a random seeded spot: reachable, walkable, inside the map, not in the house, not in water, at least ~30% of the map away from the spawn so you have to explore. Hidden-ish (near trees/rocks/landmark) like a Korok.
- Idle animation (bob, look around). In 3D he can peek out from behind cover.
- Near him: prompt "Talk to Elio". Talking opens a dialogue box (typewriter text, tap/E to advance):
  1. "Ahah! You found me!"
  2. A line that varies by day (pick from a list of ~8, seeded), e.g. "I was hiding behind this tree all morning.", "Werka! I knew you'd come this way.", "Shh, don't tell the flowers I'm here."
  3. "Here, this is for you." → gives **Elio's Golden Kiss** (special item 💖, gold, goes into the pocket, does not count against the pocket limit) + increments lifetime kiss counter by 3.
- After the gift, same day: he says a short line ("See you tomorrow, somewhere else!") and doesn't give again. State saved for the day.
- Small reward feedback: hearts burst, chime.

## 3. Bouquets use trinkets
- In crafting, the player can add up to **2 pocket items** (trinkets, kisses, golden kiss) to a bouquet as decorations, on top of up to 8 flowers.
- Saved bouquet records them (`extras: string[]` of trinket ids, `kiss`, `golden_kiss`).
- 2D: bouquet SVG draws them (ribbon tied, charm on the paper, heart sticker); Pollinations prompt mentions them.
- 3D: bouquet model shows them (small meshes on the wrap).
- Gallery shows them.

## 4. Running
- Hold Shift (desktop) or push the joystick to the edge (touch, > ~85% of radius) to run. Run speed ≈ 1.7× walk.
- Visual feedback: faster animation, dust puffs (3D), small speed lines / bob (2D). A small "RUN" indicator or the joystick ring turning brighter on touch.
- Tutorial/help text mentions it ("Shift to run" desktop, "push the stick all the way to run" touch).
- No stamina system (keep it cozy).

## 5. Save keys
- 2D: extend existing keys; add `werka_pocket`, `werka_kisses_total`, `werka_elio_day` (date string when gift was received), picked trinket/kiss ids in the existing `werka-bouquet-save-v1` payload (`picked` already holds ids; use prefixed ids `t:`/`k:` so they never clash with flower ids).
- 3D: same idea with prefix `werka3d_` (`werka3d_pocket`, `werka3d_kisses_total`, `werka3d_elio_day`, picked ids in `werka3d_picked`).
- Old saves without these keys must still load.

## 6. 3D-only
- **Map edge**: no hard void. Past the playable area the world keeps going (terrain, trees, hills) and fades into a soft, coloured fog/mist ("the world evaporates"); an invisible soft boundary slows then stops Werka near the edge; optional gentle line like "The mist is too thick to go further." The fog colour follows the time of day/biome.
- **House interior**: rework so it feels cosy and finished (walls with trim, windows with light, floor planks, rug, shelves with pots and jars, bed, fireplace or stove, plants, lamp light, the crafting table clearly readable as the focal point, a place showing collected trinkets / the kiss counter). Same toon style and outlines as outdoors. Camera framing tuned for the room on phone portrait and landscape.
- **Render + perf**: keep the TUNIC look, improve it (roof, rocks, cliffs instead of contour-like terraces), reduce draw calls near the house, keep 60 fps on a mid phone on Low/Med.

## 7. 2D-only
- Keep the pixel-art look. Render/perf polish: avoid per-frame allocations, cache static layers to offscreen canvases where possible, keep the loop smooth on phones.
- Elio + trinkets + kisses drawn as pixel sprites matching the existing style.

## 8. Done means
- `npm run typecheck` (2D) and `npm run build` + `npm run check` (3D) pass.
- Headless playthrough per version: walk, run, pick a flower, a trinket, a kiss, find Elio and get the golden kiss, craft a bouquet with an extra, see it in the gallery, reload and keep the day's state.
- Screenshots reviewed (desktop + phone portrait + phone landscape).
