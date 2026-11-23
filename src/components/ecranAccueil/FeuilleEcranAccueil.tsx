"use client";
// Feuille qui monte du bas de l'écran pour proposer d'ajouter Siklon à l'écran d'accueil d'un iPhone
// ou d'un iPad (US-07c, #110, maquette B). Boîte de dialogue modale du navigateur (<dialog>) : le reste
// de la page devient inerte et Échap la ferme ; le focus va sur le titre et y reste jusqu'à la fermeture.
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Lien } from "@/components/langue/Lien";
import type { Appareil } from "@/lib/ecranAccueil/detection";
import { IconeEcranAccueil, IconePartager } from "./icones";

/** Glissement vers le bas, en pixels, au-delà duquel la feuille se ferme. */
const SEUIL_GLISSEMENT = 80;

const BOUTON_PRINCIPAL =
  "flex min-h-12 flex-1 items-center justify-center rounded-full bg-accent px-5 text-base font-bold text-on-accent";
const BOUTON_SECONDAIRE =
  "flex min-h-12 flex-1 items-center justify-center rounded-full border-2 border-accent px-5 text-base font-bold text-accent";

export const TEXTES_FEUILLE = {
  titre: (appareil: Appareil) => `Recevez les alertes de votre île sur votre ${appareil === "ipad" ? "iPad" : "iPhone"}`,
  pourquoi: "Ajoutez Siklon à l'écran d'accueil pour recevoir les alertes de votre île, même quand l'app est fermée.",
  partager: "Touchez Partager",
  ecranAccueil: "Puis « Sur l'écran d'accueil »",
  aide: "Voir en images",
  plusTard: "Plus tard",
  fermer: "Fermer",
};

function Geste({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-base">
      <span
        aria-hidden="true"
        className="flex size-7 flex-none items-center justify-center rounded-full bg-soft font-bold text-accent"
      >
        {numero}
      </span>
      {children}
    </li>
  );
}

export function FeuilleEcranAccueil({
  appareil,
  onFermer,
}: {
  appareil: Appareil;
  onFermer: (fermeture: { refus: boolean }) => void;
}) {
  const feuille = useRef<HTMLDialogElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);
  const depart = useRef<number | null>(null);
  const [decalage, setDecalage] = useState(0);

  useEffect(() => {
    const precedent = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialogue = feuille.current;
    dialogue?.showModal();
    titre.current?.focus();
    return () => {
      if (dialogue?.open) dialogue.close();
      precedent?.focus();
    };
  }, []);

  // Le <dialog> modal rend la page inerte ; Tab boucle en plus dans la feuille, sans passer par le navigateur.
  function garderLeFocus(evenement: KeyboardEvent<HTMLDialogElement>) {
    if (evenement.key !== "Tab" || !feuille.current) return;
    const cibles = [...feuille.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
    if (cibles.length === 0) return;
    const [premiere, derniere] = [cibles[0], cibles[cibles.length - 1]];
    const actif = document.activeElement;
    if (evenement.shiftKey && (actif === premiere || actif === titre.current)) {
      evenement.preventDefault();
      derniere.focus();
    } else if (!evenement.shiftKey && actif === derniere) {
      evenement.preventDefault();
      premiere.focus();
    }
  }

  function commencerGlissement(evenement: PointerEvent<HTMLDivElement>) {
    depart.current = evenement.clientY;
    evenement.currentTarget.setPointerCapture?.(evenement.pointerId);
  }

  function suivreGlissement(evenement: PointerEvent<HTMLDivElement>) {
    if (depart.current === null) return;
    setDecalage(Math.max(0, evenement.clientY - depart.current));
  }

  function finirGlissement(evenement: PointerEvent<HTMLDivElement>) {
    if (depart.current === null) return;
    const parcours = evenement.clientY - depart.current;
    depart.current = null;
    setDecalage(0);
    if (parcours > SEUIL_GLISSEMENT) onFermer({ refus: true });
  }

  const libelle = TEXTES_FEUILLE.titre(appareil);
  return (
    <dialog
      ref={feuille}
      aria-label={libelle}
      onCancel={(evenement) => {
        evenement.preventDefault();
        onFermer({ refus: true });
      }}
      onKeyDown={garderLeFocus}
      style={decalage > 0 ? { transform: `translateY(${decalage}px)` } : undefined}
      className="mx-auto mt-auto mb-0 w-full max-w-lg flex-col gap-4 rounded-t-3xl bg-surface px-4 pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground backdrop:bg-background/80 open:flex motion-safe:animate-monter"
    >
      <div
        data-testid="poignee-feuille"
        aria-hidden="true"
        onPointerDown={commencerGlissement}
        onPointerMove={suivreGlissement}
        onPointerUp={finirGlissement}
        onPointerCancel={() => {
          depart.current = null;
          setDecalage(0);
        }}
        className="flex h-6 cursor-grab touch-none items-center justify-center"
      >
        <div className="h-1.5 w-10 rounded-full bg-field" />
      </div>
      <div className="flex items-start justify-between">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-soft text-accent">
          <IconeEcranAccueil taille={32} />
        </span>
        <button
          type="button"
          aria-label={TEXTES_FEUILLE.fermer}
          onClick={() => onFermer({ refus: true })}
          className="flex size-11 items-center justify-center rounded-full bg-soft text-foreground"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <h2 ref={titre} tabIndex={-1} className="text-2xl leading-tight font-bold outline-none">
        {libelle}
      </h2>
      <p className="text-base text-muted">{TEXTES_FEUILLE.pourquoi}</p>
      <ol className="flex flex-col gap-2">
        <Geste numero={1}>
          {TEXTES_FEUILLE.partager} <IconePartager className="text-accent" />
        </Geste>
        <Geste numero={2}>
          {TEXTES_FEUILLE.ecranAccueil} <IconeEcranAccueil className="text-accent" />
        </Geste>
      </ol>
      <div className="flex gap-2">
        <Lien href="/compte/ecran-accueil" onClick={() => onFermer({ refus: false })} className={BOUTON_PRINCIPAL}>
          {TEXTES_FEUILLE.aide}
        </Lien>
        <button type="button" onClick={() => onFermer({ refus: true })} className={BOUTON_SECONDAIRE}>
          {TEXTES_FEUILLE.plusTard}
        </button>
      </div>
    </dialog>
  );
}
