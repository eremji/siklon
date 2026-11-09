import "server-only";
import pg from "pg";
import type { Executeur } from "./historique";

let pool: pg.Pool | undefined;

/** Pool Postgres partagé, créé à la première requête. DATABASE_URL vient de l'environnement. */
export function connexion(): Executeur {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL manquante");
  pool ??= new pg.Pool({ connectionString, max: 3, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 });
  return pool;
}
