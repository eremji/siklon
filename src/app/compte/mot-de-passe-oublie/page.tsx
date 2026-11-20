import type { Metadata } from "next";
import { FormulaireMotDePasseOublie } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { demanderReinitialisation } from "../actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié · Siklon",
  description: "Recevez un lien pour choisir un nouveau mot de passe Siklon.",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Mot de passe oublié</h1>
      <p className="text-base">Saisissez l&apos;adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <FormulaireMotDePasseOublie action={demanderReinitialisation} />
      <MentionOfficielle />
    </main>
  );
}
