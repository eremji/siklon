// @vitest-environment node
// État des alertes et journal des notifications (US-07), sur la base migrée, avec le rôle du site.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";
import { enregistrerIlesSuivies } from "./ilesSuivies";
import {
  compterEmailsAlerteDuJour,
  destinataires,
  enregistrerAccordEmail,
  enregistrerNiveau,
  lireNiveauxIles,
  reserverEnvoi,
} from "./notifications";

const DEMARRAGE_PGLITE_MS = 30_000;

let db: PGlite;
let numero = 0;

beforeAll(async () => {
  db = await baseMigree();
  await db.exec("set role siklon_comptes");
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

async function nouvelUtilisateur({ verifie = true, langue = "fr" } = {}) {
  const email = `personne${++numero}@exemple.org`;
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, $2, $3) returning id",
    [email, verifie, langue],
  );
  return { id, email };
}

describe("niveau d'alerte connu de chaque île", () => {
  it("enregistre un premier niveau, puis le relit", async () => {
    expect(await enregistrerNiveau(db, "dominique", undefined, { niveau: "aucune", misAJour: "2026-09-10T15:00:00Z" })).toBe(
      true,
    );
    expect((await lireNiveauxIles(db)).get("dominique")).toBe("aucune");
  });

  it("remplace le niveau seulement s'il est encore celui attendu : un seul passage gagne", async () => {
    await enregistrerNiveau(db, "guadeloupe", undefined, { niveau: "jaune", misAJour: "2026-09-10T12:00:00Z" });
    const orange = { niveau: "orange" as const, misAJour: "2026-09-10T16:00:00Z" };

    expect(await enregistrerNiveau(db, "guadeloupe", "jaune", orange)).toBe(true);
    // Un second passage qui avait lu « jaune » en même temps ne doit pas prévenir une seconde fois.
    expect(await enregistrerNiveau(db, "guadeloupe", "jaune", orange)).toBe(false);
    expect((await lireNiveauxIles(db)).get("guadeloupe")).toBe("orange");
  });

  it("refuse un premier niveau quand une île en a déjà un", async () => {
    await enregistrerNiveau(db, "martinique", undefined, { niveau: "vert", misAJour: "2026-09-10T12:00:00Z" });

    expect(await enregistrerNiveau(db, "martinique", undefined, { niveau: "jaune", misAJour: "2026-09-10T13:00:00Z" })).toBe(
      false,
    );
    expect((await lireNiveauxIles(db)).get("martinique")).toBe("vert");
  });

  it("ignore une ligne dont l'île ou le niveau n'est pas reconnu", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into public.niveaux_alerte_iles (ile, niveau, mis_a_jour) values ('atlantide', 'vert', now()), ('cuba', 'bleu', now())",
    );
    await db.exec("set role siklon_comptes");

    const niveaux = await lireNiveauxIles(db);
    expect(niveaux.has("atlantide")).toBe(false);
    expect(niveaux.has("cuba")).toBe(false);
  });
});

describe("destinataires d'une île", () => {
  it("rend les utilisateurs qui suivent l'île et dont l'adresse est confirmée", async () => {
    const suit = await nouvelUtilisateur({ langue: "en" });
    const nonConfirme = await nouvelUtilisateur({ verifie: false });
    const autreIle = await nouvelUtilisateur();
    await enregistrerIlesSuivies(db, suit.id, ["barbade", "jamaique"]);
    await enregistrerIlesSuivies(db, nonConfirme.id, ["barbade"]);
    await enregistrerIlesSuivies(db, autreIle.id, ["jamaique"]);

    expect(await destinataires(db, "barbade")).toEqual([{ id: suit.id, email: suit.email, langue: "en", alertesEmail: false }]);
  });
});

describe("accord pour les alertes par e-mail (US-13)", () => {
  it("n'est pas donné par défaut, puis suit le choix de l'utilisateur", async () => {
    const { id } = await nouvelUtilisateur();
    await enregistrerIlesSuivies(db, id, ["haiti"]);
    const accord = async () => (await destinataires(db, "haiti")).find((d) => d.id === id)?.alertesEmail;

    expect(await accord()).toBe(false);
    await enregistrerAccordEmail(db, id, true);
    expect(await accord()).toBe(true);
    await enregistrerAccordEmail(db, id, false);
    expect(await accord()).toBe(false);
  });

  it("est effacé avec le compte", async () => {
    const { id } = await nouvelUtilisateur();
    await enregistrerAccordEmail(db, id, true);

    await db.query("delete from public.utilisateurs where id = $1", [id]);

    const { rows } = await db.query("select 1 from public.preferences_alertes where utilisateur_id = $1", [id]);
    expect(rows).toEqual([]);
  });
});

describe("journal des envois", () => {
  it("n'autorise qu'un envoi d'une même alerte par canal et par utilisateur", async () => {
    const { id } = await nouvelUtilisateur();

    expect(await reserverEnvoi(db, id, "rayon:guadeloupe:al052026", "push")).toBe(true);
    expect(await reserverEnvoi(db, id, "rayon:guadeloupe:al052026", "push")).toBe(false);
    expect(await reserverEnvoi(db, id, "rayon:guadeloupe:al052026", "email")).toBe(true);
    expect(await reserverEnvoi(db, id, "rayon:guadeloupe:al062026", "push")).toBe(true);
  });

  it("garde des journaux séparés pour chaque utilisateur", async () => {
    const [a, b] = [await nouvelUtilisateur(), await nouvelUtilisateur()];

    expect(await reserverEnvoi(db, a.id, "niveau:martinique:jaune:2026-09-10T16:00:00Z", "push")).toBe(true);
    expect(await reserverEnvoi(db, b.id, "niveau:martinique:jaune:2026-09-10T16:00:00Z", "push")).toBe(true);
  });

  it("compte les e-mails d'alerte réservés depuis minuit (UTC), sans les envois push", async () => {
    const avant = await compterEmailsAlerteDuJour(db);
    const { id } = await nouvelUtilisateur();
    await reserverEnvoi(db, id, "rayon:haiti:al072026", "email");
    await reserverEnvoi(db, id, "rayon:cuba:al072026", "email");
    await reserverEnvoi(db, id, "rayon:haiti:al072026", "push");
    await db.exec("reset role");
    await db.query(
      "insert into public.notifications_envoyees (utilisateur_id, cle, canal, cree_le) values ($1, 'hier', 'email', date_trunc('day', now() at time zone 'utc') at time zone 'utc' - interval '1 minute')",
      [id],
    );
    await db.exec("set role siklon_comptes");

    expect(await compterEmailsAlerteDuJour(db)).toBe(avant + 2);
  });

  it("refuse un canal inconnu", async () => {
    const { id } = await nouvelUtilisateur();
    await expect(db.query("insert into public.notifications_envoyees (utilisateur_id, cle, canal) values ($1, 'x', 'sms')", [id])).rejects.toThrow();
  });

  it("efface le journal d'un utilisateur avec son compte", async () => {
    const { id } = await nouvelUtilisateur();
    await reserverEnvoi(db, id, "rayon:cuba:al052026", "push");

    await db.query("delete from public.utilisateurs where id = $1", [id]);

    const { rows } = await db.query("select 1 from public.notifications_envoyees where utilisateur_id = $1", [id]);
    expect(rows).toEqual([]);
  });
});
