import { Suspense } from "react";
import { SystemesActifs } from "@/components/systemes/SystemesActifs";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Siklon</h1>
      <section aria-labelledby="titre-systemes" className="flex flex-col gap-3">
        <h2 id="titre-systemes" className="text-xl font-bold">
          Systèmes actifs dans l&apos;Atlantique
        </h2>
        <Suspense fallback={<p className="text-base text-muted">Chargement des systèmes actifs…</p>}>
          <SystemesActifs />
        </Suspense>
      </section>
      <p className="mt-auto text-sm text-muted">
        Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.
      </p>
    </main>
  );
}
