"use client";
// Bouton « Partager » (US-21) : partage du téléphone (Web Share API) avec le message et le lien ;
// sans partage natif, ou s'il échoue, copie du lien et confirmation à l'écran.
// Le lien n'a pas de langue : le proxy envoie le destinataire vers la sienne (US-10).
import { useEffect, useState } from "react";
import { useLangue } from "@/components/langue/ContexteLangue";
import type { ContenuPartage } from "@/lib/partage/texte";
import { PARTAGE } from "@/lib/textes/partage";

const DUREE_CONFIRMATION_MS = 6000;

type Retour = { etat: "aucun" } | { etat: "copie" } | { etat: "copieImpossible"; lien: string };

const estAnnulation = (erreur: unknown) => erreur instanceof DOMException && erreur.name === "AbortError";

export function BoutonPartager({ chemin, contenu }: { chemin: string; contenu: () => ContenuPartage }) {
  const textes = PARTAGE[useLangue()];
  const [retour, setRetour] = useState<Retour>({ etat: "aucun" });

  useEffect(() => {
    if (retour.etat !== "copie") return;
    const minuterie = setTimeout(() => setRetour({ etat: "aucun" }), DUREE_CONFIRMATION_MS);
    return () => clearTimeout(minuterie);
  }, [retour]);

  async function partager() {
    const lien = new URL(chemin, window.location.origin).href;
    const { titre, texte } = contenu();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titre, text: texte, url: lien });
        return;
      } catch (erreur) {
        if (estAnnulation(erreur)) return;
      }
    }
    try {
      await navigator.clipboard.writeText(lien);
      setRetour({ etat: "copie" });
    } catch {
      setRetour({ etat: "copieImpossible", lien });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={partager}
        className="flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-accent px-6 text-lg font-bold text-on-accent"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[22px] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12M7 8l5-5 5 5" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
        {textes.bouton}
      </button>
      {/* Zone annoncée par les lecteurs d'écran : présente dès l'affichage, remplie après le clic. */}
      <div
        role="status"
        className="fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-20 mx-auto max-w-md"
      >
        {retour.etat === "copie" && (
          <p className="flex items-center gap-2.5 rounded-2xl bg-foreground px-4 py-3.5 text-base text-background shadow-lg">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 5 5 9-10" />
            </svg>
            {textes.copie}
          </p>
        )}
        {retour.etat === "copieImpossible" && (
          <p className="rounded-2xl bg-foreground px-4 py-3.5 text-base break-all text-background shadow-lg">
            {textes.copieImpossible} <span className="font-bold select-all">{retour.lien}</span>
          </p>
        )}
      </div>
    </>
  );
}
