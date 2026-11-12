import Link from "next/link";
import { type EtatAlertesNhc, TYPES_ALERTE } from "@/lib/nhc/alertes";
import { formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import type { CodeAlerte } from "@/lib/nhc/watches";
import { EnTeteIle } from "./BandeauVigilance";

// Couleurs des watches/warnings (DESIGN.md) : l'en-tête prend celle du type le plus grave.
const COULEURS: Record<CodeAlerte, string> = {
  HWR: "bg-nhc-hwr text-on-vig-fonce",
  TWR: "bg-nhc-twr text-on-vig-fonce",
  HWA: "bg-nhc-hwa text-on-vig-clair",
  TWA: "bg-nhc-twa text-on-vig-clair",
};

// Définitions du NHC : une veille annonce des conditions possibles, un avertissement des conditions attendues.
const DEFINITIONS: Record<CodeAlerte, string> = {
  HWR: "Conditions d'ouragan attendues, en général dans les 36 heures.",
  TWR: "Conditions de tempête tropicale attendues, en général dans les 36 heures.",
  HWA: "Conditions d'ouragan possibles, en général dans les 48 heures.",
  TWA: "Conditions de tempête tropicale possibles, en général dans les 48 heures.",
};

function Source({ luLe }: { luLe?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">
        {luLe
          ? `Source : NHC, données lues le ${formaterHeureAntilles(luLe)} (heure des Antilles françaises).`
          : "Source : NHC."}
      </p>
      <a
        href="https://www.nhc.noaa.gov/"
        className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-2"
      >
        Consulter les alertes sur le site du NHC
      </a>
    </div>
  );
}

/** Watches/warnings NHC d'une île sans vigilance Météo-France (US-06b). */
export function AlertesNhc({ nomIle, etat }: { nomIle: string; etat: EtatAlertesNhc }) {
  if (etat.etat === "indisponible") {
    return (
      <>
        <EnTeteIle nomIle={nomIle}>
          <p className="text-3xl font-bold">Veilles et avertissements NHC indisponibles</p>
        </EnTeteIle>
        <Source />
      </>
    );
  }

  const [plusGrave] = etat.alertes;
  if (!plusGrave) {
    return (
      <>
        <EnTeteIle nomIle={nomIle}>
          <p className="text-3xl font-bold">Aucune veille ni aucun avertissement</p>
        </EnTeteIle>
        <p className="text-base">Aucune veille ni aucun avertissement NHC en cours pour {nomIle}.</p>
        <Source luLe={etat.luLe} />
      </>
    );
  }

  const type = TYPES_ALERTE[plusGrave.code];
  return (
    <>
      <EnTeteIle nomIle={nomIle} className={COULEURS[plusGrave.code]}>
        <p className="text-3xl font-bold">{type.libelle}</p>
        <p className="text-xl font-bold">({type.origine})</p>
        <p className="text-base">{DEFINITIONS[plusGrave.code]}</p>
      </EnTeteIle>
      <ul aria-label="Veilles et avertissements NHC en cours" className="flex flex-col gap-3">
        {etat.alertes.map(({ code, systeme, avis }) => (
          <li key={`${code} ${systeme.id}`} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            <p className="text-lg font-bold">
              {TYPES_ALERTE[code].libelle} ({TYPES_ALERTE[code].origine})
            </p>
            <p className="text-base">
              <Link href={`/systemes/${systeme.id}`} className="font-bold text-accent underline underline-offset-2">
                {systeme.nom}
              </Link>{" "}
              ({systeme.description})
            </p>
            <p className="text-sm text-muted">
              Avis n° {avis.numero} du NHC, émis le {formaterHeureAntilles(avis.emisLe)}.
            </p>
          </li>
        ))}
      </ul>
      <Source luLe={etat.luLe} />
    </>
  );
}
