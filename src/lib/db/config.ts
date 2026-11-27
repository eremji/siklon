// Configuration de connexion Postgres, partagée par le site et le script d'import.
// Toute base distante est jointe en TLS avec vérification du certificat (équivalent de
// sslmode=verify-full), quels que soient les paramètres TLS écrits dans DATABASE_URL.
import { readFileSync } from "node:fs";

export class ConfigurationBaseError extends Error {
  constructor(raison: string) {
    super(`Configuration Postgres refusée : ${raison}`);
    this.name = "ConfigurationBaseError";
  }
}

export interface ConfigurationConnexion {
  connectionString: string;
  ssl: false | { ca: string; rejectUnauthorized: true };
}

// Hôtes de la machine elle-même (base de test de la CI, Postgres local) : TLS facultatif.
const HOTES_LOCAUX = new Set(["localhost", "127.0.0.1", "[::1]", ""]);

// Paramètres que `pg` lit dans la chaîne et qui écraseraient l'option `ssl` passée à côté.
const estParametreTls = (nom: string) => nom.startsWith("ssl") || nom === "uselibpqcompat";

const DEBUT_PEM = "-----BEGIN CERTIFICATE-----";

function lireUrl(chaine: string): URL {
  try {
    return new URL(chaine);
  } catch {
    // Le message de l'erreur d'origine recopie la chaîne, donc le mot de passe.
    throw new ConfigurationBaseError("DATABASE_URL invalide");
  }
}

export function configurationConnexion(
  env: Record<string, string | undefined>,
  lireFichier: (chemin: string) => string = (chemin) => readFileSync(chemin, "utf8"),
): ConfigurationConnexion {
  const chaine = env.DATABASE_URL;
  if (!chaine) throw new ConfigurationBaseError("DATABASE_URL manquante");

  const url = lireUrl(chaine);
  const hote = url.searchParams.get("host") ?? url.hostname;
  if (HOTES_LOCAUX.has(hote) || hote.startsWith("/")) return { connectionString: chaine, ssl: false };

  const cheminCa = url.searchParams.get("sslrootcert");
  const ca = env.DATABASE_CA_CERT ? env.DATABASE_CA_CERT.replaceAll("\\n", "\n") : cheminCa ? lireFichier(cheminCa) : "";
  if (!ca) {
    throw new ConfigurationBaseError(
      "certificat racine requis pour une base distante (DATABASE_CA_CERT, ou sslrootcert en local)",
    );
  }
  if (!ca.includes(DEBUT_PEM)) throw new ConfigurationBaseError("le certificat racine doit être au format PEM");

  const parametresTls = [...url.searchParams.keys()].filter(estParametreTls);
  for (const nom of parametresTls) url.searchParams.delete(nom);
  return {
    connectionString: parametresTls.length > 0 ? url.toString() : chaine,
    ssl: { ca, rejectUnauthorized: true },
  };
}

export interface OptionsPool {
  max: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
}

// 3 connexions par instance Vercel : le pooler Supabase partage les siennes entre toutes les instances.
const MAX_POOL_PAR_DEFAUT = 3;
const MAX_POOL_LIMITE = 50;

/**
 * Options des pools Postgres. DATABASE_POOL_MAX agrandit le pool d'un serveur qui reçoit beaucoup de
 * requêtes à la fois depuis une seule instance (serveur des tests e2e) ; elle n'est pas définie sur
 * Vercel, où la taille reste celle par défaut.
 */
export function optionsPool(env: Record<string, string | undefined>): OptionsPool {
  const valeur = env.DATABASE_POOL_MAX;
  let max = MAX_POOL_PAR_DEFAUT;
  if (valeur !== undefined && valeur !== "") {
    max = /^\d+$/.test(valeur) ? Number(valeur) : Number.NaN;
    if (!(max >= 1 && max <= MAX_POOL_LIMITE)) {
      throw new ConfigurationBaseError(`DATABASE_POOL_MAX doit être un entier entre 1 et ${MAX_POOL_LIMITE}`);
    }
  }
  return { max, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 };
}
