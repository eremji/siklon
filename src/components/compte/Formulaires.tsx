"use client";
// Formulaires d'inscription et de connexion (US-05). L'action est une server action passée par la
// page : sans JavaScript, le formulaire est envoyé normalement ; avec, l'erreur s'affiche sur place.
import { useActionState } from "react";
import { LONGUEUR_MAX_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/options";

export interface EtatFormulaire {
  message?: string;
  email?: string;
}

type Action = (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;

const CHAMP = "min-h-12 w-full rounded-xl border border-field bg-surface px-3 text-base text-foreground";
const BOUTON = "min-h-12 rounded-full bg-accent px-6 text-base font-bold text-on-accent disabled:opacity-70";

// Identifiants fixes et propres à chaque formulaire, plutôt que useId : Next.js garde la page
// précédente cachée dans le DOM, et useId y redonnerait les mêmes identifiants.
function ChampEmail({ formulaire, defaut }: { formulaire: string; defaut?: string }) {
  const id = `${formulaire}-email`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-bold">
        Adresse email
      </label>
      {/* key : React vide le formulaire après l'envoi ; on remet l'email renvoyé par le serveur. */}
      <input key={defaut} id={id} name="email" type="email" autoComplete="email" required defaultValue={defaut} className={CHAMP} />
    </div>
  );
}

function ChampMotDePasse({ formulaire, nouveau }: { formulaire: string; nouveau: boolean }) {
  const id = `${formulaire}-mot-de-passe`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-bold">
        Mot de passe
      </label>
      <input
        id={id}
        name="motDePasse"
        type="password"
        autoComplete={nouveau ? "new-password" : "current-password"}
        required
        minLength={nouveau ? LONGUEUR_MIN_MOT_DE_PASSE : undefined}
        maxLength={LONGUEUR_MAX_MOT_DE_PASSE}
        aria-describedby={nouveau ? `${id}-aide` : undefined}
        className={CHAMP}
      />
      {nouveau && (
        <p id={`${id}-aide`} className="text-sm text-muted">
          Au moins {LONGUEUR_MIN_MOT_DE_PASSE} caractères.
        </p>
      )}
    </div>
  );
}

function Erreur({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-base font-bold text-danger-text">
      {message}
    </p>
  ) : null;
}

export function FormulaireInscription({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <Erreur message={etat.message} />
      <ChampEmail formulaire="inscription" defaut={etat.email} />
      <ChampMotDePasse formulaire="inscription" nouveau />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-bold">Langue des messages</legend>
        {[
          ["fr", "Français", "fr"],
          ["en", "English", "en"],
        ].map(([valeur, libelle, lang]) => (
          <label key={valeur} lang={lang} className="flex min-h-11 items-center gap-3 text-base">
            <input type="radio" name="langue" value={valeur} defaultChecked={valeur === "fr"} className="size-5 accent-accent" />
            {libelle}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Création en cours…" : "Créer mon compte"}
      </button>
    </form>
  );
}

export function FormulaireConnexion({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <Erreur message={etat.message} />
      <ChampEmail formulaire="connexion" defaut={etat.email} />
      <ChampMotDePasse formulaire="connexion" nouveau={false} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Connexion en cours…" : "Se connecter"}
      </button>
    </form>
  );
}
