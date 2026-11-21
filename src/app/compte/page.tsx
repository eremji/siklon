import type { Metadata } from "next";
import { Suspense } from "react";
import { EtatCompte } from "@/components/compte/EtatCompte";
import { AlerteGoogle } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { connexionGoogleActive } from "@/lib/auth/configuration";
import { utilisateurCourant } from "@/lib/auth/serveur";
import { lireIlesSuivies } from "@/lib/db/ilesSuivies";
import { connexionComptes } from "@/lib/db/pool";
import {
  abonnerAppareil,
  connecterAvecGoogle,
  deconnecter,
  desabonnerAppareil,
  enregistrerIles,
  renvoyerConfirmation,
  supprimerCompte,
} from "./actions";

export const metadata: Metadata = {
  title: "Compte · Siklon",
  description: "Connectez-vous ou créez un compte Siklon pour suivre vos îles.",
};

// Lit la session : rendu à la requête, sous la frontière <Suspense> (Cache Components).
async function Contenu() {
  const utilisateur = await utilisateurCourant();
  const ilesSuivies = utilisateur ? await lireIlesSuivies(connexionComptes(), utilisateur.id) : [];
  return (
    <EtatCompte
      utilisateur={utilisateur}
      ilesSuivies={ilesSuivies}
      deconnecter={deconnecter}
      supprimer={supprimerCompte}
      enregistrerIles={enregistrerIles}
      renvoyerConfirmation={renvoyerConfirmation}
      abonnerAppareil={abonnerAppareil}
      desabonnerAppareil={desabonnerAppareil}
      // Lue à la requête (pas de NEXT_PUBLIC_) : la clé peut changer sans reconstruire le site.
      clePubliqueVapid={process.env.VAPID_PUBLIC_KEY || null}
      google={connexionGoogleActive(process.env) ? connecterAvecGoogle : undefined}
    />
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Compte</h1>
      {/* Retour de Google en échec, par exemple en se reconnectant avant de supprimer son compte. */}
      <Suspense fallback={null}>
        <AlerteGoogle />
      </Suspense>
      <Suspense fallback={<p className="text-base text-muted">Chargement du compte…</p>}>
        <Contenu />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
