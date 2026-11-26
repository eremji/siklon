"use client";
// Partage depuis la page d'une île menacée (US-21) : le délai est calculé au moment du clic.
import { useLangue } from "@/components/langue/ContexteLangue";
import { trouverIle } from "@/lib/iles";
import type { Menace } from "@/lib/nhc/menace";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { type AlerteIle, partageIle } from "@/lib/partage/ile";
import { BoutonPartager } from "./BoutonPartager";

export function PartageIle({ slug, menaces, alerte }: { slug: string; menaces: Menace<SystemeActif>[]; alerte: AlerteIle }) {
  const langue = useLangue();
  const ile = trouverIle(slug);
  if (!ile) return null;
  return <BoutonPartager chemin={`/iles/${slug}`} contenu={() => partageIle(ile, menaces, alerte, langue, new Date())} />;
}
