// @vitest-environment node
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationEmailError, choisirServiceEmails, EXPEDITEUR, serviceDossier } from "./configuration";

describe("choisirServiceEmails", () => {
  it("écrit les emails dans un dossier local pour les tests e2e", () => {
    expect(choisirServiceEmails({ EMAILS_DOSSIER: "/tmp/emails", BREVO_API_KEY: "cle" }).type).toBe("dossier");
  });

  it("ignore le dossier local sur Vercel et passe par Brevo", () => {
    expect(choisirServiceEmails({ EMAILS_DOSSIER: "/tmp/emails", BREVO_API_KEY: "cle", VERCEL_ENV: "preview" }).type).toBe(
      "brevo",
    );
  });

  it("passe par Brevo quand la clé est fournie", () => {
    expect(choisirServiceEmails({ BREVO_API_KEY: "cle", NODE_ENV: "production" }).type).toBe("brevo");
  });

  it("refuse de démarrer en production sans clé Brevo", () => {
    expect(() => choisirServiceEmails({ NODE_ENV: "production" })).toThrow(ConfigurationEmailError);
    expect(() => choisirServiceEmails({ NODE_ENV: "production" })).toThrow("BREVO_API_KEY manquante");
  });

  it("affiche les emails dans la console en développement, sans clé", () => {
    expect(choisirServiceEmails({ NODE_ENV: "development" }).type).toBe("console");
  });

  it("envoie depuis l'adresse dédiée du sous-domaine authentifié chez Brevo", () => {
    expect(EXPEDITEUR).toEqual({ nom: "Siklon", email: "noreply@siklon.mj-soft.fr" });
  });
});

describe("serviceDossier", () => {
  let dossier: string;
  beforeEach(async () => {
    dossier = await mkdtemp(join(tmpdir(), "siklon-emails-"));
  });
  afterEach(async () => {
    await rm(dossier, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const message = (a: string) => ({ a, sujet: "Sujet", texte: "Texte", html: "<p>HTML</p>" });

  it("écrit chaque email dans un fichier JSON", async () => {
    await serviceDossier(dossier).envoyer(message("a@b.fr"));
    const fichiers = await readdir(dossier);
    expect(fichiers).toHaveLength(1);
    expect(JSON.parse(await readFile(join(dossier, fichiers[0]), "utf8"))).toEqual(message("a@b.fr"));
  });

  it("efface les emails d'une adresse, et seulement ceux-là", async () => {
    const service = serviceDossier(dossier);
    await service.envoyer(message("a@b.fr"));
    await service.envoyer(message("ba@b.fr"));
    await service.envoyer(message("a@b.fr"));
    await service.effacer("a@b.fr");
    const restants = await readdir(dossier);
    expect(restants).toHaveLength(1);
    expect(JSON.parse(await readFile(join(dossier, restants[0]), "utf8")).a).toBe("ba@b.fr");
  });
});
