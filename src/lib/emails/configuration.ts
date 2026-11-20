// Choix du service d'envoi des emails selon l'environnement (.env.local, variables Vercel).
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { serviceBrevo } from "./brevo";
import type { EmailSortant, ServiceEmails } from "./types";

/** Adresse d'envoi : sous-domaine authentifié chez Brevo (SPF, DKIM, DMARC), sans boîte de réception. */
export const EXPEDITEUR = { nom: "Siklon", email: "noreply@siklon.mj-soft.fr" } as const;

export class ConfigurationEmailError extends Error {
  constructor(raison: string) {
    super(`Configuration des emails refusée : ${raison}`);
    this.name = "ConfigurationEmailError";
  }
}

/** Tests e2e : chaque email devient un fichier JSON, que le test lit pour suivre le lien. */
export function serviceDossier(dossier: string): ServiceEmails {
  const lire = async () => {
    const fichiers = await readdir(dossier).catch(() => []);
    return Promise.all(
      fichiers.map(async (fichier) => ({
        fichier,
        message: JSON.parse(await readFile(join(dossier, fichier), "utf8")) as EmailSortant,
      })),
    );
  };
  return {
    async envoyer(message) {
      await mkdir(dossier, { recursive: true });
      await writeFile(join(dossier, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(message));
    },
    async effacer(adresse) {
      const emails = await lire();
      await Promise.all(
        emails.filter(({ message }) => message.a === adresse).map(({ fichier }) => rm(join(dossier, fichier))),
      );
    },
  };
}

/** Développement sans clé Brevo : l'email (et son lien) s'affiche dans le terminal du serveur. */
const serviceConsole: ServiceEmails = {
  async envoyer({ sujet, texte }) {
    console.info(`[emails] non envoyé (pas de BREVO_API_KEY) : ${sujet}\n${texte}`);
  },
  async effacer() {},
};

export type ChoixServiceEmails = { type: "dossier" | "brevo" | "console"; service: ServiceEmails };

export function choisirServiceEmails(env: Record<string, string | undefined>): ChoixServiceEmails {
  // Comme NHC_FIXTURES : jamais sur Vercel, pour qu'une variable oubliée n'y coupe pas les emails.
  if (env.EMAILS_DOSSIER && !env.VERCEL_ENV) return { type: "dossier", service: serviceDossier(env.EMAILS_DOSSIER) };
  if (env.BREVO_API_KEY) {
    return { type: "brevo", service: serviceBrevo({ cleApi: env.BREVO_API_KEY, expediteur: EXPEDITEUR }) };
  }
  if (env.NODE_ENV === "production") throw new ConfigurationEmailError("BREVO_API_KEY manquante");
  return { type: "console", service: serviceConsole };
}
