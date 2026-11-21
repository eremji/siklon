// État de la checklist de préparation d'un utilisateur (US-08), table public.checklist_elements,
// rôle siklon_comptes. Seuls les éléments de la checklist de base sont acceptés.
import { CHECKLISTS } from "../checklist/contenu";
import type { Executeur } from "./historique";

export class ElementInconnuError extends Error {
  constructor(element: string) {
    super(`Élément de checklist inconnu : ${element}`);
    this.name = "ElementInconnuError";
  }
}

const ELEMENTS = new Set(
  Object.values(CHECKLISTS).flatMap(({ sections }) => sections.flatMap(({ elements }) => elements.map(({ id }) => id))),
);

export function estElementDeBase(element: string): boolean {
  return ELEMENTS.has(element);
}

/** Identifiants des éléments cochés par l'utilisateur. */
export async function lireElementsCoches(db: Executeur, utilisateurId: string): Promise<string[]> {
  const { rows } = await db.query(
    "select element from public.checklist_elements where utilisateur_id = $1 and coche order by element",
    [utilisateurId],
  );
  return (rows as { element: string }[]).map((ligne) => ligne.element).filter(estElementDeBase);
}

/** Coche ou décoche un élément. Refuse un élément hors de la checklist de base, sans rien écrire. */
export async function cocherElement(db: Executeur, utilisateurId: string, element: string, coche: boolean): Promise<void> {
  if (!estElementDeBase(element)) throw new ElementInconnuError(element);
  await db.query(
    `insert into public.checklist_elements (utilisateur_id, element, coche) values ($1, $2, $3)
     on conflict (utilisateur_id, element) do update set coche = excluded.coche, modifie_le = current_timestamp`,
    [utilisateurId, element, coche],
  );
}
