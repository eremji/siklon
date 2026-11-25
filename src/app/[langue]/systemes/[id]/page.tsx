import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Lien } from "@/components/langue/Lien";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FicheSystemeActif } from "@/components/systemes/FicheSystemeActif";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { fluxNhc } from "@/lib/nhc/lecture";
import { COOKIE_FIXTURE, fixtureDemandee } from "@/lib/nhc/source";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { SYSTEMES } from "@/lib/textes/systemes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: SYSTEMES[await langueDeLaPage()].fiche.titreOnglet };
}

// Identifiant NHC d'un système de l'Atlantique, par exemple « al112026 ».
const ID_SYSTEME = /^al\d{6}$/;

export default async function Page({ params }: PageProps<"/[langue]/systemes/[id]">) {
  const { fiche } = SYSTEMES[await langueDeLaPage()];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Lien href="/" className="flex min-h-11 items-center self-start text-base text-accent underline underline-offset-4">
        {fiche.retour}
      </Lien>
      <Suspense fallback={<p className="text-base text-muted">{fiche.chargement}</p>}>
        <Fiche params={params} />
      </Suspense>
      <MentionOfficielle />
    </main>
  );
}

// Lit le flux NHC à chaque requête, à travers le cache partagé, jamais pendant le build.
async function Fiche({ params }: Pick<PageProps<"/[langue]/systemes/[id]">, "params">) {
  const { id } = await params;
  if (!ID_SYSTEME.test(id)) notFound();
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const flux = await fluxNhc(fixture);
  return <FicheSystemeActif langue={await langueDeLaPage()} flux={flux} id={id} />;
}
