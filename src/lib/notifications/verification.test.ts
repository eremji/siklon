// @vitest-environment node
// Vérification planifiée des alertes (US-07, livraison 3) : base migrée, sources simulées (fixtures
// NHC locales, vigilance choisie), vrai envoi web push vers un service push simulé (aucun réseau).
import type { PGlite } from "@electric-sql/pglite";
import { createECDH, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVAPIDKeys } from "web-push";
import { enregistrerAbonnement } from "../db/abonnementsPush";
import { enregistrerIlesSuivies } from "../db/ilesSuivies";
import { lireNiveauxIles } from "../db/notifications";
import { type FichierVigilance, trouverIle } from "../iles";
import type { EtatAlertesNhc } from "../nhc/alertes";
import type { EtatFlux } from "../nhc/client";
import { evaluerMenaces } from "../nhc/menace";
import type { PositionsPrevues } from "../nhc/positions";
import { etatFixture, positionsFixture } from "../nhc/source";
import { baseMigree } from "../test/poolPglite";
import type { EtatVigilance } from "../vigilance/vigilance";
import { envoyerPush } from "./push";
import { type SourcesAlertes, verifierAlertes } from "./verification";

const DEMARRAGE_PGLITE_MS = 30_000;
const BASE = "https://siklon.exemple";
const LU_LE = "2026-09-10T15:00:00.000Z";
const VAPID = { subject: "mailto:alertes@exemple.org", ...generateVAPIDKeys() };

let db: PGlite;
let numero = 0;

beforeEach(async () => {
  db = await baseMigree();
  await db.exec("set role siklon_comptes");
}, DEMARRAGE_PGLITE_MS);

afterEach(async () => {
  vi.restoreAllMocks();
  await db.close();
});

/** Utilisateur à l'adresse confirmée, qui suit ces îles avec un appareil abonné. */
async function abonne(iles: string[]): Promise<{ id: string; endpoint: string }> {
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, true, 'fr') returning id",
    [`verif${++numero}@exemple.org`],
  );
  await enregistrerIlesSuivies(db, id, iles);
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const endpoint = `https://fcm.googleapis.com/fcm/send/appareil-${numero}`;
  await enregistrerAbonnement(db, id, {
    endpoint,
    cles: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") },
  });
  return { id, endpoint };
}

interface Situation {
  flux?: EtatFlux;
  positions?: Record<string, PositionsPrevues>;
  vigilance?: Partial<Record<FichierVigilance, EtatVigilance>>;
  nhc?: Record<string, EtatAlertesNhc>;
}

const VERT: EtatVigilance = { etat: "ok", niveau: "vert", misAJour: "2026-09-10T12:00:00.000Z" };

function sources({ flux = etatFixture("vide", LU_LE), positions = {}, vigilance = {}, nhc = {} }: Situation = {}): SourcesAlertes {
  return {
    flux: async () => flux,
    positions: async () => positions,
    vigilance: async (fichier) => vigilance[fichier] ?? VERT,
    alertesNhc: async (ile) => nhc[ile.slug] ?? { etat: "ok", alertes: [], luLe: LU_LE },
  };
}

/** Service push simulé : garde l'endpoint de chaque notification reçue. */
function servicePush() {
  const recus: string[] = [];
  const fetch = vi.fn(async (url: string | URL | Request) => {
    recus.push(String(url));
    return new Response(null, { status: 201 });
  }) as unknown as typeof globalThis.fetch;
  return { recus, envoyer: (alerte: Parameters<typeof envoyerPush>[1]) => envoyerPush(db, alerte, { vapid: VAPID, fetch }) };
}

const verifier = (situation: Situation, envoyer: ReturnType<typeof servicePush>["envoyer"]) =>
  verifierAlertes(db, sources(situation), { canaux: [envoyer], base: BASE });

describe("entrée d'un système dans le rayon d'une île", () => {
  const KYLE = { flux: etatFixture("actifs", LU_LE), positions: positionsFixture("actifs") };

  it("prévient une seule fois chaque abonné qui suit l'île menacée", async () => {
    const guadeloupe = await abonne(["guadeloupe"]);
    const service = servicePush();

    const premier = await verifier(KYLE, service.envoyer);
    const second = await verifier(KYLE, service.envoyer);

    expect(service.recus).toEqual([guadeloupe.endpoint]);
    expect(premier.envoyes).toBe(1);
    expect(second.envoyes).toBe(0);
  });

  it("ne prévient pas un utilisateur qui ne suit que des îles hors de portée", async () => {
    const flux = KYLE.flux;
    if (flux.etat !== "ok") throw new Error("fixture « actifs » illisible");
    // Précondition : Kyle ne passe pas dans le rayon de la Jamaïque.
    expect(evaluerMenaces(trouverIle("jamaique")!, flux.systemes, KYLE.positions).menaces).toEqual([]);
    const jamaique = await abonne(["jamaique"]);
    const service = servicePush();

    await verifier(KYLE, service.envoyer);

    expect(service.recus).not.toContain(jamaique.endpoint);
  });
});

