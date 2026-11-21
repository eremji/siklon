import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlerteGoogle, FormulaireInscription } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { connexionGoogleActive } from "@/lib/auth/configuration";
import { connecterAvecGoogle, inscrire } from "../actions";

export const metadata: Metadata = {
  title: "Créer un compte · Siklon",
  description: "Créez un compte Siklon avec votre adresse email ou votre compte Google.",
};

const LIEN = "inline-flex min-h-11 items-center text-accent underline underline-offset-4";

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Créer un compte</h1>
      {connexionGoogleActive(process.env) && (
        <Suspense fallback={null}>
          <AlerteGoogle />
        </Suspense>
      )}
      <FormulaireInscription action={inscrire} google={connexionGoogleActive(process.env) ? connecterAvecGoogle : undefined} />
      <p className="text-base">
        Siklon garde seulement votre adresse email et votre langue.{" "}
        <Link href="/confidentialite" className={LIEN}>
          Vos données
        </Link>
      </p>
      <p className="text-base">
        Déjà un compte ?{" "}
        <Link href="/compte/connexion" className={LIEN}>
          Se connecter
        </Link>
      </p>
      <MentionOfficielle />
    </main>
  );
}
