"use client";
// Propose d'ajouter Siklon à l'écran d'accueil (US-07c, #110) : seulement dans Safari sur iPhone et iPad
// (iOS 16.4+), quand Siklon n'y est pas déjà, selon les règles de frequence.ts. Feuille du bas, ou
// bandeau quand une alerte est en cours sur la page (la feuille ne cache jamais une information d'alerte).
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { type Appareil, ouvertDepuisEcranAccueil, situationEcranAccueil } from "@/lib/ecranAccueil/detection";
import {
  CLE_MEMO,
  doitProposer,
  ecrireMemo,
  estPageIle,
  lireMemo,
  type Memo,
  noterFermeture,
  noterVisite,
  pageAvecAlertes,
} from "@/lib/ecranAccueil/frequence";
import { BandeauEcranAccueil } from "./BandeauEcranAccueil";
import { FeuilleEcranAccueil } from "./FeuilleEcranAccueil";

// Le stockage local peut être bloqué (réglages de Safari) : la proposition ne s'affiche alors jamais.
function lireStockage(): Memo | null {
  try {
    return lireMemo(localStorage.getItem(CLE_MEMO));
  } catch {
    return null;
  }
}

function ecrireStockage(memo: Memo) {
  try {
    localStorage.setItem(CLE_MEMO, ecrireMemo(memo));
  } catch {
    // Rien à faire : sans stockage, rien n'est proposé.
  }
}

function appareilAInstaller(): Appareil | null {
  const situation = situationEcranAccueil({
    agent: navigator.userAgent,
    pointsTactiles: navigator.maxTouchPoints ?? 0,
    installe: typeof window.matchMedia === "function" && ouvertDepuisEcranAccueil(window),
  });
  return situation.etat === "a-installer" ? situation.appareil : null;
}

export function PropositionEcranAccueil({ alerteEnCours = false }: { alerteEnCours?: boolean }) {
  const chemin = usePathname();
  const [appareil, setAppareil] = useState<Appareil | null>(null);

  // Décidé dans le navigateur, après l'hydratation, à chaque page vue.
  useEffect(() => {
    const cible = appareilAInstaller();
    if (!cible) return;
    const memo = lireStockage();
    if (!memo) return;
    const maintenant = new Date();
    const proposer = doitProposer({ memo, maintenant, pageIle: estPageIle(chemin) });
    ecrireStockage(noterVisite(memo, maintenant));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'appareil n'est connu que dans le navigateur
    if (proposer) setAppareil(cible);
  }, [chemin]);

  if (!appareil) return null;
  if (alerteEnCours) return <BandeauEcranAccueil appareil={appareil} />;
  return (
    <FeuilleEcranAccueil
      appareil={appareil}
      onFermer={({ refus }) => {
        const memo = lireStockage();
        if (memo) ecrireStockage(noterFermeture(memo, new Date(), { refus }));
        setAppareil(null);
      }}
    />
  );
}

/** Pour la mise en page : partout, sauf sur les pages d'alerte et de checklist, qui ont la leur. */
export function PropositionHorsPagesAlertes() {
  const chemin = usePathname();
  return pageAvecAlertes(chemin) ? null : <PropositionEcranAccueil />;
}
