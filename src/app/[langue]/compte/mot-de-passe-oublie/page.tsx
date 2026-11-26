import type { Metadata } from "next";
import { FormulaireMotDePasseOublie } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { COMPTE } from "@/lib/textes/compte";
import { demanderReinitialisation } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = COMPTE[await langueDeLaPage()].pages.oubli;
  return { title: `${titre} · Siklon`, description };
}

export default async function Page() {
  const textes = COMPTE[await langueDeLaPage()].pages.oubli;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">{textes.titre}</h1>
      <p className="text-base">{textes.intro}</p>
      <FormulaireMotDePasseOublie action={demanderReinitialisation} />
      <MentionOfficielle />
    </main>
  );
}
