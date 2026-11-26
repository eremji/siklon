// @vitest-environment node
// Vérification planifiée des alertes (US-07, livraison 3) : base migrée, sources simulées (fixtures
// NHC locales, vigilance choisie), vrai envoi web push vers un service push simulé (aucun réseau).
import type { PGlite } from "@electric-sql/pglite";
import { createECDH, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVAPIDKeys } from "web-push";
import { enregistrerAbonnement } from "../db/abonnementsPush";
import { lireDerniereLecture } from "../db/dernieresLectures";
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
import { type Canal, type SourcesAlertes, verifierAlertes } from "./verification";

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
async function abonne(iles: string[], langue: "fr" | "en" = "fr"): Promise<{ id: string; endpoint: string }> {
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, true, $2) returning id",
    [`verif${++numero}@exemple.org`, langue],
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

describe("langue du compte (US-10)", () => {
  it("prévient chaque abonné dans la langue de son compte", async () => {
    const francais = await abonne(["guadeloupe"], "fr");
    const anglais = await abonne(["guadeloupe"], "en");
    const recues: { id: string; titre: string; lien: string; langue: string }[] = [];
    const canal: Canal = async ({ destinataire, contenu }) => {
      recues.push({ id: destinataire.id, titre: contenu.titre, lien: contenu.lien, langue: contenu.langue });
      return { envoyes: 1, echecs: 0 };
    };
    const orange = { CDPV85TFFR: { etat: "ok", niveau: "orange", misAJour: "2026-09-10T16:00:00.000Z" } as const };

    await verifierAlertes(db, sources(), { canaux: [canal], base: BASE });
    await verifierAlertes(db, sources({ vigilance: orange }), { canaux: [canal], base: BASE });

    expect(recues).toEqual([
      { id: francais.id, titre: "Guadeloupe : Vigilance orange", lien: `${BASE}/fr/iles/guadeloupe/alerte`, langue: "fr" },
      {
        id: anglais.id,
        titre: "Guadeloupe: Orange vigilance (Vigilance orange)",
        lien: `${BASE}/en/iles/guadeloupe/alerte`,
        langue: "en",
      },
    ]);
  });
});

describe("dernière lecture réussie du flux NHC (US-11)", () => {
  const ACTIFS = { ...etatFixture("actifs", LU_LE), brut: { activeStorms: [] } };

  it("mémorise le flux lu en direct, pour que les pages le montrent si le NHC ne répond plus", async () => {
    await verifier({ flux: ACTIFS }, servicePush().envoyer);

    expect(await lireDerniereLecture(db, "nhc-systemes")).toEqual({ contenu: { activeStorms: [] }, luLe: LU_LE });
  });

  it("ne mémorise rien quand le NHC ne répond pas", async () => {
    await verifier({ flux: { etat: "indisponible", luLe: LU_LE } }, servicePush().envoyer);

    expect(await lireDerniereLecture(db, "nhc-systemes")).toBeNull();
  });

  it("vérifie les alertes même si la lecture ne peut pas être mémorisée", async () => {
    const guadeloupe = await abonne(["guadeloupe"]);
    const service = servicePush();
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const enPanne = {
      query: (texte: string, params?: unknown[]) =>
        texte.includes("dernieres_lectures") ? Promise.reject(new Error("base saturée")) : db.query(texte, params),
    };
    const jaune = { CDPV85TFFR: { etat: "ok", niveau: "jaune", misAJour: "2026-09-10T16:00:00.000Z" } as const };

    const bilan = await verifierAlertes(enPanne, sources({ flux: ACTIFS, vigilance: jaune }), {
      canaux: [service.envoyer],
      base: BASE,
    });

    expect(service.recus).toEqual([guadeloupe.endpoint]);
    expect(bilan.envoyes).toBe(1);
    expect(journal.mock.calls.flat().join(" ")).toContain("[alertes]");
  });
});

