// Configuration de l'authentification lue dans l'environnement (.env.local, variables Vercel).

export class ConfigurationAuthError extends Error {
  constructor(raison: string) {
    super(`Configuration de l'authentification refusée : ${raison}`);
    this.name = "ConfigurationAuthError";
  }
}

const LONGUEUR_MIN_SECRET = 32;

export function configurationAuth(env: Record<string, string | undefined>): { secret: string; baseURL: string } {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) throw new ConfigurationAuthError("BETTER_AUTH_SECRET manquant");
  if (secret.length < LONGUEUR_MIN_SECRET) {
    throw new ConfigurationAuthError(`BETTER_AUTH_SECRET doit faire au moins ${LONGUEUR_MIN_SECRET} caractères`);
  }

  const url = env.BETTER_AUTH_URL ?? (env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
  if (!url) throw new ConfigurationAuthError("BETTER_AUTH_URL manquante (URL publique du site)");
  return { secret, baseURL: url.replace(/\/+$/, "") };
}
