// Îles suivies par un utilisateur (US-05), table public.iles_suivies, rôle siklon_comptes.
import { ILES } from "../iles";
import type { Executeur } from "./historique";

export class IleInconnueError extends Error {
  constructor(slug: string) {
    super(`Île inconnue : ${slug}`);
    this.name = "IleInconnueError";
  }
}

const ORDRE = new Map(ILES.map((ile, rang) => [ile.slug, rang]));

/** Identifiants des îles suivies, dans l'ordre de la liste des îles (SPEC.md). */
export async function lireIlesSuivies(db: Executeur, utilisateurId: string): Promise<string[]> {
  const { rows } = await db.query("select ile from public.iles_suivies where utilisateur_id = $1", [utilisateurId]);
  return (rows as { ile: string }[])
    .map((ligne) => ligne.ile)
    .filter((slug) => ORDRE.has(slug))
    .sort((a, b) => (ORDRE.get(a) ?? 0) - (ORDRE.get(b) ?? 0));
}

/**
 * Remplace les îles suivies par celles données : les absentes sont retirées, les nouvelles ajoutées.
 * Une seule requête, donc tout ou rien. Refuse une île qui n'est pas dans la liste, sans rien changer.
 */
export async function enregistrerIlesSuivies(db: Executeur, utilisateurId: string, slugs: string[]): Promise<void> {
  const inconnue = slugs.find((slug) => !ORDRE.has(slug));
  if (inconnue !== undefined) throw new IleInconnueError(inconnue);
  await db.query(
    `with retirees as (
       delete from public.iles_suivies where utilisateur_id = $1 and not (ile = any($2::text[]))
     )
     insert into public.iles_suivies (utilisateur_id, ile)
     select $1, ile from unnest($2::text[]) as ile
     on conflict do nothing`,
    [utilisateurId, [...new Set(slugs)]],
  );
}
