import type { Metadata } from "next";
import { Suspense } from "react";
import { EtatCompte } from "@/components/compte/EtatCompte";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { utilisateurCourant } from "@/lib/auth/serveur";
import { deconnecter } from "./actions";

export const metadata: Metadata = {
  title: "Compte · Siklon",
  description: "Connectez-vous ou créez un compte Siklon pour suivre vos îles.",
};

// Lit la session : rendu à la requête, sous la frontière <Suspense> (Cache Components).
async function Contenu() {
  return <EtatCompte utilisateur={await utilisateurCourant()} deconnecter={deconnecter} />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Compte</h1>
      <Suspense fallback={<p className="text-base text-muted">Chargement du compte…</p>}>
        <Contenu />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
