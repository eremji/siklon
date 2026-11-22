import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { Suspense } from "react";
import { FormulaireConfirmationAdresse } from "@/components/compte/Formulaires";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { confirmerAdresse } from "../actions";

// Le jeton est dans l'adresse : ni transmis aux autres sites, ni indexé.
export const metadata: Metadata = {
  title: "Confirmer mon adresse · Siklon",
  description: "Confirmez l'adresse email de votre compte Siklon.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

// L'adresse est lue sous Suspense (Cache Components) : la coquille de la page reste statique.
async function Contenu({ searchParams }: PageProps<"/[langue]/compte/confirmer">) {
  const { jeton } = await searchParams;
  if (typeof jeton !== "string" || !jeton) {
    return (
      <p role="alert" className="text-base">
        Ce lien est incomplet. Ouvrez le lien reçu par email, ou demandez-en un nouveau depuis{" "}
        <Lien href="/compte" className="text-accent underline underline-offset-4">
          votre compte
        </Lien>
        .
      </p>
    );
  }
  return <FormulaireConfirmationAdresse action={confirmerAdresse} jeton={jeton} />;
}

export default function Page(props: PageProps<"/[langue]/compte/confirmer">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Confirmer mon adresse</h1>
      <Suspense fallback={<p className="text-base text-muted">Chargement…</p>}>
        <Contenu {...props} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}
