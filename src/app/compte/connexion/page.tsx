import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireConnexion } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { connecter } from "../actions";

export const metadata: Metadata = {
  title: "Se connecter · Siklon",
  description: "Connectez-vous à votre compte Siklon.",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Se connecter</h1>
      <FormulaireConnexion action={connecter} />
      <p className="text-base">
        Pas encore de compte ?{" "}
        <Link href="/compte/inscription" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
      <MentionOfficielle />
    </main>
  );
}
