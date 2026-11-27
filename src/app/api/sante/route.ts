// Route de santé publique (#164), lue toutes les 15 minutes par le surveillant GitHub Actions
// (.github/workflows/surveillance.yml). Elle dit seulement si le journal des lectures est encore alimenté
// par la vérification de chaque minute (pg_cron → /api/alertes/verifier) : ni heure, ni contenu, ni erreur.
import { connection } from "next/server";
import { lireDerniereEcriture } from "@/lib/db/dernieresLectures";
import { connexion } from "@/lib/db/pool";
import { type EtatJournal, etatJournal } from "@/lib/sante/journal";

const repondre = (etat: EtatJournal) =>
  Response.json({ etat }, { status: etat === "a-jour" ? 200 : 503, headers: { "Cache-Control": "no-store" } });

export async function GET(): Promise<Response> {
  await connection();
  try {
    return repondre(etatJournal(await lireDerniereEcriture(connexion()), new Date()));
  } catch (erreur) {
    console.error("[sante] lecture du journal impossible", erreur);
    return repondre("en-retard");
  }
}
