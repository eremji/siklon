import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { Suspense } from "react";
import { AlerteGoogle, FormulaireConnexion, FormulaireGoogle } from "@/components/compte/Formulaires";
import { LogoSiklon } from "@/components/logo/LogoSiklon";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { connexionGoogleActive } from "@/lib/auth/configuration";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { COMPTE } from "@/lib/textes/compte";
import { connecter, connecterAvecGoogle } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = COMPTE[await langueDeLaPage()].pages.connexion;
  return { title: `${titre} · Siklon`, description };
}

export default async function Page() {
  const textes = COMPTE[await langueDeLaPage()].pages.connexion;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <LogoSiklon hauteur={36} />
      <h1 className="text-3xl font-bold">{textes.titre}</h1>
      {connexionGoogleActive(process.env) && (
        <>
          <Suspense fallback={null}>
            <AlerteGoogle />
          </Suspense>
          <FormulaireGoogle action={connecterAvecGoogle} origine="/compte/connexion" />
          <p className="text-center text-sm text-muted">{textes.ouEmail}</p>
        </>
      )}
      <FormulaireConnexion action={connecter} />
      <Lien href="/compte/mot-de-passe-oublie" className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        {textes.oubli}
      </Lien>
      <p className="text-base">
        {textes.pasDeCompte}{" "}
        <Lien href="/compte/inscription" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          {textes.creer}
        </Lien>
      </p>
      <MentionOfficielle />
    </main>
  );
}
