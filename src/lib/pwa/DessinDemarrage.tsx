// Dessin de l'écran de démarrage de l'app installée, pour next/og (US-07c, #110) : la spirale au-dessus
// du mot « Siklon », centrées sur le fond --bg du thème, en --text et --accent (DESIGN.md, « Logo et
// icône »). Une image par taille d'écran et par thème : src/lib/pwa/demarrage.ts.
import { LETTRAGE, SPIRALE } from "@/lib/logo/traces";
import type { Theme } from "./demarrage";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

/** Largeur de la spirale : 28 % de la largeur de l'écran. */
const PART_SPIRALE = 0.28;

type Dessin = typeof SPIRALE | typeof LETTRAGE;

function Traces({ dessin, largeur, couleurs }: { dessin: Dessin; largeur: number; couleurs: { text: string; accent: string } }) {
  const { x, y, largeur: l, hauteur: h } = dessin.cadre;
  return (
    <svg width={largeur} height={Math.round((largeur * h) / l)} viewBox={`${x} ${y} ${l} ${h}`}>
      {dessin.texte.map((d) => (
        <path key={d.slice(0, 24)} fill={couleurs.text} d={d} />
      ))}
      {dessin.accent.map((d) => (
        <path key={d.slice(0, 24)} fill={couleurs.accent} d={d} />
      ))}
    </svg>
  );
}

/** `largeur` : largeur de l'image en pixels réels. */
export function DessinDemarrage({ theme, largeur }: { theme: Theme; largeur: number }) {
  const jetons = theme === "clair" ? JETONS_CLAIR : JETONS_SOMBRE;
  // Arrondi par paire de pixels : même taille en points sur un écran 2x et sur un écran 3x de même largeur.
  const spirale = Math.round((largeur * PART_SPIRALE) / 2) * 2;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(spirale * 0.16),
        background: jetons.bg,
      }}
    >
      <Traces dessin={SPIRALE} largeur={spirale} couleurs={jetons} />
      <Traces dessin={LETTRAGE} largeur={Math.round(spirale * 1.1)} couleurs={jetons} />
    </div>
  );
}
