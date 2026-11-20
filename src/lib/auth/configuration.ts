// Configuration de l'authentification lue dans l'environnement (.env.local, variables Vercel).

export class ConfigurationAuthError extends Error {
  constructor(raison: string) {
    super(`Configuration de l'authentification refusée : ${raison}`);
    this.name = "ConfigurationAuthError";
  }
}

const LONGUEUR_MIN_SECRET = 32;

export interface ConfigurationAuth {
  secret: string;
  baseURL: string;
  /** Client OAuth de Google (console Google Cloud) ; sans lui, la connexion avec Google est désactivée. */
  google?: { clientId: string; clientSecret: string };
}

function configurationGoogle(env: Record<string, string | undefined>): ConfigurationAuth["google"] {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId && !clientSecret) return undefined;
  if (!clientId) throw new ConfigurationAuthError("GOOGLE_CLIENT_ID manquant (GOOGLE_CLIENT_SECRET est fourni)");
  if (!clientSecret) throw new ConfigurationAuthError("GOOGLE_CLIENT_SECRET manquant (GOOGLE_CLIENT_ID est fourni)");
  return { clientId, clientSecret };
}

export function configurationAuth(env: Record<string, string | undefined>): ConfigurationAuth {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) throw new ConfigurationAuthError("BETTER_AUTH_SECRET manquant");
  if (secret.length < LONGUEUR_MIN_SECRET) {
    throw new ConfigurationAuthError(`BETTER_AUTH_SECRET doit faire au moins ${LONGUEUR_MIN_SECRET} caractères`);
  }

  const url = env.BETTER_AUTH_URL ?? (env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
  if (!url) throw new ConfigurationAuthError("BETTER_AUTH_URL manquante (URL publique du site)");
  return { secret, baseURL: url.replace(/\/+$/, ""), google: configurationGoogle(env) };
}

/** Vrai si le client Google est configuré : les pages n'affichent le bouton Google qu'alors. */
export const connexionGoogleActive = (env: Record<string, string | undefined>) =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
