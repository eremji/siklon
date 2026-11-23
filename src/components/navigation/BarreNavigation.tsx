"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { chemin as cheminDans, decouperChemin, type Langue } from "@/lib/langues";
import { COMMUN } from "@/lib/textes/commun";

// DESIGN.md : barre flottante en pilule, onglet actif sur --accent. L'entrée Alertes viendra
// avec sa page (US-07, US-09).
const ENTREES = [
  { href: "/", libelle: "carte", section: (chemin: string) => chemin === "/" || chemin.startsWith("/systemes") },
  { href: "/iles", libelle: "monIle", section: (chemin: string) => /^\/(iles|historique)(\/|$)/.test(chemin) },
  { href: "/compte", libelle: "compte", section: (chemin: string) => /^\/compte(\/|$)/.test(chemin) },
] as const;

function Barre({ langue, chemin }: { langue: Langue; chemin?: string }) {
  // Les sections se reconnaissent au chemin sans la langue : /en/iles → /iles.
  const page = chemin === undefined ? undefined : decouperChemin(chemin).reste;
  const textes = COMMUN[langue].navigation;
  return (
    <nav
      aria-label={textes.nom}
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto flex w-fit gap-1 rounded-full bg-surface p-1.5 shadow-lg shadow-foreground/15"
    >
      {ENTREES.map(({ href, libelle, section }) => {
        const actif = page !== undefined && section(page);
        return (
          <Link
            key={href}
            href={cheminDans(langue, href)}
            aria-current={actif ? "page" : undefined}
            className={`flex min-h-11 min-w-11 items-center rounded-full px-5 text-base font-bold ${
              actif ? "bg-accent text-on-accent" : "text-foreground"
            }`}
          >
            {textes[libelle]}
          </Link>
        );
      })}
    </nav>
  );
}

// Sans onglet actif : rendu pendant le prérendu des pages dont l'adresse n'est connue qu'à la requête.
export function BarreNavigationSansSection({ langue }: { langue: Langue }) {
  return <Barre langue={langue} />;
}

export function BarreNavigation({ langue }: { langue: Langue }) {
  return <Barre langue={langue} chemin={usePathname()} />;
}
