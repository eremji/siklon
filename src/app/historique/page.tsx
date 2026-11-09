import type { Metadata } from "next";
import Link from "next/link";
import { SourceHurdat2 } from "@/components/historique/SourceHurdat2";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import { ILES } from "@/lib/iles";

export const metadata: Metadata = {
  title: "Historique des cyclones · Siklon",
  description: "Les cyclones passés près des îles des Antilles depuis 1851 (base HURDAT2 du NHC).",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Historique des cyclones</h1>
      <p className="text-base">
        Choisissez une île pour voir les cyclones passés à moins de {RADIUS_IMPACT_KM} km de sa ville principale,
        depuis 1851.
      </p>
      <ul className="flex flex-col gap-2">
        {ILES.map((ile) => (
          <li key={ile.slug}>
            <Link
              href={`/iles/${ile.slug}/historique`}
              className="flex min-h-12 items-center rounded-2xl bg-surface px-4 text-base font-bold text-accent underline underline-offset-4"
            >
              {ile.nom}
            </Link>
          </li>
        ))}
      </ul>
      <SourceHurdat2 dernierImport={null} />
    </main>
  );
}
