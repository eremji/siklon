// Lecture de l'abonnement web push envoyé par le navigateur (PushSubscription.toJSON()), avant de
// l'enregistrer. Le serveur enverra plus tard des requêtes à son endpoint : seuls les services push
// des navigateurs sont acceptés, jamais une adresse quelconque (sinon, n'importe qui pourrait faire
// appeler par Siklon une adresse de son choix).
import type { AbonnementPush } from "../db/abonnementsPush";

/** Services push des navigateurs : Chrome et Edge (FCM), Firefox, Edge sous Windows (WNS), Safari. */
const HOTES_PUSH: readonly string[] = ["fcm.googleapis.com"];
const SUFFIXES_PUSH: readonly string[] = [".push.services.mozilla.com", ".notify.windows.com", ".push.apple.com"];

const LONGUEUR_MAX_ENDPOINT = 2048;
// Clé publique P-256 non compressée et secret d'authentification (RFC 8291).
const OCTETS_P256DH = 65;
const OCTETS_AUTH = 16;

function serviceConnu(hote: string): boolean {
  return HOTES_PUSH.includes(hote) || SUFFIXES_PUSH.some((suffixe) => hote.endsWith(suffixe));
}

function endpointValide(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > LONGUEUR_MAX_ENDPOINT || !URL.canParse(endpoint)) return false;
  const url = new URL(endpoint);
  return url.protocol === "https:" && !url.username && !url.password && !url.port && serviceConnu(url.hostname);
}

function cleValide(cle: unknown, octets: number): cle is string {
  return typeof cle === "string" && /^[A-Za-z0-9_-]+$/.test(cle) && Buffer.from(cle, "base64url").length === octets;
}

/** L'abonnement s'il est valable, sinon `null`. */
export function lireAbonnement(valeur: unknown): AbonnementPush | null {
  if (typeof valeur !== "object" || valeur === null) return null;
  const { endpoint, keys } = valeur as { endpoint?: unknown; keys?: unknown };
  if (!endpointValide(endpoint) || typeof keys !== "object" || keys === null) return null;
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  if (!cleValide(p256dh, OCTETS_P256DH) || !cleValide(auth, OCTETS_AUTH)) return null;
  return { endpoint, cles: { p256dh, auth } };
}
