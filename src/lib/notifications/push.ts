// Envoi d'une alerte par web push (US-07) à tous les appareils abonnés d'un utilisateur.
// web-push chiffre le contenu (RFC 8291) et signe la requête (VAPID, RFC 8292) ; l'appel HTTP passe
// par fetch, remplaçable dans les tests. Les journaux ne citent jamais l'endpoint (il identifie
// l'appareil), ni l'adresse ou l'identifiant de l'utilisateur.
import { type ClesVapidWebPush, generateRequestDetails } from "web-push";
import { type AbonnementPush, lireAbonnements, supprimerAbonnementExpire } from "../db/abonnementsPush";
import type { Executeur } from "../db/historique";
import { type Destinataire, reserverEnvoi } from "../db/notifications";
import type { ContenuNotification } from "./textes";

/** Une alerte qui n'a pas pu être remise dans ce délai n'a plus de sens : le service push l'abandonne. */
const DUREE_VIE_S = 12 * 60 * 60;
const DELAI_REPONSE_MS = 10_000;

export type ClesVapid = ClesVapidWebPush;

/** Ce que reçoit le service worker (public/sw.js). */
export interface MessagePush {
  titre: string;
  texte: string;
  lien: string;
  /** Une même alerte arrivée deux fois sur un appareil n'y est affichée qu'une fois. */
  etiquette: string;
}

export interface AlertePush {
  destinataire: Destinataire;
  /** Clé de l'alerte (src/lib/notifications/evenements.ts), pour ne jamais l'envoyer deux fois. */
  cle: string;
  contenu: ContenuNotification;
}

export interface BilanPush {
  dejaEnvoye: boolean;
  envoyes: number;
  expires: number;
  echecs: number;
}

export function messagePush({ titre, corps, lien, source }: ContenuNotification, cle: string): MessagePush {
  return { titre, texte: `${corps}\nSource : ${source.nom}.`, lien, etiquette: cle };
}

type Resultat = "envoye" | "expire" | "echec";

async function envoyerA(
  abonnement: AbonnementPush,
  message: string,
  vapid: ClesVapid,
  fetch: typeof globalThis.fetch,
): Promise<Resultat> {
  const { endpoint, cles } = abonnement;
  const hote = new URL(endpoint).hostname;
  const details = generateRequestDetails({ endpoint, keys: cles }, message, {
    vapidDetails: vapid,
    TTL: DUREE_VIE_S,
    urgency: "high",
  });
  // fetch calcule lui-même la longueur du corps.
  const entetes = Object.entries(details.headers)
    .filter(([nom]) => nom.toLowerCase() !== "content-length")
    .map(([nom, valeur]): [string, string] => [nom, String(valeur)]);

  let reponse: Response;
  try {
    reponse = await fetch(endpoint, {
      method: details.method,
      headers: entetes,
      body: details.body ? new Uint8Array(details.body) : null,
      signal: AbortSignal.timeout(DELAI_REPONSE_MS),
    });
  } catch (erreur) {
    // Le message d'une erreur réseau peut citer l'adresse appelée : seul son type est gardé.
    console.error(`[push] échec de l'envoi vers ${hote} : ${erreur instanceof Error ? erreur.name : "inconnue"}`);
    return "echec";
  }
  if (reponse.ok) return "envoye";
  if (reponse.status === 404 || reponse.status === 410) return "expire";
  console.error(`[push] échec de l'envoi : ${hote} a répondu ${reponse.status}`);
  return "echec";
}

/**
 * Envoie l'alerte à chaque appareil abonné du destinataire, une seule fois : l'envoi est réservé
 * dans le journal (canal « push ») avant de partir. Un utilisateur sans appareil abonné ne réserve
 * rien. Un appareil que le service push déclare expiré (404, 410) est désabonné.
 */
export async function envoyerPush(
  db: Executeur,
  { destinataire, cle, contenu }: AlertePush,
  { vapid, fetch = globalThis.fetch }: { vapid: ClesVapid; fetch?: typeof globalThis.fetch },
): Promise<BilanPush> {
  const bilan: BilanPush = { dejaEnvoye: false, envoyes: 0, expires: 0, echecs: 0 };
  const abonnements = await lireAbonnements(db, destinataire.id);
  if (abonnements.length === 0) return bilan;
  if (!(await reserverEnvoi(db, destinataire.id, cle, "push"))) return { ...bilan, dejaEnvoye: true };

  const message = JSON.stringify(messagePush(contenu, cle));
  for (const abonnement of abonnements) {
    const resultat = await envoyerA(abonnement, message, vapid, fetch);
    if (resultat === "envoye") bilan.envoyes += 1;
    else if (resultat === "echec") bilan.echecs += 1;
    else {
      bilan.expires += 1;
      await supprimerAbonnementExpire(db, abonnement.endpoint);
    }
  }
  return bilan;
}
