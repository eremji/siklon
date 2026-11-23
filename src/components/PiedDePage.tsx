import Link from "next/link";
import { Suspense } from "react";
import { BasculeLangue, BasculeLangueSansPage } from "@/components/langue/BasculeLangue";
import { chemin, type Langue } from "@/lib/langues";
import { COMMUN } from "@/lib/textes/commun";

/** Pied commun à toutes les pages (layout racine) : confidentialité et bascule de langue. */
export function PiedDePage({ langue }: { langue: Langue }) {
  return (
    <footer className="mx-auto flex w-full max-w-md flex-wrap gap-x-6 px-4 pb-6">
      <Link
        href={chemin(langue, "/confidentialite")}
        className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        {COMMUN[langue].pied.confidentialite}
      </Link>
      {/* usePathname suspend sur les pages à paramètre inconnu au build (Cache Components). */}
      <Suspense fallback={<BasculeLangueSansPage langue={langue} />}>
        <BasculeLangue langue={langue} />
      </Suspense>
    </footer>
  );
}
