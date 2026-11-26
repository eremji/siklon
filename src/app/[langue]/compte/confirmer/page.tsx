import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { Suspense } from "react";
import { FormulaireConfirmationAdresse } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { COMPTE } from "@/lib/textes/compte";
import { confirmerAdresse } from "../actions";

// Le jeton est dans l'adresse : ni transmis aux autres sites, ni indexé.
export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = COMPTE[await langueDeLaPage()].pages.confirmer;
  return { title: `${titre} · Siklon`, description, referrer: "no-referrer", robots: { index: false, follow: false } };
}

// L'adresse est lue sous Suspense (Cache Components) : la coquille de la page reste statique.
async function Contenu({ searchParams }: PageProps<"/[langue]/compte/confirmer">) {
  const { jeton } = await searchParams;
  const textes = COMPTE[await langueDeLaPage()].pages.confirmer;
  if (typeof jeton !== "string" || !jeton) {
    return (
      <p role="alert" className="text-base">
        {textes.incomplet}{" "}
        <Lien href="/compte" className="text-accent underline underline-offset-4">
          {textes.votreCompte}
        </Lien>
        .
      </p>
    );
  }
  return <FormulaireConfirmationAdresse action={confirmerAdresse} jeton={jeton} />;
}

export default async function Page(props: PageProps<"/[langue]/compte/confirmer">) {
  const { pages } = COMPTE[await langueDeLaPage()];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">{pages.confirmer.titre}</h1>
      <Suspense fallback={<p className="text-base text-muted">{pages.chargement}</p>}>
        <Contenu {...props} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
