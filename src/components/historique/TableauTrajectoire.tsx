import type { PointHurdat2 } from "@/lib/hurdat2/parseur";
import { formaterDateHeureUtc, formaterPosition, formaterVent, libelleStatut } from "@/lib/historique/formatage";

const VIDE = "—";

/** Alternative textuelle à la carte : tous les points de la trajectoire. */
export function TableauTrajectoire({ points }: { points: readonly PointHurdat2[] }) {
  const legende = `Points de la trajectoire (${points.length}), heures en UTC`;
  return (
    <div tabIndex={0} role="region" aria-label={legende} className="overflow-x-auto rounded-2xl bg-surface">
      <table className="w-full text-left text-base">
        <caption className="sr-only">{legende}</caption>
        <thead className="text-muted">
          <tr>
            {["Date et heure", "Stade", "Position", "Vent maximal", "Pression"].map((titre) => (
              <th key={titre} scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
                {titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.horodatage.getTime()} className="border-t border-soft">
              <td className="px-3 py-2 whitespace-nowrap">{formaterDateHeureUtc(point.horodatage)}</td>
              <td className="px-3 py-2">
                {libelleStatut(point.statut)}
                {point.identifiant === "L" ? " (atterrissage)" : ""}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{formaterPosition(point)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{point.ventKt === null ? VIDE : formaterVent(point.ventKt)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{point.pressionMb === null ? VIDE : `${point.pressionMb} hPa`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
