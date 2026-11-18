// Options Better Auth de Siklon (US-05), sans dépendance à Next.js ni à l'environnement :
// le serveur (serveur.ts) et les tests les construisent avec leur propre base et leur secret.
import type { BetterAuthOptions } from "better-auth";
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
      },
    },
    advanced: {
      cookiePrefix: "siklon",
      database: { generateId: "uuid" },
      // Vercel remplace l'en-tête x-forwarded-for par l'adresse réelle du client.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
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
