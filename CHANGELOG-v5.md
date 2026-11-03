# Werka's Bouquet — v5 (saisons, saut entre les mondes, relief, tenues)

Branche `v5`, partie de `v4`. Spec : `docs/v5-spec.md`. Plan : `docs/v5-plan.md`.

## Commun aux deux versions
- **Saut 2D ↔ 3D** : un seul site, la 2D à `/` et la 3D à `/3d/`. Bouton dans le jeu et sur l'écran titre, avec un fondu. Werka réapparaît devant la maison, à la même heure.
- **Sauvegarde partagée** (`shared/save.ts`) : panier, poche, kisses, cadeau d'Elio et galerie suivent d'un monde à l'autre. Les fleurs cueillies restent par monde.
  - Au premier lancement, les anciennes sauvegardes 2D et 3D sont fusionnées. Elles restent en place, intactes.
  - « Reset » efface maintenant les deux mondes.
  - Un bouquet garde une disposition par monde : celle faite à la main dans l'autre monde n'est pas écrasée, et il s'y affiche avec la disposition auto.
- **Cycle jour/nuit** (`shared/sky.ts`) : une seule table de teintes, avec aube rose, lever, heure dorée, coucher, crépuscule violet, heure bleue. Plus de saut de couleur ni d'ombre.
- **Saisons** (`shared/season.ts`) : d'après la vraie date, hémisphère nord. `?season=winter|spring|summer|autumn` en force une. Le HUD affiche la saison.
- **9 nouveaux objets** : ammonite, trilobite, fougère fossile, dent de requin (près des rochers) ; nautile, cauri, buccin, oursin, dollar des sables (sur les rives).
- **Elio** : plus de sac ni de bretelles, cheveux plus lisses avec une frange propre. `docs/elio-design.md` est à jour.

## 2D
- **Relief** : mesas de forme irrégulière, falaises en roche, rampes en pierre, ombres portées. Flux RNG `${seed}-relief` : fleurs et arbres d'une date ne bougent pas, les objets et Elio peuvent changer de place. La poignée de plateaux qui ne trouvent pas de place libre est abandonnée : environ 8 % des écrans restent plats.
- **Lumière** : teinte en `multiply`, halo chaud autour de Werka et de la maison la nuit, étoiles reflétées sur l'eau, ombres qui s'allongent quand le soleil est bas.
- **Saisons** : seuls les pixels verts du sol changent de couleur (eau, sable et chemins restent), une fois par écran. Arbres par saison, neige sur les rochers, feuilles, pétales et flocons.
- **Corrigé** : l'heure revenait au matin à chaque sortie de la maison.

## 3D
- **Armoire** : mur de droite de la maison. Hauts, bas, écharpes, lunettes, chapeaux, tout est débloqué. Aperçu en direct, sauvegarde dans `werka3d_outfit`. Le chignon descend sur la nuque sous un chapeau.
- **Saisons** : dans le shader toon, seules les parties vertes changent. Neige sur les faces tournées vers le haut en hiver (toit, rochers, arbres), eau plus pâle, particules qui tombent autour de Werka (un draw call).
- **Lumière** : soleil, ciel et contre-jour suivent la table. Étoiles reflétées sur l'eau. Les ombres ne sautent plus au crépuscule.
- **Étagère** : passée à 8 × 3 (24 places pour 33 objets possibles, les plus rares d'abord).

## Retours après la première preview
- **3D, blocages sur le relief** : la règle de pente (`steep`) faisait des murs invisibles le long des terrasses, surtout en montagne, et bloquait aussi en descente. Le relief n'arrête plus jamais Werka (`walkBlocked`), elle fait un petit saut sur chaque corniche. Arbres, rochers et eau bloquent toujours. La génération n'a pas changé : fleurs et arbres d'une date restent les mêmes.
- **Armoire refaite** : un onglet par catégorie, des tuiles avec un dessin de chaque vêtement, et une caméra qui s'approche de ce qu'on choisit (visage pour les lunettes, tête pour les chapeaux).
- **Lunettes** : vraies montures avec verre, reflet, pont et branches, courbées autour du visage.
- **Visage de Werka** : frange, petit sourire, plus de peau visible dans les cheveux. L'écharpe passe sous le menton au lieu de traverser le visage.
- **Coquillages** : 6 à 9 par jour sur les rives dans les deux versions (environ 7,5 en moyenne, contre 3 en 3D). Le total passe de 9-13 à 13-19 objets par jour. La poche passe de 16 à 24 places.

## Mise en ligne
- `npm run build` à la racine produit tout le site dans `dist/`. `vercel.json` le configure.
- `api/bouquet.js` : route serverless pour l'image pixel art, qui n'existait qu'en local.

## Vérification
- 2D : `npm run typecheck`, `npm run build`, et le nouveau `npm run check` : 150 dates, aucune fleur coupée par le relief, rampes praticables, mêmes objets et fleurs connus des deux mondes, saisons par mois, jour sans saut de lumière.
- 3D : `npm run build` et `npm run check` passent (avec un contrôle des fossiles près des rochers et du relief qui ne bloque jamais). Traversée d'une vraie corniche de 1,7 de haut en jeu.
- En headless, un Chrome à la fois : captures par heure et par saison (ordinateur), téléphone portrait et paysage pour le HUD, l'armoire et le bouton de saut, ramassage dans les deux mondes, armoire et rechargement, presets Low et High.
- Sur le site compilé : migration des anciennes sauvegardes, saut dans les deux sens, panier, poche, kisses et galerie conservés.

## Restes connus
- FPS jamais mesurés sur un vrai téléphone ou un vrai GPU (rendu logiciel uniquement). 3D : environ 150 draw calls et 450 000 triangles au spawn.
- En dev, 2D et 3D ont des origines différentes (ports 3000 et 3001), donc la sauvegarde partagée n'est visible que sur le site compilé (`npm run build && npx vite preview`).
- `api/bouquet.js` n'a pas été exécuté : il faut un déploiement Vercel pour le tester.
- De v4 : un peu de feuillage plat au centre de certains bouquets 3D, pas de lapin, crabe ni hibou en 3D, le hibou 2D sans son, terrasses de montagne 3D lisibles comme des courbes de niveau.

## Lancer
- 2D : `npm run dev` à la racine (http://localhost:3000).
- 3D : `cd werka-3d && npm run dev` (http://localhost:3001).
