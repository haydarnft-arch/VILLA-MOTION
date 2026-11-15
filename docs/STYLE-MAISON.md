# Style maison — grammaire de montage

Tirée de 4 références fournies le 15/11/2026 : publicités en motion design au format vertical, republiées sur TikTok (une démo McDonald's, une démo Airbnb, le film « Make it move » d'ugoki, une démo de l'app Hevy). On en reprend la **grammaire** (rythme, construction des transitions, typographie, caméra), **jamais le contenu** : ni leurs images, ni leur musique, ni les marques citées.

Légende : **[mesuré]** = relevé image par image ou par analyse audio ; **[observé]** = vu sur les planches, valeur estimée.

## 1. Format

- Vertical 9:16 en priorité (1080×1920), version paysage recomposée et non étirée. **[mesuré : les 4 références sont en 576×1024, 30 i/s]**
- Durée 15 à 20 s. **[mesuré : 16,4 / 18,7 / 19,6 / 20,0 s]**
- Zone utile sur mobile : rien d'important dans les 168 px du haut ni sous 1330 px (interface TikTok/Reels).

## 2. Un plan-séquence, pas une suite de plans

- **Presque aucune coupe franche** : 1 à 2 coupes par vidéo, souvent zéro. **[mesuré : détection de coupes]** Tout passe par des transitions animées.
- **Un fil conducteur visuel** traverse tout le film et relie les scènes : un trait de lumière néon (Hevy), une forme rose qui devient carte puis point puis logo (Airbnb), le ticket de commande qui devient le burger (McDonald's). **[observé]**
- **Histoire = parcours de l'utilisateur** en 4 temps : marque → action (on commande, on cherche, on réserve) → résultat (« C'est prêt », « C'est réservé ! ») → marque + slogan. **[observé]**

## 3. Transitions (3 à 5 types par film, chacune causée par un objet à l'écran)

| Transition | Construction | Source |
|---|---|---|
| L'objet devient le logo | la carte de confirmation perd son contenu, se rétracte en pilule (0,5 s), devient un point (0,3 s), le point se dessine en logo (0,2 s), le nom s'écrit lettre par lettre (0,3 s), maintien ≥ 1 s | **[mesuré, réf. Airbnb, 11,0 → 14,1 s]** |
| Zoom à travers | la caméra rase la surface d'un téléphone en contre-plongée avec flou de profondeur (0,9 s), l'icône sort de l'écran avec des anneaux lumineux (0,6 s), on traverse vers un fond uni | **[mesuré, réf. ugoki, 2,6 → 4,4 s]** |
| Arrivée en profondeur | l'objet arrive du fond en tournant, se pose (≈ 0,6 s), maintien 0,8 s, repart en tournant vers le fond (0,4 s) | **[mesuré, réf. ugoki]** |
| Remplissage couleur | une couleur de marque envahit l'écran depuis un élément (bouton, carte) | **[observé, réf. Airbnb/McDonald's]** |
| Empilement | les éléments du produit tombent et s'empilent couche par couche, un mot-titre par couche (PAIN, CHEDDAR…) | **[observé, réf. McDonald's, 5 → 9 s]** |
| Mosaïque finale | tous les éléments vus en grille rapide juste avant le logo | **[observé, réf. McDonald's, 11 s]** |

## 4. Typographie animée

- Mots très gros (60 à 90 % de la largeur), 1 à 3 mots à l'écran à la fois. **[observé]**
- Apparition lettre par lettre ou mot par mot, souvent avec un mot mis en valeur dans un bloc plein (« make **it** move »). **[observé, réf. ugoki]**
- Typo inclinée dans l'espace 3D, flou de mouvement sur les déplacements rapides, lueur (glow) sur fond sombre. **[observé]**
- Slogan final court, centré sous le logo (« Make it move. », « Venez comme vous êtes. »). **[observé]**

## 5. Caméra et matière

- Objets 3D (téléphone, icône, carte) avec perspective, profondeur de champ et reflets. **[observé]**
- Mouvements rapides (0,3 à 0,6 s) avec flou de mouvement, puis arrêt net et maintien : l'élément posé ne bouge plus. **[observé, cohérent avec les mesures HyperFrames]**
- Palette réduite : 1 couleur de marque saturée + noir ou blanc, lueurs sur fond sombre. **[mesuré, réf. ugoki : luminance 37/255, contraste 41, saturation 0,41]**

## 6. Son

- Musique de 81 à 117 BPM, avec des impacts sonores calés sur les grandes transitions. **[mesuré : tempos 117 / 112 / 103 / 81 BPM ; les accents audio tombent sur les changements de scène, par ex. réf. McDonald's à 2,1 s (ouverture de l'écran), 5,1 s (ingrédients), 10,1 s (plateau)]**
- Les gros changements tombent sur la mesure, les petits sur le temps.

## 7. À éviter (ce qui fait « généré »)

- Diaporama : une image par plan avec un fondu entre chaque.
- La même entrée (fondu + glissement vers le haut) sur chaque titre.
- Des titres qui continuent de bouger une fois posés.
- Plus d'un tiers de coupes franches entre les scènes.
- Un logo dans un coin ; un logo qui apparaît en fondu au lieu d'être « joué ».

## Outils

HyperFrames + GSAP (voir `MOTION-STACK.md`), méthode de variété de `references/saas-motion-kit/`.
