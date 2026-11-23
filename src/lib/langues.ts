// Langues de l'interface (US-10). La langue est le premier segment de chaque adresse de page
// (/fr/…, /en/…) : chaque langue garde ainsi ses pages pré-construites (Cache Components).
// Sans dépendance : pas d'import Next ici, le module sert au proxy, au serveur et au navigateur.

export const LANGUES = ["fr", "en"] as const;
export type Langue = (typeof LANGUES)[number];

/** Langue d'un navigateur qui ne propose ni le français ni l'anglais. */
export const LANGUE_PAR_DEFAUT: Langue = "fr";

/** Cookie qui garde la langue choisie par le visiteur. */
export const COOKIE_LANGUE = "siklon-langue";

export const estLangue = (valeur: unknown): valeur is Langue =>
  typeof valeur === "string" && (LANGUES as readonly string[]).includes(valeur);

/**
 * Langue à proposer d'après l'en-tête Accept-Language : la langue de l'app la mieux classée par le
 * navigateur (poids q, puis ordre d'écriture), sinon la langue par défaut.
 */
export function langueDuNavigateur(acceptLanguage: string | null | undefined): Langue {
  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((morceau, rang) => {
      const [etiquette, ...parametres] = morceau.trim().split(";");
      const q = parametres.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const poids = q === undefined ? 1 : Number(q.slice(2));
      return { langue: etiquette.trim().toLowerCase().split("-")[0], poids: Number.isFinite(poids) ? poids : 0, rang };
    })
    .filter(({ langue, poids }) => poids > 0 && estLangue(langue))
    .sort((a, b) => b.poids - a.poids || a.rang - b.rang);
  return candidates.length > 0 ? (candidates[0].langue as Langue) : LANGUE_PAR_DEFAUT;
}

/** Adresse d'une page dans une langue : chemin("en", "/iles") → "/en/iles". */
export function chemin(langue: Langue, page: string): string {
  return page === "/" ? `/${langue}` : `/${langue}${page}`;
}

/** Langue en tête d'un chemin (s'il y en a une) et le reste du chemin. */
export function decouperChemin(cheminComplet: string): { langue: Langue | undefined; reste: string } {
  const [, premier, ...suite] = cheminComplet.split("/");
  if (!estLangue(premier)) return { langue: undefined, reste: cheminComplet };
  const reste = `/${suite.join("/")}`.replace(/\/$/, "");
  return { langue: premier, reste: reste || "/" };
}
