"use client";
// Langue de la page pour les composants du navigateur (US-10) : posée une fois par la mise en page
// racine, qui la lit dans l'adresse. Sans fournisseur (tests), le français.
import { createContext, type ReactNode, use } from "react";
import { LANGUE_PAR_DEFAUT, type Langue } from "@/lib/langues";

const ContexteLangue = createContext<Langue>(LANGUE_PAR_DEFAUT);

export function FournisseurLangue({ langue, children }: { langue: Langue; children: ReactNode }) {
  return <ContexteLangue value={langue}>{children}</ContexteLangue>;
}

export function useLangue(): Langue {
  return use(ContexteLangue);
}

/** Champ caché qui transmet la langue de la page aux server actions (elles ne lisent pas l'adresse). */
export function ChampLangueInterface() {
  return <input type="hidden" name="langueInterface" value={useLangue()} />;
}
