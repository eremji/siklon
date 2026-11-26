// Contenu de la page Compte selon la session (US-05) : invitation à se connecter, ou résumé du compte.
import { ChampLangueInterface } from "@/components/langue/ContexteLangue";
import { Lien } from "@/components/langue/Lien";
import { AbonnementAppareil, type ResultatAbonnement } from "@/components/compte/AbonnementAppareil";
import {
  type ActionGoogle,
  type EtatAlertesEmail,
  type EtatFormulaire,
  type EtatIles,
  FormulaireAlertesEmail,
  FormulaireIles,
  FormulaireRenvoiConfirmation,
  FormulaireSuppression,
} from "@/components/compte/Formulaires";
import type { Langue } from "@/lib/auth/options";
import type { UtilisateurCourant } from "@/lib/auth/serveur";
import { COMPTE } from "@/lib/textes/compte";

const NOMS_LANGUES: Record<Langue, { libelle: string; lang: string }> = {
  fr: { libelle: "Français", lang: "fr" },
  en: { libelle: "English", lang: "en" },
};

const LIEN_PRINCIPAL = "flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-bold text-on-accent";
const LIEN_SECONDAIRE =
  "flex min-h-12 items-center justify-center rounded-full border border-accent px-6 text-base font-bold text-accent";

export function EtatCompte({
  utilisateur,
  ilesSuivies = [],
  accordEmail = false,
  deconnecter,
  supprimer,
  enregistrerIles,
  renvoyerConfirmation,
  abonnerAppareil,
  desabonnerAppareil,
  enregistrerAlertesEmail,
  clePubliqueVapid,
  google,
  langue: langueDeLaPage,
}: {
  utilisateur: UtilisateurCourant | null;
  ilesSuivies?: readonly string[];
  /** Accord enregistré pour les alertes par e-mail (non par défaut). */
  accordEmail?: boolean;
  deconnecter: (donnees: FormData) => Promise<void>;
  supprimer: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  enregistrerIles: (etat: EtatIles, donnees: FormData) => Promise<EtatIles>;
  renvoyerConfirmation: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  abonnerAppareil: (abonnement: unknown, langue: Langue) => Promise<ResultatAbonnement>;
  desabonnerAppareil: (endpoint: unknown, langue: Langue) => Promise<ResultatAbonnement>;
  enregistrerAlertesEmail: (etat: EtatAlertesEmail, donnees: FormData) => Promise<EtatAlertesEmail>;
  /** Clé publique VAPID du web push ; `null` s'il n'est pas configuré. */
  clePubliqueVapid: string | null;
  /** Départ vers Google, si la connexion avec Google est configurée. */
  google?: ActionGoogle;
  /** Langue de la page (US-10) ; celle du compte, `utilisateur.langue`, sert aux messages envoyés. */
  langue: Langue;
}) {
  const textes = COMPTE[langueDeLaPage].etat;
  if (!utilisateur) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base">{textes.sansCompte}</p>
        <Lien href="/compte/connexion" className={LIEN_PRINCIPAL}>
          {textes.seConnecter}
        </Lien>
        <Lien href="/compte/inscription" className={LIEN_SECONDAIRE}>
          {textes.creer}
        </Lien>
      </div>
    );
  }

  const langue = NOMS_LANGUES[utilisateur.langue];
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3 rounded-2xl bg-surface p-4 text-base">
        <div>
          <dt className="text-sm text-muted">{textes.email}</dt>
          <dd className="font-bold break-all">{utilisateur.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{textes.adresse}</dt>
          <dd className="font-bold">{utilisateur.emailVerifie ? textes.confirmee : textes.nonConfirmee}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{textes.langueMessages}</dt>
          <dd lang={langue.lang} className="font-bold">
            {langue.libelle}
          </dd>
          <dd className="text-sm text-muted">{textes.langueSuit}</dd>
        </div>
      </dl>
      {!utilisateur.emailVerifie && (
        <section aria-labelledby="confirmation-titre" className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
          <h2 id="confirmation-titre" className="text-xl font-bold">
            {textes.confirmerTitre}
          </h2>
          <p className="text-base">{textes.confirmerTexte}</p>
          <FormulaireRenvoiConfirmation action={renvoyerConfirmation} />
        </section>
      )}
      <FormulaireIles action={enregistrerIles} suivies={ilesSuivies} />
      {/* Les alertes ne partent que vers un compte dont l'adresse est confirmée. */}
      {utilisateur.emailVerifie && (
        <>
          <AbonnementAppareil clePublique={clePubliqueVapid} abonner={abonnerAppareil} desabonner={desabonnerAppareil} />
          <FormulaireAlertesEmail action={enregistrerAlertesEmail} accord={accordEmail} email={utilisateur.email} />
        </>
      )}
      <form action={deconnecter}>
        <ChampLangueInterface />
        <button type="submit" className={`${LIEN_SECONDAIRE} w-full`}>
          {textes.deconnexion}
        </button>
      </form>
      <FormulaireSuppression action={supprimer} motDePasse={utilisateur.motDePasse} google={google} />
    </div>
  );
}
