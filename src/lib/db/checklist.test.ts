// @vitest-environment node
// État de la checklist d'un utilisateur (US-08), sur la base migrée, avec le rôle du site.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";
import {
  ajouterElementPerso,
  cocherElement,
  cocherElementPerso,
  ElementInconnuError,
  LIMITE_ELEMENTS_PERSO,
  LimiteAtteinteError,
  lireElementsCoches,
  lireElementsMasques,
  lireElementsPerso,
  masquerElement,
  supprimerElementPerso,
  TexteInvalideError,
} from "./checklist";

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

describe("masquage des éléments de base", () => {
  it("aucun élément n'est masqué au départ", async () => {
    expect(await lireElementsMasques(db, utilisateur)).toEqual([]);
  });

  it("masque puis réaffiche un élément", async () => {
    await masquerElement(db, utilisateur, "orange-bateaux", true);
    await masquerElement(db, utilisateur, "orange-elevage", true);
    expect(await lireElementsMasques(db, utilisateur)).toEqual(["orange-bateaux", "orange-elevage"]);

    await masquerElement(db, utilisateur, "orange-bateaux", false);
    expect(await lireElementsMasques(db, utilisateur)).toEqual(["orange-elevage"]);
  });

  it("garde l'élément coché quand on le masque", async () => {
    await cocherElement(db, utilisateur, "vert-eau", true);
    await masquerElement(db, utilisateur, "vert-eau", true);
    expect(await lireElementsCoches(db, utilisateur)).toEqual(["vert-eau"]);
  });

  it("refuse un élément qui n'est pas dans la checklist de base", async () => {
    await expect(masquerElement(db, utilisateur, "orange-inexistant", true)).rejects.toThrow(ElementInconnuError);
  });
});

describe("éléments ajoutés par l'utilisateur", () => {
  it("n'en a aucun au départ", async () => {
    expect(await lireElementsPerso(db, utilisateur)).toEqual([]);
  });

  it("ajoute des éléments, sans espaces autour, dans l'ordre d'ajout", async () => {
    await ajouterElementPerso(db, utilisateur, "  Croquettes du chien ");
    await ajouterElementPerso(db, utilisateur, "Lunettes de rechange");
    expect(await lireElementsPerso(db, utilisateur)).toEqual([
      { id: expect.any(String), texte: "Croquettes du chien", coche: false },
      { id: expect.any(String), texte: "Lunettes de rechange", coche: false },
    ]);
  });

  it("coche et décoche un élément ajouté", async () => {
    const id = await ajouterElementPerso(db, utilisateur, "Croquettes du chien");
    await cocherElementPerso(db, utilisateur, id, true);
    expect((await lireElementsPerso(db, utilisateur))[0].coche).toBe(true);
    await cocherElementPerso(db, utilisateur, id, false);
    expect((await lireElementsPerso(db, utilisateur))[0].coche).toBe(false);
  });

  it("supprime un élément ajouté", async () => {
    const id = await ajouterElementPerso(db, utilisateur, "Croquettes du chien");
    await ajouterElementPerso(db, utilisateur, "Lunettes de rechange");
    await supprimerElementPerso(db, utilisateur, id);
    expect((await lireElementsPerso(db, utilisateur)).map(({ texte }) => texte)).toEqual(["Lunettes de rechange"]);
  });

  it.each([
    ["vide", "   "],
    ["trop long", "a".repeat(201)],
  ])("refuse un texte %s", async (_cas, texte) => {
    await expect(ajouterElementPerso(db, utilisateur, texte)).rejects.toThrow(TexteInvalideError);
    expect(await lireElementsPerso(db, utilisateur)).toEqual([]);
  });

  it("accepte un texte de 200 caractères", async () => {
    await ajouterElementPerso(db, utilisateur, "a".repeat(200));
    expect(await lireElementsPerso(db, utilisateur)).toHaveLength(1);
  });

  it(`refuse un élément au-delà de ${LIMITE_ELEMENTS_PERSO}`, async () => {
    for (let i = 0; i < LIMITE_ELEMENTS_PERSO; i++) await ajouterElementPerso(db, utilisateur, `Élément ${i}`);
    await expect(ajouterElementPerso(db, utilisateur, "Un de trop")).rejects.toThrow(LimiteAtteinteError);
    expect(await lireElementsPerso(db, utilisateur)).toHaveLength(LIMITE_ELEMENTS_PERSO);
  });

  it("ne coche ni ne supprime l'élément d'un autre utilisateur", async () => {
    const autre = await nouvelUtilisateur();
    const id = await ajouterElementPerso(db, autre, "Croquettes du chien");

    await expect(cocherElementPerso(db, utilisateur, id, true)).rejects.toThrow(ElementInconnuError);
    await expect(supprimerElementPerso(db, utilisateur, id)).rejects.toThrow(ElementInconnuError);
    expect(await lireElementsPerso(db, autre)).toEqual([{ id, texte: "Croquettes du chien", coche: false }]);
  });

  it("refuse un identifiant mal formé", async () => {
    await expect(cocherElementPerso(db, utilisateur, "pas-un-uuid", true)).rejects.toThrow(ElementInconnuError);
    await expect(supprimerElementPerso(db, utilisateur, "pas-un-uuid")).rejects.toThrow(ElementInconnuError);
  });

  it("efface les éléments ajoutés quand le compte est supprimé", async () => {
    await ajouterElementPerso(db, utilisateur, "Croquettes du chien");
    await db.query("delete from public.utilisateurs where id = $1", [utilisateur]);
    const { rows } = await db.query("select 1 from public.checklist_elements_perso where utilisateur_id = $1", [utilisateur]);
    expect(rows).toEqual([]);
  });
});
