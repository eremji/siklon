// Options Better Auth de Siklon (US-05), sans dépendance à Next.js ni à l'environnement :
// le serveur (serveur.ts) et les tests les construisent avec leur propre base et leur secret.
import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getOAuthState, getSessionFromCtx } from "better-auth/api";
import type { PostgresPool } from "kysely";
import { emailConfirmation, emailReinitialisation, VALIDITE_LIEN } from "../emails/messages";
import type { ServiceEmails } from "../emails/types";
import { chemin, LANGUES, type Langue } from "../langues";

export const LONGUEUR_MIN_MOT_DE_PASSE = 12;
// Au-delà, le hachage scrypt coûterait cher pour rien (et ouvrirait un déni de service).
export const LONGUEUR_MAX_MOT_DE_PASSE = 128;
export { LANGUES, type Langue };

export const DUREE_SESSION_JOURS = 7;

/**
 * Un compte sans mot de passe (Google seul) ne peut être supprimé que dans ce délai après une
 * connexion avec Google : c'est la confirmation qui remplace le mot de passe.
 */
export const DUREE_REAUTHENTIFICATION_MINUTES = 10;

/** Limites des tentatives par adresse IP, en secondes. */
export const LIMITES_TENTATIVES = {
  connexion: { window: 60, max: 5 },
  inscription: { window: 600, max: 3 },
  // Demandes d'un email (lien de confirmation, réinitialisation) : protège aussi le quota Brevo.
  emails: { window: 600, max: 3 },
} as const;

/** Pages du site où mènent les liens envoyés par email, dans la langue du compte. */
export const PAGES_LIENS = {
  confirmation: "/compte/confirmer",
  reinitialisation: "/compte/nouveau-mot-de-passe",
} as const;

export interface ParametresAuth {
  database: PostgresPool;
  secret: string;
  baseURL: string;
  emails: ServiceEmails;
  /**
   * Exécute un envoi après la réponse (sur le serveur : `after` de Next.js). Ainsi la réponse ne
   * révèle pas, par sa durée, si l'adresse a un compte. Sans elle, l'envoi est attendu (tests).
   */
  tacheDeFond?: (tache: Promise<unknown>) => void;
  /** Client OAuth de Google ; sans lui, la connexion avec Google est désactivée. */
  google?: { clientId: string; clientSecret: string };
}

const langueDe = (utilisateur: object): Langue =>
  "langue" in utilisateur && utilisateur.langue === "en" ? "en" : "fr";

// Jetons OAuth : Siklon n'appelle jamais les API de Google, il n'a aucune raison de les garder.
const SANS_JETONS = { accessToken: null, refreshToken: null, idToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null };

/**
 * Efface les jetons à usage unique (réinitialisation du mot de passe, suppression du compte) d'un
 * utilisateur supprimé : Better Auth ne les supprime pas avec le compte. Dans Better Auth 1.7.18 sans
 * plugin, leur valeur est exactement l'identifiant de l'utilisateur. On ne cherche pas l'email dans
 * l'identifiant du jeton : a@b.fr toucherait aussi les jetons de ba@b.fr.
 */
async function effacerJetons(database: PostgresPool, utilisateur: { id: string }) {
  const client = await database.connect();
  try {
    await client.query("delete from public.verifications where valeur = $1", [utilisateur.id]);
  } finally {
    client.release();
  }
}

