import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormulaireFiltres } from "@/components/historique/FormulaireFiltres";
import { ListeHistorique } from "@/components/historique/ListeHistorique";
import { SourceHurdat2 } from "@/components/historique/SourceHurdat2";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { DernierImport, EntreeHistorique } from "@/lib/db/historique";
import { chargerDernierImport, chargerPassages } from "@/lib/historique/chargement";
import { lireFiltres } from "@/lib/historique/filtres";
import { type Ile, ILES, trouverIle } from "@/lib/iles";

export function generateStaticParams() {
  return ILES.map((ile) => ({ ile: ile.slug }));
}

export async function generateMetadata({ params }: PageProps<"/iles/[ile]/historique">): Promise<Metadata> {
  const ile = trouverIle((await params).ile);
  return { title: ile ? `Historique des cyclones : ${ile.nom} · Siklon` : "Île inconnue · Siklon" };
}

// Les données d'URL (params, searchParams) sont lues sous Suspense : la coquille de la route reste
// partagée et prérendue, et la navigation vers une île est instantanée (Partial Prefetching).
export default function Page({ params, searchParams }: PageProps<"/iles/[ile]/historique">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Link href="/historique" className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        Toutes les îles
      </Link>
      <Suspense
        fallback={
          <>
            <h1 className="text-3xl font-bold">Historique des cyclones</h1>
            <p className="text-base">Chargement de l&apos;historique…</p>
          </>
        }
      >
        <Contenu params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenu({ params, searchParams }: PageProps<"/iles/[ile]/historique">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();

  return (
    <>
      <h1 className="text-3xl font-bold">Historique des cyclones : {ile.nom}</h1>
      <p className="text-base">
        Cyclones passés à moins de {RADIUS_IMPACT_KM} km de {ile.pointReference.nom}, du plus récent au plus ancien.
      </p>
      <Suspense fallback={<p className="text-base">Chargement de l&apos;historique…</p>}>
        <Resultats ile={ile} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Resultats({ ile, searchParams }: { ile: Ile; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
          L&apos;historique est momentanément indisponible. Réessayez plus tard.
        </p>
        <SourceHurdat2 dernierImport={null} />
      </>
    );
  }

  return (
    <>
      <FormulaireFiltres ile={ile} filtres={filtres} />
      <h2 className="text-xl font-bold">
        {entrees.length} {entrees.length > 1 ? "cyclones" : "cyclone"}
      </h2>
      <ListeHistorique entrees={entrees} ile={ile} />
      <SourceHurdat2 dernierImport={dernierImport} />
    </>
  );
}
