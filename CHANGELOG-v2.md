# Werka's Bouquet — v2 (ce qu'on a fait)

## Contexte
Remake du jeu vibecodé de cueillette de fleurs. Le jeu était down : la génération d'images des bouquets utilisait l'API Gemini Imagen, qui n'est plus disponible.

## 2D (racine du dépôt)
- **Gemini supprimé** : `@google/genai` et `services/` retirés, plus de clé API.
- **Bouquets sans API payante** (`utils/bouquetArt.ts`) :
  - un SVG généré côté client s'affiche tout de suite (fleurs, tige, papier, ruban) ;
  - une image pixel art est demandée à Pollinations (gratuit, sans clé), réduite à 96 px et palette limitée, puis remplace le SVG ;
  - si Pollinations échoue, le SVG reste.
- **Proxy Vite `/api/bouquet`** (`vite.config.ts`) : Pollinations refuse les appels directs du navigateur. Le proxy n'existe qu'en dev/preview. Pour un hébergement statique, il faudra une fonction serverless équivalente, sinon seul le SVG s'affiche.
- **Limite Pollinations** : 1 image par 45 s et par IP. Un 402 déclenche une attente de 46 s puis un seul nouvel essai.
- **UI mobile / iPad** (`components/MobileControls.tsx`) : joystick flottant, bouton d'action contextuel (🌼 🚪 💐), mode overlay en paysage, panneau en portrait, HUD d'inventaire adapté.
- **Corrections de sauvegarde** :
  - l'inventaire et les fleurs ramassées persistent ;
  - la sauvegarde se vide au changement de jour ;
  - le bug d'un inventaire écrasé par un état vide est corrigé (`useState(loadSaved)`).
- **Moteur** : boucle de jeu qui ne redémarre plus, mouvement indépendant du framerate, moins de re-rendus.
- **Divers** : déblocage audio iOS, zoom autorisé sur mobile, README réécrit, script `typecheck`, `.gitignore` complété.

## 3D (`werka-3d/`)
Version three.js séparée, construite par un sous-agent Opus en trois tours.
- Une seule grande carte générée chaque jour avec la même graine que la 2D.
- Rendu façon TUNIC : caméra à longue focale, toon shading, bloom, tilt-shift, étalonnage des couleurs.
- 55 modèles de fleurs différenciés, repères (landmarks), mares, boussole vers la maison.
- Réglage qualité Low / Med / High, sons synthétisés avec WebAudio.
- Détails dans `werka-3d/PLAN.md`.

## Limites connues
- 3D : décors encore simples (toit plat, terrasses de montagne qui ressemblent à des courbes de niveau), environ 310 draw calls près de la maison, performances jamais mesurées sur un vrai GPU.
- Pas encore de bouton de bascule 2D → 3D dans le jeu.
- Pas encore de « elio's kisses » ni de trinkets : en attente de tes détails.

## Lancer en local
- 2D : `npm install && npm run dev` à la racine (port 3000).
- 3D : `cd werka-3d && npm install && npm run dev` (port 3001).

## Prochaines pistes
Décors 3D (round 4), passage perf mobile, bouton 2D ↔ 3D, kisses et trinkets, découpage de `GameEngine.tsx`, Tailwind via npm au lieu du CDN, route serverless pour `/api/bouquet`.
