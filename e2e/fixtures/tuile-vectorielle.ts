// Tuile vectorielle synthétique (format Mapbox Vector Tile 2.1, schéma OpenMapTiles) pour les e2e :
// des bandes verticales d'eau alternent avec la terre, si bien qu'une vue, même très zoomée,
// montre toujours les deux ; une frontière (admin_level 2) traverse la tuile.
// Encodée à la main pour n'ajouter aucune dépendance et ne jamais télécharger de vraie tuile.

const ETENDUE = 4096;
const MARGE = 64;
// Largeur d'une bande d'eau, puis d'une bande de terre (1/16 de tuile).
const BANDE = ETENDUE / 16;

function varint(n: number): number[] {
  const octets: number[] = [];
  while (n > 0x7f) {
    octets.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  octets.push(n);
  return octets;
}

const zigzag = (n: number) => (n << 1) ^ (n >> 31);
const cle = (champ: number, type: 0 | 2) => varint((champ << 3) | type);
const entier = (champ: number, valeur: number) => [...cle(champ, 0), ...varint(valeur)];
const bloc = (champ: number, contenu: number[]) => [...cle(champ, 2), ...varint(contenu.length), ...contenu];
const texte = (champ: number, valeur: string) => bloc(champ, [...new TextEncoder().encode(valeur)]);
const commande = (id: number, nombre: number) => (id & 0x7) | (nombre << 3);

// Anneau extérieur dans le sens horaire (axe y vers le bas), comme l'exige la spécification.
function rectangle(x0: number, y0: number, x1: number, y1: number): number[] {
  const largeur = x1 - x0;
  const hauteur = y1 - y0;
  return [
    commande(1, 1), zigzag(x0), zigzag(y0),
    commande(2, 3), zigzag(largeur), zigzag(0), zigzag(0), zigzag(hauteur), zigzag(-largeur), zigzag(0),
    commande(7, 1),
  ];
}

// Entité : identifiant, attributs (indices clé/valeur), type de géométrie, géométrie.
function entite(id: number, type: 2 | 3, geometrie: number[], attributs: number[] = []): number[] {
  return [
    ...entier(1, id),
    ...(attributs.length ? bloc(2, attributs.flatMap(varint)) : []),
    ...entier(3, type),
    ...bloc(4, geometrie.flatMap(varint)),
  ];
}

function couche(nom: string, entites: number[][], cles: string[] = [], valeurs: number[][] = []): number[] {
  return [
    ...entier(15, 2),
    ...texte(1, nom),
    ...entites.flatMap((contenu) => bloc(2, contenu)),
    ...cles.flatMap((nomCle) => texte(3, nomCle)),
    ...valeurs.flatMap((valeur) => bloc(4, valeur)),
    ...entier(5, ETENDUE),
  ];
}

function coucheEau(): number[] {
  const bandes = Array.from({ length: ETENDUE / (2 * BANDE) }, (_, n) =>
    entite(n + 1, 3, rectangle(2 * n * BANDE, -MARGE, (2 * n + 1) * BANDE, ETENDUE + MARGE)),
  );
  return couche("water", bandes);
}

function coucheFrontieres(): number[] {
  // Ligne horizontale au milieu de la tuile, d'un bord à l'autre.
  const ligne = [commande(1, 1), zigzag(-MARGE), zigzag(ETENDUE / 2), commande(2, 1), zigzag(ETENDUE + 2 * MARGE), zigzag(0)];
  // Attribut admin_level = 2 (clé 0, valeur 0 en entier non signé).
  return couche("boundary", [entite(1, 2, ligne, [0, 0])], ["admin_level"], [entier(5, 2)]);
}

export function tuileVectorielle(): Buffer {
  return Buffer.from([...bloc(3, coucheEau()), ...bloc(3, coucheFrontieres())]);
}

// TileJSON servi à la place de https://tiles.openfreemap.org/planet.
export const TILEJSON = {
  tilejson: "3.0.0",
  tiles: ["https://tiles.openfreemap.org/planet/fixture/{z}/{x}/{y}.pbf"],
  minzoom: 0,
  maxzoom: 14,
  vector_layers: [
    { id: "water", fields: {} },
    { id: "boundary", fields: { admin_level: "Number" } },
  ],
};
