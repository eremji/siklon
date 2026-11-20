// Clés VAPID du web push (US-07), lues dans .env.local ou les variables Vercel. La clé publique est
// donnée au navigateur pour l'abonnement ; la clé privée signe les envois et reste sur le serveur.
import type { ClesVapid } from "./push";

export class ConfigurationPushError extends Error {
  constructor(raison: string) {
    super(`Configuration du web push refusée : ${raison}`);
    this.name = "ConfigurationPushError";
  }
}

const VARIABLES = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;

/** Les clés VAPID ; `null` si aucune variable n'est définie (web push désactivé). */
export function lireClesVapid(env: Record<string, string | undefined>): ClesVapid | null {
  const manquantes = VARIABLES.filter((nom) => !env[nom]);
  if (manquantes.length === VARIABLES.length) return null;
  if (manquantes.length > 0) throw new ConfigurationPushError(`${manquantes.join(", ")} manquante(s)`);
  const subject = env.VAPID_SUBJECT ?? "";
  if (!/^(mailto:|https:\/\/)/.test(subject)) {
    throw new ConfigurationPushError("VAPID_SUBJECT doit commencer par mailto: ou https://");
  }
  return { publicKey: env.VAPID_PUBLIC_KEY ?? "", privateKey: env.VAPID_PRIVATE_KEY ?? "", subject };
}
