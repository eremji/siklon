import type { ReactNode } from "react";
import type { Langue } from "@/lib/langues";
import { formaterHeureAntilles, libelleHeureAntilles } from "@/lib/nhc/fraicheur";
import { type SystemeActif, descriptionSysteme } from "@/lib/nhc/systemes";
import { SYSTEMES } from "@/lib/textes/systemes";
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

function deplacementMetrique({ deplacement }: SystemeActif, langue: Langue): string {
  const { fiche } = SYSTEMES[langue];
  if (!deplacement) return fiche.nonCommuniqueNhc;
  if (deplacement.vitesseMph === 0) return fiche.stationnaire;
  const direction = directionDeplacement(deplacement.directionDeg, langue);
  return fiche.vitesse(`${direction.charAt(0).toUpperCase()}${direction.slice(1)}`, mphVersKmh(deplacement.vitesseMph));
}

function deplacementOrigine({ deplacement }: SystemeActif, langue: Langue): string {
  const { fiche } = SYSTEMES[langue];
  if (!deplacement) return fiche.nonCommunique;
  if (deplacement.vitesseMph === 0) return "0 mph";
  return fiche.vitesseOrigine(deplacement.directionDeg, deplacement.vitesseMph);
}

/** Fiche d'un système actif (US-02) : intensité, déplacement et avis NHC d'origine. */
export function FicheSysteme({ langue, systeme }: { langue: Langue; systeme: SystemeActif }) {
  const { avis } = systeme;
  const { fiche, source } = SYSTEMES[langue];
  return (
    <>
      <header className="flex items-center gap-3">
        <Pastille systeme={systeme} />
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{systeme.nom}</h1>
          <p className="text-base text-muted">{descriptionSysteme(systeme, langue)}</p>
        </div>
      </header>
      <AlerteObsolescence emisLe={avis.emisLe} />

      <section aria-labelledby="titre-mesures" className="flex flex-col gap-2">
        <h2 id="titre-mesures" className="text-xl font-bold">
          {fiche.mesures}
        </h2>
        <dl className="grid grid-cols-2 gap-2">
          <Mesure libelle={fiche.vent} cle>
            {ktVersKmh(systeme.ventKt)} km/h
          </Mesure>
          <Mesure libelle={fiche.pression}>{systeme.pressionHpa} hPa</Mesure>
          <Mesure libelle={fiche.position}>{formaterPosition(systeme.latitude, systeme.longitude, langue)}</Mesure>
          <Mesure libelle={fiche.deplacement} large>
            {deplacementMetrique(systeme, langue)}
          </Mesure>
        </dl>
      </section>

      <details className="group rounded-2xl bg-surface px-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-base font-bold text-accent">
          {fiche.origine}
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
          <Origine libelle={fiche.vent}>{fiche.noeuds(systeme.ventKt, ktVersMph(systeme.ventKt))}</Origine>
          <Origine libelle={fiche.pression}>{systeme.pressionHpa} mb</Origine>
          <Origine libelle={fiche.deplacement}>{deplacementOrigine(systeme, langue)}</Origine>
        </dl>
        <p className="pb-4 text-sm text-muted">{fiche.conversion}</p>
      </details>

      <footer className="flex flex-col gap-1 text-sm text-muted">
        <p>{source.avis(avis.numero, formaterHeureAntilles(avis.emisLe, langue), libelleHeureAntilles(langue))}</p>
        <p>
          <a
            href={avis.url ?? URL_NHC}
            className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4"
          >
            {avis.url ? fiche.lireAvis(avis.numero) : fiche.lireAvisTous}
          </a>
        </p>
      </footer>
    </>
  );
}
