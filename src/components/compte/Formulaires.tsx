"use client";
// Formulaires d'inscription et de connexion (US-05). L'action est une server action passée par la
// page : sans JavaScript, le formulaire est envoyé normalement ; avec, l'erreur s'affiche sur place.
import Link from "next/link";
import { useActionState } from "react";
import { LONGUEUR_MAX_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/options";
import { ILES } from "@/lib/iles";

export interface EtatFormulaire {
  message?: string;
  confirmation?: string;
  email?: string;
}

/** État du formulaire des îles suivies : îles enregistrées, confirmation ou erreur. */
export interface EtatIles {
  message?: string;
  confirmation?: string;
  iles?: string[];
}

type Action = (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
type ActionIles = (etat: EtatIles, donnees: FormData) => Promise<EtatIles>;

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

function ChampMotDePasse({
  formulaire,
  nouveau,
  libelle = "Mot de passe",
}: {
  formulaire: string;
  nouveau: boolean;
  libelle?: string;
}) {
  const id = `${formulaire}-mot-de-passe`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-bold">
        {libelle}
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

function Confirmation({ message }: { message?: string }) {
  return (
    <p role="status" className="text-base font-bold empty:hidden">
      {message}
    </p>
  );
}

const LIEN = "inline-flex min-h-11 items-center text-accent underline underline-offset-4";

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

export function FormulaireSuppression({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  return (
    <section aria-labelledby="suppression-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 id="suppression-titre" className="text-xl font-bold">
        Supprimer mon compte
      </h2>
      <p className="text-base">
        Le compte et toutes ses données (adresse email, langue, îles suivies, mot de passe, sessions) sont
        effacés immédiatement. La suppression est définitive.
      </p>
      <form action={envoyer} className="flex flex-col gap-3">
        <Erreur message={etat.message} />
        <div className="flex flex-col gap-1">
          <label htmlFor="suppression-mot-de-passe" className="text-base font-bold">
            Mot de passe actuel
          </label>
          <input
            id="suppression-mot-de-passe"
            name="motDePasse"
            type="password"
            autoComplete="current-password"
            required
            maxLength={LONGUEUR_MAX_MOT_DE_PASSE}
            className={CHAMP}
          />
        </div>
        <button
          type="submit"
          disabled={enCours}
          className="min-h-12 rounded-full border-2 border-danger-text px-6 text-base font-bold text-danger-text disabled:opacity-70"
        >
          {enCours ? "Suppression en cours…" : "Supprimer définitivement mon compte"}
        </button>
      </form>
    </section>
  );
}

/** Îles suivies (US-05) : cocher pour suivre, décocher pour retirer, puis enregistrer. */
export function FormulaireIles({ action, suivies }: { action: ActionIles; suivies: readonly string[] }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const cochees = etat.iles ?? suivies;
  return (
    <section aria-labelledby="iles-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 id="iles-titre" className="text-xl font-bold">
        Mes îles
      </h2>
      <p className="text-base">Cochez les îles que vous suivez, décochez celles que vous ne suivez plus.</p>
      <form action={envoyer} className="flex flex-col gap-3">
        <Erreur message={etat.message} />
        {/* key : React vide le formulaire après l'envoi ; on recoche les îles enregistrées. */}
        <fieldset key={cochees.join(" ")} className="flex flex-col">
          <legend className="mb-1 text-base font-bold">Îles suivies</legend>
          {ILES.map((ile) => (
            <label key={ile.slug} className="flex min-h-11 items-center gap-3 text-base">
              <input
                type="checkbox"
                name="ile"
                value={ile.slug}
                defaultChecked={cochees.includes(ile.slug)}
                className="size-5 accent-accent"
              />
              {ile.nom}
            </label>
          ))}
        </fieldset>
        <p role="status" className="text-base font-bold empty:hidden">
          {etat.confirmation}
        </p>
        <button type="submit" disabled={enCours} className={BOUTON}>
          {enCours ? "Enregistrement en cours…" : "Enregistrer mes îles"}
        </button>
      </form>
    </section>
  );
}

/** Page ouverte depuis le lien de confirmation : un clic confirme l'adresse (US-05). */
export function FormulaireConfirmationAdresse({ action, jeton }: { action: Action; jeton: string }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  if (etat.confirmation) {
    return (
      <div className="flex flex-col gap-4">
        <Confirmation message={etat.confirmation} />
        <Link href="/compte" className={LIEN}>
          Aller à mon compte
        </Link>
      </div>
    );
  }
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <Erreur message={etat.message} />
      <input type="hidden" name="jeton" value={jeton} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Confirmation en cours…" : "Confirmer mon adresse"}
      </button>
    </form>
  );
}

/** Page Compte, adresse non confirmée : renvoie le lien (le premier a pu expirer ou se perdre). */
export function FormulaireRenvoiConfirmation({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  return (
    <form action={envoyer} className="flex flex-col gap-3">
      <Erreur message={etat.message} />
      <Confirmation message={etat.confirmation} />
      <button
        type="submit"
        disabled={enCours}
        className="min-h-12 rounded-full border border-accent px-6 text-base font-bold text-accent disabled:opacity-70"
      >
        {enCours ? "Envoi en cours…" : "Renvoyer le lien de confirmation"}
      </button>
    </form>
  );
}

export function FormulaireMotDePasseOublie({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  if (etat.confirmation) return <Confirmation message={etat.confirmation} />;
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <Erreur message={etat.message} />
      <ChampEmail formulaire="oubli" defaut={etat.email} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Envoi en cours…" : "Recevoir un lien"}
      </button>
    </form>
  );
}

/** Page ouverte depuis le lien de réinitialisation : choix du nouveau mot de passe. */
export function FormulaireNouveauMotDePasse({ action, jeton }: { action: Action; jeton: string }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  if (etat.confirmation) {
    return (
      <div className="flex flex-col gap-4">
        <Confirmation message={etat.confirmation} />
        <Link href="/compte/connexion" className={LIEN}>
          Se connecter
        </Link>
      </div>
    );
  }
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <Erreur message={etat.message} />
      {etat.message && (
        <Link href="/compte/mot-de-passe-oublie" className={LIEN}>
          Demander un nouveau lien
        </Link>
      )}
      <input type="hidden" name="jeton" value={jeton} />
      <ChampMotDePasse formulaire="nouveau" nouveau libelle="Nouveau mot de passe" />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement en cours…" : "Changer mon mot de passe"}
      </button>
    </form>
  );
}
