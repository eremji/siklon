"use client";
// Bandeau qui remplace la feuille du bas quand une alerte est en cours sur la page (US-07c, #110) :
// placé après le niveau, le délai et la source, il ne cache aucune information et ne prend pas le focus.
import { useLangue } from "@/components/langue/ContexteLangue";
import { Lien } from "@/components/langue/Lien";
import type { Appareil } from "@/lib/ecranAccueil/detection";
import { ECRAN_ACCUEIL } from "@/lib/textes/ecranAccueil";

export function BandeauEcranAccueil({ appareil }: { appareil: Appareil }) {
  const textes = ECRAN_ACCUEIL[useLangue()].bandeau;
  return (
    <section aria-label={textes.nom} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
      <p className="text-base">{textes.texte(appareil)}</p>
      <Lien
        href="/compte/ecran-accueil"
        className="flex min-h-11 w-fit items-center text-base font-bold text-accent underline underline-offset-4"
      >
        {textes.lien}
      </Lien>
    </section>
  );
}
