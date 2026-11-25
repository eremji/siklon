import { Lien } from "@/components/langue/Lien";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { EntreeHistorique } from "@/lib/db/historique";
import { formaterDate, formaterDistance, formaterVent, libelleCategorie, nomTempete } from "@/lib/historique/formatage";
import { type Ile, nomVille } from "@/lib/iles";
import type { Langue } from "@/lib/langues";
import { HISTORIQUE } from "@/lib/textes/historique";

export function ListeHistorique({
  entrees,
  ile,
  langue,
}: {
  entrees: readonly EntreeHistorique[];
  ile: Ile;
  langue: Langue;
}) {
  const textes = HISTORIQUE[langue].liste;
  if (entrees.length === 0) {
    return (
      <p className="rounded-2xl bg-surface p-4 text-base">
        {textes.aucun(RADIUS_IMPACT_KM, nomVille(ile, langue))}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {entrees.map((entree) => (
        <li key={entree.tempeteId} className="rounded-2xl bg-surface p-4">
          <Lien
            href={`/historique/${entree.tempeteId}?ile=${ile.slug}`}
            className="flex min-h-11 items-center text-accent underline underline-offset-4"
          >
            <h3 className="text-lg font-bold">
              {nomTempete(entree.nom, entree.tempeteId, langue)} <span className="font-normal">{entree.annee}</span>
            </h3>
          </Lien>
          <dl className="mt-2 grid grid-cols-1 gap-y-1 text-base sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-muted">{textes.intensite}</dt>
            <dd className="flex flex-wrap gap-x-2">
              <span className="font-bold">{libelleCategorie(entree.categorie, langue)}</span>
              {entree.ventMaxKt !== null && <span>{formaterVent(entree.ventMaxKt, langue)}</span>}
            </dd>
            <dt className="text-muted">{textes.distance}</dt>
            <dd>{formaterDistance(entree.distanceMinKm, langue)}</dd>
            <dt className="text-muted">{textes.passage}</dt>
            <dd>{formaterDate(entree.horodatage, ile.fuseau, langue)}</dd>
          </dl>
        </li>
      ))}
    </ol>
  );
}
