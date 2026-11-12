# Siklon : design

Direction retenue : **C · Lagon**. Identité chaleureuse et antillaise,
lisible en situation d'urgence, en thème clair et sombre.

Maquettes (canevas privé, à partager depuis son menu Share) :
https://claude.ai/artifact/WCMhoUPMui2udnV8ssPisv

## Principes
- Mobile d'abord (390 px de large), utilisable à une main.
- Contraste AA minimum partout : 4,5:1 pour le texte, 3:1 pour les
  éléments graphiques (icônes, contours, carte).
- Les couleurs de vigilance sont réservées aux alertes réelles. La couleur
  de marque ne doit jamais leur ressembler.
- Sur la page d'une île en alerte, l'en-tête prend la couleur de la
  vigilance en cours à la place de la couleur de marque.
- Chaque écran affiche la source et l'heure de mise à jour des données,
  et la mention « Siklon ne remplace pas les consignes officielles ».

## Jetons de couleur

Le thème sombre suit le réglage du téléphone (`prefers-color-scheme`), avec
un bouton pour forcer l'un ou l'autre.

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | #F2F7F6 | #0B1F24 | Fond des écrans |
| `--surface` | #FFFFFF | #12303A | Cartes, barre de navigation |
| `--soft` | #E3F0EE | #1A3E48 | Séparateurs, encadrés, piste de progression |
| `--text` | #10292E | #E6F2F0 | Texte principal |
| `--text-2` | #3E5A60 | #A9C4C2 | Texte secondaire |
| `--header` | #0E5E6F | #12303A | En-têtes (Lagon en clair, neutre en sombre) |
| `--header-text` | #FFFFFF | #E6F2F0 | Texte des en-têtes |
| `--accent` | #0E5E6F | #5EC4C9 | Boutons, liens, onglet actif |
| `--on-accent` | #FFFFFF | #0B1F24 | Texte sur `--accent` |
| `--field` | #6B8287 | #6E9096 | Contour des champs, interrupteur éteint |
| `--map-sea` | #CFE7E4 | #0E2830 | Mer sur la carte |
| `--map-land` | #3F6B4F | #6B8F7A | Îles |
| `--map-land-hi` | #1F3D2B | #C9DDD6 | Île suivie |
| `--danger` | #B91C1C | #DC2626 | Ouragan, cône, alerte rouge (fond) |
| `--danger-text` | #B91C1C | #F87171 | Texte rouge sur `--surface` |
| `--danger-soft` | #FDECEC | #3A1A1F | Ligne mise en évidence (échéance proche) |

Contrastes clés : `--text` sur `--bg` 14:1 (clair) et 14,8:1 (sombre) ;
`--text-2` sur `--surface` 7,4:1 et 7,5:1 ; blanc sur Lagon 7,4:1 ;
`--accent` sombre sur `--surface` 6,8:1.

## Couleurs de vigilance (Météo-France)

| Niveau | Consigne | Clair : fond / texte | Sombre : fond / texte |
|---|---|---|---|
| Vert | Pas de vigilance | `--header` / `--header-text` | idem |
| Jaune | Soyez attentifs | #FACC15 / #10292E (9,9:1) | idem |
| Orange | Préparez-vous | #EA7A00 / #10292E (5,3:1) | idem |
| Rouge | Protégez-vous | #B91C1C / #FFFFFF (6,5:1) | #DC2626 / #FFFFFF (4,8:1) |
| Violet | Confinez-vous | #6B21A8 / #FFFFFF (8,7:1) | #9333EA / #FFFFFF (5,4:1) |
| Gris | Restez prudents | #4B5563 / #FFFFFF (7,6:1) | #64748B / #FFFFFF (4,7:1) |

Les îles sans vigilance Météo-France affichent les watches/warnings NHC
avec les mêmes règles de contraste.

## Couleurs des watches/warnings (NHC)

Échelle bleu → magenta, reprise des cartes du NHC (bleu pour
l'avertissement de tempête tropicale, rose pour la veille d'ouragan),
sans le jaune ni le rouge réservés à la vigilance Météo-France, et loin
du Lagon de la marque. L'en-tête de la page île prend la couleur du type
le plus grave en cours ; sans watch ni warning, il garde `--header`.

| Type (terme d'origine) | Jeton | Clair : fond / texte | Sombre : fond / texte |
|---|---|---|---|
| Avertissement d'ouragan (Hurricane Warning) | `--nhc-hwr` | #9D174D / #FFFFFF (7,9:1) | #DB2777 / #FFFFFF (4,6:1) |
| Avertissement de tempête tropicale (Tropical Storm Warning) | `--nhc-twr` | #1D4ED8 / #FFFFFF (6,7:1) | #2563EB / #FFFFFF (5,2:1) |
| Veille d'ouragan (Hurricane Watch) | `--nhc-hwa` | #F9A8D4 / #10292E (8,4:1) | idem |
| Veille de tempête tropicale (Tropical Storm Watch) | `--nhc-twa` | #93C5FD / #10292E (8,4:1) | idem |

Le texte utilise `--on-vig-clair` / `--on-vig-fonce`. Le libellé
français est toujours écrit, suivi du terme d'origine entre parenthèses,
et de la définition du NHC : veille = conditions possibles (environ
48 h avant), avertissement = conditions attendues (environ 36 h avant).

## Typographie
Police unique : **Atkinson Hyperlegible** (Google Fonts, 400 et 700),
conçue pour distinguer sans ambiguïté I, l et 1.

| Rôle | Taille | Graisse |
|---|---|---|
| Chiffre clé (délai, niveau) | 44–48 px | 700 |
| Titre d'écran | 28–30 px | 700 |
| Titre de section | 18–20 px | 700 |
| Corps | 16–17 px | 400 |
| Secondaire | 14 px | 400 |
| Mention, légende | 12–13 px | 400 |

Le corps du texte ne descend jamais sous 16 px.

## Formes et espacements
- Rayons : 12 / 16 / 20 / 24 px ; boutons et pastilles en pilule.
- Espacements : 4 / 8 / 12 / 16 / 24 px ; marges d'écran 16 px.
- Zones tactiles : 44 px minimum, 48–52 px pour les actions principales.
- Pastille de catégorie : rond de 46 px, chiffre de la catégorie.
- Navigation : barre flottante en pilule, 4 entrées (Carte, Mon île,
  Alertes, Compte), l'onglet actif sur `--accent`.

## Carte
- Carte réelle et interactive (zoom, déplacement), centrée par défaut sur
  l'île suivie et le système le plus proche, stylée avec les jetons
  `--map-*`. Bibliothèque envisagée : MapLibre GL avec un fond OpenFreeMap
  ou Protomaps (dépendance à valider avant ajout).
- Cône et trajectoire tracés à partir des fichiers officiels du NHC.
- Zone de surveillance (`RADIUS_WATCH_KM`) en cercle pointillé autour de
  l'île suivie.
- Carte simplifiée en SVG en secours quand la connexion est trop faible.

## Accessibilité
- Vrais éléments interactifs (`button`, `a`, `input` avec `label`),
  `aria-label` sur les boutons à icône seule, `aria-pressed` sur les
  bascules et `role="switch"` sur les interrupteurs.
- Les états ne reposent jamais sur la couleur seule : texte, position ou
  icône les accompagnent toujours.
- Icônes en trait (SVG en ligne), jamais d'emoji.
