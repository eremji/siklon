import { Lien } from "@/components/langue/Lien";
import { LienNhc } from "@/components/LienNhc";
import type { EtatFlux } from "@/lib/nhc/client";
import type { Langue } from "@/lib/langues";
import { derniereDonneeGardee, formaterHeureAntilles, libelleHeureAntilles } from "@/lib/nhc/fraicheur";
import { SYSTEMES } from "@/lib/textes/systemes";
import { EchecMiseAJourNhc } from "./EchecMiseAJourNhc";
import { FicheSysteme } from "./FicheSysteme";

/** Fiche d'un système selon l'état du flux NHC : disponible, système disparu, ou flux indisponible. */
export function FicheSystemeActif({ langue, flux, id }: { langue: Langue; flux: EtatFlux; id: string }) {
  const { fiche, liste, source } = SYSTEMES[langue];
  if (flux.etat === "indisponible") {
    return (
      <>
        <h1 className="text-3xl font-bold">{fiche.titre}</h1>
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
          {liste.indisponible} {liste.consultez} <LienNhc />
          .
        </p>
      </>
    );
  }

  const echec = <EchecMiseAJourNhc langue={langue} flux={flux} />;
  const systeme = flux.systemes.find((candidat) => candidat.id === id);
  if (systeme) {
    return (
      <>
        {echec}
        <FicheSysteme langue={langue} systeme={systeme} nhcAncien={derniereDonneeGardee([flux])} />
      </>
    );
  }

  return (
    <>
      {echec}
      <h1 className="text-3xl font-bold">{fiche.introuvable}</h1>
      <p className="rounded-2xl bg-surface p-4 text-base">{fiche.plusSuivi}</p>
      <Lien href="/" className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        {fiche.voirActifs}
      </Lien>
      <p className="text-sm text-muted">
        {source.fluxLu(formaterHeureAntilles(flux.luLe, langue), libelleHeureAntilles(langue))}
      </p>
    </>
  );
}
