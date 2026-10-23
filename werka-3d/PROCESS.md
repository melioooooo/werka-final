# Werka's Bouquet 3D — process détaillé

Document de reprise pour peaufiner la version 3D. `PLAN.md` garde le plan technique d'origine ; ici, le *comment* et le *pourquoi*, tour par tour, puis ce qu'il reste à faire.

## 1. Brief de départ
- Même principe que la 2D : monde généré chaque jour depuis la date, mais **une seule grande carte** au lieu de 9 écrans.
- Dossier séparé (`werka-3d/`), Vite + TypeScript + three.js, port 3001.
- Mêmes règles de jeu que la 2D : panier de 12, bouquet de 8 fleurs max, cycle jour/nuit de 10 min, départ à 0.35 (matin), maison au centre.
- Sauvegarde dans `localStorage` avec le préfixe `werka3d_` pour ne pas toucher à la 2D.

## 2. Architecture (3538 lignes de TS)
| Dossier | Rôle |
|---|---|
| `src/world/` | Génération pure du monde (aucun import three). `rng.ts` = même `SeededRandom` que la 2D, `generate.ts` = carte, collisions, relief, `data.ts` = couleurs, biomes, listes de fleurs. |
| `src/render/` | Transforme les données en scène three : `outdoor.ts` (terrain, eau, arbres, 709 lignes), `props.ts` (décors et points de repère), `flowers.ts` (55 modèles), `player.ts`, `house.ts`, `bouquet.ts`, `toon.ts` (matériaux), `post.ts` (post-traitement), `icons.ts`. |
| `src/input/input.ts` | Clavier, souris et joystick tactile fusionnés en un seul vecteur de déplacement. |
| `src/ui/` | HUD, menus, craft, galerie en DOM simple (`ui.ts`, `style.css`), sans framework. |
| `src/main.ts` | Machine à états : MENU, EXPLORING, HOUSE, CRAFTING, GALLERY. |
| `src/audio.ts` | Sons synthétisés WebAudio (ambiance, carillons, mute). |
| `src/quality.ts` | Presets Low / Med / High. |
| `scripts/check-world.ts` | `npm run check` : même date = même monde, dates différentes = mondes différents, aucune fleur dans la maison ni dans l'eau (hors fleurs aquatiques), fleurs atteignables. |

Choix clé : la génération est séparée du rendu. On peut donc changer le look sans toucher aux règles, et tester le monde sans navigateur.

## 3. Monde (`src/world/generate.ts`)
- Carte 3×3 régions de 80 unités (`REGION`), soit 240×240, centrée sur (0,0). Région centrale = herbe, maison en (0,0), porte en (0,4), spawn en (0,8).
- Rivière qui traverse la carte (`riverZ(x)`, demi-largeur 4), un pont (demi-largeur 1.8, tablier à y=0.45) près de la maison.
- Biomes mélangés par poids (`biomeWeights`) : pas de coupure nette entre régions.
- Relief en terrasses (`TERRACE = 1.8`) avec corniches rocheuses. Un remplissage par flood fill garantit que chaque fleur reste accessible ; `steep()` et `MAX_SLOPE = 1.15` empêchent de grimper les pentes trop raides.
- Mares avec lotus et nénuphars (fleurs aquatiques), un point de repère par région.
- `blocked()` gère les collisions (cercles : arbres, rochers, maison) et la rivière hors pont.

## 4. Les trois tours
### Tour 1 — base jouable
Génération, terrain coloré par vertex, eau, pont, maison, arbres et rochers instanciés, joueur et caméra troisième personne, ramassage à moins de 2 unités, porte vers l'intérieur, table de craft, galerie 3D de bouquets en rotation.

