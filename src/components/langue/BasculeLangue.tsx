"use client";
// Bascule FR/EN du pied de page (US-10) : ouvre la même page dans l'autre langue et garde le choix
// (route /api/langue). Libellé écrit dans la langue d'arrivée, prononcé dans cette langue (lang).
import { usePathname } from "next/navigation";
import { decouperChemin, type Langue } from "@/lib/langues";

const AUTRE: Record<Langue, { langue: Langue; nom: string }> = {
  fr: { langue: "en", nom: "English" },
  en: { langue: "fr", nom: "Français" },
};

function Lien({ langue, page }: { langue: Langue; page: string }) {
  const autre = AUTRE[langue];
  const parametres = new URLSearchParams({ vers: autre.langue, page });
  return (
    // <a> et non <Link> : changer de langue recharge toute la page (autre mise en page racine),
    // et une route d'API ne se précharge pas.
    <a
      href={`/api/langue?${parametres}`}
      lang={autre.langue}
      hrefLang={autre.langue}
      className="inline-flex min-h-11 items-center gap-2 text-base text-accent underline underline-offset-4"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
      </svg>
      {autre.nom}
    </a>
  );
}

/** Pendant le prérendu des pages dont l'adresse n'est connue qu'à la requête : l'accueil. */
export function BasculeLangueSansPage({ langue }: { langue: Langue }) {
  return <Lien langue={langue} page="/" />;
}

export function BasculeLangue({ langue }: { langue: Langue }) {
  return <Lien langue={langue} page={decouperChemin(usePathname()).reste} />;
}
