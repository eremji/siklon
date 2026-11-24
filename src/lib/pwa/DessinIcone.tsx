// Dessin de l'icône de Siklon pour next/og (ImageResponse) : la spirale du logo (US-07c, #110), bras
// en blanc (--header-text) et en turquoise (--accent du thème sombre) sur le fond Lagon des en-têtes
// (--header). Jamais de rouge ni d'orange, couleurs réservées aux vigilances (DESIGN.md).
import { SPIRALE } from "@/lib/logo/traces";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

const pourcent = (part: number) => `${Math.round(part * 1000) / 10}%`;

/**
 * `zoneSure` : part de la hauteur occupée par la spirale. Une icône « maskable » est découpée par
 * Android (cercle de 80 % du côté) : la spirale y reste plus petite.
 */
export function DessinIcone({ zoneSure }: { zoneSure: number }) {
  const { x, y, largeur, hauteur } = SPIRALE.cadre;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: JETONS_CLAIR.header,
      }}
    >
      <svg
        width={pourcent((zoneSure * largeur) / hauteur)}
        height={pourcent(zoneSure)}
        viewBox={`${x} ${y} ${largeur} ${hauteur}`}
      >
        {SPIRALE.texte.map((d) => (
          <path key={d.slice(0, 24)} fill={JETONS_CLAIR["header-text"]} d={d} />
        ))}
        {SPIRALE.accent.map((d) => (
          <path key={d.slice(0, 24)} fill={JETONS_SOMBRE.accent} d={d} />
        ))}
      </svg>
    </div>
  );
}

/** Part de la hauteur occupée par la spirale : icône ordinaire, ou découpée par Android. */
export const ZONE_SURE = { normale: 0.74, maskable: 0.56 } as const;
