import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { Suspense } from "react";
import { FormulaireNouveauMotDePasse } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { reinitialiserMotDePasse } from "../actions";

// Le jeton est dans l'adresse : ni transmis aux autres sites, ni indexé.
export const metadata: Metadata = {
  title: "Nouveau mot de passe · Siklon",
  description: "Choisissez un nouveau mot de passe pour votre compte Siklon.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

async function Contenu({ searchParams }: PageProps<"/[langue]/compte/nouveau-mot-de-passe">) {
  const { jeton } = await searchParams;
  if (typeof jeton !== "string" || !jeton) {
    return (
      <p role="alert" className="text-base">
        Ce lien est incomplet.{" "}
        <Lien href="/compte/mot-de-passe-oublie" className="text-accent underline underline-offset-4">
          Demander un nouveau lien
        </Lien>
      </p>
    );
  }
  return <FormulaireNouveauMotDePasse action={reinitialiserMotDePasse} jeton={jeton} />;
}

export default function Page(props: PageProps<"/[langue]/compte/nouveau-mot-de-passe">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Nouveau mot de passe</h1>
      <Suspense fallback={<p className="text-base text-muted">Chargement…</p>}>
        <Contenu {...props} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
