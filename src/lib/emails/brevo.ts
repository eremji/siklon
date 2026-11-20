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

export interface ParametresBrevo {
  cleApi: string;
  expediteur: { nom: string; email: string };
  fetch?: typeof globalThis.fetch;
}

async function codeErreur(reponse: Response): Promise<string> {
  const corps: unknown = await reponse.json().catch(() => ({}));
  const code = typeof corps === "object" && corps !== null && "code" in corps ? corps.code : undefined;
  return typeof code === "string" ? `${reponse.status} ${code}` : String(reponse.status);
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
      if (!reponse.ok) throw new EnvoiEmailError(`Brevo a refusé l'envoi (${await codeErreur(reponse)})`);
    },

    async effacer(adresse: string) {
      const id = encodeURIComponent(adresse);
      await supprimer(`/smtp/log/${id}`);
      await supprimer(`/contacts/${id}?identifierType=email_id`);
    },
  };
}
