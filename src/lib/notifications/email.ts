// Alertes par e-mail (US-07), par le service d'envoi de l'US-05 (Brevo en production).
// Seulement aux utilisateurs qui l'ont accepté (US-13). Les e-mails de connexion restent prioritaires :
// les alertes ne dépassent jamais QUOTA_EMAILS_JOUR - RESERVE_EMAILS_AUTH par jour (UTC). Les journaux
// ne citent jamais l'adresse du destinataire.
import { QUOTA_EMAILS_JOUR, RESERVE_EMAILS_AUTH } from "../constantes";
import type { Executeur } from "../db/historique";
import { compterEmailsAlerteDuJour, reserverEnvoi } from "../db/notifications";
import { QuotaEmailsError } from "../emails/brevo";
import { type ContenuEmail, echapper } from "../emails/messages";
import type { ServiceEmails } from "../emails/types";
import { chemin } from "../langues";
import { COMMUN } from "../textes/commun";
import { NOTIFICATIONS } from "../textes/notifications";
import type { ContenuNotification } from "./textes";
import type { BilanEnvoi, Canal } from "./verification";

/** E-mail d'alerte dans la langue du contenu, c'est-à-dire celle du compte (US-10). */
export function messageEmailAlerte({ titre, corps, lien, source, langue }: ContenuNotification, base: string): ContenuEmail {
  const textes = NOTIFICATIONS[langue].email;
  const { mention } = COMMUN[langue];
  const compte = `${base}${chemin(langue, "/compte")}`;
  const texte = [
    corps,
    "",
    textes.ligne(textes.source, `${source.nom} (${source.url})`),
    textes.ligne(textes.fiche, lien),
    "",
    mention,
    textes.ligne(textes.compte, compte),
  ].join("\n");
  const html = `<!doctype html>
<html lang="${langue}">
<body style="font-family: system-ui, sans-serif; font-size: 16px; line-height: 1.5;">
<p><strong>${echapper(titre)}</strong></p>
<p>${echapper(corps)}</p>
<p>${echapper(textes.ligne(textes.source, ""))}<a href="${echapper(source.url)}">${echapper(source.nom)}</a></p>
<p><a href="${echapper(lien)}">${echapper(textes.fiche)}</a></p>
<p>${echapper(mention)}</p>
<p><a href="${echapper(compte)}">${echapper(textes.compte)}</a></p>
</body>
</html>`;
  return { sujet: `${titre} · Siklon`, texte, html };
}

const RIEN: BilanEnvoi = { envoyes: 0, echecs: 0 };

/**
 * Canal e-mail pour un passage de la vérification. Il garde en mémoire, le temps du passage, que le
 * quota est atteint : plus aucun envoi n'est alors tenté. Une alerte bloquée par le plafond n'est pas
 * réservée, et pourra partir un autre jour si l'événement se reproduit.
 */
export function canalEmail(
  db: Executeur,
  {
    service,
    base,
    plafond = QUOTA_EMAILS_JOUR - RESERVE_EMAILS_AUTH,
  }: { service: ServiceEmails; base: string; plafond?: number },
): Canal {
  let suspendu = false;

  return async ({ destinataire, cle, contenu }) => {
    if (!destinataire.alertesEmail || suspendu) return RIEN;
    if ((await compterEmailsAlerteDuJour(db)) >= plafond) {
      suspendu = true;
      console.warn(`[alertes] plafond quotidien des e-mails d'alerte atteint (${plafond}) : e-mails suspendus jusqu'à minuit UTC`);
      return RIEN;
    }
    if (!(await reserverEnvoi(db, destinataire.id, cle, "email"))) return RIEN;

    try {
      await service.envoyer({ a: destinataire.email, ...messageEmailAlerte(contenu, base) });
      return { envoyes: 1, echecs: 0 };
    } catch (erreur) {
      if (erreur instanceof QuotaEmailsError) {
        suspendu = true;
        console.error("[alertes] Brevo signale le quota d'e-mails atteint : e-mails d'alerte suspendus pour ce passage");
      } else {
        // Le message d'erreur peut citer l'adresse : seul son type est gardé.
        console.error(`[alertes] échec d'un e-mail d'alerte (${erreur instanceof Error ? erreur.name : "inconnue"})`);
      }
      return { envoyes: 0, echecs: 1 };
    }
  };
}
