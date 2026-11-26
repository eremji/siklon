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
import { type Emprise, type FichierVigilance, ILES, type Ile, nomIle, trouverIle } from "@/lib/iles";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import type { Langue } from "@/lib/langues";
import { alertesNhc } from "@/lib/nhc/lecture";
import { COOKIE_FIXTURE as COOKIE_FIXTURE_NHC, fixtureDemandee as fixtureNhcDemandee } from "@/lib/nhc/source";
import { niveauNhc, niveauVigilance } from "@/lib/notifications/evenements";
import { COOKIE_FIXTURE, etatFixture, fixtureDemandee } from "@/lib/vigilance/fixtures";
import { ALERTE } from "@/lib/textes/alerte";
import { CHECKLIST } from "@/lib/textes/checklist";
import { vigilanceAffichee } from "@/lib/vigilance/source";
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
  const langue = await langueDeLaPage();
  const textes = CHECKLIST[langue].page;
  const ile = trouverIle((await params).ile);
  return { title: ile ? textes.titreOnglet(nomIle(ile, langue)) : textes.introuvable };
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
async function ChecklistMeteoFrance({ ile, fichier, langue }: { ile: Ile; fichier: FichierVigilance; langue: Langue }) {
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const [etat, compte] = await Promise.all([
    fixture ? etatFixture(fixture) : vigilanceAffichee(fichier),
    compteChecklist(),
  ]);
  return (
    <>
      <BandeauVigilance langue={langue} nomIle={nomIle(ile, langue)} fichier={fichier} etat={etat} />
      <PropositionEcranAccueil alerteEnCours={vigilanceEnCours(etat)} />
      <Checklist
        langue={langue}
        nomIle={nomIle(ile, langue)}
        source="meteo-france"
        niveau={niveauVigilance(etat)?.niveau ?? null}
        compte={compte}
      />
    </>
  );
}

async function ChecklistNhc({ ile, emprise, langue }: { ile: Ile; emprise: Emprise; langue: Langue }) {
  await connection();
  const fixture = fixtureNhcDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE_NHC)?.value);
  const [etat, compte] = await Promise.all([alertesNhc(fixture, emprise), compteChecklist()]);
  return (
    <>
      <AlertesNhc langue={langue} nomIle={nomIle(ile, langue)} etat={etat} />
      <PropositionEcranAccueil alerteEnCours={alertesNhcEnCours(etat)} />
      <Checklist langue={langue} nomIle={nomIle(ile, langue)} source="nhc" niveau={niveauNhc(etat)?.niveau ?? null} compte={compte} />
    </>
  );
}

// L'identifiant d'île vient de l'URL : il est lu sous Suspense pour garder une coquille commune.
async function ChecklistIle({ params }: Pick<Props, "params">) {
  const ile = trouverIle((await params).ile);
  if (!ile) notFound();
  const langue = await langueDeLaPage();
  const textes = CHECKLIST[langue].page;
  const nom = nomIle(ile, langue);

  return (
    <>
      <Lien
        href={`/iles/${ile.slug}`}
        className="flex min-h-11 items-center text-base text-accent underline underline-offset-4"
      >
        {ALERTE[langue].page.menaces(nom)}
      </Lien>
      <Suspense
        fallback={
          <EnTeteIle nomIle={nom}>
            <p className="text-base">{textes.chargementNiveau}</p>
          </EnTeteIle>
        }
      >
        {ile.alerte.source === "nhc" ? (
          <ChecklistNhc ile={ile} emprise={ile.alerte.emprise} langue={langue} />
        ) : (
          <ChecklistMeteoFrance ile={ile} fichier={ile.alerte.fichier} langue={langue} />
        )}
      </Suspense>
    </>
  );
}

export default async function PageChecklist({ params }: Props) {
  const textes = CHECKLIST[await langueDeLaPage()].page;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-base text-muted">{textes.chargement}</p>}>
        <ChecklistIle params={params} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