describe("changement du niveau d'alerte d'une île", () => {
  it("au premier passage, enregistre le niveau de chaque île sans prévenir s'il n'y a pas d'alerte", async () => {
    await abonne(["guadeloupe", "cuba"]);
    const service = servicePush();

    const bilan = await verifier({}, service.envoyer);

    expect(service.recus).toEqual([]);
    expect(bilan.evenements).toBe(0);
    const niveaux = await lireNiveauxIles(db);
    expect(niveaux.get("guadeloupe")).toBe("vert");
    expect(niveaux.get("cuba")).toBe("aucune");
  });

  it("prévient une seule fois d'un changement de vigilance Météo-France", async () => {
    const guadeloupe = await abonne(["guadeloupe"]);
    const martinique = await abonne(["martinique"]);
    const service = servicePush();
    const orange = { CDPV85TFFR: { etat: "ok", niveau: "orange", misAJour: "2026-09-10T16:00:00.000Z" } as const };

    await verifier({}, service.envoyer);
    await verifier({ vigilance: orange }, service.envoyer);
    await verifier({ vigilance: orange }, service.envoyer);

    expect(service.recus).toEqual([guadeloupe.endpoint]);
    expect(service.recus).not.toContain(martinique.endpoint);
    expect((await lireNiveauxIles(db)).get("guadeloupe")).toBe("orange");
  });

  it("prévient d'un nouveau watch/warning NHC pour une île sans vigilance Météo-France", async () => {
    const cuba = await abonne(["cuba"]);
    const service = servicePush();
    const veille: EtatAlertesNhc = {
      etat: "ok",
      luLe: LU_LE,
      alertes: [
        {
          code: "HWA",
          systeme: { id: "al112026", nom: "Kyle", classification: "HU", ventKt: 120 },
          avis: { numero: "12", emisLe: "2026-09-10T15:00:00.000Z" },
        },
      ],
    };

    await verifier({}, service.envoyer);
    const bilan = await verifier({ nhc: { cuba: veille } }, service.envoyer);

    expect(bilan.evenements).toBe(1);
    expect(service.recus).toEqual([cuba.endpoint]);
    expect((await lireNiveauxIles(db)).get("cuba")).toBe("HWA");
  });

  it("source indisponible : ni alerte, ni changement du niveau connu", async () => {
    const guadeloupe = await abonne(["guadeloupe"]);
    const service = servicePush();

    await verifier({}, service.envoyer);
    await verifier({ vigilance: { CDPV85TFFR: { etat: "indisponible" } } }, service.envoyer);

    expect(service.recus).not.toContain(guadeloupe.endpoint);
    expect((await lireNiveauxIles(db)).get("guadeloupe")).toBe("vert");
  });
});

describe("robustesse", () => {
  it("une source qui rejette n'empêche pas de vérifier les autres îles", async () => {
    const martinique = await abonne(["martinique"]);
    const service = servicePush();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const enPanne: SourcesAlertes = {
      ...sources({ vigilance: { CDPV85TFFF: { etat: "ok", niveau: "jaune", misAJour: "2026-09-10T16:00:00.000Z" } } }),
      flux: async () => {
        throw new Error("NHC injoignable");
      },
    };

    const bilan = await verifierAlertes(db, enPanne, { canaux: [service.envoyer], base: BASE });

    expect(service.recus).toEqual([martinique.endpoint]);
    expect(bilan.envoyes).toBe(1);
  });

  it("un envoi qui échoue pour un utilisateur n'empêche pas les autres, sans donnée personnelle au journal", async () => {
    const [premier, second] = [await abonne(["guadeloupe"]), await abonne(["guadeloupe"])];
    const service = servicePush();
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const envoyer: typeof service.envoyer = async (alerte) => {
      if (alerte.destinataire.id === premier.id) throw new Error(`base injoignable pour ${alerte.destinataire.email}`);
      return service.envoyer(alerte);
    };
    const jaune = { CDPV85TFFR: { etat: "ok", niveau: "jaune", misAJour: "2026-09-10T16:00:00.000Z" } as const };

    const bilan = await verifierAlertes(db, sources({ vigilance: jaune }), { canaux: [envoyer], base: BASE });

    expect(service.recus).toEqual([second.endpoint]);
    expect(bilan).toMatchObject({ evenements: 1, envoyes: 1, echecs: 1 });
    const ecrit = journal.mock.calls.flat().join(" ");
    expect(ecrit).toContain("[alertes]");
    expect(ecrit).not.toContain(premier.id);
    expect(ecrit).not.toContain("@exemple.org");
  });

  it("prévient par chaque canal, et la panne d'un canal n'empêche pas l'autre", async () => {
    const guadeloupe = await abonne(["guadeloupe"]);
    const service = servicePush();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const enPanne = vi.fn(async () => {
      throw new Error("Brevo injoignable");
    });
    const jaune = { CDPV85TFFR: { etat: "ok", niveau: "jaune", misAJour: "2026-09-10T16:00:00.000Z" } as const };

    const bilan = await verifierAlertes(db, sources({ vigilance: jaune }), { canaux: [enPanne, service.envoyer], base: BASE });

    expect(enPanne).toHaveBeenCalledOnce();
    expect(service.recus).toEqual([guadeloupe.endpoint]);
    expect(bilan).toMatchObject({ envoyes: 1, echecs: 1 });
  });
});
