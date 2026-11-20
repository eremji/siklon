// @vitest-environment node
// Envoi web push (US-07) : base migrée, service push simulé par un faux fetch (aucun réseau).
import type { PGlite } from "@electric-sql/pglite";
import { createECDH, randomBytes } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { generateVAPIDKeys } from "web-push";
import { type AbonnementPush, enregistrerAbonnement, lireAbonnements } from "../db/abonnementsPush";
import { reserverEnvoi } from "../db/notifications";
import { baseMigree } from "../test/poolPglite";
import { envoyerPush, messagePush } from "./push";
import type { ContenuNotification } from "./textes";

const DEMARRAGE_PGLITE_MS = 30_000;
const VAPID = { subject: "mailto:alertes@exemple.org", ...generateVAPIDKeys() };

const CONTENU: ContenuNotification = {
  titre: "Guadeloupe : Vigilance orange",
  corps: "Préparez-vous. Météo-France passe de la vigilance jaune à la vigilance orange (mise à jour du 10 septembre à 12 h).",
  lien: "https://siklon.exemple/iles/guadeloupe/alerte",
  source: { nom: "Météo-France", url: "https://vigilance.meteofrance.fr/fr/guadeloupe" },
};

let db: PGlite;
let numero = 0;

beforeAll(async () => {
  db = await baseMigree();
  await db.exec("set role siklon_comptes");
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function nouvelUtilisateur() {
  const email = `push${++numero}@exemple.org`;
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, true, 'fr') returning id",
    [email],
  );
  return { id, email, langue: "fr" as const };
}

function appareil(endpoint: string): AbonnementPush {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { endpoint, cles: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
}

/** Service push simulé : répond le statut prévu pour chaque endpoint (201 par défaut) et garde les requêtes. */
function servicePush(statuts: Record<string, number | Error> = {}) {
  const requetes: { url: string; init: RequestInit }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    requetes.push({ url: String(url), init });
    const statut = statuts[String(url)] ?? 201;
    if (statut instanceof Error) throw statut;
    return new Response(null, { status: statut });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, requetes };
}

describe("message affiché par la notification", () => {
  it("reprend le titre, le texte avec la source officielle, et le lien de la fiche", () => {
    expect(messagePush(CONTENU, "niveau:guadeloupe:orange:2026-09-10T16:00:00Z")).toEqual({
      titre: CONTENU.titre,
      texte: `${CONTENU.corps}\nSource : Météo-France.`,
      lien: CONTENU.lien,
      etiquette: "niveau:guadeloupe:orange:2026-09-10T16:00:00Z",
    });
  });
});

