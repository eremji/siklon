import Link from "next/link";
import { LienNhc } from "@/components/LienNhc";
import type { EtatFlux } from "@/lib/nhc/client";
import { formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import { FicheSysteme } from "./FicheSysteme";

/** Fiche d'un système selon l'état du flux NHC : disponible, système disparu, ou flux indisponible. */
export function FicheSystemeActif({ flux, id }: { flux: EtatFlux; id: string }) {
  if (flux.etat === "indisponible") {
    return (
      <>
        <h1 className="text-3xl font-bold">Fiche du système</h1>
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
          Les données du NHC sont momentanément indisponibles. Consultez{" "}
          <LienNhc />
          .
        </p>
      </>
    );
  }

  const systeme = flux.systemes.find((candidat) => candidat.id === id);
  if (systeme) return <FicheSysteme systeme={systeme} />;

  return (
    <>
      <h1 className="text-3xl font-bold">Système introuvable</h1>
      <p className="rounded-2xl bg-surface p-4 text-base">
        Ce système n&apos;est plus suivi par le NHC, ou n&apos;existe pas.
      </p>
      <Link href="/" className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        Voir les systèmes actifs
      </Link>
      <p className="text-sm text-muted">
        Source : NHC, flux lu le {formaterHeureAntilles(flux.luLe)} (heure des Antilles françaises).
      </p>
    </>
  );
}
