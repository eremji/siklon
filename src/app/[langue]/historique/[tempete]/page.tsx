import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
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
import { nomIle, nomVille, trouverIle } from "@/lib/iles";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { HISTORIQUE } from "@/lib/textes/historique";

export async function generateMetadata(): Promise<Metadata> {
  return { title: HISTORIQUE[await langueDeLaPage()].fiche.titreOnglet };
}

const ID_TEMPETE = /^AL\d{6}$/;

export default async function Page({ params, searchParams }: PageProps<"/[langue]/historique/[tempete]">) {
  const textes = HISTORIQUE[await langueDeLaPage()].fiche;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-base">{textes.chargement}</p>}>
        <Fiche params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Fiche({ params, searchParams }: PageProps<"/[langue]/historique/[tempete]">) {
  const { tempete: id } = await params;
  if (!ID_TEMPETE.test(id)) notFound();
  const { ile: slug } = await searchParams;
  const ile = typeof slug === "string" ? trouverIle(slug) : undefined;
  const langue = await langueDeLaPage();
  const textes = HISTORIQUE[langue].fiche;

  let tempete: TempeteHistorique | null;
  let dernierImport: DernierImport | null;
  try {
    [tempete, dernierImport] = await Promise.all([chargerTempete(id), chargerDernierImport()]);
  } catch (erreur) {
    console.error("Fiche historique indisponible :", erreur instanceof Error ? erreur.message : "erreur inconnue");
    return (
      <>
        <p role="alert" className="rounded-2xl bg-surface p-4 text-base">
          {textes.indisponible}
        </p>
        <SourceHurdat2 langue={langue} dernierImport={null} />
      </>
    );
  }
  if (!tempete || tempete.points.length === 0) notFound();

  const titre = `${nomTempete(tempete.nom, tempete.id, langue)} (${tempete.annee})`;
  const vents = tempete.points.flatMap((p) => (p.ventKt === null ? [] : [p.ventKt]));
  const ventMax = vents.length > 0 ? Math.max(...vents) : null;
  const passage = ile ? calculerPassage(tempete, ile) : null;

  return (
    <>
      {ile && (
        <Lien
          href={`/iles/${ile.slug}/historique`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          {textes.historiqueDe(nomIle(ile, langue))}
        </Lien>
      )}
      <h1 className="text-3xl font-bold">{titre}</h1>
      <dl className="grid grid-cols-1 gap-y-1 rounded-2xl bg-surface p-4 text-base">
        <dt className="text-muted">{textes.intensiteMax}</dt>
        <dd>
          <span className="font-bold">{libelleCategorie(categorieVent(ventMax), langue)}</span>
          {ventMax !== null && <> · {formaterVent(ventMax, langue)}</>}
        </dd>
        <dt className="text-muted">{textes.periode}</dt>
        <dd>
          {textes.duAu(
            formaterDateHeureUtc(tempete.points[0].horodatage, langue),
            formaterDateHeureUtc(tempete.points[tempete.points.length - 1].horodatage, langue),
          )}
        </dd>
        {ile && passage && (
          <>
            <dt className="text-muted">{textes.pres(nomIle(ile, langue))}</dt>
            <dd>
              {textes.passage(
                formaterDistance(passage.distanceMinKm, langue),
                nomVille(ile, langue),
                formaterDate(passage.horodatage, ile.fuseau, langue),
                libelleCategorie(passage.categorie, langue),
              )}
            </dd>
          </>
        )}
      </dl>
      <CarteTrajectoire langue={langue} titre={titre} points={tempete.points} ile={ile} />
      <details className="flex flex-col gap-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-bold text-accent">
          {textes.voirPoints}
        </summary>
        <TableauTrajectoire langue={langue} points={tempete.points} />
      </details>
      <SourceHurdat2 langue={langue} dernierImport={dernierImport} />
    </>
  );
}
