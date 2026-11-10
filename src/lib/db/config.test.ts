// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ConfigurationBaseError, configurationConnexion } from "./config";

const CA = "-----BEGIN CERTIFICATE-----\nMIIBcertificat\n-----END CERTIFICATE-----\n";
const SUPABASE = "postgresql://siklon_lecture.ref:secret@aws-1-eu-west-3.pooler.supabase.com:5432/postgres";

const aucunFichier = (chemin: string): string => {
  throw new Error(`lecture inattendue de ${chemin}`);
};

describe("configurationConnexion", () => {
  it("refuse l'absence de DATABASE_URL", () => {
    expect(() => configurationConnexion({}, aucunFichier)).toThrow(ConfigurationBaseError);
    expect(() => configurationConnexion({ DATABASE_URL: "" }, aucunFichier)).toThrow(/DATABASE_URL manquante/);
  });

  it("vérifie toujours le certificat d'une base distante, avec le certificat de DATABASE_CA_CERT", () => {
    const config = configurationConnexion({ DATABASE_URL: SUPABASE, DATABASE_CA_CERT: CA }, aucunFichier);
    expect(config.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
    expect(config.connectionString).toBe(SUPABASE);
  });

  it("accepte un certificat dont les retours à la ligne sont écrits « \\n »", () => {
    const config = configurationConnexion(
      { DATABASE_URL: SUPABASE, DATABASE_CA_CERT: CA.replaceAll("\n", "\\n") },
      aucunFichier,
    );
    expect(config.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it("lit le certificat désigné par sslrootcert quand DATABASE_CA_CERT est absente (développement local)", () => {
    const lus: string[] = [];
    const config = configurationConnexion(
      { DATABASE_URL: `${SUPABASE}?sslmode=verify-full&sslrootcert=/home/moi/.config/siklon/supabase-ca.crt` },
      (chemin) => {
        lus.push(chemin);
        return CA;
      },
    );
    expect(lus).toEqual(["/home/moi/.config/siklon/supabase-ca.crt"]);
    expect(config.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it("retire de la chaîne les paramètres TLS, qui écraseraient la configuration imposée", () => {
    const config = configurationConnexion(
      {
        DATABASE_URL: `${SUPABASE}?sslmode=no-verify&ssl=true&sslrootcert=/ca.crt&uselibpqcompat=true&application_name=siklon`,
        DATABASE_CA_CERT: CA,
      },
      aucunFichier,
    );
    expect(config.connectionString).toBe(`${SUPABASE}?application_name=siklon`);
    expect(config.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it("refuse une base distante sans certificat, même avec sslmode=no-verify ou disable", () => {
    for (const suffixe of ["", "?sslmode=require", "?sslmode=no-verify", "?sslmode=disable"]) {
      expect(() => configurationConnexion({ DATABASE_URL: `${SUPABASE}${suffixe}` }, aucunFichier)).toThrow(
        /certificat/,
      );
    }
  });

  it("refuse un DATABASE_CA_CERT qui n'est pas un certificat PEM", () => {
    expect(() =>
      configurationConnexion({ DATABASE_URL: SUPABASE, DATABASE_CA_CERT: "/chemin/vers/ca.crt" }, aucunFichier),
    ).toThrow(/PEM/);
  });

  it("autorise une base locale sans TLS (base de test de la CI, Postgres local)", () => {
    for (const hote of ["localhost", "127.0.0.1", "[::1]"]) {
      const url = `postgresql://siklon:ci-seulement@${hote}:5432/siklon_e2e`;
      expect(configurationConnexion({ DATABASE_URL: url }, aucunFichier)).toEqual({ connectionString: url, ssl: false });
    }
  });

  it("ne confond pas un hôte distant qui commence par « localhost » avec la machine locale", () => {
    expect(() =>
      configurationConnexion({ DATABASE_URL: "postgresql://u:p@localhost.attaquant.example:5432/db" }, aucunFichier),
    ).toThrow(/certificat/);
  });

  it("tient compte du paramètre host, qui remplace l'hôte de la chaîne", () => {
    expect(() =>
      configurationConnexion({ DATABASE_URL: "postgresql://u:p@localhost/db?host=base.example" }, aucunFichier),
    ).toThrow(/certificat/);
  });

  it("refuse une chaîne illisible sans la recopier dans le message (elle contient le mot de passe)", () => {
    let message = "";
    try {
      configurationConnexion({ DATABASE_URL: "pas une url motdepasse" }, aucunFichier);
    } catch (erreur) {
      message = (erreur as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL invalide/);
    expect(message).not.toContain("motdepasse");
  });
});
