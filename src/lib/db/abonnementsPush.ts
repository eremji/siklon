// Abonnements web push des appareils (US-07), table public.abonnements_push, rôle siklon_comptes.
import type { Executeur } from "./historique";

/** Ce que le navigateur donne à l'abonnement (PushSubscription), réduit à l'utile. */
export interface AbonnementPush {
  endpoint: string;
  cles: { p256dh: string; auth: string };
}

/** Enregistre l'appareil pour cet utilisateur ; un appareil déjà connu prend les nouvelles clés et ce compte. */
export async function enregistrerAbonnement(db: Executeur, utilisateurId: string, { endpoint, cles }: AbonnementPush): Promise<void> {
  await db.query(
    `insert into public.abonnements_push (endpoint, utilisateur_id, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update
     set utilisateur_id = excluded.utilisateur_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [endpoint, utilisateurId, cles.p256dh, cles.auth],
  );
}

/** Appareils de l'utilisateur, du plus ancien au plus récent. */
export async function lireAbonnements(db: Executeur, utilisateurId: string): Promise<AbonnementPush[]> {
  const { rows } = await db.query(
    "select endpoint, p256dh, auth from public.abonnements_push where utilisateur_id = $1 order by cree_le, endpoint",
    [utilisateurId],
  );
  return (rows as { endpoint: string; p256dh: string; auth: string }[]).map(({ endpoint, p256dh, auth }) => ({
    endpoint,
    cles: { p256dh, auth },
  }));
}

/** Désabonnement demandé par l'utilisateur : seulement s'il s'agit de l'un de ses appareils. */
export async function supprimerAbonnement(db: Executeur, utilisateurId: string, endpoint: string): Promise<void> {
  await db.query("delete from public.abonnements_push where endpoint = $1 and utilisateur_id = $2", [endpoint, utilisateurId]);
}

/** Abonnement que le service push déclare expiré (404 ou 410). */
export async function supprimerAbonnementExpire(db: Executeur, endpoint: string): Promise<void> {
  await db.query("delete from public.abonnements_push where endpoint = $1", [endpoint]);
}
