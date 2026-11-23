import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import { ILES } from "@/lib/iles";
import { MentionOfficielle } from "@/components/MentionOfficielle";

export const metadata: Metadata = {
  title: "Mon île · Siklon",
  description: "Choisissez une île des Antilles pour savoir dans combien de temps un système actif pourrait l'atteindre.",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Mon île</h1>
      <p className="text-base">
        Choisissez une île pour savoir si un système actif est prévu à moins de {RADIUS_WATCH_KM} km de sa ville
        principale, et dans combien de temps.
      </p>
      <ul className="flex flex-col gap-2">
        {ILES.map((ile) => (
          <li key={ile.slug}>
            <Lien
              href={`/iles/${ile.slug}`}
              className="flex min-h-12 items-center rounded-2xl bg-surface px-4 text-base font-bold text-accent underline underline-offset-4"
            >
              {ile.nom}
            </Lien>
          </li>
        ))}
      </ul>
      <MentionOfficielle />
    </main>
  );
}
