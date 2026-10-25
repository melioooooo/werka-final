# Werka's Bouquet — v4 (coquillages, biomes vivants, bouquets bac à sable)

Branche `v4`, partie de `v3`. Spec commune : `docs/v4-spec.md`. Fiche perso d'Elio : `docs/elio-design.md` (tirée d'une photo de référence ; la photo elle-même est ignorée par git et n'est jamais utilisée dans le jeu).

## Méthode
- Un orchestrateur (Opus 5.5) a écrit la spec, puis deux sous-agents Opus 5.5 ont travaillé en parallèle : un sur la 2D, un sur la 3D. Chacun avait ses propres fichiers.
- Tous chargeaient les skills karpathy-guidelines, ponytail, caveman et superpowers (vérification avant de dire « fini »).
- Deux tours chacun. L'orchestrateur relisait les captures et renvoyait les corrections.
- Un seul Chrome headless à la fois (verrou `flock`), parce que la machine n'a que 7,5 Go de RAM.

## Commun aux deux versions
- **Coquillages** : conque rose, Saint-Jacques et spirale, plus la Perle (rare, irisée) et la Perle noire (très rare). Ils s'ajoutent au coquillage existant. Chaque jour, 2 à 4 sont échoués sur les rives.
- **6 nouveaux trinkets** : trèfle à quatre feuilles, cristal de glace, goutte d'ambre, breloque lune, coccinelle, clochette.
  - Il y en a 9 à 13 par jour, tirés selon la rareté : commun 1, peu commun 0.5, rare 0.2, très rare 0.07.
  - Les objets rares brillent plus fort et ont leur propre toast (« A rare Pearl! »), leur son et leurs étincelles.
- **Poche** : 16 places (au lieu de 8).
- **Bouquets bac à sable** : jusqu'à 6 keepsakes par bouquet (au lieu de 2). On place à la main les fleurs et les objets, on les tourne, on change leur taille, et il y a un bouton « Shuffle ».
  - La disposition est sauvegardée dans `layout`. La galerie la réaffiche.
  - Les anciens bouquets se chargent toujours, avec la disposition automatique.
- **Biomes vivants** : chaque jour a ses animaux, avec leur propre flux RNG, purement décoratifs et sans aucune allocation par image. Ils réagissent quand Werka passe :
  - les oiseaux s'envolent en arc ;
  - les grenouilles plongent avec des ronds dans l'eau ;
  - les poissons filent ;
  - les papillons tournent autour d'elle ;
  - les lucioles s'approchent la nuit.
  - Les sons sont discrets et limités.
- **Elio redessiné** : cheveux presque noirs en mèches avec une grosse frange et les côtés courts, fines lunettes hexagonales dorées, moustache, sourire en coin, clou d'oreille, t-shirt noir avec une petite marque verte, bretelles de sac noir et bleu.

## 2D
- **Mares et lagon** : de vraies mares dans le marais, les tropiques (un lagon turquoise bordé de sable) et parfois ailleurs. Werka ne peut pas y entrer.
- **Animaux en plus** : en plus de ceux communs aux deux versions, des lapins, des crabes au bord du lagon et un hibou la nuit en forêt. Il tourne la tête vers Werka et cligne des yeux. La nuit, les oiseaux dorment en boule et les papillons se posent.
  - Le pool est fixe (40 animaux au plus) et rien n'est dessiné hors écran.
- **Crafting** :
  - on glisse les éléments à la souris, au doigt ou aux flèches ; ↺ ↻ pour tourner, − + pour la taille, « Shuffle » et « Tidy » ;
  - les keepsakes sont épinglés sur l'emballage par défaut ;
  - la barre d'outils tient sur une ligne.
- **Galerie** : badges compacts, les 6 objets tiennent dans la carte. L'image pixel générée reste accessible avec « ✨ Pixel art ».
- **HUD** : icône pixel de chaque objet de la poche, pour distinguer les coquillages entre eux.
- **Corrigé** :
  - Werka entrait dans la rivière par le haut, parce que les pieds étaient décalés de 15 px par rapport au sprite ;
  - le pont est moins large, donc plus de traversée par la rambarde ;
  - le 404 venait du favicon manquant, il y a maintenant une fleur SVG.

## 3D
- **Écran du bouquet refait** (« Arrange your bouquet ») :
  - **Fleurs** : modèles plus détaillés, toujours en facettes low-poly façon TUNIC. Le monde garde la version légère.
  - **Dôme** : les fleurs forment un dôme serré qui démarre juste au-dessus du papier. Chaque tête est une capsule ajustée à sa forme, et une relaxation empêche tout chevauchement, y compris pendant l'animation de ressort.
  - **Composition** : papier plissé évasé, collerette de feuilles, brins pastel dans les trous, nœud et pans de ruban.
  - **Interactif** : on tourne en glissant et on zoome à la molette ou en pinçant. On déplace fleurs et keepsakes sur leur surface, les voisins s'écartent, et poser une fleur sur une autre les échange.
  - **Décor** : petit guéridon avec nappe festonnée et napperon, fond dégradé chaud, lumière principale chaude et contre-jour froid.
  - **Galerie** : même modèle, avec orbite et zoom.
- **Étagère à trésors** : passée à 6 × 3 pour accueillir les nouveaux objets.
- **Animaux** : environ 2× plus grands qu'au premier jet, avec des ombres au sol (l'ombre reste par terre quand l'oiseau s'envole). Il y en a 60 au plus, pour environ 10 draw calls, et ils ne sont animés que près de Werka.
- **Perf** : 137 draw calls au spawn (134 en v3), 81 dans la maison, 62 à 68 dans le studio du bouquet.
- **Tests** : `npm run check` vérifie 200 dates (trinkets, coquillages sur les rives, déterminisme des animaux) et 400 dispositions de bouquet sans chevauchement.

## Vérification
- 2D : `npm run typecheck` et `npm run build` passent.
- 3D : `npm run build` passe (avec l'avertissement habituel sur la taille du chunk) et `npm run check` passe.
- Parties complètes en headless, sur ordinateur, téléphone portrait et paysage, souris et tactile (CDP touch en 3D) :
  - ramassage d'un coquillage, d'une perle et d'une perle noire ;
  - réaction des animaux ;
  - bouquet avec au moins 3 keepsakes placés à la main ;
  - galerie, puis rechargement : la disposition est identique ;
  - une sauvegarde v3 se charge.

## Restes connus
- FPS jamais mesurés sur un vrai téléphone ou un vrai GPU (rendu logiciel uniquement).
- 2D : pour une même date, les kisses et Elio ont changé de place par rapport à v3, à cause des nouveaux trinkets et des mares. Fleurs et arbres n'ont pas bougé. Le hibou ne fait pas de son.
- 3D : un peu de feuillage plat au centre quand deux grosses têtes laissent un trou. Le guéridon prend de la place en portrait. Pas de lapin, crabe ni hibou en 3D. L'erreur de shader `MeshDepthMaterial` sous swiftshader existait déjà avant.

## Lancer
- 2D : `npm run dev` à la racine (http://localhost:3000).
- 3D : `cd werka-3d && npm run dev` (http://localhost:3001).
