// Bandeau qui remplace la feuille du bas quand une alerte est en cours sur la page (US-07c, #110) :
// placé après le niveau, le délai et la source, il ne cache aucune information et ne prend pas le focus.
import { Lien } from "@/components/langue/Lien";
import type { Appareil } from "@/lib/ecranAccueil/detection";

export const TEXTES_BANDEAU = {
  nom: "Ajouter Siklon à l'écran d'accueil",
  texte: (appareil: Appareil) =>
    `Sur ${appareil === "ipad" ? "iPad" : "iPhone"}, ajoutez Siklon à l'écran d'accueil pour recevoir les alertes de votre île, même quand l'app est fermée.`,
  lien: "Voir comment faire",
};

export function BandeauEcranAccueil({ appareil }: { appareil: Appareil }) {
  return (
    <section aria-label={TEXTES_BANDEAU.nom} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
      <p className="text-base">{TEXTES_BANDEAU.texte(appareil)}</p>
      <Lien
        href="/compte/ecran-accueil"
        className="flex min-h-11 w-fit items-center text-base font-bold text-accent underline underline-offset-4"
      >
        {TEXTES_BANDEAU.lien}
      </Lien>
    </section>
  );
}
