// @vitest-environment node
// Droits des rôles de l'API Supabase (#80) : Siklon ne passe jamais par cette API, donc anon et
// authenticated ne doivent avoir aucun droit dans `public`, même si une RLS venait à manquer.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";

// Démarrer PGlite et appliquer les migrations prend plusieurs secondes quand les fichiers tournent en parallèle.
const DEMARRAGE_PGLITE_MS = 30_000;

// Ce que Supabase met en place sur tout projet neuf : les rôles de l'API, et tous les droits
// par défaut sur ce que le rôle des migrations crée dans `public`.
const SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

// Droits accordés à anon ou authenticated sur les tables, séquences et fonctions de `public`.
const DROITS_PUBLICS = `
  select objet, role, droit from (
    select c.relname as objet, a.grantee, a.privilege_type as droit
      from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
      where n.nspname = 'public'
    union all
    select p.proname, a.grantee, a.privilege_type
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace, aclexplode(p.proacl) a
      where n.nspname = 'public'
  ) d join (select oid, rolname as role from pg_roles where rolname in ('anon', 'authenticated')) r on r.oid = d.grantee
  order by objet, role, droit
`;

let db: PGlite;

beforeAll(async () => {
  db = await baseMigree(SUPABASE);
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

describe("droits des rôles de l'API Supabase", () => {
  it("anon et authenticated n'ont aucun droit sur les tables et séquences existantes", async () => {
    expect((await db.query(DROITS_PUBLICS)).rows).toEqual([]);
  });

  it("une table, une séquence ou une fonction créée plus tard ne leur donne aucun droit", async () => {
    await db.exec(`
      create table public.essai_futur (id bigint generated always as identity primary key);
      create function public.essai_futur_f() returns integer language sql as 'select 1';
    `);
    try {
      expect((await db.query(DROITS_PUBLICS)).rows).toEqual([]);
    } finally {
      await db.exec("drop function public.essai_futur_f(); drop table public.essai_futur;");
    }
  });

  it("anon ne lit ni l'historique ni les comptes", async () => {
    for (const table of ["hurdat2_tempetes", "utilisateurs", "comptes_lies"]) {
      await expect(enTantQue("anon", () => db.query(`select 1 from public.${table}`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  it.each(["abonnements_push", "preferences_alertes"])("seul siklon_comptes accède à %s (US-07)", async (table) => {
    for (const role of ["anon", "authenticated", "siklon_lecture", "siklon_import"]) {
      await expect(enTantQue(role, () => db.query(`select 1 from public.${table}`))).rejects.toThrow(/permission denied/);
    }
    await expect(enTantQue("siklon_comptes", () => db.query(`select 1 from public.${table}`))).resolves.toBeDefined();
  });

  it.each(["checklist_elements", "checklist_elements_perso"])("seul siklon_comptes accède à la table %s (US-08)", async (table) => {
    for (const role of ["anon", "authenticated", "siklon_lecture", "siklon_import"]) {
      await expect(enTantQue(role, () => db.query(`select 1 from public.${table}`))).rejects.toThrow(/permission denied/);
    }
    await expect(enTantQue("siklon_comptes", () => db.query(`select 1 from public.${table}`))).resolves.toBeDefined();
  });

  it("les rôles du site gardent leurs droits", async () => {
    await expect(enTantQue("siklon_lecture", () => db.query("select 1 from public.hurdat2_tempetes"))).resolves.toBeDefined();
    await expect(enTantQue("siklon_import", () => db.query("delete from public.passages_iles"))).resolves.toBeDefined();
    await expect(enTantQue("siklon_comptes", () => db.query("select 1 from public.utilisateurs"))).resolves.toBeDefined();
  });
});
