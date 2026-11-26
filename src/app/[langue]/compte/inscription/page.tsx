import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { Suspense } from "react";
import { AlerteGoogle, FormulaireInscription } from "@/components/compte/Formulaires";
import { LogoSiklon } from "@/components/logo/LogoSiklon";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { connexionGoogleActive } from "@/lib/auth/configuration";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { COMPTE } from "@/lib/textes/compte";
import { connecterAvecGoogle, inscrire } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = COMPTE[await langueDeLaPage()].pages.inscription;
  return { title: `${titre} · Siklon`, description };
}

const LIEN = "inline-flex min-h-11 items-center text-accent underline underline-offset-4";

export default async function Page() {
  const textes = COMPTE[await langueDeLaPage()].pages.inscription;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <LogoSiklon hauteur={36} />
      <h1 className="text-3xl font-bold">{textes.titre}</h1>
      {connexionGoogleActive(process.env) && (
        <Suspense fallback={null}>
          <AlerteGoogle />
        </Suspense>
      )}
      <FormulaireInscription action={inscrire} google={connexionGoogleActive(process.env) ? connecterAvecGoogle : undefined} />
      <p className="text-base">
        {textes.donnees}{" "}
        <Lien href="/confidentialite" className={LIEN}>
          {textes.vosDonnees}
        </Lien>
      </p>
      <p className="text-base">
        {textes.dejaUnCompte}{" "}
        <Lien href="/compte/connexion" className={LIEN}>
          {textes.seConnecter}
        </Lien>
      </p>
      <MentionOfficielle />
    </main>
  );
}
