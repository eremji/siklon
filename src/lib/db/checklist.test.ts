// @vitest-environment node
// État de la checklist d'un utilisateur (US-08), sur la base migrée, avec le rôle du site.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";
import { cocherElement, ElementInconnuError, lireElementsCoches } from "./checklist";

const DEMARRAGE_PGLITE_MS = 30_000;

let db: PGlite;
let numero = 0;

beforeAll(async () => {
  db = await baseMigree();
  await db.exec("set role siklon_comptes");
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

let utilisateur: string;
beforeEach(async () => {
  utilisateur = await nouvelUtilisateur();
});

async function nouvelUtilisateur() {
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, false, 'fr') returning id",
    [`checklist${++numero}@exemple.org`],
  );
  return id;
}

describe("état de la checklist", () => {
  it("aucun élément n'est coché au départ", async () => {
    expect(await lireElementsCoches(db, utilisateur)).toEqual([]);
  });

  it("garde les éléments cochés", async () => {
    await cocherElement(db, utilisateur, "orange-carburant", true);
    await cocherElement(db, utilisateur, "vert-eau", true);
    expect((await lireElementsCoches(db, utilisateur)).sort()).toEqual(["orange-carburant", "vert-eau"]);
  });

  it("décoche un élément et garde les autres", async () => {
    await cocherElement(db, utilisateur, "orange-carburant", true);
    await cocherElement(db, utilisateur, "vert-eau", true);
    await cocherElement(db, utilisateur, "orange-carburant", false);
    expect(await lireElementsCoches(db, utilisateur)).toEqual(["vert-eau"]);
  });

  it("accepte de cocher deux fois le même élément", async () => {
    await cocherElement(db, utilisateur, "vert-eau", true);
    await cocherElement(db, utilisateur, "vert-eau", true);
    expect(await lireElementsCoches(db, utilisateur)).toEqual(["vert-eau"]);
  });

  it("refuse un élément qui n'est pas dans la checklist de base, sans rien écrire", async () => {
    await expect(cocherElement(db, utilisateur, "orange-inexistant", true)).rejects.toThrow(ElementInconnuError);
    expect(await lireElementsCoches(db, utilisateur)).toEqual([]);
  });

  it("ne touche pas à l'état des autres utilisateurs", async () => {
    const autre = await nouvelUtilisateur();
    await cocherElement(db, autre, "vert-eau", true);
    await cocherElement(db, utilisateur, "vert-radio", true);
    expect(await lireElementsCoches(db, autre)).toEqual(["vert-eau"]);
  });

  it("efface l'état quand le compte est supprimé", async () => {
    await cocherElement(db, utilisateur, "vert-eau", true);
    await db.query("delete from public.utilisateurs where id = $1", [utilisateur]);
    const { rows } = await db.query("select 1 from public.checklist_elements where utilisateur_id = $1", [utilisateur]);
    expect(rows).toEqual([]);
  });
});
