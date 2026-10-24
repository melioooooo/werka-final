# Werka's Bouquet — v3 (ce qu'on a fait)

Branche `v3`, construite à partir de `v2`. La spec commune à la 2D et à la 3D est dans `docs/v3-spec.md`.

## Comment on a travaillé
- Un orchestrateur (Opus 5.5) a écrit la spec partagée, puis l'a confiée à des sous-agents Opus 5.5, chacun propriétaire de ses propres fichiers :
  1. **2D** : toutes les fonctionnalités, la caméra mobile et les perfs, en trois tours.
  2. **3D gameplay** : trinkets, kisses, Elio, course et limite de carte.
  3. **3D maison** : refonte de l'intérieur.
  4. **3D monde** : brouillard en bord de carte, rendu et perfs.
  5. **3D QA** : passe finale avec captures et corrections.
- L'orchestrateur a relu les captures d'écran et renvoyé les agents pour de nouveaux tours. Il a aussi corrigé un bug de la maison : l'étagère plantait en boucle infinie à chaque mise à jour.
- Contraintes rencontrées : une limite d'usage a coupé les agents en plein travail (ils ont repris ensuite), et la machine (7,5 Go de RAM) saturait. On est donc passé à un seul Chrome headless à la fois.

## Commun aux deux versions
- **Trinkets** : 11 objets (ruban, bouton, coquillage, bille, plume, vieille clé, bague, gland, galet cœur, breloque papillon, étoile filante, plus rare). Il y en a 6 à 9 par jour, choisis selon le biome.
- **Kisses** : 3 à 5 cœurs flottants par jour, et un compteur de kisses à vie.
- **Placement** : un flux RNG séparé, donc les fleurs et les arbres d'une date ne bougent pas. Chaque objet est accessible, hors de l'eau et de la maison, et dans la carte.
- **Poche** : 8 places, séparée du panier de 12 fleurs, remise à zéro chaque jour. Le compteur de kisses, lui, est gardé.
- **Elio** : brun, lunettes rondes. Il se cache chaque jour à un endroit différent, loin de la maison, comme un Korok : il jette un œil puis surgit quand Werka approche.
  - Le dialogue en machine à écrire s'ouvre sur « Ahah! You found me! », suivi d'une réplique du jour (parmi 8), puis du cadeau.
  - Il donne le **Golden Kiss** 💖 une fois par jour (+3 kisses), puis dit « See you tomorrow, somewhere else! ».
- **Bouquets** : jusqu'à 2 objets de la poche par bouquet (`extras`), visibles sur le bouquet et dans la galerie. Les anciens bouquets se chargent toujours.
- **Course** : Shift sur ordinateur, joystick poussé au bord sur mobile, 1.7× la vitesse de marche. L'anneau du joystick s'allume, l'aide à l'écran l'explique, et il n'y a pas d'endurance.
- **Sauvegardes** : nouvelles clés pour la poche, le compteur de kisses et le jour du cadeau d'Elio. Les anciennes sauvegardes restent compatibles.

## 2D
- **Mobile** : sur téléphone et tablette, une caméra zoomée suit Werka, environ 2× en portrait. Le jeu occupe la plupart de l'écran au lieu d'un tiers, et les contrôles prennent 27 % de la hauteur.
- **Bouton d'action** : il montre l'objet visé (🦋, 💋, 💬…).
- **Paysage** : HUD compact et semi-transparent, aide qui disparaît toute seule.
- **Sol** : texture par biome (herbe en plusieurs tons, touffes, trèfle, cailloux, pétales, rides du désert, fissures de montagne, neige). Elle est calculée une fois par écran, donc sans coût par image.
- **Couleurs** : palette adoucie, ombres de nuages plus légères.
- **Bouquets** : les décorations sont de vrais dessins vectoriels au lieu d'emojis, donc identiques sur tous les appareils.
- **Code** : `GameEngine.tsx` passe d'environ 2300 à 800 lignes (`utils/world.ts`, `utils/draw.ts`, `utils/camera.ts`). Plus d'allocations à chaque image, et les calques statiques sont mis en cache.

## 3D
- **Maison** : intérieur refait. Murs lambrissés, poutres, fenêtres avec rayons de lumière, cheminée avec feu, lit avec un chat, coin lecture, étagères. La table de craft est au centre.
  - Une étagère à trésors montre les trinkets ramassés, avec un bocal de kisses et une plaque compteur.
  - La caméra est réglée pour le portrait et le paysage.
- **Bord de carte** : le terrain continue sur 64 unités (collines, rivière, forêts lointaines) puis se dissout dans une brume qui suit l'heure et le biome. Werka ralentit doucement et s'arrête avant le bord.
- **Rendu** :
  - toit en pente avec tuiles et cheminée, rochers et falaises refaits, ombres de nuages, eau plus jolie ;
  - palette adoucie et plus proche de TUNIC ;
  - ombres qui ne scintillent plus ;
  - caméra plus proche sur téléphone ;
  - qualité Low plus jolie.
- **Perf** : environ 125 draw calls près de la maison (contre environ 300), environ 70 dans la maison. Plus aucun avertissement dans la console.
- **Bug corrigé** : le drapeau de la montagne s'envolait à travers la carte.
- **Tests** : `npm run check` vérifie le déterminisme et le placement des trinkets, kisses et d'Elio sur 60 dates.

## Vérification
- 2D : `npm run typecheck`.
- 3D : `npm run build` et `npm run check`.
- Parcours complet headless dans les deux versions, sur ordinateur, en portrait et en paysage, au clavier et au tactile : marcher, courir, ramasser fleur, trinket et kiss, Elio et le Golden Kiss, bouquet avec 2 objets, galerie, rechargement.

## Restes connus
- Perfs jamais mesurées sur un vrai téléphone ou GPU (rendu logiciel uniquement).
- 3D : terrasses de montagne encore un peu en « courbes de niveau », qualité Low sans étalonnage couleur, désert, prairie et toundra de nuit non capturés.
- 2D : l'herbe autour de la maison reste l'écran le plus vif.

## Lancer
- 2D : `npm install && npm run dev` à la racine (port 3000).
- 3D : `cd werka-3d && npm install && npm run dev` (port 3001).
