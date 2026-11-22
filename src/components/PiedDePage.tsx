import Link from "next/link";
import { chemin, type Langue } from "@/lib/langues";

/** Pied commun à toutes les pages (layout racine). */
export function PiedDePage({ langue }: { langue: Langue }) {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-6">
      <Link
        href={chemin(langue, "/confidentialite")}
        className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        Confidentialité
      </Link>
    </footer>
  );
}
