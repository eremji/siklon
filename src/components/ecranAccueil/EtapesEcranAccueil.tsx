"use client";
// Étapes pour ajouter Siklon à l'écran d'accueil d'un iPhone ou d'un iPad (US-07c, #110).
import type { ReactNode } from "react";
import { useLangue } from "@/components/langue/ContexteLangue";
import { ECRAN_ACCUEIL } from "@/lib/textes/ecranAccueil";
import type { Appareil } from "@/lib/ecranAccueil/detection";
import { IconeEcranAccueil, IconePartager } from "./icones";

function Etape({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-base">
      <span
        aria-hidden="true"
        className="flex size-7 flex-none items-center justify-center rounded-full bg-surface font-bold text-accent"
      >
        {numero}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function EtapesEcranAccueil({ appareil }: { appareil: Appareil }) {
  const textes = ECRAN_ACCUEIL[useLangue()].etapes;
  const partager = appareil === "ipad" ? textes.partagerIpad : textes.partagerIphone;
  return (
    <ol className="flex flex-col gap-3">
      <Etape numero={1}>
        {partager.avant} <IconePartager className="inline align-[-4px] text-accent" />
        {partager.apres}
      </Etape>
      <Etape numero={2}>
        {textes.ecranAccueil.avant} <IconeEcranAccueil className="inline align-[-4px] text-accent" />
        {textes.ecranAccueil.apres}
      </Etape>
      <Etape numero={3}>{textes.ajouter}</Etape>
      <Etape numero={4}>{textes.ouvrir}</Etape>
    </ol>
  );
}
