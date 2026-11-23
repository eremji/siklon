"use client";
// Formulaire d'ajout d'un élément personnel à la checklist (US-08). Sans JavaScript, il est envoyé
// comme un formulaire classique ; en cas de refus, la saisie est gardée et le message annoncé.
import { useActionState } from "react";
import type { EtatAction } from "@/app/[langue]/iles/[ile]/checklist/actions";

// Identifiants fixes : le champ n'existe que sur la page de la checklist (pas de useId, CLAUDE.md).
const CHAMP = "ajout-element-checklist";
const ERREUR = "ajout-element-checklist-erreur";

export function FormulaireAjout({ action, longueurMax }: {
  action: (etat: EtatAction, donnees: FormData) => Promise<EtatAction>;
  longueurMax: number;
}) {
  const [etat, envoyer, enCours] = useActionState(action, null);
  return (
    <form action={envoyer} className="flex flex-col gap-2">
      <label htmlFor={CHAMP} className="text-base font-bold">
        Ajouter un élément
      </label>
      <div className="flex gap-2">
        <input
          id={CHAMP}
          name="texte"
          type="text"
          required
          maxLength={longueurMax}
          defaultValue={etat?.texte ?? ""}
          aria-invalid={etat?.message ? true : undefined}
          aria-describedby={etat?.message ? ERREUR : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-field bg-surface px-3 text-base text-foreground"
        />
        <button
          type="submit"
          disabled={enCours}
          className="min-h-12 shrink-0 cursor-pointer rounded-full bg-accent px-5 text-base font-bold text-on-accent disabled:cursor-wait disabled:opacity-60"
        >
          Ajouter
        </button>
      </div>
      {etat?.message && (
        <p id={ERREUR} role="alert" className="text-sm text-danger-text">
          {etat.message}
        </p>
      )}
    </form>
  );
}
