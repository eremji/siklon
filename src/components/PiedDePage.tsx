import Link from "next/link";

/** Pied commun à toutes les pages (layout racine). */
export function PiedDePage() {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-6">
      <Link
        href="/confidentialite"
        className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        Confidentialité
      </Link>
    </footer>
  );
}
