import type { ReactNode } from "react";
import { formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import { type SystemeActif, descriptionSysteme } from "@/lib/nhc/systemes";
import { directionDeplacement, formaterPosition, ktVersKmh, ktVersMph, mphVersKmh } from "@/lib/unites";
import { AlerteObsolescence } from "./AlerteObsolescence";
import { Pastille } from "./Pastille";

const URL_NHC = "https://www.nhc.noaa.gov/";

// cle : chiffre clé (DESIGN.md) ; large : occupe toute la largeur de la grille.
function Mesure({
  libelle,
  children,
  cle = false,
  large = cle,
}: {
  libelle: string;
  children: ReactNode;
  cle?: boolean;
  large?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl bg-surface p-4 ${large ? "col-span-2" : ""}`}>
      <dt className="text-sm text-muted">{libelle}</dt>
      <dd className={cle ? "text-[44px] leading-none font-bold" : "text-lg font-bold"}>{children}</dd>
    </div>
  );
}

function Origine({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{libelle}</dt>
      <dd className="text-base">{children}</dd>
    </div>
  );
}

function deplacementMetrique({ deplacement }: SystemeActif): string {
  if (!deplacement) return "Non communiqué par le NHC";
  if (deplacement.vitesseMph === 0) return "Stationnaire";
  const direction = directionDeplacement(deplacement.directionDeg);
  return `${direction.charAt(0).toUpperCase()}${direction.slice(1)} à ${mphVersKmh(deplacement.vitesseMph)} km/h`;
}

function deplacementOrigine({ deplacement }: SystemeActif): string {
  if (!deplacement) return "Non communiqué";
  if (deplacement.vitesseMph === 0) return "0 mph";
  return `${deplacement.directionDeg}° à ${deplacement.vitesseMph} mph`;
}

/** Fiche d'un système actif (US-02) : intensité, déplacement et avis NHC d'origine. */
export function FicheSysteme({ systeme }: { systeme: SystemeActif }) {
  const { avis } = systeme;
  return (
    <>
      <header className="flex items-center gap-3">
        <Pastille systeme={systeme} />
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{systeme.nom}</h1>
          <p className="text-base text-muted">{descriptionSysteme(systeme)}</p>
        </div>
      </header>
      <AlerteObsolescence emisLe={avis.emisLe} />

      <section aria-labelledby="titre-mesures" className="flex flex-col gap-2">
        <h2 id="titre-mesures" className="text-xl font-bold">
          Intensité et déplacement
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <Mesure libelle="Vents maximaux soutenus" cle>
            {ktVersKmh(systeme.ventKt)} km/h
          </Mesure>
          <Mesure libelle="Pression centrale">{systeme.pressionHpa} hPa</Mesure>
          <Mesure libelle="Position">{formaterPosition(systeme.latitude, systeme.longitude)}</Mesure>
          <Mesure libelle="Déplacement" large>
            {deplacementMetrique(systeme)}
          </Mesure>
        </dl>
      </section>

      <details className="group rounded-2xl bg-surface px-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-base font-bold text-accent">
          Valeurs d&apos;origine du NHC
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <dl className="flex flex-col gap-2 pb-4">
          <Origine libelle="Vents maximaux soutenus">
            {systeme.ventKt} nœuds ({ktVersMph(systeme.ventKt)} mph)
          </Origine>
          <Origine libelle="Pression centrale">{systeme.pressionHpa} mb</Origine>
          <Origine libelle="Déplacement">{deplacementOrigine(systeme)}</Origine>
        </dl>
        <p className="pb-4 text-sm text-muted">
          Siklon convertit ces valeurs en unités métriques ; les vents sont arrondis à 5 km/h près, comme dans
          les avis du NHC.
        </p>
      </details>

      <footer className="flex flex-col gap-1 text-sm text-muted">
        <p>
          Source : NHC, avis n° {avis.numero} du {formaterHeureAntilles(avis.emisLe)} (heure des Antilles
          françaises).
        </p>
        <p>
          <a
            href={avis.url ?? URL_NHC}
            className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4"
          >
            {avis.url ? `Lire l'avis n° ${avis.numero} sur le site du NHC (en anglais)` : "Lire les avis sur le site du NHC (en anglais)"}
          </a>
        </p>
      </footer>
    </>
  );
}
