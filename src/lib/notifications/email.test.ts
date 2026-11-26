// @vitest-environment node
// Alertes par e-mail (US-07, livraison 4) : base migrée, service d'envoi simulé (aucun réseau).
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Destinataire, enregistrerAccordEmail, reserverEnvoi } from "../db/notifications";
import { EnvoiEmailError, QuotaEmailsError } from "../emails/brevo";
import type { EmailSortant, ServiceEmails } from "../emails/types";
import { baseMigree } from "../test/poolPglite";
import { canalEmail, messageEmailAlerte } from "./email";
import type { ContenuNotification } from "./textes";

const DEMARRAGE_PGLITE_MS = 30_000;
const BASE = "https://siklon.exemple";

const CONTENU: ContenuNotification = {
  titre: "Haïti : Veille d'ouragan (Hurricane Watch)",
  corps: "Le NHC a émis pour l'île une veille d'ouragan (Hurricane Watch) : conditions possibles. Avis du 10 septembre à 11 h.",
  lien: `${BASE}/fr/iles/haiti/alerte`,
  source: { nom: "NHC", url: "https://www.nhc.noaa.gov/" },
  langue: "fr",
};

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

async function destinataire({ accord = true } = {}): Promise<Destinataire> {
  const email = `alerte${++numero}@exemple.org`;
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, true, 'fr') returning id",
    [email],
  );
  if (accord) await enregistrerAccordEmail(db, id, true);
  return { id, email, langue: "fr", alertesEmail: accord };
}

/** Service d'envoi simulé : garde les e-mails envoyés, ou rejette avec l'erreur donnée. */
function serviceSimule(echec?: (message: EmailSortant) => Error | undefined) {
  const envoyes: EmailSortant[] = [];
  const service: ServiceEmails = {
    envoyer: vi.fn(async (message: EmailSortant) => {
      const erreur = echec?.(message);
      if (erreur) throw erreur;
      envoyes.push(message);
    }),
    effacer: vi.fn(async () => {}),
  };
  return { service, envoyes };
}

