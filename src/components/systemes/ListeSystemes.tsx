import { Lien } from "@/components/langue/Lien";
import { LienNhc } from "@/components/LienNhc";
import type { EtatFlux } from "@/lib/nhc/client";
import type { Langue } from "@/lib/langues";
import { avisLePlusRecent, formaterHeureAntilles, libelleHeureAntilles } from "@/lib/nhc/fraicheur";
import type { Prevision } from "@/lib/nhc/previsions";
import { type SystemeActif, descriptionSysteme } from "@/lib/nhc/systemes";
import { SYSTEMES } from "@/lib/textes/systemes";
import { AlerteObsolescence } from "./AlerteObsolescence";
import { Pastille } from "./Pastille";

function Source({ systemes, luLe, langue }: { systemes: SystemeActif[]; luLe: string; langue: Langue }) {
  const { source } = SYSTEMES[langue];
  const fuseau = libelleHeureAntilles(langue);
  const dernierAvis = avisLePlusRecent(systemes.map((systeme) => systeme.avis.emisLe));
  return (
    <p className="text-sm text-muted">
      {dernierAvis
        ? source.dernierAvis(formaterHeureAntilles(dernierAvis, langue), fuseau)
        : source.fluxLu(formaterHeureAntilles(luLe, langue), fuseau)}
    </p>
  );
}

export function ListeSystemes({
  langue,
  flux,
  previsions = {},
}: {
  langue: Langue;
  flux: EtatFlux;
  // Prévisions disponibles, par identifiant de système.
  previsions?: Record<string, Prevision>;
}) {
  const { liste } = SYSTEMES[langue];
  if (flux.etat === "indisponible") {
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
        {liste.indisponible} {liste.consultez} <LienNhc />.
      </p>
    );
  }

  const { systemes, rejetes } = flux;
  return (
    <div className="flex flex-col gap-3">
      {rejetes > 0 && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
          {liste.rejetes(rejetes)} {liste.consultez} <LienNhc />.
        </p>
      )}
      {systemes.length === 0 && rejetes === 0 && (
        <p className="rounded-2xl bg-surface p-4 text-base font-bold">{liste.aucun}</p>
      )}
      {systemes.length > 0 && (
        <ul aria-label={liste.nom} className="flex flex-col gap-2">
          {systemes.map((systeme) => (
            <li key={systeme.id} className="flex min-h-11 items-start gap-3 rounded-2xl bg-surface p-3">
              <Pastille systeme={systeme} />
              <div className="flex flex-col">
                <Lien
                  href={`/systemes/${systeme.id}`}
                  className="flex min-h-11 items-center text-lg font-bold text-accent underline underline-offset-4"
                >
                  {systeme.nom}
                </Lien>
                <span className="text-base text-muted">{descriptionSysteme(systeme, langue)}</span>
                <span className="text-sm text-muted">
                  {liste.avis(systeme.avis.numero, formaterHeureAntilles(systeme.avis.emisLe, langue))}
                </span>
                <span className="text-sm text-muted">
                  {previsions[systeme.id]
                    ? liste.prevision(previsions[systeme.id].avis)
                    : liste.sansPrevision}
                </span>
                <AlerteObsolescence emisLe={systeme.avis.emisLe} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Source systemes={systemes} luLe={flux.luLe} langue={langue} />
    </div>
  );
}
