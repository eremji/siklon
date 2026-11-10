import "server-only";
import pg from "pg";
import { configurationConnexion } from "./config";
import type { Executeur } from "./historique";

let pool: pg.Pool | undefined;

/** Pool Postgres partagé, créé à la première requête. DATABASE_URL vient de l'environnement, TLS vérifié imposé. */
export function connexion(): Executeur {
  pool ??= new pg.Pool({
    ...configurationConnexion(process.env),
    max: 3,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });
  return pool;
}