### Tour 2 — look TUNIC
- Caméra fixe en hauteur (FOV 30, 50°, distance 28), suivi amorti, pas d'orbite. Arbres, rochers et maison passent en tramage (dither) quand ils cachent Werka.
- `toon.ts` : rampe toon, éclairage de contour (rim), balancement au vent, contours par coque inversée.
- `post.ts` : bloom en demi-résolution, étalonnage, vignette, rayons de soleil.
- 55 modèles de fleurs depuis un seul tableau de specs (`flowers.ts`) ; galerie de test `/flowers.html` (dev seulement). Les bouquets réutilisent ces modèles.
- Intro avec texte tapé, sons, effet de ramassage qui vole vers le panier, joystick flottant et bouton d'action contextuel.

### Tour 3 — focale longue et finition
- Caméra FOV 20, distance 80 : Werka fait environ 1/15 de la hauteur de l'écran, effet « maquette » avec tilt-shift sur les bords.
- Palette par biome, ombres bleu-vert / lumières chaudes, courbe en S, brume par biome, heure dorée, lanternes avec halos.
- Sol : touffes de fleurs, troncs, champignons, pierres moussues ; cour de la maison (lanternes, clôtures, panneau, arche en ruine).
- Werka : ombre de contact, poussière, respiration, petit saut au ramassage, cheveux qui traînent.
- Performance : fleurs en un seul `BatchedMesh`, décors statiques fusionnés par matériau, trois presets de qualité.

## 5. Qualité (`src/quality.ts`)
| Preset | Pixel ratio | Ombres | Post | MSAA | Herbe |
|---|---|---|---|---|---|
| low | 1 | 512 | non | 0 | 0.4 |
| med | 1.5 | 1024 | oui | 0 | 0.7 |
| high | 2 | 2048 | oui | 4 | 1 |

Choix automatique sur l'écran titre d'après le temps de frame moyen mesuré en med : moins de 11 ms → high, moins de 24 ms → med, sinon low. Mémorisé dans `werka3d_quality`, bouton manuel sur l'écran titre.

## 6. Lancer, tester, déboguer
- `npm install && npm run dev` (port 3001), `npm run build` (typecheck + build), `npm run check` (monde).
- En dev uniquement : `window.__werka` pour piloter le jeu depuis la console ou un script puppeteer, et `/flowers.html` pour voir toutes les fleurs.
- Les captures d'écran de l'agent ont été faites en headless avec swiftshader (rendu logiciel) : **les FPS sur vrai GPU n'ont jamais été mesurés**.

## 7. Limites connues (à peaufiner en priorité)
1. **Décors trop simples** : toit de la maison plat et bleu avec des bandes visibles, ruines et rochers peu travaillés.
2. **Terrasses de montagne** qui se lisent comme des courbes de niveau plutôt que comme des falaises.
3. **Performance mobile** : environ 310 draw calls près de la maison, à réduire (fusion, instances, LOD) et à mesurer sur un vrai téléphone et un iPad.
4. **Collisions** : les troncs décoratifs au sol n'ont pas de collision.
5. **Preset Low** plus plat (pas de post-traitement), à rendre plus joli.
6. **Pas de bouton 2D ↔ 3D** dans le jeu : pour l'instant, deux builds séparés.
7. **Portrait mobile** : le canvas est limité par la largeur, plus petit qu'un 4:3.
8. **Pas encore de kisses ni de trinkets** (en attente de ta spec, à ajouter aussi côté 2D).
9. Note de l'agent : il s'est donné environ 6.5/10 au dernier tour.

## 8. Pistes de peaufinage
- **Look** : toit en pente avec tuiles et cheminée, ruines et rochers avec silhouettes marquées, falaises au lieu de terrasses, plus de variété de végétation, ciel et nuages stylisés.
- **Caméra** : fiche de réglage (FOV, distance, angle) exposée en dev pour comparer avec TUNIC en direct.
- **Perf** : mesurer sur appareil, fusionner les décors proches, réduire les ombres sur mobile, tester `high` seulement sur desktop.
- **Gameplay** : kisses et trinkets une fois la spec donnée, bouton de bascule 2D ↔ 3D avec une page commune.
- **Qualité du code** : découper `outdoor.ts` (709 lignes) en terrain / eau / végétation.
