# Werka's Bouquet 3D Implementation Plan

**Goal:** three.js port of Werka's Bouquet: one continuous daily-seeded map, third-person walking, flower picking, house interior with crafting, 3D bouquet gallery.

**Architecture:** `src/world/` is pure TS (no three) and generates the world data from the date string. `src/render/` turns that data into three.js scenes. `src/input/` merges keyboard, mouse-drag camera and touch joystick into one move vector. `src/ui/` is plain DOM (HUD, menus, crafting, gallery). `src/main.ts` owns the state machine (MENU, EXPLORING, HOUSE, CRAFTING, GALLERY).

**Tech Stack:** Vite, TypeScript, three. No UI framework.

**Spec:** caller brief (in this folder's history) + 2D sources in `../` (read-only).

## Global Constraints

- Only edit files under `werka-3d/`. Dev server port 3001.
- localStorage keys prefixed `werka3d_` (`werka3d_inventory`, `werka3d_bouquets`, `werka3d_last_date`, `werka3d_picked`).
- MAX_INVENTORY = 12, MAX_BOUQUET_SIZE = 8, DAY_CYCLE_DURATION = 600000 ms, start time 0.35.
- Time labels: t<0.2||t>0.85 NIGHT, <0.3 DAWN, <0.7 DAY, else DUSK.
- Seed string = `toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})`, same as 2D.
- New calendar day => inventory and picked list reset; bouquets kept.

## Review Focus

1. Same date twice => identical world (checked by `npm run check`).
2. Flowers never spawn inside the house or in deep river water (except water flowers).
3. Player cannot walk into the river except on the bridge, nor through the house/trees/rocks.
4. Full basket (12) => pick refused with a message.
5. Reload mid-day keeps inventory and already-picked flowers gone.

---

### Task 1: Scaffold + world generation
**Files:** `package.json`, `tsconfig.json`, `index.html`, `src/world/{rng,data,generate}.ts`, `scripts/check-world.ts`
- Copy `SeededRandom` (same hash + LCG), FlowerType names, FLOWER_COLORS, BIOME_COLORS, biome->flowers lists from 2D.
- `generateWorld(seed: string): World` with `World = { size, biomes: Biome[3][3], river: {x0..}, bridge: {x,z}, trees, rocks, flowers: {id,type,color,x,z}[] }`.
- Map 3x3 regions, each REGION=80 units, center region GRASS with house at (0,0). River crosses the map along z = riverZ(x); one bridge near house.
- `biomeAt(world,x,z)`, `heightAt(world,x,z)`, `isRiver(world,x,z)` helpers (pure).
- Check: `npm run check` asserts generateWorld(d) deep-equals itself on a fresh call, differs for another date, and no flower is inside house footprint.

### Task 2: Render outdoor world
`src/render/world.ts`: vertex-colored terrain (biome colors blended), water plane, bridge, house mesh, InstancedMesh for trees, rocks, grass tufts, flower stems/heads. Lights + fog + sky color driven by time of day. Player capsule + third-person camera.

### Task 3: Input + game loop
`src/input/input.ts`: WASD/arrows, E/Space action, mouse drag rotates camera, touch joystick + action button. `src/main.ts`: movement relative to camera, collisions (circles + river), pick nearest flower < 2 units, door trigger => fade => house.

### Task 4: House, crafting, gallery
`src/render/house.ts` interior scene with crafting table; `src/render/bouquet.ts` builds a bouquet Group from FlowerType[]; `src/ui/*` HUD, start menu, crafting picker (max 8), gallery with rotating 3D bouquet previews.

### Task 5: Verify
`npm run build`, dev on 3001, puppeteer script walks, picks, enters house, crafts; screenshots reviewed.

## Round 2: TUNIC look (done)
- Camera: fixed high angle (FOV 30, 50 deg, distance 28), damped follow, no orbit. Trees, rocks and the house dither away when they would hide Werka; the house fully dissolves when she is behind it.
- Look: `render/toon.ts` (toon ramp + rim + wind sway + occlusion dither + outline hulls), `render/post.ts` (half-res bloom, colour grade, vignette, sun shafts). Terraced terrain with rock ledges (`world/generate.ts`, reachability flood fill keeps every flower reachable), foam water, puffy canopies, bushes, cacti, particles.
- Flowers: `render/flowers.ts` builds every 2D FlowerType from one spec table; `/flowers.html` (dev only) shows the lineup. Bouquets reuse those models.
- Polish: intro typing, WebAudio ambience + chimes + mute (`audio.ts`), pick burst + fly-to-basket, floating joystick + contextual action button, `window.__werka` only in dev.

## Round 3 (done)
- Camera: FOV 20, distance 80 (Werka ~1/15 of frame height). Tilt-shift edge blur in post. House fades with real alpha; occluders use fine noise dither.
- Light/colour: new biome palette, teal-shadow/warm-light grading, S-curve, per-biome mist, golden-hour exposure lift, lantern light pools, ground skirt + hill ring past the map edge.
- Ground: meadow blossom clumps, logs, mushrooms, mossy stones; cottage yard (lanterns, fences, signpost, ruined arch); one landmark per region (`render/props.ts`).
- Fixes: ponds with lotus/water lily on water (checked in `npm run check`), crafting shows 3D flower icons (`render/icons.ts`).
- Werka: contact shadow, dust puffs, breathing, pick hop, hair lag.
- Perf: `quality.ts` Low/Med/High (auto probe, saved in werka3d_quality, toggle on title); flowers in one BatchedMesh; static props/player baked per material.
