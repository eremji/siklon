# Fixtures e2e

`hurdat2-1851-2005-010126.txt` est un fichier **synthétique** au format HURDAT2 (tempêtes et
valeurs inventées, pas des données NHC). La CI l'importe dans un Postgres de test avant les tests
Playwright. Le nom suit le format NHC (`hurdat2-AAAA-AAAA-MMJJAA.txt`) exigé par l'import.

Près de la Guadeloupe (à moins de `RADIUS_IMPACT_KM`) : BRAVO 2005 (catégorie 5), ALPHA 1990,
CHARLIE 1989 et une tempête sans nom de 1899. DELTA 1950 reste loin de toutes les îles.

`tuile-vectorielle.ts` encode à la main une tuile vectorielle **synthétique** (bandes verticales
d'eau et une frontière, schéma OpenMapTiles) et le TileJSON qui la référence. `fond-carte.spec.ts`
les sert à la place d'OpenFreeMap pour vérifier que le worker MapLibre décode et dessine les tuiles.
