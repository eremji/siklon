// Logo de Siklon : la spirale, puis le lettrage « Siklon » (US-07c, #110, option 2 de la maquette).
// En jetons seulement : --text et --accent, qui donnent en sombre le blanc et le turquoise de l'icône.
// Une seule image nommée « Siklon » pour le lecteur d'écran ; les deux dessins sont décoratifs.
import { LETTRAGE, SPIRALE } from "@/lib/logo/traces";

type Dessin = typeof SPIRALE | typeof LETTRAGE;

function Traces({ dessin, hauteur }: { dessin: Dessin; hauteur: number }) {
  const { x, y, largeur, hauteur: h } = dessin.cadre;
  return (
    <svg
      width={Math.round((hauteur * largeur) / h)}
      height={hauteur}
      viewBox={`${x} ${y} ${largeur} ${h}`}
      aria-hidden="true"
      className="block flex-none"
    >
      {dessin.texte.map((d) => (
        <path key={d.slice(0, 24)} className="fill-foreground" d={d} />
      ))}
      {dessin.accent.map((d) => (
        <path key={d.slice(0, 24)} className="fill-accent" d={d} />
      ))}
    </svg>
  );
}

/** `hauteur` : hauteur de la spirale en pixels ; le lettrage en fait les 30/44 (maquette). */
export function LogoSiklon({ hauteur = 44, className = "" }: { hauteur?: number; className?: string }) {
  return (
    <span role="img" aria-label="Siklon" className={`flex items-center gap-3 ${className}`}>
      <Traces dessin={SPIRALE} hauteur={hauteur} />
      <Traces dessin={LETTRAGE} hauteur={Math.round((hauteur * 30) / 44)} />
    </span>
  );
}
