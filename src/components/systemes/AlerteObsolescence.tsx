"use client";

import { useSyncExternalStore } from "react";
import { SEUIL_OBSOLESCENCE_H, estObsolete } from "@/lib/nhc/fraicheur";

const MINUTE_MS = 60_000;

// L'heure courante est relue chaque minute : une page restée ouverte (ou servie
// depuis un cache) affiche l'avertissement dès que le seuil est franchi.
function abonner(rappel: () => void) {
  const minuterie = setInterval(rappel, MINUTE_MS);
  return () => clearInterval(minuterie);
}

const minuteCourante = () => Math.floor(Date.now() / MINUTE_MS);
// Côté serveur, l'heure du client est inconnue : l'avertissement est calculé à l'hydratation.
const minuteServeur = () => null;

export function AlerteObsolescence({ emisLe }: { emisLe: string }) {
  const minute = useSyncExternalStore(abonner, minuteCourante, minuteServeur);
  if (minute === null || !estObsolete(emisLe, new Date(minute * MINUTE_MS))) return null;

  return (
    <p role="status" className="text-base font-bold text-danger-text">
      Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de {SEUIL_OBSOLESCENCE_H} h.
    </p>
  );
}
