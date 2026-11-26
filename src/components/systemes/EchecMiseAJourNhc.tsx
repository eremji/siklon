import { LienNhc } from "@/components/LienNhc";
import type { EtatFlux } from "@/lib/nhc/client";
import { formaterHeureAntilles, libelleHeureAntilles } from "@/lib/nhc/fraicheur";
import type { Langue } from "@/lib/langues";
import { SYSTEMES } from "@/lib/textes/systemes";

/**
 * Avertissement affiché quand le NHC ne répond plus et que la page montre sa dernière lecture réussie
 * (US-11) : la mise à jour a échoué, et la donnée affichée date de l'heure indiquée.
 */
export function EchecMiseAJourNhc({ langue, flux }: { langue: Langue; flux: EtatFlux }) {
  if (flux.etat !== "ok" || !flux.echecLe) return null;
  const { echecMiseAJour, liste } = SYSTEMES[langue];
  return (
    <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
      {echecMiseAJour(formaterHeureAntilles(flux.luLe, langue), libelleHeureAntilles(langue))} {liste.consultez}{" "}
      <LienNhc />.
    </p>
  );
}
