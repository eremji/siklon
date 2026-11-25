import { Suspense } from "react";
import { LogoSiklon } from "@/components/logo/LogoSiklon";
import { SystemesActifs } from "@/components/systemes/SystemesActifs";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { SYSTEMES } from "@/lib/textes/systemes";

export default async function Home() {
  const { accueil } = SYSTEMES[await langueDeLaPage()];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1>
        <LogoSiklon />
      </h1>
      <section aria-labelledby="titre-systemes" className="flex flex-col gap-3">
        <h2 id="titre-systemes" className="text-xl font-bold">
          {accueil.titre}
        </h2>
        <Suspense fallback={<p className="text-base text-muted">{accueil.chargement}</p>}>
          <SystemesActifs />
        </Suspense>
      </section>
      <MentionOfficielle />
    </main>
  );
}
