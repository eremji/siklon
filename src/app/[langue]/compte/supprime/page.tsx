import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { COMPTE } from "@/lib/textes/compte";

export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = COMPTE[await langueDeLaPage()].pages.supprime;
  return { title: `${titre} · Siklon`, description };
}

export default async function Page() {
  const textes = COMPTE[await langueDeLaPage()].pages.supprime;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">{textes.titre}</h1>
      <p role="status" className="text-base">
        {textes.efface}
      </p>
      <Lien
        href="/"
        className="flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-bold text-on-accent"
      >
        {textes.carte}
      </Lien>
      <MentionOfficielle />
    </main>
  );
}
