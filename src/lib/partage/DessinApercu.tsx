// Dessin de l'image d'aperçu d'un lien partagé (US-21), 1200 × 630, pour next/og (ImageResponse) :
// flexbox et styles en ligne seulement. Thème clair, jetons de DESIGN.md ; la couleur de vigilance
// ne colore que la pastille d'une alerte réelle. Grands corps : l'image reste lisible en vignette.
import { LETTRAGE, SPIRALE } from "@/lib/logo/traces";
import type { Apercu } from "./apercu";
import { COULEURS_APERCU as C } from "./couleurs";

export const TAILLE_APERCU = { width: 1200, height: 630 } as const;

/** Police de DESIGN.md ; ses fichiers sont fournis à next/og par polices.ts. */
export const POLICE_APERCU = "Atkinson Hyperlegible";

/**
 * next/og sert ses images « immutable » pour un an : un aperçu doit au contraire suivre le dernier
 * bulletin : cinq minutes de cache partagé au plus.
 */
export const CACHE_APERCU = "public, max-age=0, s-maxage=300, must-revalidate";

/** Au-delà, l'image deviendrait illisible en vignette ; la page donne la liste complète. */
const LIGNES_MAX = 2;

function Traces({ dessin, hauteur }: { dessin: typeof SPIRALE | typeof LETTRAGE; hauteur: number }) {
  const { x, y, largeur, hauteur: h } = dessin.cadre;
  return (
    <svg width={Math.round((hauteur * largeur) / h)} height={hauteur} viewBox={`${x} ${y} ${largeur} ${h}`}>
      {dessin.texte.map((d) => (
        <path key={d.slice(0, 24)} fill={C.texte} d={d} />
      ))}
      {dessin.accent.map((d) => (
        <path key={d.slice(0, 24)} fill={C.accent} d={d} />
      ))}
    </svg>
  );
}

/** Logo de Siklon (DESIGN.md) : spirale puis lettrage, le lettrage aux 30/44 de la spirale. */
function Logo({ hauteur }: { hauteur: number }) {
  return (
    <div data-testid="logo-siklon" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Traces dessin={SPIRALE} hauteur={hauteur} />
      <Traces dessin={LETTRAGE} hauteur={Math.round((hauteur * 30) / 44)} />
    </div>
  );
}

export function DessinApercu({ apercu }: { apercu: Apercu }) {
  const { titre, niveau, lignes, sources, avertissement, mention } = apercu;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "44px 60px 36px",
        background: C.fond,
        color: C.texte,
        fontFamily: POLICE_APERCU,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1 }}>{titre}</div>
          <Logo hauteur={48} />
        </div>
        {niveau && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 700,
                padding: "10px 28px",
                borderRadius: 999,
                backgroundColor: niveau.couleurs?.fond ?? C.neutre,
                color: niveau.couleurs?.texte ?? C.texte,
              }}
            >
              {niveau.libelle}
            </div>
            {niveau.origine && (
              <div style={{ display: "flex", fontSize: 28, color: C.secondaire }}>{`(${niveau.origine})`}</div>
            )}
          </div>
        )}
        {lignes.slice(0, LIGNES_MAX).map(({ fort, detail }) => (
          <div key={fort} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>{fort}</div>
            {detail && <div style={{ display: "flex", fontSize: 32, lineHeight: 1.2 }}>{detail}</div>}
          </div>
        ))}
        {avertissement && (
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, lineHeight: 1.25 }}>{avertissement}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sources && <div style={{ display: "flex", fontSize: 26, lineHeight: 1.3 }}>{sources}</div>}
        <div style={{ display: "flex", fontSize: 22, color: C.secondaire }}>{mention}</div>
      </div>
    </div>
  );
}
