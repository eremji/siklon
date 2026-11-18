// Pour les tests uniquement : présente une base PGlite en mémoire comme un pool `pg`, ce que
// Better Auth (via Kysely) sait utiliser. Les requêtes passent l'une après l'autre, comme sur
// une connexion unique, ce qui suffit aux tests.
import { PGlite } from "@electric-sql/pglite";
import type { PostgresPool, PostgresPoolClient } from "kysely";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DOSSIER_MIGRATIONS = join(import.meta.dirname, "../../../supabase/migrations");

/** Base PGlite neuve, avec toutes les migrations du dépôt appliquées dans l'ordre. */
export async function baseMigree(): Promise<PGlite> {
  const db = new PGlite();
  for (const fichier of readdirSync(DOSSIER_MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(DOSSIER_MIGRATIONS, fichier), "utf8"));
  }
  return db;
}

interface ResultatPg {
  command: string;
  rowCount: number;
  rows: unknown[];
}

// Kysely ne compte les lignes touchées que si `command` vaut INSERT, UPDATE, DELETE ou MERGE.
const commande = (texte: string) => /^\s*(?:with\b[\s\S]*?\)\s*)?(\w+)/i.exec(texte)?.[1]?.toUpperCase() ?? "";

export function poolPglite(db: PGlite): PostgresPool {
  const client = {
    async query(texte: string, params?: unknown[]): Promise<ResultatPg> {
      const resultat = await db.query(texte, params);
      return {
        command: commande(texte),
        rowCount: resultat.affectedRows ?? resultat.rows.length,
        rows: resultat.rows,
      };
    },
    release() {},
  };
  // Les curseurs de `pg` (lecture en flux) ne sont pas pris en charge : ni Better Auth ni les tests
  // ne s'en servent.
  const clientPg = client as unknown as PostgresPoolClient;
  return {
    connect: async () => clientPg,
    end: async () => {},
    options: {},
  };
}
