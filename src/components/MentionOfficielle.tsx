"use client";
// Rappel affiché sur chaque écran (DESIGN.md, US-12), dans la langue de la page (US-10).
import { useLangue } from "@/components/langue/ContexteLangue";
import { COMMUN } from "@/lib/textes/commun";

export function MentionOfficielle({ className = "mt-auto text-sm text-muted" }: { className?: string }) {
  return <p className={className}>{COMMUN[useLangue()].mention}</p>;
}
