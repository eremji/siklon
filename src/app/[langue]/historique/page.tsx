import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { SourceHurdat2 } from "@/components/historique/SourceHurdat2";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import { ILES, nomIle } from "@/lib/iles";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { HISTORIQUE } from "@/lib/textes/historique";

export async function generateMetadata(): Promise<Metadata> {
  const { titreOnglet, description } = HISTORIQUE[await langueDeLaPage()].accueil;
  return { title: titreOnglet, description };
}

export default async function Page() {
  const langue = await langueDeLaPage();
  const textes = HISTORIQUE[langue].accueil;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">{textes.titre}</h1>
      <p className="text-base">{textes.intro(RADIUS_IMPACT_KM)}</p>
      <ul className="flex flex-col gap-2">
        {ILES.map((ile) => (
          <li key={ile.slug}>
            <Lien
              href={`/iles/${ile.slug}/historique`}
              className="flex min-h-12 items-center rounded-2xl bg-surface px-4 text-base font-bold text-accent underline underline-offset-4"
            >
              {nomIle(ile, langue)}
            </Lien>
          </li>
        ))}
      </ul>
      <SourceHurdat2 langue={langue} dernierImport={null} />
    </main>
  );
}
