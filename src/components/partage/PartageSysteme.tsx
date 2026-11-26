"use client";
// Partage depuis la fiche d'un système actif (US-21) : le message est rédigé au moment du clic,
// pour signaler un avis devenu ancien sur une page restée ouverte.
import { useLangue } from "@/components/langue/ContexteLangue";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { partageSysteme } from "@/lib/partage/texte";
import { BoutonPartager } from "./BoutonPartager";

export function PartageSysteme({ systeme }: { systeme: SystemeActif }) {
  const langue = useLangue();
  return <BoutonPartager chemin={`/systemes/${systeme.id}`} contenu={() => partageSysteme(systeme, langue, new Date())} />;
}