describe("envoi web push", () => {
  it("envoie l'alerte chiffrée et signée à chaque appareil de l'utilisateur", async () => {
    const destinataire = await nouvelUtilisateur();
    const [telephone, ordinateur] = [appareil("https://fcm.googleapis.com/fcm/send/tel-1"), appareil("https://updates.push.services.mozilla.com/wpush/v2/pc-1")];
    await enregistrerAbonnement(db, destinataire.id, telephone);
    await enregistrerAbonnement(db, destinataire.id, ordinateur);
    const service = servicePush();

    const bilan = await envoyerPush(db, { destinataire, cle: "rayon:guadeloupe:al052026", contenu: CONTENU }, { vapid: VAPID, fetch: service.fetch });

    expect(bilan).toEqual({ dejaEnvoye: false, envoyes: 2, expires: 0, echecs: 0 });
    expect(service.requetes.map((r) => r.url)).toEqual([telephone.endpoint, ordinateur.endpoint]);
    const { init } = service.requetes[0];
    const entetes = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(entetes.get("authorization")).toMatch(/^vapid t=.+, k=/);
    expect(entetes.get("content-encoding")).toBe("aes128gcm");
    expect(entetes.get("urgency")).toBe("high");
    expect(Number(entetes.get("ttl"))).toBeGreaterThan(0);
    // Le contenu est chiffré : le titre n'apparaît pas en clair.
    const corps = Buffer.from(init.body as Uint8Array);
    expect(corps.length).toBeGreaterThan(0);
    expect(corps.toString("utf8")).not.toContain("Guadeloupe");
  });

  it("n'envoie pas deux fois la même alerte", async () => {
    const destinataire = await nouvelUtilisateur();
    await enregistrerAbonnement(db, destinataire.id, appareil("https://fcm.googleapis.com/fcm/send/tel-2"));
    const alerte = { destinataire, cle: "rayon:martinique:al052026", contenu: CONTENU };
    await envoyerPush(db, alerte, { vapid: VAPID, fetch: servicePush().fetch });
    const service = servicePush();

    const bilan = await envoyerPush(db, alerte, { vapid: VAPID, fetch: service.fetch });

    expect(bilan).toEqual({ dejaEnvoye: true, envoyes: 0, expires: 0, echecs: 0 });
    expect(service.requetes).toEqual([]);
  });

  it("ne réserve rien pour un utilisateur sans appareil abonné", async () => {
    const destinataire = await nouvelUtilisateur();
    const service = servicePush();

    const bilan = await envoyerPush(db, { destinataire, cle: "rayon:cuba:al052026", contenu: CONTENU }, { vapid: VAPID, fetch: service.fetch });

    expect(bilan).toEqual({ dejaEnvoye: false, envoyes: 0, expires: 0, echecs: 0 });
    expect(service.requetes).toEqual([]);
    // Un appareil abonné plus tard pourra encore recevoir cette alerte.
    expect(await reserverEnvoi(db, destinataire.id, "rayon:cuba:al052026", "push")).toBe(true);
  });

  it.each([404, 410])("supprime l'abonnement que le service push déclare expiré (%i)", async (statut) => {
    const destinataire = await nouvelUtilisateur();
    const [expire, actif] = [appareil(`https://fcm.googleapis.com/fcm/send/expire-${statut}`), appareil(`https://fcm.googleapis.com/fcm/send/actif-${statut}`)];
    await enregistrerAbonnement(db, destinataire.id, expire);
    await enregistrerAbonnement(db, destinataire.id, actif);

    const bilan = await envoyerPush(
      db,
      { destinataire, cle: `rayon:barbade:${statut}`, contenu: CONTENU },
      { vapid: VAPID, fetch: servicePush({ [expire.endpoint]: statut }).fetch },
    );

    expect(bilan).toEqual({ dejaEnvoye: false, envoyes: 1, expires: 1, echecs: 0 });
    expect(await lireAbonnements(db, destinataire.id)).toEqual([actif]);
  });

  it("journalise un refus du service push sans donnée personnelle, et garde l'abonnement", async () => {
    const destinataire = await nouvelUtilisateur();
    const telephone = appareil("https://fcm.googleapis.com/fcm/send/jeton-secret-500");
    await enregistrerAbonnement(db, destinataire.id, telephone);
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});

    const bilan = await envoyerPush(
      db,
      { destinataire, cle: "rayon:dominique:al052026", contenu: CONTENU },
      { vapid: VAPID, fetch: servicePush({ [telephone.endpoint]: 500 }).fetch },
    );

    expect(bilan).toEqual({ dejaEnvoye: false, envoyes: 0, expires: 0, echecs: 1 });
    expect(await lireAbonnements(db, destinataire.id)).toEqual([telephone]);
    expect(journal).toHaveBeenCalledWith("[push] échec de l'envoi : fcm.googleapis.com a répondu 500");
    const ecrit = journal.mock.calls.flat().join(" ");
    for (const donnee of ["jeton-secret", destinataire.email, destinataire.id, telephone.cles.p256dh]) {
      expect(ecrit).not.toContain(donnee);
    }
  });

  it("journalise une erreur réseau sans recopier son message, et continue avec les autres appareils", async () => {
    const destinataire = await nouvelUtilisateur();
    const [injoignable, actif] = [appareil("https://fcm.googleapis.com/fcm/send/injoignable"), appareil("https://fcm.googleapis.com/fcm/send/actif-reseau")];
    await enregistrerAbonnement(db, destinataire.id, injoignable);
    await enregistrerAbonnement(db, destinataire.id, actif);
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});

    const bilan = await envoyerPush(
      db,
      { destinataire, cle: "rayon:jamaique:al052026", contenu: CONTENU },
      { vapid: VAPID, fetch: servicePush({ [injoignable.endpoint]: new TypeError(`fetch failed ${injoignable.endpoint}`) }).fetch },
    );

    expect(bilan).toEqual({ dejaEnvoye: false, envoyes: 1, expires: 0, echecs: 1 });
    expect(journal).toHaveBeenCalledWith("[push] échec de l'envoi vers fcm.googleapis.com : TypeError");
    expect(journal.mock.calls.flat().join(" ")).not.toContain("injoignable");
  });
});
