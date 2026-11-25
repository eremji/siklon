import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormulaireFiltres } from "@/components/historique/FormulaireFiltres";
import { ListeHistorique } from "@/components/historique/ListeHistorique";
import { SourceHurdat2 } from "@/components/historique/SourceHurdat2";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { DernierImport, EntreeHistorique } from "@/lib/db/historique";
import { chargerDernierImport, chargerPassages } from "@/lib/historique/chargement";
import { lireFiltres } from "@/lib/historique/filtres";
import { type Ile, ILES, nomIle, nomVille, trouverIle } from "@/lib/iles";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import type { Langue } from "@/lib/langues";
import { HISTORIQUE } from "@/lib/textes/historique";

export function generateStaticParams() {
  return ILES.map((ile) => ({ ile: ile.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[langue]/iles/[ile]/historique">): Promise<Metadata> {
  const langue = await langueDeLaPage();
  const textes = HISTORIQUE[langue].ile;
  const ile = trouverIle((await params).ile);
  return { title: ile ? textes.titreOnglet(nomIle(ile, langue)) : textes.inconnue };
}

// Les données d'URL (params, searchParams) sont lues sous Suspense : la coquille de la route reste
// partagée et prérendue, et la navigation vers une île est instantanée (Partial Prefetching).
export default async function Page({ params, searchParams }: PageProps<"/[langue]/iles/[ile]/historique">) {
  const { accueil, ile } = HISTORIQUE[await langueDeLaPage()];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Lien href="/historique" className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        {ile.toutes}
      </Lien>
      <Suspense
        fallback={
          <>
            <h1 className="text-3xl font-bold">{accueil.titre}</h1>
            <p className="text-base">{ile.chargement}</p>
          </>
        }
      >
        <Contenu params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenu({ params, searchParams }: PageProps<"/[langue]/iles/[ile]/historique">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();
  const langue = await langueDeLaPage();
  const textes = HISTORIQUE[langue].ile;

  return (
    <>
      <h1 className="text-3xl font-bold">{textes.titre(nomIle(ile, langue))}</h1>
      <p className="text-base">{textes.intro(RADIUS_IMPACT_KM, nomVille(ile, langue))}</p>
      <Suspense fallback={<p className="text-base">{textes.chargement}</p>}>
        <Resultats ile={ile} langue={langue} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Resultats({
  ile,
  langue,
  searchParams,
}: {
  ile: Ile;
  langue: Langue;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const textes = HISTORIQUE[langue].ile;
  const filtres = lireFiltres(await searchParams);
  let entrees: EntreeHistorique[];
  let dernierImport: DernierImport | null;
  try {
    [entrees, dernierImport] = await Promise.all([
      chargerPassages({ ileSlug: ile.slug, ...filtres }),
      chargerDernierImport(),
    ]);
  } catch (erreur) {
    console.error("Historique indisponible :", erreur instanceof Error ? erreur.message : "erreur inconnue");
    return (
      <>
        <p role="alert" className="rounded-2xl bg-surface p-4 text-base">
          {textes.indisponible}
        </p>
        <SourceHurdat2 langue={langue} dernierImport={null} />
      </>
    );
  }

  return (
    <>
      <FormulaireFiltres langue={langue} ile={ile} filtres={filtres} />
      <h2 className="text-xl font-bold">
        {textes.nombre(entrees.length)}
      </h2>
      <ListeHistorique langue={langue} entrees={entrees} ile={ile} />
      <SourceHurdat2 langue={langue} dernierImport={dernierImport} />
    </>
  );
}
