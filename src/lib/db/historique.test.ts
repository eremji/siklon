// @vitest-environment node
// Tests d'intégration sur un vrai Postgres en mémoire (PGlite), avec les migrations du dépôt.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PassageIle } from "../hurdat2/passages";
import type { TempeteHurdat2 } from "../hurdat2/parseur";
import { type ImportHistorique, lireDernierImport, lirePassages, lireTempete, remplacerHistorique } from "./historique";

const DOSSIER_MIGRATIONS = join(import.meta.dirname, "../../../supabase/migrations");

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  for (const fichier of readdirSync(DOSSIER_MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(DOSSIER_MIGRATIONS, fichier), "utf8"));
  }
});

afterAll(async () => {
  await db.close();
});

const tempete = (id: string, annee: number, nom: string): TempeteHurdat2 => ({
  id,
  bassin: "AL",
  numero: +id.slice(2, 4),
  annee,
  nom,
  points: [
    { horodatage: new Date(Date.UTC(annee, 8, 1, 0)), identifiant: null, statut: "TS", lat: 15, lon: -60, ventKt: 50, pressionMb: 1000 },
    { horodatage: new Date(Date.UTC(annee, 8, 1, 6)), identifiant: "L", statut: "HU", lat: 16.2, lon: -61.5, ventKt: 120, pressionMb: null },
  ],
});

const passage = (tempeteId: string, ileSlug: string, annee: number, categorie: PassageIle["categorie"]): PassageIle => ({
  ileSlug,
  tempeteId,
  distanceMinKm: 12.5,
  horodatage: new Date(Date.UTC(annee, 8, 1, 6)),
  ventMaxKt: 120,
  categorie,
});

const donnees = (versionNhc = "2025-04-04"): ImportHistorique => ({
  fichier: "hurdat2-1851-2024-040425.txt",
  sha256: "a".repeat(64),
  versionNhc,
  tempetes: [tempete("AL111989", 1989, "HUGO"), tempete("AL152017", 2017, "MARIA"), tempete("AL031899", 1899, "UNNAMED")],
  passages: [
    passage("AL111989", "guadeloupe", 1989, 4),
    passage("AL152017", "guadeloupe", 2017, 5),
    passage("AL031899", "guadeloupe", 1899, 0),
    passage("AL152017", "dominique", 2017, 5),
  ],
});

beforeEach(async () => {
  await db.exec("truncate public.hurdat2_tempetes, public.hurdat2_imports cascade");
  await remplacerHistorique(db, donnees());
});

describe("lirePassages", () => {
  it("liste les passages de l'île, du plus récent au plus ancien", async () => {
    const passages = await lirePassages(db, { ileSlug: "guadeloupe" });
    expect(passages.map((p) => p.nom)).toEqual(["MARIA", "HUGO", "UNNAMED"]);
    expect(passages[0]).toEqual({
      tempeteId: "AL152017",
      nom: "MARIA",
      annee: 2017,
      distanceMinKm: 12.5,
      horodatage: new Date(Date.UTC(2017, 8, 1, 6)),
      ventMaxKt: 120,
      categorie: 5,
    });
  });

  it("ne renvoie que les passages de l'île demandée", async () => {
    expect((await lirePassages(db, { ileSlug: "dominique" })).map((p) => p.nom)).toEqual(["MARIA"]);
  });

  it("filtre par catégorie minimale", async () => {
    const passages = await lirePassages(db, { ileSlug: "guadeloupe", categorieMin: 4 });
    expect(passages.map((p) => p.nom)).toEqual(["MARIA", "HUGO"]);
  });

  it("filtre par période, bornes incluses", async () => {
    expect((await lirePassages(db, { ileSlug: "guadeloupe", anneeMin: 1899, anneeMax: 1989 })).map((p) => p.nom)).toEqual([
      "HUGO",
      "UNNAMED",
    ]);
    expect((await lirePassages(db, { ileSlug: "guadeloupe", anneeMin: 2000 })).map((p) => p.nom)).toEqual(["MARIA"]);
  });

  it("traite le slug comme une valeur, jamais comme du SQL", async () => {
    expect(await lirePassages(db, { ileSlug: "guadeloupe' or '1'='1" })).toEqual([]);
  });
});

describe("lireTempete", () => {
  it("renvoie la tempête et toute sa trajectoire, dans l'ordre", async () => {
    const hugo = await lireTempete(db, "AL111989");
    expect(hugo).toMatchObject({ id: "AL111989", nom: "HUGO", annee: 1989 });
    expect(hugo?.points).toEqual(tempete("AL111989", 1989, "HUGO").points);
  });

  it("renvoie null pour une tempête inconnue", async () => {
    expect(await lireTempete(db, "AL991999")).toBeNull();
  });
});

describe("remplacerHistorique", () => {
  it("enregistre la version du fichier importé", async () => {
    expect(await lireDernierImport(db)).toMatchObject({
      fichier: "hurdat2-1851-2024-040425.txt",
      versionNhc: "2025-04-04",
      nbTempetes: 3,
    });
  });

  it("remplace l'import précédent sans doublon", async () => {
    await remplacerHistorique(db, donnees("2026-04-10"));
    expect(await lirePassages(db, { ileSlug: "guadeloupe" })).toHaveLength(3);
    expect((await lireDernierImport(db))?.versionNhc).toBe("2026-04-10");
  });

  it("annule tout si une ligne est refusée par la base", async () => {
    const invalide = donnees("2026-04-10");
    invalide.passages.push(passage("AL000000", "guadeloupe", 2020, 1));
    await expect(remplacerHistorique(db, invalide)).rejects.toThrow();
    expect(await lirePassages(db, { ileSlug: "guadeloupe" })).toHaveLength(3);
    expect((await lireDernierImport(db))?.versionNhc).toBe("2025-04-04");
  });
});

describe("rôles de connexion", () => {
  const enTantQue = async <T>(role: string, action: () => Promise<T>): Promise<T> => {
    await db.exec(`set role ${role}`);
    try {
      return await action();
    } finally {
      await db.exec("reset role");
    }
  };

  it("siklon_lecture lit l'historique malgré RLS", async () => {
    const passages = await enTantQue("siklon_lecture", () => lirePassages(db, { ileSlug: "guadeloupe" }));
    expect(passages).toHaveLength(3);
    expect(await enTantQue("siklon_lecture", () => lireTempete(db, "AL111989"))).not.toBeNull();
    expect(await enTantQue("siklon_lecture", () => lireDernierImport(db))).not.toBeNull();
  });

  it("siklon_lecture ne peut rien modifier", async () => {
    await expect(enTantQue("siklon_lecture", () => db.query("delete from public.hurdat2_tempetes"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("siklon_import remplace tout l'historique", async () => {
    await enTantQue("siklon_import", () => remplacerHistorique(db, donnees("2026-04-10")));
    expect(await lirePassages(db, { ileSlug: "guadeloupe" })).toHaveLength(3);
    expect((await lireDernierImport(db))?.versionNhc).toBe("2026-04-10");
  });

  it("aucun rôle de l'API Supabase n'existe ici : les tables ne leur sont pas ouvertes", async () => {
    const { rows } = await db.query(
      "select count(*)::int as n from pg_policies where schemaname = 'public' and not ('siklon_lecture' = any(roles) or 'siklon_import' = any(roles))",
    );
    expect(rows).toEqual([{ n: 0 }]);
  });
});
