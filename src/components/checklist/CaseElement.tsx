"use client";
// Case à cocher d'un élément de la checklist (US-08) : la case change tout de suite, puis l'état
// est enregistré ; en cas d'échec, elle revient en arrière et le message est annoncé.
import { useState, useTransition } from "react";
import type { ResultatCoche } from "@/app/iles/[ile]/checklist/actions";

const ECHEC_RESEAU = "Enregistrement impossible. Vérifiez votre connexion et réessayez.";

export function CaseElement({ id, texte, cocheInitiale, cocher }: {
  id: string;
  texte: string;
  cocheInitiale: boolean;
  cocher: (element: string, coche: boolean) => Promise<ResultatCoche>;
}) {
  const [coche, setCoche] = useState(cocheInitiale);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, demarrer] = useTransition();

  function basculer(nouvelle: boolean) {
    setCoche(nouvelle);
    setErreur(null);
    demarrer(async () => {
      const resultat = await cocher(id, nouvelle).catch((): ResultatCoche => ({ ok: false, message: ECHEC_RESEAU }));
      if (!resultat.ok) {
        setCoche(!nouvelle);
        setErreur(resultat.message);
      }
    });
  }

  return (
    <>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={coche}
          onChange={(evenement) => basculer(evenement.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-accent"
        />
        <span className={`text-base ${coche ? "text-muted line-through" : ""}`}>{texte}</span>
      </label>
      {erreur && (
        <p role="alert" className="text-sm text-danger-text">
          {erreur}
        </p>
      )}
    </>
  );
}
