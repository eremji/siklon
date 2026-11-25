import type { DernierImport } from "@/lib/db/historique";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import type { Langue } from "@/lib/langues";
import { HISTORIQUE } from "@/lib/textes/historique";

const URL_HURDAT2 = "https://www.nhc.noaa.gov/data/#hurdat";

const LOCALES: Record<Langue, string> = { fr: "fr-FR", en: "en-GB" };

function formaterVersion(versionNhc: string, langue: Langue): string {
  return new Intl.DateTimeFormat(LOCALES[langue], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${versionNhc}T00:00:00Z`),
  );
}

/** Source des données affichées et rappel des consignes officielles (US-12). */
export function SourceHurdat2({ dernierImport, langue }: { dernierImport: DernierImport | null; langue: Langue }) {
  const textes = HISTORIQUE[langue].source;
  return (
    <footer className="flex flex-col gap-1 text-sm text-muted">
      <p>
        {dernierImport
          ? textes.version(formaterVersion(dernierImport.versionNhc, langue))
          : textes.sansVersion}
      </p>
      <p>
        <a href={URL_HURDAT2} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          {textes.lien}
        </a>
      </p>
      <MentionOfficielle className="" />
    </footer>
  );
}
