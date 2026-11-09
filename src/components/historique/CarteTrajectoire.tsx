import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { PointHurdat2 } from "@/lib/hurdat2/parseur";
import { cadrer, creerProjection, pasGrille } from "@/lib/historique/projection";
import type { Ile } from "@/lib/iles";

const LARGEUR = 600;
// Le SVG est réduit à ~360–420 px de large : 20 unités donnent un texte d'environ 12–14 px.
const TEXTE_GRILLE = 20;
const TEXTE_ILE = 24;

const multiples = (min: number, max: number) => {
  const pas = pasGrille(max - min);
  const valeurs: number[] = [];
  for (let v = Math.ceil(min / pas) * pas; v <= max; v += pas) valeurs.push(v);
  return valeurs;
};

/** Carte schématique en SVG, rendue côté serveur : légère en 3G, sans bibliothèque de carte. */
export function CarteTrajectoire({ titre, points, ile }: { titre: string; points: readonly PointHurdat2[]; ile?: Ile }) {
  const reference = ile?.pointReference;
  const cadre = cadrer(reference ? [...points, reference] : points, { marge: 2, ecartMin: 8 });
  const { hauteur, projeter, kmVersUnites } = creerProjection(cadre, LARGEUR);
  const trace = points.map((p) => projeter(p)).map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`);
  const ileSurCarte = reference ? projeter(reference) : null;
  const etiquetteAGauche = ileSurCarte !== null && ileSurCarte.x > LARGEUR * 0.6;
  const description = `Carte de la trajectoire de ${titre}, ${points.length} points${ile ? `, près de ${ile.nom}` : ""}`;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={description}
        viewBox={`0 0 ${LARGEUR} ${hauteur.toFixed(1)}`}
        className="h-auto w-full rounded-2xl"
      >
        <rect width={LARGEUR} height={hauteur} fill="var(--map-sea)" />
        {multiples(cadre.latMin, cadre.latMax).map((lat) => {
          const { y } = projeter({ lat, lon: cadre.lonMin });
          return (
            <g key={`lat${lat}`}>
              <line x1={0} x2={LARGEUR} y1={y} y2={y} stroke="var(--field)" strokeWidth={0.5} strokeDasharray="2 4" />
              <text x={6} y={y - 6} fontSize={TEXTE_GRILLE} fill="var(--text-2)">
                {Math.abs(lat)}° {lat < 0 ? "S" : "N"}
              </text>
            </g>
          );
        })}
        {multiples(cadre.lonMin, cadre.lonMax).map((lon) => {
          const { x } = projeter({ lat: cadre.latMin, lon });
          return (
            <g key={`lon${lon}`}>
              <line x1={x} x2={x} y1={0} y2={hauteur} stroke="var(--field)" strokeWidth={0.5} strokeDasharray="2 4" />
              {x < LARGEUR - 3 * TEXTE_GRILLE && (
                <text x={x + 6} y={hauteur - 8} fontSize={TEXTE_GRILLE} fill="var(--text-2)">
                  {Math.abs(lon)}° {lon < 0 ? "O" : "E"}
                </text>
              )}
            </g>
          );
        })}
        <polyline points={trace.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((point) => {
          const { x, y } = projeter(point);
          return point.statut === "HU" ? (
            <rect key={point.horodatage.getTime()} data-point="ouragan" x={x - 4} y={y - 4} width={8} height={8} fill="var(--danger)" />
          ) : (
            <circle key={point.horodatage.getTime()} data-point="autre" cx={x} cy={y} r={3.5} fill="var(--text-2)" />
          );
        })}
        {reference && ileSurCarte && (
          <g>
            <circle
              data-rayon-impact
              cx={ileSurCarte.x}
              cy={ileSurCarte.y}
              r={kmVersUnites(RADIUS_IMPACT_KM)}
              fill="none"
              stroke="var(--map-land-hi)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <circle cx={ileSurCarte.x} cy={ileSurCarte.y} r={7} fill="var(--map-land-hi)" />
            <text
              x={ileSurCarte.x + (etiquetteAGauche ? -12 : 12)}
              y={ileSurCarte.y - 12}
              textAnchor={etiquetteAGauche ? "end" : "start"}
              fontSize={TEXTE_ILE}
              fontWeight={700}
              fill="var(--text)"
            >
              {reference.nom}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="2" width="8" height="8" fill="var(--danger)" />
          </svg>
          Carré : stade d&apos;ouragan
        </span>
        <span className="flex items-center gap-1">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="3.5" fill="var(--text-2)" />
          </svg>
          Rond : autre stade
        </span>
        {reference && (
          <span>
            Cercle pointillé : {RADIUS_IMPACT_KM} km autour de {reference.nom}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