describe("contenu de l'e-mail d'alerte", () => {
  it("reprend le titre, le texte, la source officielle, le lien de la fiche, et dit où gérer ses alertes", () => {
    const { sujet, texte, html } = messageEmailAlerte(CONTENU, BASE);

    expect(sujet).toBe("Haïti : Veille d'ouragan (Hurricane Watch) · Siklon");
    expect(texte).toBe(
      [
        CONTENU.corps,
        "",
        "Source : NHC (https://www.nhc.noaa.gov/)",
        `Voir la fiche : ${CONTENU.lien}`,
        "",
        "Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.",
        `Gérer vos alertes : ${BASE}/fr/compte`,
      ].join("\n"),
    );
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain(`<a href="${CONTENU.lien}">Voir la fiche</a>`);
    expect(html).toContain(`<a href="${BASE}/fr/compte">Gérer vos alertes</a>`);
  });

  it("écrit en anglais pour un compte en anglais", () => {
    const contenu: ContenuNotification = {
      titre: "Haiti: Hurricane Watch",
      corps: "The NHC has issued a Hurricane Watch for the island: conditions possible.",
      lien: `${BASE}/en/iles/haiti/alerte`,
      source: { nom: "NHC", url: "https://www.nhc.noaa.gov/" },
      langue: "en",
    };
    const { sujet, texte, html } = messageEmailAlerte(contenu, BASE);

    expect(sujet).toBe("Haiti: Hurricane Watch · Siklon");
    expect(texte).toBe(
      [
        contenu.corps,
        "",
        "Source: NHC (https://www.nhc.noaa.gov/)",
        `View details: ${contenu.lien}`,
        "",
        "Siklon does not replace official instructions. Follow local authorities.",
        `Manage your alerts: ${BASE}/en/compte`,
      ].join("\n"),
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<p>Source: <a href="https://www.nhc.noaa.gov/">NHC</a></p>');
    expect(html).toContain(`<a href="${contenu.lien}">View details</a>`);
    expect(html).toContain(`<a href="${BASE}/en/compte">Manage your alerts</a>`);
  });

  it("échappe le HTML du contenu", () => {
    const { html } = messageEmailAlerte({ ...CONTENU, titre: "<b>Titre</b>", corps: "a < b & c" }, BASE);
    expect(html).toContain("a &lt; b &amp; c");
    expect(html).not.toContain("<b>Titre</b>");
  });
});

describe("envoi d'une alerte par e-mail", () => {
  it("n'écrit pas à un utilisateur qui n'a pas donné son accord, et ne réserve rien", async () => {
    const sans = await destinataire({ accord: false });
    const { service, envoyes } = serviceSimule();

    const bilan = await canalEmail(db, { service, base: BASE })({ destinataire: sans, cle: "rayon:haiti:al072026", contenu: CONTENU });

    expect(bilan).toEqual({ envoyes: 0, echecs: 0 });
    expect(envoyes).toEqual([]);
    expect(await reserverEnvoi(db, sans.id, "rayon:haiti:al072026", "email")).toBe(true);
  });

  it("écrit une seule fois la même alerte à un utilisateur qui a donné son accord", async () => {
    const avec = await destinataire();
    const { service, envoyes } = serviceSimule();
    const envoyer = canalEmail(db, { service, base: BASE });
    const alerte = { destinataire: avec, cle: "rayon:haiti:al072026", contenu: CONTENU };

    expect(await envoyer(alerte)).toEqual({ envoyes: 1, echecs: 0 });
    expect(await envoyer(alerte)).toEqual({ envoyes: 0, echecs: 0 });

    expect(envoyes.map((e) => e.a)).toEqual([avec.email]);
    expect(envoyes[0].sujet).toBe(messageEmailAlerte(CONTENU, BASE).sujet);
  });

  it("au plafond quotidien, n'écrit plus et ne réserve rien, pour laisser la place aux e-mails de connexion", async () => {
    const [a, b, c] = [await destinataire(), await destinataire(), await destinataire()];
    const { service, envoyes } = serviceSimule();
    const journal = vi.spyOn(console, "warn").mockImplementation(() => {});
    const envoyer = canalEmail(db, { service, base: BASE, plafond: 2 });

    for (const d of [a, b, c]) await envoyer({ destinataire: d, cle: "rayon:haiti:al072026", contenu: CONTENU });

    expect(envoyes.map((e) => e.a)).toEqual([a.email, b.email]);
    // Le jour suivant, cette alerte pourra encore partir.
    expect(await reserverEnvoi(db, c.id, "rayon:haiti:al072026", "email")).toBe(true);
    expect(journal).toHaveBeenCalledOnce();
    expect(journal.mock.calls[0][0]).toMatch(/^\[alertes\] plafond quotidien des e-mails d'alerte atteint \(2\)/);
    expect(journal.mock.calls.flat().join(" ")).not.toContain("@exemple.org");
  });

  it("quand Brevo signale le quota atteint, n'essaie plus d'écrire pendant ce passage", async () => {
    const [a, b] = [await destinataire(), await destinataire()];
    const { service } = serviceSimule(() => new QuotaEmailsError("Brevo a refusé l'envoi (402)"));
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const envoyer = canalEmail(db, { service, base: BASE });

    expect(await envoyer({ destinataire: a, cle: "rayon:cuba:al072026", contenu: CONTENU })).toEqual({ envoyes: 0, echecs: 1 });
    expect(await envoyer({ destinataire: b, cle: "rayon:cuba:al072026", contenu: CONTENU })).toEqual({ envoyes: 0, echecs: 0 });

    expect(service.envoyer).toHaveBeenCalledOnce();
    expect(journal).toHaveBeenCalledWith("[alertes] Brevo signale le quota d'e-mails atteint : e-mails d'alerte suspendus pour ce passage");
  });

  it("journalise un autre échec sans l'adresse, et continue avec les utilisateurs suivants", async () => {
    const [a, b] = [await destinataire(), await destinataire()];
    const { service, envoyes } = serviceSimule((message) =>
      message.a === a.email ? new EnvoiEmailError(`Brevo a refusé l'envoi pour ${a.email}`) : undefined,
    );
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const envoyer = canalEmail(db, { service, base: BASE });

    expect(await envoyer({ destinataire: a, cle: "rayon:cuba:al072026", contenu: CONTENU })).toEqual({ envoyes: 0, echecs: 1 });
    expect(await envoyer({ destinataire: b, cle: "rayon:cuba:al072026", contenu: CONTENU })).toEqual({ envoyes: 1, echecs: 0 });

    expect(envoyes.map((e) => e.a)).toEqual([b.email]);
    expect(journal).toHaveBeenCalledWith("[alertes] échec d'un e-mail d'alerte (EnvoiEmailError)");
    expect(journal.mock.calls.flat().join(" ")).not.toContain("@exemple.org");
  });
});
