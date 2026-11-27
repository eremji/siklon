// Surveillant du journal des lectures (#164), lancé toutes les 15 minutes par GitHub Actions
// (.github/workflows/surveillance.yml, scripts/surveiller-journal.mts) : indépendant de pg_cron, il lit la
// route de santé du site, ouvre une issue à la panne (GitHub la notifie par e-mail) et la ferme au retour.
// Aucune dépendance : le script tourne avec Node seul, sans node_modules.
import { RETARD_MAX_JOURNAL_MIN } from "../constantes";
import type { EtatJournal } from "./journal";

export type EtatSante = EtatJournal | "injoignable";

export const TITRE_ALERTE = "Surveillance : le journal des lectures n'est plus alimenté";

/** Au-delà, le site est tenu pour injoignable (une fonction Vercel qui ne répond pas). */
const DELAI_SANTE_MS = 20_000;

/** État du journal d'après la route de santé du site ; « injoignable » si elle ne répond pas comme prévu. */
export async function lireSante(base: string, recuperer: typeof fetch = fetch): Promise<EtatSante> {
  try {
    const reponse = await recuperer(new URL("/api/sante", base).toString(), {
      signal: AbortSignal.timeout(DELAI_SANTE_MS),
    });
    const { etat } = (await reponse.json()) as { etat?: unknown };
    if (reponse.status === 200 && etat === "a-jour") return "a-jour";
    if (reponse.status === 503 && etat === "en-retard") return "en-retard";
    return "injoignable";
  } catch {
    return "injoignable";
  }
}

/** Issue qui porte l'alerte : une seule ouverte par panne. */
export interface IssuesAlerte {
  /** Numéro de l'issue d'alerte ouverte, ou `null`. */
  ouverte(): Promise<number | null>;
  ouvrir(titre: string, corps: string): Promise<void>;
  /** Commente l'issue, puis la ferme. */
  fermer(numero: number, commentaire: string): Promise<void>;
}

/** Issues du dépôt par l'API REST de GitHub, avec le GITHUB_TOKEN du workflow (permission issues: write). */
export function issuesGitHub(options: { depot: string; jeton: string; recuperer?: typeof fetch }): IssuesAlerte {
  const recuperer = options.recuperer ?? fetch;
  const api = `https://api.github.com/repos/${options.depot}/issues`;
  const appeler = async (url: string, methode = "GET", corps?: unknown): Promise<unknown> => {
    const reponse = await recuperer(url, {
      method: methode,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${options.jeton}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    if (!reponse.ok) throw new Error(`GitHub a refusé ${methode} ${url} : ${reponse.status}`);
    return reponse.json();
  };
  return {
    async ouverte() {
      const issues = (await appeler(
        `${api}?state=open&creator=${encodeURIComponent("github-actions[bot]")}&per_page=100`,
      )) as { number: number; title: string }[];
      return issues.find((issue) => issue.title === TITRE_ALERTE)?.number ?? null;
    },
    async ouvrir(titre, corps) {
      await appeler(api, "POST", { title: titre, body: corps });
    },
    async fermer(numero, commentaire) {
      await appeler(`${api}/${numero}/comments`, "POST", { body: commentaire });
      await appeler(`${api}/${numero}`, "PATCH", { state: "closed", state_reason: "completed" });
    },
  };
}

const heure = (date: Date) => `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;

function texteAlerte(etat: "en-retard" | "injoignable", maintenant: Date): string {
  const constat =
    etat === "en-retard"
      ? `Aucune lecture n'a été écrite dans \`dernieres_lectures\` depuis plus de ${RETARD_MAX_JOURNAL_MIN} minutes ` +
        "(`RETARD_MAX_JOURNAL_MIN`, SPEC.md) : la vérification de chaque minute ne tourne plus, " +
        "et aucune alerte ne part vers les abonnés."
      : "La route de santé `/api/sante` n'a pas répondu : le site est peut-être en panne, " +
        "ou il ne peut plus lire la base.";
  return [
    `Constaté le ${heure(maintenant)} par le surveillant (\`.github/workflows/surveillance.yml\`).`,
    "",
    constat,
    "",
    "## Pistes",
    "",
    "- Supabase, éditeur SQL : `select * from cron.job_run_details order by start_time desc limit 5;` " +
      "(la tâche `siklon-verifier-alertes` tourne-t-elle ?) et " +
      "`select status_code, error_msg, created from net._http_response order by created desc limit 5;`.",
    "- Supabase, Vault : les secrets `siklon_alertes_url` et `siklon_alertes_secret` existent-ils encore ?",
    "- Vercel : journaux de `/api/alertes/verifier` (401, 503, délai dépassé ?).",
    "",
    "Cette issue se ferme d'elle-même au premier contrôle où le journal est de nouveau à jour.",
  ].join("\n");
}

export type ActionSurveillance = "ouverte" | "fermee" | "aucune";

/** Une issue par panne : ouverte au premier contrôle en défaut, fermée au premier contrôle à jour. */
export async function surveillerJournal(options: {
  etat: EtatSante;
  issues: IssuesAlerte;
  maintenant: Date;
}): Promise<ActionSurveillance> {
  const { etat, issues, maintenant } = options;
  const ouverte = await issues.ouverte();
  if (etat === "a-jour") {
    if (ouverte === null) return "aucune";
    await issues.fermer(ouverte, `Journal de nouveau à jour le ${heure(maintenant)}.`);
    return "fermee";
  }
  if (ouverte !== null) return "aucune";
  await issues.ouvrir(TITRE_ALERTE, texteAlerte(etat, maintenant));
  return "ouverte";
}
