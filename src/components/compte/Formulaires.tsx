"use client";
// Formulaires d'inscription et de connexion (US-05). L'action est une server action passée par la
// page : sans JavaScript, le formulaire est envoyé normalement ; avec, l'erreur s'affiche sur place.
import { ChampLangueInterface, useLangue } from "@/components/langue/ContexteLangue";
import { Lien } from "@/components/langue/Lien";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { messageErreurGoogle } from "@/lib/auth/messagesGoogle";
import { DUREE_REAUTHENTIFICATION_MINUTES, LONGUEUR_MAX_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/options";
import { ILES, nomIle } from "@/lib/iles";
import { COMPTE } from "@/lib/textes/compte";

/** Textes des formulaires dans la langue de la page. */
const useTextes = () => COMPTE[useLangue()].formulaires;

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

/** État du formulaire des alertes par e-mail : accord enregistré, confirmation ou erreur. */
export interface EtatAlertesEmail {
  message?: string;
  confirmation?: string;
  accord?: boolean;
}

type Action = (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
type ActionIles = (etat: EtatIles, donnees: FormData) => Promise<EtatIles>;
type ActionAlertesEmail = (etat: EtatAlertesEmail, donnees: FormData) => Promise<EtatAlertesEmail>;
/** Départ vers Google (server action) : redirige, ne renvoie rien. */
export type ActionGoogle = (donnees: FormData) => Promise<void>;

const CHAMP = "min-h-12 w-full rounded-xl border border-field bg-surface px-3 text-base text-foreground";
const BOUTON = "min-h-12 rounded-full bg-accent px-6 text-base font-bold text-on-accent disabled:opacity-70";

// Identifiants fixes et propres à chaque formulaire, plutôt que useId : Next.js garde la page
// précédente cachée dans le DOM, et useId y redonnerait les mêmes identifiants.
function ChampEmail({ formulaire, defaut }: { formulaire: string; defaut?: string }) {
  const id = `${formulaire}-email`;
  const textes = useTextes();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-bold">
        {textes.email}
      </label>
      {/* key : React vide le formulaire après l'envoi ; on remet l'email renvoyé par le serveur. */}
      <input key={defaut} id={id} name="email" type="email" autoComplete="email" required defaultValue={defaut} className={CHAMP} />
    </div>
  );
}

function ChampMotDePasse({
  formulaire,
  nouveau,
  libelle,
}: {
  formulaire: string;
  nouveau: boolean;
  libelle?: string;
}) {
  const id = `${formulaire}-mot-de-passe`;
  const textes = useTextes();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-bold">
        {libelle ?? textes.motDePasse}
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
          {textes.longueurMin(LONGUEUR_MIN_MOT_DE_PASSE)}
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
const BOUTON_GOOGLE =
  "flex min-h-12 items-center justify-center gap-3 rounded-full border border-field bg-surface px-6 text-base font-bold text-foreground";

// Logo « G » de Google, dans ses couleurs d'origine : ses règles d'usage interdisent de le modifier.
function LogoGoogle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Separateur() {
  const textes = useTextes();
  return (
    <p className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-field" />
      {textes.ou}
      <span className="h-px flex-1 bg-field" />
    </p>
  );
}

/** Erreur reçue dans l'adresse au retour de Google (?error=…), à afficher sous Suspense. */
export function AlerteGoogle() {
  const code = useSearchParams().get("error");
  const langue = useLangue();
  return code ? <Erreur message={messageErreurGoogle(code, langue)} /> : null;
}

/** Bouton « Continuer avec Google » ; `origine` : page où revenir si la connexion échoue. */
export function FormulaireGoogle({
  action,
  origine,
  libelle,
}: {
  action: ActionGoogle;
  origine: string;
  libelle?: string;
}) {
  const textes = useTextes();
  return (
    <form action={action}>
      <input type="hidden" name="origine" value={origine} />
      <ChampLangueInterface />
      <button type="submit" className={`${BOUTON_GOOGLE} w-full`}>
        <LogoGoogle />
        {libelle ?? textes.google}
      </button>
    </form>
  );
}

export function FormulaireInscription({ action, google }: { action: Action; google?: ActionGoogle }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  // Langue des messages cochée sur celle de la page (US-10).
  const langue = useLangue();
  const textes = COMPTE[langue].formulaires;
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <ChampLangueInterface />
      <Erreur message={etat.message} />
      <ChampEmail formulaire="inscription" defaut={etat.email} />
      <ChampMotDePasse formulaire="inscription" nouveau />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-bold">{textes.inscription.langue}</legend>
        {[
          ["fr", "Français", "fr"],
          ["en", "English", "en"],
        ].map(([valeur, libelle, lang]) => (
          <label key={valeur} lang={lang} className="flex min-h-11 items-center gap-3 text-base">
            <input type="radio" name="langue" value={valeur} defaultChecked={valeur === langue} className="size-5 accent-accent" />
            {libelle}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? textes.inscription.enCours : textes.inscription.creer}
      </button>
      {google && (
        <>
          <Separateur />
          {/* Même formulaire, pour emporter la langue cochée ; formNoValidate : ni email ni mot de passe. */}
          <input type="hidden" name="origine" value="/compte/inscription" />
          <button type="submit" formAction={google} formNoValidate className={BOUTON_GOOGLE}>
            <LogoGoogle />
            {textes.inscription.google}
          </button>
        </>
      )}
    </form>
  );
}

export function FormulaireConnexion({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const textes = useTextes();
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <ChampLangueInterface />
      <Erreur message={etat.message} />
      <ChampEmail formulaire="connexion" defaut={etat.email} />
      <ChampMotDePasse formulaire="connexion" nouveau={false} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? textes.connexion.enCours : textes.connexion.bouton}
      </button>
    </form>
  );
}

export function FormulaireSuppression({
  action,
  motDePasse = true,
  google,
}: {
  action: Action;
  /** Faux pour un compte Google seul : la confirmation passe par une connexion récente avec Google. */
  motDePasse?: boolean;
  google?: ActionGoogle;
}) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const champs = useTextes();
  const textes = champs.suppression;
  return (
    <section aria-labelledby="suppression-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 id="suppression-titre" className="text-xl font-bold">
        {textes.titre}
      </h2>
      <p className="text-base">{textes.texte}</p>
      {!motDePasse && (
        <>
          <p className="text-base">{textes.sansMotDePasse(DUREE_REAUTHENTIFICATION_MINUTES)}</p>
          {google && <FormulaireGoogle action={google} origine="/compte" libelle={textes.reconnexion} />}
        </>
      )}
      <form action={envoyer} className="flex flex-col gap-3">
        <ChampLangueInterface />
        <Erreur message={etat.message} />
        {motDePasse && (
          <div className="flex flex-col gap-1">
            <label htmlFor="suppression-mot-de-passe" className="text-base font-bold">
              {champs.motDePasseActuel}
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
        )}
        <button
          type="submit"
          disabled={enCours}
          className="min-h-12 rounded-full border-2 border-danger-text px-6 text-base font-bold text-danger-text disabled:opacity-70"
        >
          {enCours ? textes.enCours : textes.bouton}
        </button>
      </form>
    </section>
  );
}

/** Îles suivies (US-05) : cocher pour suivre, décocher pour retirer, puis enregistrer. */
export function FormulaireIles({ action, suivies }: { action: ActionIles; suivies: readonly string[] }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const cochees = etat.iles ?? suivies;
  const langue = useLangue();
  const textes = COMPTE[langue].formulaires;
  return (
    <section aria-labelledby="iles-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 id="iles-titre" className="text-xl font-bold">
        {textes.iles.titre}
      </h2>
      <p className="text-base">{textes.iles.texte}</p>
      <form action={envoyer} className="flex flex-col gap-3">
        <ChampLangueInterface />
        <Erreur message={etat.message} />
        {/* key : React vide le formulaire après l'envoi ; on recoche les îles enregistrées. */}
        <fieldset key={cochees.join(" ")} className="flex flex-col">
          <legend className="mb-1 text-base font-bold">{textes.iles.liste}</legend>
          {ILES.map((ile) => (
            <label key={ile.slug} className="flex min-h-11 items-center gap-3 text-base">
              <input
                type="checkbox"
                name="ile"
                value={ile.slug}
                defaultChecked={cochees.includes(ile.slug)}
                className="size-5 accent-accent"
              />
              {nomIle(ile, langue)}
            </label>
          ))}
        </fieldset>
        <p role="status" className="text-base font-bold empty:hidden">
          {etat.confirmation}
        </p>
        <button type="submit" disabled={enCours} className={BOUTON}>
          {enCours ? textes.enregistrement : textes.iles.bouton}
        </button>
      </form>
    </section>
  );
}

/** Alertes par e-mail (US-07) : jamais sans l'accord de l'utilisateur, case décochée par défaut (US-13). */
export function FormulaireAlertesEmail({
  action,
  accord,
  email,
}: {
  action: ActionAlertesEmail;
  accord: boolean;
  email: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const coche = etat.accord ?? accord;
  const textes = useTextes();
  return (
    <section aria-labelledby="alertes-email-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 id="alertes-email-titre" className="text-xl font-bold">
        {textes.alertesEmail.titre}
      </h2>
      <p className="text-base">
        {textes.alertesEmail.avant} <span className="font-bold break-all">{email}</span>. {textes.alertesEmail.apres}
      </p>
      <form action={envoyer} className="flex flex-col gap-3">
        <ChampLangueInterface />
        <Erreur message={etat.message} />
        {/* key : React vide le formulaire après l'envoi ; on remet la case dans l'état enregistré. */}
        <label key={String(coche)} className="flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" name="email" value="oui" defaultChecked={coche} className="size-5 accent-accent" />
          {textes.alertesEmail.case}
        </label>
        <p role="status" className="text-base font-bold empty:hidden">
          {etat.confirmation}
        </p>
        <button type="submit" disabled={enCours} className={BOUTON}>
          {enCours ? textes.enregistrement : textes.alertesEmail.bouton}
        </button>
      </form>
    </section>
  );
}

/** Page ouverte depuis le lien de confirmation : un clic confirme l'adresse (US-05). */
export function FormulaireConfirmationAdresse({ action, jeton }: { action: Action; jeton: string }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const textes = useTextes();
  if (etat.confirmation) {
    return (
      <div className="flex flex-col gap-4">
        <Confirmation message={etat.confirmation} />
        <Lien href="/compte" className={LIEN}>
          {textes.confirmation.compte}
        </Lien>
      </div>
    );
  }
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <ChampLangueInterface />
      <Erreur message={etat.message} />
      <input type="hidden" name="jeton" value={jeton} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? textes.confirmation.enCours : textes.confirmation.bouton}
      </button>
    </form>
  );
}

