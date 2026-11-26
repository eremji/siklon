import { Lien } from "@/components/langue/Lien";
import { type EtatAlertesNhc, TYPES_ALERTE } from "@/lib/nhc/alertes";
import type { Langue } from "@/lib/langues";
import { formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import { descriptionSysteme } from "@/lib/nhc/systemes";
import { ALERTE } from "@/lib/textes/alerte";
import type { CodeAlerte } from "@/lib/nhc/watches";
import { EnTeteIle } from "./BandeauVigilance";

// Couleurs des watches/warnings (DESIGN.md) : l'en-tête prend celle du type le plus grave.
const COULEURS: Record<CodeAlerte, string> = {
  HWR: "bg-nhc-hwr text-on-vig-fonce",
  TWR: "bg-nhc-twr text-on-vig-fonce",
  HWA: "bg-nhc-hwa text-on-vig-clair",
  TWA: "bg-nhc-twa text-on-vig-clair",
};

// Libellé d'un type dans la langue de la page : en français avec le terme d'origine, en anglais le terme seul.
function libelles(code: CodeAlerte, langue: Langue) {
  const { libelle, origine } = TYPES_ALERTE[code];
  return langue === "fr" ? { titre: libelle, origine: `(${origine})`, complet: `${libelle} (${origine})` } : { titre: origine, origine: null, complet: origine };
}

function Source({ luLe, langue }: { luLe?: string; langue: Langue }) {
  const textes = ALERTE[langue].nhc;
  const fuseau = ALERTE[langue].vigilance.fuseau;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">
        {luLe
          ? textes.source(formaterHeureAntilles(luLe, langue), fuseau)
          : textes.sourceSansHeure}
      </p>
      <a
        href="https://www.nhc.noaa.gov/"
        className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-2"
      >
        {textes.lien}
      </a>
    </div>
  );
}

/** Watches/warnings NHC d'une île sans vigilance Météo-France (US-06b). */
export function AlertesNhc({ nomIle, etat, langue }: { nomIle: string; etat: EtatAlertesNhc; langue: Langue }) {
  const textes = ALERTE[langue].nhc;
  if (etat.etat === "indisponible") {
    return (
      <>
        <EnTeteIle nomIle={nomIle}>
          <p className="text-3xl font-bold">{textes.indisponible}</p>
        </EnTeteIle>
        <Source langue={langue} />
      </>
    );
  }

  const [plusGrave] = etat.alertes;
  if (!plusGrave) {
    return (
      <>
        <EnTeteIle nomIle={nomIle}>
          <p className="text-3xl font-bold">{textes.aucune}</p>
        </EnTeteIle>
        <p className="text-base">{textes.aucunePour(nomIle)}</p>
        <Source luLe={etat.luLe} langue={langue} />
      </>
    );
  }

  const type = libelles(plusGrave.code, langue);
  return (
    <>
      <EnTeteIle nomIle={nomIle} className={COULEURS[plusGrave.code]}>
        <p className="text-3xl font-bold">{type.titre}</p>
        {type.origine && <p className="text-xl font-bold">{type.origine}</p>}
        <p className="text-base">{textes.definitions[plusGrave.code]}</p>
      </EnTeteIle>
      <ul aria-label={textes.liste} className="flex flex-col gap-3">
        {etat.alertes.map(({ code, systeme, avis }) => (
          <li key={`${code} ${systeme.id}`} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            <p className="text-lg font-bold">{libelles(code, langue).complet}</p>
            <p className="text-base">
              <Lien href={`/systemes/${systeme.id}`} className="font-bold text-accent underline underline-offset-2">
                {systeme.nom}
              </Lien>{" "}
              ({descriptionSysteme(systeme, langue)})
            </p>
            <p className="text-sm text-muted">
              {textes.avis(avis.numero, formaterHeureAntilles(avis.emisLe, langue))}
            </p>
          </li>
        ))}
      </ul>
      <Source luLe={etat.luLe} langue={langue} />
    </>
  );
}
