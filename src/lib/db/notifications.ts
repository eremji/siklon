// État des alertes et journal des notifications (US-07), tables public.niveaux_alerte_iles et
// public.notifications_envoyees, rôle siklon_comptes.
import { trouverIle } from "../iles";
import type { NiveauAlerte, ObservationNiveau } from "../notifications/evenements";
import { estCode } from "../nhc/watches";
import { estNiveau } from "../vigilance/niveaux";
import type { Executeur } from "./historique";

export type Canal = "push" | "email";

export interface Destinataire {
  id: string;
  email: string;
  langue: "fr" | "en";
  /** Accord explicite pour recevoir les alertes par e-mail (US-13) ; non par défaut. */
  alertesEmail: boolean;
}

function estNiveauAlerte(valeur: string): valeur is NiveauAlerte {
  return valeur === "aucune" || estNiveau(valeur) || estCode(valeur);
}

/** Dernier niveau connu de chaque île ; une ligne d'île ou de niveau inconnu est ignorée. */
export async function lireNiveauxIles(db: Executeur): Promise<Map<string, NiveauAlerte>> {
  const { rows } = await db.query("select ile, niveau from public.niveaux_alerte_iles");
  const niveaux = new Map<string, NiveauAlerte>();
  for (const { ile, niveau } of rows as { ile: string; niveau: string }[]) {
    if (trouverIle(ile) && estNiveauAlerte(niveau)) niveaux.set(ile, niveau);
  }
  return niveaux;
}

/**
 * Enregistre le niveau observé seulement si le niveau en base est encore `attendu` (aucun niveau
 * si `undefined`). Vrai si l'écriture a eu lieu : deux vérifications simultanées qui voient le
 * même changement n'en retiennent qu'une, donc une seule série de notifications.
 */
export async function enregistrerNiveau(
  db: Executeur,
  ile: string,
  attendu: NiveauAlerte | undefined,
  { niveau, misAJour }: ObservationNiveau,
): Promise<boolean> {
  const { rows } =
    attendu === undefined
      ? await db.query(
          `insert into public.niveaux_alerte_iles (ile, niveau, mis_a_jour) values ($1, $2, $3)
           on conflict do nothing returning ile`,
          [ile, niveau, misAJour],
        )
      : await db.query(
          `update public.niveaux_alerte_iles
           set niveau = $3, mis_a_jour = $4, modifie_le = current_timestamp
           where ile = $1 and niveau = $2 returning ile`,
          [ile, attendu, niveau, misAJour],
        );
  return rows.length === 1;
}

/** Utilisateurs qui suivent l'île, dont l'adresse est confirmée (SPEC.md, US-05). */
export async function destinataires(db: Executeur, ile: string): Promise<Destinataire[]> {
  const { rows } = await db.query(
    `select u.id, u.email, u.langue, coalesce(p.email, false) as "alertesEmail"
     from public.iles_suivies s
       join public.utilisateurs u on u.id = s.utilisateur_id
       left join public.preferences_alertes p on p.utilisateur_id = u.id
     where s.ile = $1 and u.email_verifie
     order by u.cree_le, u.id`,
    [ile],
  );
  return rows as Destinataire[];
}

/**
 * Réserve l'envoi d'une alerte à un utilisateur par un canal. Vrai la première fois seulement :
 * une même alerte n'est jamais envoyée deux fois par le même canal.
 */
export async function reserverEnvoi(db: Executeur, utilisateurId: string, cle: string, canal: Canal): Promise<boolean> {
  const { rows } = await db.query(
    `insert into public.notifications_envoyees (utilisateur_id, cle, canal) values ($1, $2, $3)
     on conflict do nothing returning cle`,
    [utilisateurId, cle, canal],
  );
  return rows.length === 1;
}

/** Donne ou retire l'accord de l'utilisateur pour les alertes par e-mail. */
export async function enregistrerAccordEmail(db: Executeur, utilisateurId: string, accord: boolean): Promise<void> {
  await db.query(
    `insert into public.preferences_alertes (utilisateur_id, email) values ($1, $2)
     on conflict (utilisateur_id) do update set email = excluded.email, modifie_le = current_timestamp`,
    [utilisateurId, accord],
  );
}

/** E-mails d'alerte réservés depuis minuit (UTC) : ils comptent dans le quota quotidien de Brevo. */
export async function compterEmailsAlerteDuJour(db: Executeur): Promise<number> {
  const { rows } = await db.query(
    `select count(*)::int as nombre from public.notifications_envoyees
     where canal = 'email' and cree_le >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'`,
  );
  return (rows as { nombre: number }[])[0].nombre;
}
