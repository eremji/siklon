import type { Metadata } from "next";
import Link from "next/link";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";

export const metadata: Metadata = {
  title: "Compte supprimé · Siklon",
  description: "Votre compte Siklon a été supprimé.",
};

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Compte supprimé</h1>
      <p role="status" className="text-base">
        Votre compte et toutes ses données ont été effacés. Vous pouvez continuer à suivre les cyclones sans compte.
      </p>
      <Link
        href="/"
        className="flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-bold text-on-accent"
      >
        Revenir à la carte
      </Link>
      <MentionOfficielle />
    </main>
  );
}
