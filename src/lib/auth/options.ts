// Options Better Auth de Siklon (US-05), sans dépendance à Next.js ni à l'environnement :
// le serveur (serveur.ts) et les tests les construisent avec leur propre base et leur secret.
import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { PostgresPool } from "kysely";

export const LONGUEUR_MIN_MOT_DE_PASSE = 12;
// Au-delà, le hachage scrypt coûterait cher pour rien (et ouvrirait un déni de service).
export const LONGUEUR_MAX_MOT_DE_PASSE = 128;
export const LANGUES = ["fr", "en"] as const;
export type Langue = (typeof LANGUES)[number];

export const DUREE_SESSION_JOURS = 7;

/** Limites des tentatives par adresse IP, en secondes. */
export const LIMITES_TENTATIVES = {
  connexion: { window: 60, max: 5 },
  inscription: { window: 600, max: 3 },
} as const;

export interface ParametresAuth {
  database: PostgresPool;
  secret: string;
  baseURL: string;
}

/**
 * Efface les jetons à usage unique (confirmation, réinitialisation) liés à un utilisateur supprimé :
 * Better Auth ne les supprime pas avec le compte. Leur valeur porte l'identifiant de l'utilisateur,
 * ou leur identifiant porte son email.
 */
async function effacerJetons(database: PostgresPool, utilisateur: { id: string; email: string }) {
  const client = await database.connect();
  try {
    await client.query(
      "delete from public.verifications where strpos(valeur, $1) > 0 or strpos(identifiant, $2) > 0",
      [utilisateur.id, utilisateur.email],
    );
  } finally {
    client.release();
  }
}

export function optionsAuth({ database, secret, baseURL }: ParametresAuth) {
  return {
    appName: "Siklon",
    database,
    secret,
    baseURL,
    basePath: "/api/auth",
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: LONGUEUR_MIN_MOT_DE_PASSE,
      maxPasswordLength: LONGUEUR_MAX_MOT_DE_PASSE,
      // La confirmation de l'adresse arrive avec l'envoi d'emails (PR suivante) ; d'ici là, aucune
      // notification n'existe, et `emailVerified` reste faux.
      requireEmailVerification: false,
      autoSignIn: true,
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
        afterDelete: async (utilisateur) => effacerJetons(database, utilisateur),
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
      },
    },
    advanced: {
      cookiePrefix: "siklon",
      database: { generateId: "uuid" },
      // Vercel remplace l'en-tête x-forwarded-for par l'adresse réelle du client.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    hooks: {
      // Better Auth accepte une suppression sans mot de passe si la session a moins d'un jour : Siklon
      // exige toujours le mot de passe, pour qu'un téléphone laissé déverrouillé ne suffise pas.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/delete-user" && !ctx.body?.password) {
          throw new APIError("BAD_REQUEST", { message: "Password required", code: "PASSWORD_REQUIRED" });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          // Données minimales (RGPD) : l'IP ne sert qu'à limiter les tentatives, jamais conservée.
          before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }),
        },
      },
    },
  } satisfies BetterAuthOptions;
}
