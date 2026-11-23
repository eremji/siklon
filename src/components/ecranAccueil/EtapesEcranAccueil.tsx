// Étapes pour ajouter Siklon à l'écran d'accueil d'un iPhone ou d'un iPad (US-07c, #110).
import type { ReactNode } from "react";
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
  const ouPartager = appareil === "ipad" ? "en haut à droite de l'écran" : "en bas de l'écran";
  return (
    <ol className="flex flex-col gap-3">
      <Etape numero={1}>
        Touchez Partager <IconePartager className="inline align-[-4px] text-accent" />, {ouPartager}.
      </Etape>
      <Etape numero={2}>
        Touchez « Sur l&apos;écran d&apos;accueil » <IconeEcranAccueil className="inline align-[-4px] text-accent" />.
      </Etape>
      <Etape numero={3}>Touchez « Ajouter ».</Etape>
      <Etape numero={4}>Ouvrez Siklon depuis son icône, puis revenez dans Compte pour activer les alertes.</Etape>
    </ol>
  );
}
