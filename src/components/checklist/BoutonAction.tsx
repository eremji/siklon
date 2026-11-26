"use client";
// Bouton qui envoie un petit formulaire à une server action de la checklist (masquer, réafficher,
// supprimer). Fonctionne sans JavaScript ; l'échec éventuel est annoncé sous le bouton.
import { useActionState } from "react";
import type { EtatAction } from "@/app/[langue]/iles/[ile]/checklist/actions";
import { ChampLangueInterface } from "@/components/langue/ContexteLangue";

export function BoutonAction({ action, champs, libelle, description }: {
  action: (etat: EtatAction, donnees: FormData) => Promise<EtatAction>;
  champs: Record<string, string>;
  libelle: string;
  /** Nom accessible complet, qui dit sur quel élément porte le bouton. */
  description: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, null);
  return (
    <form action={envoyer} className="flex flex-col items-end gap-1">
      {Object.entries(champs).map(([nom, valeur]) => (
        <input key={nom} type="hidden" name={nom} value={valeur} />
      ))}
      <ChampLangueInterface />
      <button
        type="submit"
        aria-label={description}
        disabled={enCours}
        className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-base text-accent underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
      >
        {libelle}
      </button>
      {etat?.message && (
        <p role="alert" className="text-sm text-danger-text">
          {etat.message}
        </p>
      )}
    </form>
  );
}
