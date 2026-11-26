// Dernière lecture réussie de chaque source officielle (US-11), table public.dernieres_lectures :
// écrite par la vérification de chaque minute (rôle siklon_comptes), relue par le site (siklon_lecture)
// quand la source ne répond plus.
import type { FichierVigilance } from "../iles";
import type { Executeur } from "./historique";

/**
 * Source lue : le flux CurrentStorms.json du NHC, le bulletin de vigilance Météo-France d'un fichier,
 * les watches/warnings NHC d'une île (identifiant d'URL), ou les positions prévues d'un système (identifiant NHC).
 */
export type SourceLue =
  | "nhc-systemes"
  | `vigilance:${FichierVigilance}`
  | `alertes-nhc:${string}`
  | `positions:${string}`;

export interface Lecture {
  /** Réponse brute de la source, à relire avec le même lecteur que la réponse en direct. */
  contenu: unknown;
  /** Heure de lecture (ISO). */
  luLe: string;
}

/** Enregistre une lecture réussie, sauf si une lecture plus récente est déjà enregistrée. */
export async function enregistrerLecture(db: Executeur, source: SourceLue, contenu: unknown, luLe: string): Promise<void> {
  await db.query(
    `insert into public.dernieres_lectures (source, contenu, lu_le) values ($1, $2, $3)
     on conflict (source) do update set contenu = excluded.contenu, lu_le = excluded.lu_le
     where public.dernieres_lectures.lu_le < excluded.lu_le`,
    [source, JSON.stringify(contenu), luLe],
  );
}

/** Dernière lecture réussie de la source, ou `null` si aucune n'a jamais réussi. */
export async function lireDerniereLecture(db: Executeur, source: SourceLue): Promise<Lecture | null> {
  const { rows } = await db.query("select contenu, lu_le from public.dernieres_lectures where source = $1", [source]);
  const [ligne] = rows as { contenu: unknown; lu_le: Date }[];
  return ligne ? { contenu: ligne.contenu, luLe: new Date(ligne.lu_le).toISOString() } : null;
}
