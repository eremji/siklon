import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertesNhc } from "@/components/vigilance/AlertesNhc";
import { BandeauVigilance, EnTeteIle } from "@/components/vigilance/BandeauVigilance";
import { type Emprise, type FichierVigilance, ILES, type Ile, trouverIle } from "@/lib/iles";
import { alertesNhc } from "@/lib/nhc/lecture";
import { COOKIE_FIXTURE as COOKIE_FIXTURE_NHC, fixtureDemandee as fixtureNhcDemandee } from "@/lib/nhc/source";
import { COOKIE_FIXTURE, etatFixture, fixtureDemandee } from "@/lib/vigilance/fixtures";
import { SOURCES_METEO_FRANCE } from "@/lib/vigilance/source";
import { chargerVigilance } from "@/lib/vigilance/vigilance";

type Props = PageProps<"/iles/[ile]/alerte">;

export function generateStaticParams() {
  return ILES.map(({ slug }) => ({ ile: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ile = trouverIle((await params).ile);
  return { title: ile ? `Alerte en cours : ${ile.nom} · Siklon` : "Île introuvable · Siklon" };
}

function Chargement({ texte }: { texte: string }) {
  return <p className="rounded-3xl bg-header p-6 text-base text-header-foreground">{texte}</p>;
}

// Lit la vigilance à chaque requête (le cache partagé limite les appels à Météo-France).
async function VigilanceIle({ ile, fichier }: { ile: Ile; fichier: FichierVigilance }) {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const etat = fixture ? etatFixture(fixture) : await chargerVigilance(fichier, SOURCES_METEO_FRANCE);
  return <BandeauVigilance nomIle={ile.nom} fichier={fichier} etat={etat} />;
}

// Lit les watches/warnings NHC à chaque requête, par le cache partagé du flux et des couches NOAA.
async function AlertesNhcIle({ ile, emprise }: { ile: Ile; emprise: Emprise }) {
  await connection();
  const fixture = fixtureNhcDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE_NHC)?.value);
  return <AlertesNhc nomIle={ile.nom} etat={await alertesNhc(fixture, emprise)} />;
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder un App Shell commun.
async function AlerteIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();

  return (
    <>
      <Link
        href={`/iles/${ile.slug}`}
        className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        {ile.nom} : menaces en cours
      </Link>
      {ile.alerte.source === "nhc" ? (
        <Suspense
          fallback={
            <EnTeteIle nomIle={ile.nom}>
              <p className="text-base">Chargement des veilles et avertissements du NHC…</p>
            </EnTeteIle>
          }
        >
          <AlertesNhcIle ile={ile} emprise={ile.alerte.emprise} />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <EnTeteIle nomIle={ile.nom}>
              <p className="text-base">Chargement de la vigilance Météo-France…</p>
            </EnTeteIle>
          }
        >
          <VigilanceIle ile={ile} fichier={ile.alerte.fichier} />
        </Suspense>
      )}
    </>
  );
}

export default function PageAlerte({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<Chargement texte="Chargement de l'île…" />}>
        <AlerteIle params={params} />
      </Suspense>
      <p className="mt-auto text-sm text-muted">
        Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.
      </p>
    </main>
  );
}