/** Page Compte, adresse non confirmée : renvoie le lien (le premier a pu expirer ou se perdre). */
export function FormulaireRenvoiConfirmation({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const textes = useTextes();
  return (
    <form action={envoyer} className="flex flex-col gap-3">
      <ChampLangueInterface />
      <Erreur message={etat.message} />
      <Confirmation message={etat.confirmation} />
      <button
        type="submit"
        disabled={enCours}
        className="min-h-12 rounded-full border border-accent px-6 text-base font-bold text-accent disabled:opacity-70"
      >
        {enCours ? textes.envoi : textes.renvoi}
      </button>
    </form>
  );
}

export function FormulaireMotDePasseOublie({ action }: { action: Action }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const textes = useTextes();
  if (etat.confirmation) return <Confirmation message={etat.confirmation} />;
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <ChampLangueInterface />
      <Erreur message={etat.message} />
      <ChampEmail formulaire="oubli" defaut={etat.email} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? textes.envoi : textes.oubli}
      </button>
    </form>
  );
}

/** Page ouverte depuis le lien de réinitialisation : choix du nouveau mot de passe. */
export function FormulaireNouveauMotDePasse({ action, jeton }: { action: Action; jeton: string }) {
  const [etat, envoyer, enCours] = useActionState(action, {});
  const textes = useTextes();
  if (etat.confirmation) {
    return (
      <div className="flex flex-col gap-4">
        <Confirmation message={etat.confirmation} />
        <Lien href="/compte/connexion" className={LIEN}>
          {textes.nouveau.seConnecter}
        </Lien>
      </div>
    );
  }
  return (
    <form action={envoyer} className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
      <ChampLangueInterface />
      <Erreur message={etat.message} />
      {etat.message && (
        <Lien href="/compte/mot-de-passe-oublie" className={LIEN}>
          {textes.nouveau.nouveauLien}
        </Lien>
      )}
      <input type="hidden" name="jeton" value={jeton} />
      <ChampMotDePasse formulaire="nouveau" nouveau libelle={textes.nouveauMotDePasse} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? textes.enregistrement : textes.nouveau.bouton}
      </button>
    </form>
  );
}
