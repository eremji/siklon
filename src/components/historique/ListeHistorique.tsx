import Link from "next/link";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { EntreeHistorique } from "@/lib/db/historique";
import { formaterDate, formaterDistance, formaterVent, libelleCategorie, nomTempete } from "@/lib/historique/formatage";
import type { Ile } from "@/lib/iles";

export function ListeHistorique({ entrees, ile }: { entrees: readonly EntreeHistorique[]; ile: Ile }) {
  if (entrees.length === 0) {
    return (
      <p className="rounded-2xl bg-surface p-4 text-base">
        Aucun cyclone n&apos;est passé à moins de {RADIUS_IMPACT_KM} km de {ile.pointReference.nom} avec ces filtres.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {entrees.map((entree) => (
        <li key={entree.tempeteId} className="rounded-2xl bg-surface p-4">
          <Link
            href={`/historique/${entree.tempeteId}?ile=${ile.slug}`}
            className="flex min-h-11 items-center text-accent underline underline-offset-4"
          >
            <h3 className="text-lg font-bold">
              {nomTempete(entree.nom, entree.tempeteId)} <span className="font-normal">{entree.annee}</span>
            </h3>
          </Link>
          <dl className="mt-2 grid grid-cols-1 gap-y-1 text-base sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-muted">Intensité près de l&apos;île</dt>
            <dd className="flex flex-wrap gap-x-2">
              <span className="font-bold">{libelleCategorie(entree.categorie)}</span>
              {entree.ventMaxKt !== null && <span>{formaterVent(entree.ventMaxKt)}</span>}
            </dd>
            <dt className="text-muted">Distance minimale</dt>
            <dd>{formaterDistance(entree.distanceMinKm)}</dd>
            <dt className="text-muted">Plus proche passage</dt>
            <dd>{formaterDate(entree.horodatage, ile.fuseau)}</dd>
          </dl>
        </li>
      ))}
    </ol>
  );
}
