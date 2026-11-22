// Checklist de préparation d'un utilisateur (US-08), rôle siklon_comptes :
// - public.checklist_elements : état (coché, masqué) des éléments de la checklist de base ;
// - public.checklist_elements_perso : éléments que l'utilisateur ajoute lui-même.
import { CHECKLISTS } from "../checklist/contenu";
import type { Executeur } from "./historique";

export const LIMITE_ELEMENTS_PERSO = 50;
export const LONGUEUR_MAX_TEXTE = 200;

export class ElementInconnuError extends Error {
  constructor(element: string) {
    super(`Élément de checklist inconnu : ${element}`);
    this.name = "ElementInconnuError";
  }
}

export class TexteInvalideError extends Error {
  constructor() {
    super(`Texte d'élément vide ou de plus de ${LONGUEUR_MAX_TEXTE} caractères`);
    this.name = "TexteInvalideError";
  }
}

export class LimiteAtteinteError extends Error {
  constructor() {
    super(`Pas plus de ${LIMITE_ELEMENTS_PERSO} éléments ajoutés par compte`);
    this.name = "LimiteAtteinteError";
  }
}

const ELEMENTS = new Set(
  Object.values(CHECKLISTS).flatMap(({ sections }) => sections.flatMap(({ elements }) => elements.map(({ id }) => id))),
);

export function estElementDeBase(element: string): boolean {
  return ELEMENTS.has(element);
}

// --- Éléments de la checklist de base -------------------------------------------------------

async function lireElements(db: Executeur, utilisateurId: string, colonne: "coche" | "masque"): Promise<string[]> {
  const { rows } = await db.query(
    `select element from public.checklist_elements where utilisateur_id = $1 and ${colonne} order by element`,
    [utilisateurId],
  );
  return (rows as { element: string }[]).map((ligne) => ligne.element).filter(estElementDeBase);
}

async function ecrireElement(
  db: Executeur,
  utilisateurId: string,
  element: string,
  colonne: "coche" | "masque",
  valeur: boolean,
): Promise<void> {
  if (!estElementDeBase(element)) throw new ElementInconnuError(element);
  await db.query(
    `insert into public.checklist_elements (utilisateur_id, element, ${colonne}) values ($1, $2, $3)
     on conflict (utilisateur_id, element) do update set ${colonne} = excluded.${colonne}, modifie_le = current_timestamp`,
    [utilisateurId, element, valeur],
  );
}

/** Identifiants des éléments cochés par l'utilisateur. */
export const lireElementsCoches = (db: Executeur, utilisateurId: string) => lireElements(db, utilisateurId, "coche");

/** Identifiants des éléments que l'utilisateur a masqués. */
export const lireElementsMasques = (db: Executeur, utilisateurId: string) => lireElements(db, utilisateurId, "masque");

/** Coche ou décoche un élément. Refuse un élément hors de la checklist de base, sans rien écrire. */
export const cocherElement = (db: Executeur, utilisateurId: string, element: string, coche: boolean) =>
  ecrireElement(db, utilisateurId, element, "coche", coche);

/** Masque ou réaffiche un élément. Refuse un élément hors de la checklist de base, sans rien écrire. */
export const masquerElement = (db: Executeur, utilisateurId: string, element: string, masque: boolean) =>
  ecrireElement(db, utilisateurId, element, "masque", masque);

// --- Éléments ajoutés par l'utilisateur -----------------------------------------------------

export interface ElementPerso {
  id: string;
  texte: string;
  coche: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Éléments ajoutés par l'utilisateur, dans l'ordre d'ajout. */
export async function lireElementsPerso(db: Executeur, utilisateurId: string): Promise<ElementPerso[]> {
  const { rows } = await db.query(
    "select id, texte, coche from public.checklist_elements_perso where utilisateur_id = $1 order by cree_le, id",
    [utilisateurId],
  );
  return rows as ElementPerso[];
}

/** Ajoute un élément et renvoie son identifiant. Le texte est débarrassé des espaces autour. */
export async function ajouterElementPerso(db: Executeur, utilisateurId: string, texte: string): Promise<string> {
  const propre = texte.trim();
  if (propre.length === 0 || propre.length > LONGUEUR_MAX_TEXTE) throw new TexteInvalideError();
  // Une seule requête : l'insertion n'a lieu que sous la limite.
  const { rows } = await db.query(
    `insert into public.checklist_elements_perso (utilisateur_id, texte)
     select $1, $2
     where (select count(*) from public.checklist_elements_perso where utilisateur_id = $1) < $3
     returning id`,
    [utilisateurId, propre, LIMITE_ELEMENTS_PERSO],
  );
  const [ligne] = rows as { id: string }[];
  if (!ligne) throw new LimiteAtteinteError();
  return ligne.id;
}

/** Coche ou décoche un élément ajouté ; refuse un élément qui n'appartient pas à l'utilisateur. */
export async function cocherElementPerso(db: Executeur, utilisateurId: string, id: string, coche: boolean): Promise<void> {
  if (!UUID.test(id)) throw new ElementInconnuError(id);
  const { rows } = await db.query(
    `update public.checklist_elements_perso set coche = $3, modifie_le = current_timestamp
     where id = $1 and utilisateur_id = $2 returning id`,
    [id, utilisateurId, coche],
  );
  if (rows.length === 0) throw new ElementInconnuError(id);
}

/** Supprime un élément ajouté ; refuse un élément qui n'appartient pas à l'utilisateur. */
export async function supprimerElementPerso(db: Executeur, utilisateurId: string, id: string): Promise<void> {
  if (!UUID.test(id)) throw new ElementInconnuError(id);
  const { rows } = await db.query(
    "delete from public.checklist_elements_perso where id = $1 and utilisateur_id = $2 returning id",
    [id, utilisateurId],
  );
  if (rows.length === 0) throw new ElementInconnuError(id);
}
