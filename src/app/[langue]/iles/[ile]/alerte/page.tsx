import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Lien } from "@/components/langue/Lien";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PropositionEcranAccueil } from "@/components/ecranAccueil/PropositionEcranAccueil";
import { AlertesNhc } from "@/components/vigilance/AlertesNhc";
import { BandeauVigilance, EnTeteIle } from "@/components/vigilance/BandeauVigilance";
import { alertesNhcEnCours, vigilanceEnCours } from "@/lib/ecranAccueil/alerteEnCours";
import { type Emprise, type FichierVigilance, ILES, type Ile, nomIle, trouverIle } from "@/lib/iles";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import type { Langue } from "@/lib/langues";
import { alertesNhc } from "@/lib/nhc/lecture";
import { COOKIE_FIXTURE as COOKIE_FIXTURE_NHC, fixtureDemandee as fixtureNhcDemandee } from "@/lib/nhc/source";
import { COOKIE_FIXTURE, etatFixture, fixtureDemandee } from "@/lib/vigilance/fixtures";
import { SOURCES_METEO_FRANCE } from "@/lib/vigilance/source";
import { chargerVigilance } from "@/lib/vigilance/vigilance";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { ALERTE } from "@/lib/textes/alerte";

type Props = PageProps<"/[langue]/iles/[ile]/alerte">;

export function generateStaticParams() {
  return ILES.map(({ slug }) => ({ ile: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const langue = await langueDeLaPage();
  const textes = ALERTE[langue].page;
  const ile = trouverIle((await params).ile);
  return { title: ile ? textes.titreOnglet(nomIle(ile, langue)) : textes.introuvable };
}

function Chargement({ texte }: { texte: string }) {
  return <p className="rounded-3xl bg-header p-6 text-base text-header-foreground">{texte}</p>;
}

// Lit la vigilance à chaque requête (le cache partagé limite les appels à Météo-France).
async function VigilanceIle({ ile, fichier, langue }: { ile: Ile; fichier: FichierVigilance; langue: Langue }) {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const etat = fixture ? etatFixture(fixture) : await chargerVigilance(fichier, SOURCES_METEO_FRANCE);
  return (
    <>
      <BandeauVigilance langue={langue} nomIle={nomIle(ile, langue)} fichier={fichier} etat={etat} />
      <PropositionEcranAccueil alerteEnCours={vigilanceEnCours(etat)} />
    </>
  );
}

// Lit les watches/warnings NHC à chaque requête, par le cache partagé du flux et des couches NOAA.
async function AlertesNhcIle({ ile, emprise, langue }: { ile: Ile; emprise: Emprise; langue: Langue }) {
  await connection();
  const fixture = fixtureNhcDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE_NHC)?.value);
  const etat = await alertesNhc(fixture, emprise);
  return (
    <>
      <AlertesNhc langue={langue} nomIle={nomIle(ile, langue)} etat={etat} />
      <PropositionEcranAccueil alerteEnCours={alertesNhcEnCours(etat)} />
    </>
  );
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder un App Shell commun.
async function AlerteIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();
  const langue = await langueDeLaPage();
  const textes = ALERTE[langue].page;
  const nom = nomIle(ile, langue);

  return (
    <>
      <Lien
        href={`/iles/${ile.slug}`}
        className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        {textes.menaces(nom)}
      </Lien>
      {ile.alerte.source === "nhc" ? (
        <Suspense
          fallback={
            <EnTeteIle nomIle={nom}>
              <p className="text-base">{textes.chargementNhc}</p>
            </EnTeteIle>
          }
        >
          <AlertesNhcIle ile={ile} emprise={ile.alerte.emprise} langue={langue} />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <EnTeteIle nomIle={nom}>
              <p className="text-base">{textes.chargementVigilance}</p>
            </EnTeteIle>
          }
        >
          <VigilanceIle ile={ile} fichier={ile.alerte.fichier} langue={langue} />
        </Suspense>
      )}
      <Lien
        href={`/iles/${ile.slug}/checklist`}
        className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-4"
      >
        {textes.checklist}
      </Lien>
    </>
  );
}

export default async function PageAlerte({ params }: Props) {
  const textes = ALERTE[await langueDeLaPage()].page;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<Chargement texte={textes.chargement} />}>
        <AlerteIle params={params} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
