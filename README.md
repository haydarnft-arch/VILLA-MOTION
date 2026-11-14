# VILLA MOTION

Logiciel professionnel de création de vidéos promotionnelles immobilières pour villas et locations de prestige.

À partir des photographies d'un bien, VILLA MOTION produit automatiquement un **véritable film publicitaire** : introduction animée avec le nom de la villa, mouvements de caméra cinématographiques sur chaque photographie (zooms progressifs, travellings, effets de profondeur), transitions fluides, libellés de pièces animés, conclusion professionnelle et musique élégante.

- **Format** : 16:9 · Full HD 1920 × 1080 · MP4 (H.264) · 30 i/s
- **Durée** : 30 à 45 secondes
- **Styles** : Luxury · Cinematic · Modern
- **Technologies** : 100 % gratuites et open source (Node.js, Express, [Remotion](https://remotion.dev), Chromium headless). Aucune API payante requise.

## Démarrage

```bash
npm install
npm start
```

Puis ouvrez **http://localhost:4680**.

> Premier rendu : le moteur vidéo se prépare une fois (≈ 1 minute), les rendus suivants démarrent immédiatement.

## Utilisation

1. **Créer un nouveau projet** — renseignez le nom de la villa et sa localisation.
2. **Importer les photographies** (20 à 50 recommandées, JPEG/PNG/WebP). Glissez les vignettes pour définir l'ordre du film ; ajoutez un libellé (« Salon », « Piscine »…) pour la présentation élégante des pièces.
3. **Choisir le style** : Luxury (fondus amples, sérif raffinée), Cinematic (letterbox, fondus au noir) ou Modern (rythme soutenu, balayages graphiques).
4. **Choisir la musique** (3 ambiances intégrées, libres d'utilisation, pré-écoute disponible) et la **durée** (30/35/40/45 s).
5. **Générer ma vidéo** — suivez la progression, prévisualisez le film puis **téléchargez le MP4** prêt à être livré au client.

Selon la durée choisie, le logiciel sélectionne automatiquement le nombre de photographies mises en scène, réparties harmonieusement sur l'ordre que vous avez défini (le reste des photos sert d'alternance pour les futurs rendus : changez l'ordre pour varier les films).

## Architecture

```
server/          API Express + worker de rendu Remotion
remotion/        Compositions vidéo (intro, scènes Ken Burns, transitions, outro)
public/          Interface web (noir profond, blanc, beige doré, anthracite)
assets/music     Pistes musicales intégrées
assets/fonts     Typographies élégantes embarquées
projects/        Données des projets (photos, rendus) — non versionné
```

## Bonnes pratiques

- Les photos doivent être **fournies par vos clients ou autorisées** pour cet usage.
- Le logiciel ne retouche pas les caractéristiques réelles des biens : il met en scène les photographies telles quelles (cadrage, mouvement, lumière d'ambiance uniquement).
- Remotion est gratuit pour les indépendants et les entreprises jusqu'à 3 personnes ; au-delà, une licence entreprise est requise (voir remotion.dev/license).
