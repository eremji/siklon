import type { EtatFlux } from "@/lib/nhc/client";
import { avisLePlusRecent, formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import { type Classification, type SystemeActif, categorieSaffirSimpson, libelleType } from "@/lib/nhc/systemes";
import { AlerteObsolescence } from "./AlerteObsolescence";

const URL_NHC = "https://www.nhc.noaa.gov/";

const ABREVIATIONS: Record<Classification, string> = {
  TD: "DT",
  STD: "DS",
  TS: "TT",
  STS: "TS",
  HU: "",
  PTC: "CP",
};

function LienNhc() {
  return (
    <a href={URL_NHC} className="font-bold text-accent underline underline-offset-2">
      nhc.noaa.gov
    </a>
  );
}

function Pastille({ systeme }: { systeme: SystemeActif }) {
  const categorie = systeme.classification === "HU" ? categorieSaffirSimpson(systeme.ventKt) : null;
  const ouragan = systeme.classification === "HU";
  return (
    <span
      aria-hidden="true"
      className={`flex size-[46px] shrink-0 items-center justify-center rounded-full border-2 bg-surface text-lg font-bold ${
        ouragan ? "border-danger text-danger-text" : "border-accent text-accent"
      }`}
    >
      {categorie ?? ABREVIATIONS[systeme.classification]}
    </span>
  );
}

function Source({ systemes, luLe }: { systemes: SystemeActif[]; luLe: string }) {
  const dernierAvis = avisLePlusRecent(systemes.map((systeme) => systeme.avis.emisLe));
  const heure = dernierAvis ? `dernier avis le ${formaterHeureAntilles(dernierAvis)}` : `flux lu le ${formaterHeureAntilles(luLe)}`;
  return <p className="text-sm text-muted">Source : NHC, {heure} (heure des Antilles françaises).</p>;
}

function description(systeme: SystemeActif): string {
  const type = libelleType(systeme.classification);
  const categorie = systeme.classification === "HU" ? categorieSaffirSimpson(systeme.ventKt) : null;
  return categorie ? `${type} de catégorie ${categorie}` : type;
}

export function ListeSystemes({ flux }: { flux: EtatFlux }) {
  if (flux.etat === "indisponible") {
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
        Les données du NHC sont momentanément indisponibles. Consultez <LienNhc />.
      </p>
    );
  }

  const { systemes, rejetes } = flux;
  return (
    <div className="flex flex-col gap-3">
      {rejetes > 0 && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
          {rejetes === 1
            ? "1 système n'a pas pu être affiché."
            : `${rejetes} systèmes n'ont pas pu être affichés.`}{" "}
          Consultez <LienNhc />.
        </p>
      )}
      {systemes.length === 0 && rejetes === 0 && (
        <p className="rounded-2xl bg-surface p-4 text-base font-bold">Aucun système actif dans l&apos;Atlantique.</p>
      )}
      {systemes.length > 0 && (
        <ul aria-label="Systèmes actifs" className="flex flex-col gap-2">
          {systemes.map((systeme) => (
            <li key={systeme.id} className="flex min-h-11 items-center gap-3 rounded-2xl bg-surface p-3">
              <Pastille systeme={systeme} />
              <div className="flex flex-col">
                <span className="text-lg font-bold">{systeme.nom}</span>
                <span className="text-base text-muted">{description(systeme)}</span>
                <span className="text-sm text-muted">
                  Avis n° {systeme.avis.numero} du {formaterHeureAntilles(systeme.avis.emisLe)}
                </span>
                <AlerteObsolescence emisLe={systeme.avis.emisLe} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Source systemes={systemes} luLe={flux.luLe} />
    </div>
  );
}
