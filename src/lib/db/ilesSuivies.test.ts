// @vitest-environment node
// Îles suivies par un utilisateur (US-05), sur la base migrée, avec le rôle du site.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";
import { enregistrerIlesSuivies, IleInconnueError, lireIlesSuivies } from "./ilesSuivies";

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
    [`personne${++numero}@exemple.org`],
  );
  return id;
}

describe("îles suivies", () => {
  it("aucune île n'est suivie au départ", async () => {
    expect(await lireIlesSuivies(db, utilisateur)).toEqual([]);
  });

  it("enregistre les îles cochées et les rend dans l'ordre de la liste des îles", async () => {
    await enregistrerIlesSuivies(db, utilisateur, ["martinique", "guadeloupe"]);
    expect(await lireIlesSuivies(db, utilisateur)).toEqual(["guadeloupe", "martinique"]);
  });

  it("retire les îles décochées et garde les autres", async () => {
    await enregistrerIlesSuivies(db, utilisateur, ["guadeloupe", "martinique", "dominique"]);
    await enregistrerIlesSuivies(db, utilisateur, ["martinique"]);
    expect(await lireIlesSuivies(db, utilisateur)).toEqual(["martinique"]);
  });

  it("peut tout retirer", async () => {
    await enregistrerIlesSuivies(db, utilisateur, ["guadeloupe"]);
    await enregistrerIlesSuivies(db, utilisateur, []);
    expect(await lireIlesSuivies(db, utilisateur)).toEqual([]);
  });

  it("ignore une île cochée deux fois", async () => {
    await enregistrerIlesSuivies(db, utilisateur, ["guadeloupe", "guadeloupe"]);
    expect(await lireIlesSuivies(db, utilisateur)).toEqual(["guadeloupe"]);
  });

  it("refuse une île inconnue et ne change rien", async () => {
    await enregistrerIlesSuivies(db, utilisateur, ["guadeloupe"]);
    await expect(enregistrerIlesSuivies(db, utilisateur, ["martinique", "atlantide"])).rejects.toThrow(IleInconnueError);
    expect(await lireIlesSuivies(db, utilisateur)).toEqual(["guadeloupe"]);
  });

  it("ne touche pas aux îles des autres utilisateurs", async () => {
    const autre = await nouvelUtilisateur();
    await enregistrerIlesSuivies(db, autre, ["haiti"]);
    await enregistrerIlesSuivies(db, utilisateur, ["jamaique"]);
    await enregistrerIlesSuivies(db, utilisateur, []);
    expect(await lireIlesSuivies(db, autre)).toEqual(["haiti"]);
  });
});
