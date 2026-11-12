import "server-only";
import pg from "pg";
import { configurationConnexion } from "./config";
import type { Executeur } from "./historique";

const OPTIONS_POOL = { max: 3, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 };

let pool: pg.Pool | undefined;
let poolComptes: pg.Pool | undefined;

/** Pool Postgres partagé, créé à la première requête. DATABASE_URL vient de l'environnement, TLS vérifié imposé. */
export function connexion(): Executeur {
  pool ??= new pg.Pool({ ...configurationConnexion(process.env), ...OPTIONS_POOL });
  return pool;
}

/**
 * Pool des comptes (US-05), avec le rôle siklon_comptes : DATABASE_URL_COMPTES, TLS vérifié imposé.
 * Distinct du pool de l'historique, dont le rôle ne peut que lire.
 */
export function connexionComptes(): pg.Pool {
  if (!process.env.DATABASE_URL_COMPTES) throw new Error("Configuration Postgres refusée : DATABASE_URL_COMPTES manquante");
  poolComptes ??= new pg.Pool({
    ...configurationConnexion({ ...process.env, DATABASE_URL: process.env.DATABASE_URL_COMPTES }),
    ...OPTIONS_POOL,
  });
  return poolComptes;
}
