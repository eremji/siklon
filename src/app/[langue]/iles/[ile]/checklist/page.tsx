import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Lien } from "@/components/langue/Lien";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Checklist, type CompteChecklist } from "@/components/checklist/Checklist";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { PropositionEcranAccueil } from "@/components/ecranAccueil/PropositionEcranAccueil";
import { AlertesNhc } from "@/components/vigilance/AlertesNhc";
import { BandeauVigilance, EnTeteIle } from "@/components/vigilance/BandeauVigilance";
import { utilisateurCourant } from "@/lib/auth/serveur";
import { lireElementsCoches, lireElementsMasques, lireElementsPerso } from "@/lib/db/checklist";
import { connexionComptes } from "@/lib/db/pool";
import { alertesNhcEnCours, vigilanceEnCours } from "@/lib/ecranAccueil/alerteEnCours";
import { type Emprise, type FichierVigilance, ILES, type Ile, trouverIle } from "@/lib/iles";
import { alertesNhc } from "@/lib/nhc/lecture";
import { COOKIE_FIXTURE as COOKIE_FIXTURE_NHC, fixtureDemandee as fixtureNhcDemandee } from "@/lib/nhc/source";
import { niveauNhc, niveauVigilance } from "@/lib/notifications/evenements";
import { COOKIE_FIXTURE, etatFixture, fixtureDemandee } from "@/lib/vigilance/fixtures";
import { SOURCES_METEO_FRANCE } from "@/lib/vigilance/source";
import { chargerVigilance } from "@/lib/vigilance/vigilance";
import {
  ajouterElementChecklist,
  cocherElementChecklist,
  cocherElementPersoChecklist,
  masquerElementChecklist,
  supprimerElementChecklist,
} from "./actions";

type Props = PageProps<"/[langue]/iles/[ile]/checklist">;

export function generateStaticParams() {
  return ILES.map(({ slug }) => ({ ile: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ile = trouverIle((await params).ile);
  return { title: ile ? `Checklist de préparation : ${ile.nom} · Siklon` : "Île introuvable · Siklon" };
}

// État de la checklist de l'utilisateur connecté, null pour un visiteur. Si la base des comptes ne
// répond pas, la checklist de base reste affichée : elle compte plus que l'enregistrement.
async function compteChecklist(): Promise<CompteChecklist> {
  try {
    const utilisateur = await utilisateurCourant();
    if (!utilisateur) return null;
    const db = connexionComptes();
    const [coches, masques, perso] = await Promise.all([
      lireElementsCoches(db, utilisateur.id),
      lireElementsMasques(db, utilisateur.id),
      lireElementsPerso(db, utilisateur.id),
    ]);
    return {
      coches,
      masques,
      perso,
      cocher: cocherElementChecklist,
      cocherPerso: cocherElementPersoChecklist,
      masquer: masquerElementChecklist,
      ajouter: ajouterElementChecklist,
      supprimer: supprimerElementChecklist,
    };
  } catch (erreur) {
    console.warn("[checklist] état du compte indisponible", { raison: erreur instanceof Error ? erreur.message : String(erreur) });
    return null;
  }
}

// Une seule lecture de la vigilance par requête : elle alimente l'en-tête et le choix de la liste.
async function ChecklistMeteoFrance({ ile, fichier }: { ile: Ile; fichier: FichierVigilance }) {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const [etat, compte] = await Promise.all([
    fixture ? etatFixture(fixture) : chargerVigilance(fichier, SOURCES_METEO_FRANCE),
    compteChecklist(),
  ]);
  return (
    <>
      {/* La checklist reste en français jusqu'à sa traduction (US-10, livraison 7). */}
      <BandeauVigilance langue="fr" nomIle={ile.nom} fichier={fichier} etat={etat} />
      <PropositionEcranAccueil alerteEnCours={vigilanceEnCours(etat)} />
      <Checklist nomIle={ile.nom} source="meteo-france" niveau={niveauVigilance(etat)?.niveau ?? null} compte={compte} />
    </>
  );
}

async function ChecklistNhc({ ile, emprise }: { ile: Ile; emprise: Emprise }) {
  await connection();
  const fixture = fixtureNhcDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE_NHC)?.value);
  const [etat, compte] = await Promise.all([alertesNhc(fixture, emprise), compteChecklist()]);
  return (
    <>
      {/* La checklist reste en français jusqu'à sa traduction (US-10, livraison 7). */}
      <AlertesNhc langue="fr" nomIle={ile.nom} etat={etat} />
      <PropositionEcranAccueil alerteEnCours={alertesNhcEnCours(etat)} />
      <Checklist nomIle={ile.nom} source="nhc" niveau={niveauNhc(etat)?.niveau ?? null} compte={compte} />
    </>
  );
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder une coquille commune.
async function ChecklistIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();

  return (
    <>
      <Lien
        href={`/iles/${ile.slug}`}
        className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        {ile.nom} : menaces en cours
      </Lien>
      <Suspense
        fallback={
          <EnTeteIle nomIle={ile.nom}>
            <p className="text-base">Chargement du niveau d&apos;alerte…</p>
          </EnTeteIle>
        }
      >
        {ile.alerte.source === "nhc" ? (
          <ChecklistNhc ile={ile} emprise={ile.alerte.emprise} />
        ) : (
          <ChecklistMeteoFrance ile={ile} fichier={ile.alerte.fichier} />
        )}
      </Suspense>
    </>
  );
}

export default function PageChecklist({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-base text-muted">Chargement de l&apos;île…</p>}>
        <ChecklistIle params={params} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
