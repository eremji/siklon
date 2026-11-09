import type { DernierImport } from "@/lib/db/historique";

const URL_HURDAT2 = "https://www.nhc.noaa.gov/data/#hurdat";

function formaterVersion(versionNhc: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${versionNhc}T00:00:00Z`),
  );
}

/** Source des données affichées et rappel des consignes officielles (US-12). */
export function SourceHurdat2({ dernierImport }: { dernierImport: DernierImport | null }) {
  return (
    <footer className="flex flex-col gap-1 text-sm text-muted">
      <p>
        {dernierImport
          ? `Source : base HURDAT2 du National Hurricane Center (NHC), version du ${formaterVersion(dernierImport.versionNhc)}.`
          : "Source : base HURDAT2 du National Hurricane Center (NHC)."}
      </p>
      <p>
        <a href={URL_HURDAT2} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          Données HURDAT2 sur le site du NHC
        </a>
      </p>
      <p>Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.</p>
    </footer>
  );
}