export function optionsAuth({ database, secret, baseURL, emails, tacheDeFond, google }: ParametresAuth) {
  // Le lien mène à une page du site (et non à l'API) : la personne y confirme d'un clic. Un antivirus
  // de messagerie qui ouvre les liens ne consomme donc pas le jeton.
  const lien = (langue: Langue, page: string, jeton: string) =>
    `${baseURL}${chemin(langue, page)}?jeton=${encodeURIComponent(jeton)}`;
  return {
    appName: "Siklon",
    database,
    secret,
    baseURL,
    basePath: "/api/auth",
    telemetry: { enabled: false },
    // Erreur au retour de Google (état expiré…) : la page de connexion l'explique (?error=). Sans ce
    // réglage, Better Auth renverrait vers sa propre page d'erreur, que le site n'expose pas.
    onAPIError: { errorURL: `${baseURL}/compte/connexion` },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: LONGUEUR_MIN_MOT_DE_PASSE,
      maxPasswordLength: LONGUEUR_MAX_MOT_DE_PASSE,
      // La connexion reste possible avant la confirmation : c'est l'envoi des notifications (US-07)
      // qui exigera une adresse confirmée.
      requireEmailVerification: false,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: VALIDITE_LIEN.reinitialisation,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) =>
        emails.envoyer({ a: user.email, ...emailReinitialisation(langueDe(user), lien(langueDe(user), PAGES_LIENS.reinitialisation, token)) }),
    },
    socialProviders: google
      ? {
          google: {
            ...google,
            // Données minimales (RGPD) : ni le nom ni la photo du profil Google.
            mapProfileToUser: () => ({ name: "", image: undefined }),
          },
        }
      : {},
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: VALIDITE_LIEN.confirmation,
      sendVerificationEmail: async ({ user, token }) =>
        emails.envoyer({ a: user.email, ...emailConfirmation(langueDe(user), lien(langueDe(user), PAGES_LIENS.confirmation, token)) }),
    },
    user: {
      modelName: "utilisateurs",
      fields: { name: "nom", emailVerified: "email_verifie", createdAt: "cree_le", updatedAt: "modifie_le" },
      additionalFields: {
        langue: { type: [...LANGUES], required: true, defaultValue: "fr", input: true },
      },
      // Suppression immédiate et complète (RGPD), sur confirmation du mot de passe (hooks ci-dessous).
      deleteUser: {
        enabled: true,
        afterDelete: async (utilisateur) => {
          await effacerJetons(database, utilisateur);
          // Le compte est déjà effacé chez Siklon : un échec chez Brevo est journalisé, sans l'adresse.
          await emails.effacer(utilisateur.email).catch((erreur: unknown) => {
            console.error("Effacement chez le service d'envoi échoué :", erreur instanceof Error ? erreur.message : erreur);
          });
        },
      },
    },
    session: {
      expiresIn: DUREE_SESSION_JOURS * 24 * 60 * 60,
      modelName: "sessions",
      fields: {
        userId: "utilisateur_id",
        token: "jeton",
        expiresAt: "expire_le",
        ipAddress: "adresse_ip",
        userAgent: "agent_utilisateur",
        createdAt: "cree_le",
        updatedAt: "modifie_le",
      },
    },
    account: {
      modelName: "comptes_lies",
      // Ne recopie pas les jetons de Google à chaque connexion (voir SANS_JETONS).
      updateAccountOnSignIn: false,
      fields: {
        userId: "utilisateur_id",
        providerId: "fournisseur",
        accountId: "compte_fournisseur",
        accessToken: "jeton_acces",
        refreshToken: "jeton_rafraichissement",
        idToken: "jeton_identite",
        accessTokenExpiresAt: "jeton_acces_expire_le",
        refreshTokenExpiresAt: "jeton_rafraichissement_expire_le",
        scope: "portee",
        password: "mot_de_passe_hache",
        createdAt: "cree_le",
        updatedAt: "modifie_le",
      },
    },
    verification: {
      modelName: "verifications",
      fields: { identifier: "identifiant", value: "valeur", expiresAt: "expire_le", createdAt: "cree_le", updatedAt: "modifie_le" },
    },
    rateLimit: {
      enabled: true,
      // En mémoire, chaque instance Vercel aurait ses propres compteurs : on les garde en base.
      storage: "database",
      modelName: "limites_tentatives",
      fields: { key: "cle", count: "nombre", lastRequest: "derniere_requete" },
      customRules: {
        "/sign-in/*": LIMITES_TENTATIVES.connexion,
        "/sign-up/*": LIMITES_TENTATIVES.inscription,
        // La suppression vérifie le mot de passe : mêmes limites que la connexion.
        "/delete-user": LIMITES_TENTATIVES.connexion,
        "/reset-password": LIMITES_TENTATIVES.connexion,
        "/request-password-reset": LIMITES_TENTATIVES.emails,
        "/send-verification-email": LIMITES_TENTATIVES.emails,
      },
    },
    advanced: {
      cookiePrefix: "siklon",
      database: { generateId: "uuid" },
      // Vercel remplace l'en-tête x-forwarded-for par l'adresse réelle du client.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
      ...(tacheDeFond ? { backgroundTasks: { handler: tacheDeFond } } : {}),
    },
    hooks: {
      // Better Auth accepte une suppression sans mot de passe si la session a moins d'un jour : Siklon
      // exige toujours le mot de passe, pour qu'un téléphone laissé déverrouillé ne suffise pas.
      // Un compte Google sans mot de passe confirme en se reconnectant avec Google juste avant.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/delete-user" || ctx.body?.password) return;
        const session = await getSessionFromCtx(ctx);
        if (!session) return; // Better Auth répond 401.
        const motDePasse = await ctx.context.internalAdapter.findCredentialAccount(session.user.id);
        if (motDePasse?.password) {
          throw new APIError("BAD_REQUEST", { message: "Password required", code: "PASSWORD_REQUIRED" });
        }
        const age = Date.now() - new Date(session.session.createdAt).getTime();
        if (age > DUREE_REAUTHENTIFICATION_MINUTES * 60 * 1000) {
          throw new APIError("BAD_REQUEST", { message: "Recent sign-in required", code: "RECENT_SIGN_IN_REQUIRED" });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          // Inscription avec Google : la langue choisie sur le site voyage dans l'état OAuth.
          before: async (utilisateur) => {
            const etat = await getOAuthState();
            if (!etat) return { data: utilisateur };
            return { data: { ...utilisateur, langue: etat.langue === "en" ? "en" : "fr" } };
          },
        },
      },
      account: {
        create: { before: async (compte) => ({ data: { ...compte, ...SANS_JETONS } }) },
      },
      session: {
        create: {
          // Données minimales (RGPD) : l'IP ne sert qu'à limiter les tentatives, jamais conservée.
          before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }),
        },
      },
    },
  } satisfies BetterAuthOptions;
}
