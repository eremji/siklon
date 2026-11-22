// Icônes d'iOS dessinées simplement, en trait (DESIGN.md) : décoratives, le texte voisin les nomme.

const TRAIT = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Bouton Partager d'iOS : un carré ouvert, une flèche vers le haut. */
export function IconePartager({ taille = 22, className }: { taille?: number; className?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" className={className} {...TRAIT}>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" />
    </svg>
  );
}

/** Ligne « Sur l'écran d'accueil » du menu Partager : un carré arrondi avec un plus. */
export function IconeEcranAccueil({ taille = 22, className }: { taille?: number; className?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" className={className} {...TRAIT}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/** Bouton « ⋯ » de la barre d'adresse de Safari. */
export function IconePlus({ taille = 22, className }: { taille?: number; className?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
