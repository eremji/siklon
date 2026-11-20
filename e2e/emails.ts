// Emails des tests e2e : le serveur les écrit dans ce dossier (EMAILS_DOSSIER, voir
// playwright.config.ts) au lieu de les envoyer par Brevo ; le test y lit le lien reçu.
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DOSSIER_EMAILS = join(tmpdir(), "siklon-e2e-emails");

export interface EmailRecu {
  a: string;
  sujet: string;
  texte: string;
}

export async function emailsRecus(adresse: string): Promise<EmailRecu[]> {
  const fichiers = (await readdir(DOSSIER_EMAILS).catch(() => [])).sort();
  const emails = await Promise.all(
    fichiers.map(async (fichier) => JSON.parse(await readFile(join(DOSSIER_EMAILS, fichier), "utf8")) as EmailRecu),
  );
  return emails.filter((email) => email.a === adresse);
}

/** Chemin (et paramètres) du lien contenu dans le dernier email reçu dont le sujet commence ainsi. */
export async function lienRecu(adresse: string, sujet: string): Promise<string | null> {
  const email = (await emailsRecus(adresse)).findLast((recu) => recu.sujet.startsWith(sujet));
  const lien = email?.texte.match(/https?:\/\/\S+/)?.[0];
  if (!lien) return null;
  const url = new URL(lien);
  return `${url.pathname}${url.search}`;
}
