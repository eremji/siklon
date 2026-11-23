// Dessin de l'icône de Siklon pour next/og (ImageResponse) : le symbole météo du cyclone tropical,
// un anneau et deux bras en spirale, en trait de la couleur du texte des en-têtes sur le fond Lagon
// des en-têtes (jetons --header-text et --header, DESIGN.md), jamais une couleur de vigilance.
import { JETONS_CLAIR } from "./jetons";

/**
 * `zoneSure` : part du côté occupée par le symbole. Une icône « maskable » est découpée par Android
 * (cercle de 80 % du côté) : le symbole y reste plus petit.
 */
export function DessinIcone({ zoneSure }: { zoneSure: number }) {
  const cote = `${Math.round(zoneSure * 100)}%`;
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
      <svg width={cote} height={cote} viewBox="0 0 100 100" fill="none">
        <g stroke={JETONS_CLAIR["header-text"]} strokeWidth={9} strokeLinecap="round">
          <circle cx={50} cy={50} r={14} />
          <path d="M 50 36 C 50 16, 66 6, 86 10" />
          <path d="M 50 64 C 50 84, 34 94, 14 90" />
        </g>
      </svg>
    </div>
  );
}

/** Part du côté occupée par le symbole : icône ordinaire, ou découpée par Android. */
export const ZONE_SURE = { normale: 0.78, maskable: 0.56 } as const;
