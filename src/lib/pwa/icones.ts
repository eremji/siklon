// Icônes de l'application (manifeste) : servies par src/app/icones/[nom]/route.tsx, générées au build.

export interface Icone {
  /** Nom du fichier sous /icones/. */
  nom: string;
  taille: number;
  /** Android découpe l'icône en cercle ou en carré arrondi : le dessin doit tenir dans la zone sûre. */
  maskable: boolean;
}

export const ICONES: readonly Icone[] = [
  { nom: "192.png", taille: 192, maskable: false },
  { nom: "512.png", taille: 512, maskable: false },
  { nom: "maskable-512.png", taille: 512, maskable: true },
];

export function trouverIcone(nom: string): Icone | undefined {
  return ICONES.find((icone) => icone.nom === nom);
}
