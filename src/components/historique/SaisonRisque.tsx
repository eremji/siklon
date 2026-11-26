import { DEBUT_SAISON, FIN_SAISON, RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { DernierImport } from "@/lib/db/historique";
import { formaterDate } from "@/lib/historique/formatage";
import { dansSaisonOfficielle, phraseSaison, type SaisonRisque as Saison } from "@/lib/historique/saison";
import { type Ile, nomVille } from "@/lib/iles";
import type { Langue } from "@/lib/langues";
import { HISTORIQUE } from "@/lib/textes/historique";

const majuscule = (texte: string) => texte.charAt(0).toLocaleUpperCase() + texte.slice(1);

/**
 * Bloc « Saison à risque » (US-17) : 12 barres, une par mois, avec la saison officielle repérée sur
 * `--soft`. Barres en `--accent`, jamais une couleur de vigilance. Le tableau sert d'équivalent texte.
 */
export function SaisonRisque({
  saison,
  ile,
  langue,
  dernierImport,
}: {
  saison: Saison;
  ile: Ile;
  langue: Langue;
  dernierImport: DernierImport | null;
}) {
  const t = HISTORIQUE[langue].saison;
  const ville = nomVille(ile, langue);
  const max = Math.max(1, ...saison.parMois);
  const periode = t.periode(saison.anneeMin, dernierImport?.derniereAnnee ?? null);
  const description = t.graphique(
    RADIUS_IMPACT_KM,
    ville,
    saison.parMois.map((n, mois) => t.valeur(t.mois[mois], n)).join(", "),
  );

  return (
    <section aria-label={t.titre} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <h2 className="text-xl font-bold">{t.titre}</h2>
      <p className="text-base">{phraseSaison(saison, langue)}</p>

      <div role="img" aria-label={description} className="flex flex-col gap-1">
        <div className="grid h-48 grid-cols-12 gap-0.5">
          {saison.parMois.map((n, mois) => {
            const saisonOfficielle = dansSaisonOfficielle(mois);
            const plusActif = saison.plusActifs.includes(mois);
            return (
              <div
                key={mois}
                className={`flex flex-col items-center gap-1 rounded-t-md pt-1 ${saisonOfficielle ? "bg-soft" : ""}`}
              >
                <span
                  data-mois={mois + 1}
                  data-saison={saisonOfficielle ? "oui" : "non"}
                  className={`text-xs ${plusActif ? "font-bold text-foreground" : "text-muted"}`}
                >
                  {n}
                </span>
                <div className="relative w-full flex-1">
                  <div
                    className={`absolute inset-x-0 bottom-0 mx-auto max-w-5 rounded-t ${n === 0 ? "bg-field" : "bg-accent"}`}
                    style={{ height: n === 0 ? "2px" : `${(n / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-12 gap-0.5 border-t-2 border-field pt-1">
          {t.initiales.map((initiale, mois) => (
            <span key={mois} className="text-center text-sm text-muted">
              {initiale}
            </span>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="size-4 shrink-0 rounded border border-field bg-soft" />
        {t.saisonOfficielle(
          t.jour(DEBUT_SAISON.jour, t.mois[DEBUT_SAISON.mois - 1]),
          t.jour(FIN_SAISON.jour, t.mois[FIN_SAISON.mois - 1]),
        )}
      </p>

      <details className="flex flex-col gap-2">
        <summary className="flex min-h-11 w-fit cursor-pointer items-center rounded-full border-2 border-accent px-4 text-base font-bold text-accent">
          {t.afficherTableau}
        </summary>
        <table className="mt-2 w-full text-left text-base">
          <caption className="sr-only">{t.legendeTableau(RADIUS_IMPACT_KM, ville, periode)}</caption>
          <thead className="text-muted">
            <tr>
              {t.colonnes.map((titre) => (
                <th key={titre} scope="col" className="px-2 py-1 font-bold">
                  {titre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {saison.parMois.map((n, mois) => (
              <tr key={mois} className="border-t border-soft">
                <th scope="row" className="px-2 py-1 font-normal">
                  {majuscule(t.mois[mois])}
                </th>
                <td className="px-2 py-1">{n}</td>
                <td className="px-2 py-1">{dansSaisonOfficielle(mois) ? t.oui : t.non}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div className="flex flex-col gap-1 text-sm text-muted">
        <p>{t.mention(saison.total, RADIUS_IMPACT_KM, ville, periode)}</p>
        <p>{t.source(dernierImport ? formaterDate(dernierImport.importeLe, ile.fuseau, langue) : null)}</p>
      </div>
    </section>
  );
}
