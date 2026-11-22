// Envoi par l'API transactionnelle de Brevo (https://developers.brevo.com), sans SDK : deux appels
// HTTP suffisent. Les erreurs ne citent jamais l'adresse du destinataire (journaux Vercel).
import type { EmailSortant, ServiceEmails } from "./types";

const API = "https://api.brevo.com/v3";

export class EnvoiEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvoiEmailError";
  }
}

/** Brevo refuse faute de crédits : quota quotidien de l'offre gratuite atteint, ou crédits épuisés. */
export class QuotaEmailsError extends EnvoiEmailError {
  constructor(message: string) {
    super(message);
    this.name = "QuotaEmailsError";
  }
}

export interface ParametresBrevo {
  cleApi: string;
  expediteur: { nom: string; email: string };
  fetch?: typeof globalThis.fetch;
}

async function lireCode(reponse: Response): Promise<string | undefined> {
  const corps: unknown = await reponse.json().catch(() => ({}));
  const code = typeof corps === "object" && corps !== null && "code" in corps ? corps.code : undefined;
  return typeof code === "string" ? code : undefined;
}

const libelle = (status: number, code: string | undefined) => (code ? `${status} ${code}` : String(status));

async function codeErreur(reponse: Response): Promise<string> {
  return libelle(reponse.status, await lireCode(reponse));
}

export function serviceBrevo({ cleApi, expediteur, fetch = globalThis.fetch }: ParametresBrevo): ServiceEmails {
  const appeler = (chemin: string, init: RequestInit) =>
    fetch(`${API}${chemin}`, {
      ...init,
      headers: { "api-key": cleApi, accept: "application/json", "content-type": "application/json" },
    });

  const supprimer = async (chemin: string) => {
    const reponse = await appeler(chemin, { method: "DELETE" });
    // 404 : rien à effacer (aucun email envoyé, ou contact jamais créé).
    if (!reponse.ok && reponse.status !== 404) {
      throw new EnvoiEmailError(`Brevo a refusé l'effacement (${await codeErreur(reponse)})`);
    }
  };

  return {
    async envoyer({ a, sujet, texte, html }: EmailSortant) {
      const reponse = await appeler("/smtp/email", {
        method: "POST",
        body: JSON.stringify({
          sender: { name: expediteur.nom, email: expediteur.email },
          to: [{ email: a }],
          subject: sujet,
          textContent: texte,
          htmlContent: html,
        }),
      });
      if (!reponse.ok) {
        const code = await lireCode(reponse);
        const message = `Brevo a refusé l'envoi (${libelle(reponse.status, code)})`;
        // La doc cite not_enough_credits (400) et le 402 sans dire lequel répond au quota quotidien.
        if (reponse.status === 402 || code === "not_enough_credits") throw new QuotaEmailsError(message);
        throw new EnvoiEmailError(message);
      }
    },

    async effacer(adresse: string) {
      const id = encodeURIComponent(adresse);
      await supprimer(`/smtp/log/${id}`);
      await supprimer(`/contacts/${id}?identifierType=email_id`);
    },
  };
}
