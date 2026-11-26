import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Lien } from "@/components/langue/Lien";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MenaceIle } from "@/components/menace/MenaceIle";
import { PartageIle } from "@/components/partage/PartageIle";
import { ILES, type Ile, nomIle, trouverIle } from "@/lib/iles";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import type { Langue } from "@/lib/langues";
import { fluxNhc, positionsNhc } from "@/lib/nhc/lecture";
import { evaluerMenaces } from "@/lib/nhc/menace";
import { COOKIE_FIXTURE, fixtureDemandee } from "@/lib/nhc/source";
import { chargerAlerteIle } from "@/lib/partage/chargement";
import { ileMenacee } from "@/lib/partage/ile";
import {
  COOKIE_FIXTURE as COOKIE_FIXTURE_VIGILANCE,
  fixtureDemandee as fixtureVigilanceDemandee,
} from "@/lib/vigilance/fixtures";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { ILES_TEXTES } from "@/lib/textes/iles";

type Props = PageProps<"/[langue]/iles/[ile]">;

export function generateStaticParams() {
  return ILES.map(({ slug }) => ({ ile: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const langue = await langueDeLaPage();
  const textes = ILES_TEXTES[langue].ile;
  const ile = trouverIle((await params).ile);
  return { title: ile ? textes.titreOnglet(nomIle(ile, langue)) : textes.introuvable };
}

function Chargement({ texte }: { texte: string }) {
  return <p className="text-base text-muted">{texte}</p>;
}

// Lit le flux NHC et les positions prévues à chaque requête, par le cache partagé, jamais pendant le build.
async function Menaces({ ile, langue }: { ile: Ile; langue: Langue }) {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const flux = await fluxNhc(fixture);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const positions = await positionsNhc(fixture, systemes);
  return <MenaceIle ile={ile} flux={flux} positions={positions} langue={langue} />;
}

// Bouton « Partager » (US-21), seulement pour une île menacée : un système dans le rayon de
// surveillance ou une alerte officielle en cours. Ses propres lectures passent par les caches partagés.
async function Partage({ ile }: { ile: Ile }) {
  await connection();
  const biscuits = await cookies();
  const fixture = fixtureDemandee(process.env, biscuits.get(COOKIE_FIXTURE)?.value);
  const flux = await fluxNhc(fixture);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const { menaces } = evaluerMenaces(ile, systemes, await positionsNhc(fixture, systemes));
  const alerte = await chargerAlerteIle(ile, {
    nhc: fixture,
    vigilance: fixtureVigilanceDemandee(process.env, biscuits.get(COOKIE_FIXTURE_VIGILANCE)?.value),
  });
  if (!ileMenacee(menaces, alerte)) return null;
  return <PartageIle slug={ile.slug} menaces={menaces} alerte={alerte} />;
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder une coquille commune.
async function ContenuIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();
  const langue = await langueDeLaPage();
  const textes = ILES_TEXTES[langue].ile;
  const nom = nomIle(ile, langue);

  return (
    <>
      <h1 className="text-3xl font-bold">{nom}</h1>
      <nav aria-label={textes.autresInfos(nom)} className="flex flex-wrap gap-x-4">
        <Lien
          href={`/iles/${ile.slug}/alerte`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          {textes.alerte}
        </Lien>
        <Lien
          href={`/iles/${ile.slug}/checklist`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          {textes.checklist}
        </Lien>
        <Lien
          href={`/iles/${ile.slug}/historique`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          {textes.historique}
        </Lien>
      </nav>
      <section aria-labelledby="titre-menaces" className="flex flex-col gap-3">
        <h2 id="titre-menaces" className="text-xl font-bold">
          {textes.menaces}
        </h2>
        <Suspense fallback={<Chargement texte={textes.chargementPrevisions} />}>
          <Menaces ile={ile} langue={langue} />
        </Suspense>
        <Suspense fallback={null}>
          <Partage ile={ile} />
        </Suspense>
      </section>
    </>
  );
}

export default async function PageIle({ params }: Props) {
  const textes = ILES_TEXTES[await langueDeLaPage()].ile;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Lien href="/iles" className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        {textes.toutes}
      </Lien>
      <Suspense fallback={<Chargement texte={textes.chargement} />}>
        <ContenuIle params={params} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
