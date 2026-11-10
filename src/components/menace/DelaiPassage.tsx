"use client";

import { useSyncExternalStore } from "react";
import { formaterDelai } from "@/lib/menace/formatage";

const MINUTE_MS = 60_000;

// L'heure courante est relue chaque minute : le délai reste juste sur une page restée ouverte.
function abonner(rappel: () => void) {
  const minuterie = setInterval(rappel, MINUTE_MS);
  return () => clearInterval(minuterie);
}

const minuteCourante = () => Math.floor(Date.now() / MINUTE_MS);
// Côté serveur, l'heure du visiteur est inconnue : le délai est calculé à l'hydratation.
const minuteServeur = () => null;

export function DelaiPassage({ heure }: { heure: string }) {
  const minute = useSyncExternalStore(abonner, minuteCourante, minuteServeur);
  return (
    <p className="min-h-14 text-[44px] leading-tight font-bold">
      {minute === null ? null : formaterDelai(heure, new Date(minute * MINUTE_MS))}
    </p>
  );
}
