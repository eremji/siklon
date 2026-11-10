import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FicheSystemeActif } from "@/components/systemes/FicheSystemeActif";
import { chargerSystemesActifs } from "@/lib/nhc/client";
import { COOKIE_FIXTURE, etatFixture, fixtureDemandee } from "@/lib/nhc/source";

export const metadata: Metadata = { title: "Fiche d'un système actif · Siklon" };

// Identifiant NHC d'un système de l'Atlantique, par exemple « al112026 ».
const ID_SYSTEME = /^al\d{6}$/;

export default function Page({ params }: PageProps<"/systemes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Link href="/" className="flex min-h-11 items-center self-start text-base text-accent underline underline-offset-4">
        Carte des systèmes actifs
      </Link>
      <Suspense fallback={<p className="text-base text-muted">Chargement de la fiche…</p>}>
        <Fiche params={params} />
      </Suspense>
      <p className="mt-auto text-sm text-muted">
        Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.
      </p>
    </main>
  );
}

// Lit le flux NHC à chaque requête, jamais pendant le build.
async function Fiche({ params }: Pick<PageProps<"/systemes/[id]">, "params">) {
  const { id } = await params;
  if (!ID_SYSTEME.test(id)) notFound();
  await connection();
  const fixture = fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value);
  const flux = fixture ? etatFixture(fixture, new Date().toISOString()) : await chargerSystemesActifs();
  return <FicheSystemeActif flux={flux} id={id} />;
}
