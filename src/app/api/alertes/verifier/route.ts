// Vérification des alertes (US-07), appelée chaque minute par pg_cron depuis Supabase
// (supabase/migrations/20261121000000_planification_alertes.sql). Protégée par un secret partagé :
// en-tête « Authorization: Bearer <ALERTES_CRON_SECRET> ». Le bilan ne contient que des nombres.
import { createHash, timingSafeEqual } from "node:crypto";
import { configurationAuth } from "@/lib/auth/configuration";
import { connexionComptes } from "@/lib/db/pool";
import { choisirServiceEmails } from "@/lib/emails/configuration";
import { canalEmail } from "@/lib/notifications/email";
import { lireClesVapid } from "@/lib/notifications/configurationPush";
import { envoyerPush } from "@/lib/notifications/push";
import { sourcesAlertes } from "@/lib/notifications/sources";
import { type Canal, verifierAlertes } from "@/lib/notifications/verification";

// Les sources sont en cache ; c'est l'envoi aux abonnés qui peut prendre du temps.
export const maxDuration = 60;

const LONGUEUR_MIN_SECRET = 32;

const empreinte = (texte: string) => createHash("sha256").update(texte).digest();

/** Compare à temps constant : la durée de la réponse ne trahit rien du secret. */
function autorise(entete: string | null, secret: string): boolean {
  return timingSafeEqual(empreinte(entete ?? ""), empreinte(`Bearer ${secret}`));
}

const erreur = (message: string, status: number) => Response.json({ erreur: message }, { status });

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.ALERTES_CRON_SECRET ?? "";
  if (secret.length < LONGUEUR_MIN_SECRET) return erreur("Vérification des alertes non configurée.", 503);
  if (!autorise(request.headers.get("authorization"), secret)) return erreur("Non autorisé.", 401);

  const { baseURL } = configurationAuth(process.env);
  const db = connexionComptes();
  // Web push s'il est configuré ; e-mail toujours (Brevo en production, terminal en développement).
  const vapid = lireClesVapid(process.env);
  const canaux: Canal[] = [
    ...(vapid ? [(alerte: Parameters<Canal>[0]) => envoyerPush(db, alerte, { vapid })] : []),
    canalEmail(db, { service: choisirServiceEmails(process.env).service, base: baseURL }),
  ];

  const bilan = await verifierAlertes(db, sourcesAlertes(process.env), { canaux, base: baseURL });
  console.info(
    `[alertes] ${bilan.evenements} événement(s), ${bilan.envoyes} notification(s) envoyée(s), ${bilan.echecs} échec(s)`,
  );
  return Response.json(bilan);
}
