import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CarteTrajectoire } from "@/components/historique/CarteTrajectoire";
import { SourceHurdat2 } from "@/components/historique/SourceHurdat2";
import { TableauTrajectoire } from "@/components/historique/TableauTrajectoire";
import type { DernierImport, TempeteHistorique } from "@/lib/db/historique";
import { chargerDernierImport, chargerTempete } from "@/lib/historique/chargement";
import {
  formaterDate,
  formaterDateHeureUtc,
  formaterDistance,
  formaterVent,
  libelleCategorie,
  nomTempete,
} from "@/lib/historique/formatage";
import { calculerPassage, categorieVent } from "@/lib/hurdat2/passages";
import { trouverIle } from "@/lib/iles";

export const metadata: Metadata = { title: "Fiche d'un cyclone historique · Siklon" };

const ID_TEMPETE = /^AL\d{6}$/;

export default function Page({ params, searchParams }: PageProps<"/historique/[tempete]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-base">Chargement de la fiche…</p>}>
        <Fiche params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Fiche({ params, searchParams }: PageProps<"/historique/[tempete]">) {
  const { tempete: id } = await params;
  if (!ID_TEMPETE.test(id)) notFound();
  const { ile: slug } = await searchParams;
  const ile = typeof slug === "string" ? trouverIle(slug) : undefined;

  let tempete: TempeteHistorique | null;
  let dernierImport: DernierImport | null;
  try {
    [tempete, dernierImport] = await Promise.all([chargerTempete(id), chargerDernierImport()]);
  } catch (erreur) {
    console.error("Fiche historique indisponible :", erreur instanceof Error ? erreur.message : "erreur inconnue");
    return (
      <>
        <p role="alert" className="rounded-2xl bg-surface p-4 text-base">
          Cette fiche est momentanément indisponible. Réessayez plus tard.
        </p>
        <SourceHurdat2 dernierImport={null} />
      </>
    );
  }
  if (!tempete || tempete.points.length === 0) notFound();

  const titre = `${nomTempete(tempete.nom, tempete.id)} (${tempete.annee})`;
  const vents = tempete.points.flatMap((p) => (p.ventKt === null ? [] : [p.ventKt]));
  const ventMax = vents.length > 0 ? Math.max(...vents) : null;
  const passage = ile ? calculerPassage(tempete, ile) : null;

  return (
    <>
      {ile && (
        <Link
          href={`/iles/${ile.slug}/historique`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          Historique de {ile.nom}
        </Link>
      )}
      <h1 className="text-3xl font-bold">{titre}</h1>
      <dl className="grid grid-cols-1 gap-y-1 rounded-2xl bg-surface p-4 text-base">
        <dt className="text-muted">Intensité maximale</dt>
        <dd>
          <span className="font-bold">{libelleCategorie(categorieVent(ventMax))}</span>
          {ventMax !== null && <> · {formaterVent(ventMax)}</>}
        </dd>
        <dt className="text-muted">Période suivie</dt>
        <dd>
          du {formaterDateHeureUtc(tempete.points[0].horodatage)} au{" "}
          {formaterDateHeureUtc(tempete.points[tempete.points.length - 1].horodatage)}
        </dd>
        {ile && passage && (
          <>
            <dt className="text-muted">Près de {ile.nom}</dt>
            <dd>
              {formaterDistance(passage.distanceMinKm)} de {ile.pointReference.nom} le{" "}
              {formaterDate(passage.horodatage, ile.fuseau)} ({libelleCategorie(passage.categorie)})
            </dd>
          </>
        )}
      </dl>
      <CarteTrajectoire titre={titre} points={tempete.points} ile={ile} />
      <details className="flex flex-col gap-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-bold text-accent">
          Voir les points de la trajectoire
        </summary>
        <TableauTrajectoire points={tempete.points} />
      </details>
      <SourceHurdat2 dernierImport={dernierImport} />
    </>
  );
}
