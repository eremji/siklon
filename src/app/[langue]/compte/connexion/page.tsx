import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { Suspense } from "react";
import { AlerteGoogle, FormulaireConnexion, FormulaireGoogle } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { connexionGoogleActive } from "@/lib/auth/configuration";
import { connecter, connecterAvecGoogle } from "../actions";

export const metadata: Metadata = {
  title: "Se connecter · Siklon",
  description: "Connectez-vous à votre compte Siklon.",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Se connecter</h1>
      {connexionGoogleActive(process.env) && (
        <>
          <Suspense fallback={null}>
            <AlerteGoogle />
          </Suspense>
          <FormulaireGoogle action={connecterAvecGoogle} origine="/compte/connexion" />
          <p className="text-center text-sm text-muted">ou avec votre adresse email</p>
        </>
      )}
      <FormulaireConnexion action={connecter} />
      <Lien href="/compte/mot-de-passe-oublie" className="inline-flex min-h-11 items-center text-base text-accent underline underline-offset-4">
        Mot de passe oublié ?
      </Lien>
      <p className="text-base">
        Pas encore de compte ?{" "}
        <Lien href="/compte/inscription" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          Créer un compte
        </Lien>
      </p>
      <MentionOfficielle />
    </main>
  );
}
