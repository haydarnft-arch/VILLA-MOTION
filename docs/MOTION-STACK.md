# Outils de motion design

## HyperFrames (Apache 2.0)

HTML + CSS + animations GSAP rendus en MP4 par Chrome et FFmpeg. Source : https://github.com/heygen-com/hyperframes

- Installé dans le projet : `npx hyperframes --help`
- Compétences pour l'agent (hyperframes, hyperframes-cli, hyperframes-registry, media-use, reverse-any-video, style-sampling) : `npm run skills`
- Vérifier l'environnement : `npx hyperframes doctor`
- Créer un projet : `npx hyperframes init <nom> --example blank --non-interactive`
- Rendre : `npx hyperframes render -o sortie.mp4 --quality delivery`
- Analyser une vidéo de référence (coupes, rythme, courbes) : `npx hyperframes measure ref.mp4`
- Détecter les temps d'une musique : `npx hyperframes beats`

**GSAP en local, jamais depuis un CDN** : les exemples chargent `https://cdn.jsdelivr.net/npm/gsap@3.14.2/...`. Remplacer par une copie de `node_modules/gsap/dist/gsap.min.js` (dépendance `gsap` du projet). Même règle pour les polices, textures et images : tout doit être local pour un rendu fiable.

Test du 15/11/2026 : exemple `warm-grain`, 10 s en 1920×1080, rendu en 7,6 s sur 4 cœurs.

## Remotion

Moteur actuel de VILLA MOTION (`remotion/`) : planificateur de montage, caméra 3D sur photos (profondeur MiDaS + WebGL), transitions.

## Références

`references/saas-motion-kit/` : méthode de variété, atlas de 24 transitions, grille ton/mouvement (MIT).
