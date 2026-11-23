"use client";
// Lien interne qui garde la langue de la page (US-10) : <Lien href="/iles"> mène à /en/iles depuis
// une page en anglais. Utilisable dans les composants serveur comme dans ceux du navigateur.
import Link from "next/link";
import type { ComponentProps } from "react";
import { chemin } from "@/lib/langues";
import { useLangue } from "./ContexteLangue";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Chemin de la page sans la langue : "/iles/guadeloupe". */
  href: string;
};

export function Lien({ href, ...props }: Props) {
  return <Link href={chemin(useLangue(), href)} {...props} />;
}
