# VILLA MOTION

Logiciel professionnel de création de vidéos promotionnelles immobilières pour villas et locations de prestige.

À partir des photographies d'un bien, VILLA MOTION **monte automatiquement un film**, pas un diaporama :

- **Caméra 3D dans chaque photo** : une IA de profondeur (MiDaS, exécutée en local) sépare premier plan et arrière-plan. La caméra avance, tourne ou s'élève dans la pièce avec une vraie parallaxe.
- **Montage calé sur la musique** : chaque coupe tombe sur un temps musical, avec une alternance de plans larges et de plans courts.
- **Découpage par pièce** : les photos portant le même libellé (« Salon », « Cuisine »…) forment un chapitre, avec un titre animé.
- **Recadrages automatiques** : un plan large est suivi d'un plan rapproché sur son sujet principal, détecté par l'IA.
- **Transitions de cinéma** : panoramiques filés (whip), zoom « punch », flash lumineux, passage au noir, fondus. S'y ajoutent des écrans partagés (triptyques), du grain argentique, un vignettage et un étalonnage doux.
- **Intro titrée** sur la photo principale, **carton final** professionnel et fondu au noir synchronisé avec la musique.

Format de sortie : **16:9, Full HD 1920 × 1080, MP4 (H.264), 30 i/s, 30 à 45 s**.

## Démarrage

```bash
npm install      # installe aussi le modèle de profondeur (~66 Mo, licence MIT)
npm start
```

Puis ouvrez **http://localhost:4680**.

Prérequis : Node.js 18 ou plus récent et FFmpeg installé (`ffmpeg` et `ffprobe` dans le PATH).

## Utilisation

1. **Créer un nouveau projet** : nom de la villa et localisation.
2. **Importer les photographies** (20 à 50 recommandées). Glissez les vignettes pour définir l'ordre. **Ajoutez le libellé de la pièce** sur chaque photo pour obtenir les chapitres titrés. Pour une même pièce, mettez la photo la plus large en premier.
3. **Choisir le style** :
   - *Luxury* : flashs lumineux, fondus, mouvements amples et typographie sérif.
   - *Cinematic* : format letterbox, passages au noir, zooms punch.
   - *Modern* : panoramiques filés, rythme soutenu, typographie bâton.
4. **Choisir la musique** (pré-écoute disponible) et la **durée** (30, 35, 40 ou 45 s).
5. **Générer ma vidéo**, prévisualiser le résultat puis **télécharger le MP4**.

Pour un résultat net en Full HD, utilisez les **fichiers photo originaux** (2 000 px de large ou plus). Les petites images sont agrandies automatiquement, mais une capture d'écran restera moins nette qu'un original.

## Technologies (100 % gratuites)

- Node.js et Express pour le serveur, avec une interface web sans framework.
- [Remotion](https://remotion.dev) et Chromium headless pour la composition vidéo. Le rendu WebGL est logiciel (SwiftShader) : aucune carte graphique n'est nécessaire.
- MiDaS small, via onnxruntime-node, pour la profondeur (licence MIT).
- FFmpeg pour le redimensionnement et l'encodage.
- Les musiques intégrées sont dans `assets/music/`. Pour en remplacer une, déposez votre MP3 puis lancez `python3 scripts/analyze-music.py` (nécessite numpy) afin de recalculer les temps.

Remotion est gratuit pour les indépendants et les entreprises jusqu'à 3 personnes ; au-delà, une licence entreprise est requise (remotion.dev/license).

## Architecture

```
server/index.js          API (projets, photos, rendu, téléchargement)
server/depth.mjs         Cartes de profondeur + point d'intérêt
server/render-worker.mjs Rendu Remotion (processus séparé)
remotion/planner.ts      Planificateur de montage (chapitres, temps, transitions, mouvements)
remotion/gl/             Caméra 3D (shader WebGL : parallaxe, flou de mouvement, grain)
remotion/components/     Typographie animée, transitions
public/                  Interface (noir profond, blanc, beige doré, anthracite)
```

## Éthique

Les photos doivent être **fournies par vos clients ou autorisées** pour cet usage. Le logiciel ne modifie pas les caractéristiques réelles des biens : il ne fait que mettre en scène les photographies (cadrage, mouvement de caméra, lumière d'ambiance des transitions).
