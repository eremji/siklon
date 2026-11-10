"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// DESIGN.md : barre flottante en pilule, onglet actif sur --accent. Les entrées Alertes et
// Compte viendront avec leurs pages (US-05, US-07, US-09).
const ENTREES = [
  { href: "/", libelle: "Carte", section: (chemin: string) => chemin === "/" || chemin.startsWith("/systemes") },
  { href: "/iles", libelle: "Mon île", section: (chemin: string) => /^\/(iles|historique)(\/|$)/.test(chemin) },
] as const;

function Barre({ chemin }: { chemin?: string }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto flex w-fit gap-1 rounded-full bg-surface p-1.5 shadow-lg shadow-foreground/15"
    >
      {ENTREES.map(({ href, libelle, section }) => {
        const actif = chemin !== undefined && section(chemin);
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={`flex min-h-11 min-w-11 items-center rounded-full px-5 text-base font-bold ${
              actif ? "bg-accent text-on-accent" : "text-foreground"
            }`}
          >
            {libelle}
          </Link>
        );
      })}
    </nav>
  );
}

// Sans onglet actif : rendu pendant le prérendu des pages dont l'adresse n'est connue qu'à la requête.
export function BarreNavigationSansSection() {
  return <Barre />;
}

export function BarreNavigation() {
  return <Barre chemin={usePathname()} />;
}
