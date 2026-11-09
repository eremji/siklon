import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertesNhcAVenir } from "@/components/vigilance/AlertesNhcAVenir";
import { BandeauVigilance, EnTeteIle } from "@/components/vigilance/BandeauVigilance";
import { type FichierVigilance, ILES, type Ile, trouverIle } from "@/lib/iles";
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
  return <BandeauVigilance nomIle={ile.nom} etat={etat} />;
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder un App Shell commun.
async function AlerteIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();
  if (ile.alerte.source === "nhc") return <AlertesNhcAVenir nomIle={ile.nom} />;

  return (
    <Suspense
      fallback={
        <EnTeteIle nomIle={ile.nom}>
          <p className="text-base">Chargement de la vigilance Météo-France…</p>
        </EnTeteIle>
      }
    >
      <VigilanceIle ile={ile} fichier={ile.alerte.fichier} />
    </Suspense>
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
