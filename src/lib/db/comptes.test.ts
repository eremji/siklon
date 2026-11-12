// @vitest-environment node
// Migration des comptes (US-05) : conforme à ce qu'attend Better Auth, et droits minimaux.
import type { PGlite } from "@electric-sql/pglite";
import { getMigrations } from "better-auth/db/migration";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { optionsAuth } from "../auth/options";
import { baseMigree, poolPglite } from "../test/poolPglite";

// Démarrer PGlite et appliquer les migrations prend plusieurs secondes quand les fichiers tournent en parallèle.
const DEMARRAGE_PGLITE_MS = 30_000;

const TABLES_COMPTES = ["utilisateurs", "sessions", "comptes_lies", "verifications", "limites_tentatives"];

let db: PGlite;

beforeAll(async () => {
  db = await baseMigree();
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

const enTantQue = async <T>(role: string, action: () => Promise<T>): Promise<T> => {
  await db.exec(`set role ${role}`);
  try {
    return await action();
  } finally {
    await db.exec("reset role");
  }
};

describe("migration des comptes", () => {
  it("crée exactement le schéma attendu par Better Auth", async () => {
    const options = optionsAuth({ database: poolPglite(db), secret: "s".repeat(32), baseURL: "http://localhost:3000" });
    const ecarts = await getMigrations(options);
    expect(ecarts.toBeCreated).toEqual([]);
    expect(ecarts.toBeAdded).toEqual([]);
    expect(ecarts.toBeAddedIndexes).toEqual([]);
    expect(ecarts.schemaProblems).toEqual([]);
  });

  it("refuse une langue autre que fr ou en", async () => {
    await expect(
      db.query(
        "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', 'a@exemple.org', false, 'de')",
      ),
    ).rejects.toThrow(/check/);
  });

  it("active RLS sur toutes les tables des comptes", async () => {
    const { rows } = await db.query<{ relname: string }>(
      "select relname from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity and relname = any($1)",
      [TABLES_COMPTES],
    );
    expect(rows.map((r) => r.relname).sort()).toEqual([...TABLES_COMPTES].sort());
  });

  it("supprimer un utilisateur supprime ses sessions et ses comptes liés", async () => {
    const {
      rows: [{ id }],
    } = await db.query<{ id: string }>(
      "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', 'b@exemple.org', false, 'fr') returning id",
    );
    await db.query(
      "insert into public.sessions (utilisateur_id, jeton, expire_le, modifie_le) values ($1, 'jeton-b', now() + interval '1 day', now())",
      [id],
    );
    await db.query(
      "insert into public.comptes_lies (utilisateur_id, fournisseur, compte_fournisseur, modifie_le) values ($1, 'credential', $2, now())",
      [id, id],
    );
    await db.query("delete from public.utilisateurs where id = $1", [id]);
    const { rows } = await db.query<{ n: number }>(
      "select (select count(*) from public.sessions where utilisateur_id = $1)::int + (select count(*) from public.comptes_lies where utilisateur_id = $1)::int as n",
      [id],
    );
    expect(rows[0].n).toBe(0);
  });
});

describe("rôles", () => {
  it("siklon_comptes lit et écrit les tables des comptes malgré RLS", async () => {
    await enTantQue("siklon_comptes", async () => {
      for (const table of TABLES_COMPTES) {
        await expect(db.query(`select count(*) from public.${table}`)).resolves.toBeDefined();
      }
      const {
        rows: [{ id }],
      } = await db.query<{ id: string }>(
        "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', 'c@exemple.org', false, 'en') returning id",
      );
      await db.query("update public.utilisateurs set email_verifie = true where id = $1", [id]);
      await db.query("delete from public.utilisateurs where id = $1", [id]);
    });
  });

  it("siklon_comptes n'a aucun accès à l'historique", async () => {
    await expect(enTantQue("siklon_comptes", () => db.query("select * from public.hurdat2_tempetes"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it.each(["siklon_lecture", "siklon_import"])("%s n'a aucun accès aux comptes", async (role) => {
    for (const table of TABLES_COMPTES) {
      await expect(enTantQue(role, () => db.query(`select * from public.${table}`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });
});
