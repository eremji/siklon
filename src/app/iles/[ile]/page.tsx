import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MenaceIle } from "@/components/menace/MenaceIle";
import { ILES, type Ile, trouverIle } from "@/lib/iles";
import { fluxNhc } from "@/lib/nhc/lecture";
import { chargerToutesPositions } from "@/lib/nhc/positions";
import { COOKIE_FIXTURE, fixtureDemandee, positionsFixture } from "@/lib/nhc/source";

type Props = PageProps<"/iles/[ile]">;

export function generateStaticParams() {
  return ILES.map(({ slug }) => ({ ile: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ile = trouverIle((await params).ile);
  return { title: ile ? `${ile.nom} : menaces en cours · Siklon` : "Île introuvable · Siklon" };
}

function Chargement({ texte }: { texte: string }) {
  return <p className="text-base text-muted">{texte}</p>;
}

// Lit le flux NHC (cache partagé) et les positions prévues à chaque requête, jamais pendant le build.
async function Menaces({ ile }: { ile: Ile }) {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const flux = await fluxNhc(fixture);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const positions = fixture ? positionsFixture(fixture) : await chargerToutesPositions(systemes);
  return <MenaceIle ile={ile} flux={flux} positions={positions} />;
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder une coquille commune.
async function ContenuIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();

  return (
    <>
      <h1 className="text-3xl font-bold">{ile.nom}</h1>
      <nav aria-label={`Autres informations sur ${ile.nom}`} className="flex flex-wrap gap-x-4">
        <Link
          href={`/iles/${ile.slug}/alerte`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          Alerte en cours
        </Link>
        <Link
          href={`/iles/${ile.slug}/historique`}
          className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
        >
          Historique des cyclones
        </Link>
      </nav>
      <section aria-labelledby="titre-menaces" className="flex flex-col gap-3">
        <h2 id="titre-menaces" className="text-xl font-bold">
          Systèmes qui menacent l&apos;île
        </h2>
        <Suspense fallback={<Chargement texte="Chargement des prévisions du NHC…" />}>
          <Menaces ile={ile} />
        </Suspense>
      </section>
    </>
  );
}

export default function PageIle({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Link href="/iles" className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        Toutes les îles
      </Link>
      <Suspense fallback={<Chargement texte="Chargement de l'île…" />}>
        <ContenuIle params={params} />
      </Suspense>
      <p className="mt-auto text-sm text-muted">
        Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.
      </p>
    </main>
  );
}