describe("dernier niveau de vigilance lu (US-11, livraison 2)", () => {
  const JAUNE = { etat: "ok", niveau: "jaune", misAJour: "2026-09-10T16:00:00.000Z" } as const;

  it("mémorise le niveau lu en direct de chaque fichier, pour les pages si Météo-France ne répond plus", async () => {
    await verifier({ vigilance: { CDPV85TFFR: JAUNE, CDPV85TFFF: { etat: "indisponible" } } }, servicePush().envoyer);

    expect((await lireDerniereLecture(db, "vigilance:CDPV85TFFR"))?.contenu).toEqual({
      niveau: "jaune",
      misAJour: "2026-09-10T16:00:00.000Z",
    });
    expect(await lireDerniereLecture(db, "vigilance:CDPV85TFFF")).toBeNull();
    // Saint-Martin et Saint-Barthélemy partagent un fichier : une seule lecture, mémorisée.
    expect((await lireDerniereLecture(db, "vigilance:CDPV85TFFJ"))?.contenu).toEqual({
      niveau: "vert",
      misAJour: VERT.etat === "ok" ? VERT.misAJour : "",
    });
  });

  it("ne mémorise jamais un niveau de secours", async () => {
    await verifier({ vigilance: { CDPV85TFFR: { ...JAUNE, echecLe: "2026-09-10T17:00:00.000Z" } } }, servicePush().envoyer);

    expect(await lireDerniereLecture(db, "vigilance:CDPV85TFFR")).toBeNull();
  });
});

describe("dernières alertes NHC des îles sans vigilance (US-11, livraison 3)", () => {
  const HWR = {
    code: "HWR",
    systeme: { id: "al112026", nom: "Kyle", classification: "HU", ventKt: 120 },
    avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" },
  } as const;

  it("mémorise les alertes lues en direct de chaque île NHC, pour les pages si une source ne répond plus", async () => {
    await verifier({ nhc: { dominique: { etat: "ok", alertes: [HWR], luLe: LU_LE } } }, servicePush().envoyer);

    expect(await lireDerniereLecture(db, "alertes-nhc:dominique")).toEqual({ contenu: { alertes: [HWR] }, luLe: LU_LE });
    expect(await lireDerniereLecture(db, "alertes-nhc:barbade")).toEqual({ contenu: { alertes: [] }, luLe: LU_LE });
    expect(await lireDerniereLecture(db, "alertes-nhc:guadeloupe")).toBeNull();
  });

  it("ne mémorise ni des alertes indisponibles ni des alertes de secours", async () => {
    await verifier(
      {
        nhc: {
          dominique: { etat: "indisponible", luLe: LU_LE },
          barbade: { etat: "ok", alertes: [HWR], luLe: LU_LE, echecLe: "2026-09-10T16:00:00.000Z" },
        },
      },
      servicePush().envoyer,
    );

    expect(await lireDerniereLecture(db, "alertes-nhc:dominique")).toBeNull();
    expect(await lireDerniereLecture(db, "alertes-nhc:barbade")).toBeNull();
  });
});

describe("dernières positions prévues lues (US-11, livraison 3b)", () => {
  const ACTIFS = { ...etatFixture("actifs", LU_LE), brut: { activeStorms: [] } };

  it("mémorise les positions lues en direct de chaque système, pour les pages si leur lecture échoue", async () => {
    const kyle = positionsFixture("actifs").al112026;

    await verifier({ flux: ACTIFS, positions: { al112026: kyle } }, servicePush().envoyer);

    expect((await lireDerniereLecture(db, "positions:al112026"))?.contenu).toEqual(kyle);
    expect(await lireDerniereLecture(db, "positions:al122026")).toBeNull();
  });

  it("ne mémorise jamais des positions de secours", async () => {
    const kyle = { ...positionsFixture("actifs").al112026, echecLe: "2026-09-10T17:00:00.000Z" };

    await verifier({ flux: ACTIFS, positions: { al112026: kyle } }, servicePush().envoyer);

    expect(await lireDerniereLecture(db, "positions:al112026")).toBeNull();
  });
});
