// @vitest-environment node
// Abonnements web push des appareils (US-07), sur la base migrée, avec le rôle du site.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseMigree } from "../test/poolPglite";
import {
  type AbonnementPush,
  enregistrerAbonnement,
  lireAbonnements,
  supprimerAbonnement,
  supprimerAbonnementExpire,
} from "./abonnementsPush";

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

async function nouvelUtilisateur(): Promise<string> {
  const {
    rows: [{ id }],
  } = await db.query<{ id: string }>(
    "insert into public.utilisateurs (nom, email, email_verifie, langue) values ('', $1, true, 'fr') returning id",
    [`appareil${++numero}@exemple.org`],
  );
  return id;
}

function abonnement(n: number): AbonnementPush {
  return { endpoint: `https://fcm.googleapis.com/fcm/send/appareil-${n}`, cles: { p256dh: `p256dh-${n}`, auth: `auth-${n}` } };
}

describe("abonnements web push", () => {
  it("enregistre les appareils d'un utilisateur, puis les relit", async () => {
    const id = await nouvelUtilisateur();
    await enregistrerAbonnement(db, id, abonnement(1));
    await enregistrerAbonnement(db, id, abonnement(2));

    expect(await lireAbonnements(db, id)).toEqual([abonnement(1), abonnement(2)]);
  });

  it("réenregistrer un appareil met à jour ses clés sans le doubler", async () => {
    const id = await nouvelUtilisateur();
    await enregistrerAbonnement(db, id, abonnement(3));
    const nouvellesCles = { ...abonnement(3), cles: { p256dh: "p256dh-neuve", auth: "auth-neuve" } };

    await enregistrerAbonnement(db, id, nouvellesCles);

    expect(await lireAbonnements(db, id)).toEqual([nouvellesCles]);
  });

  it("un appareil passe au dernier compte qui l'enregistre", async () => {
    const [ancien, nouveau] = [await nouvelUtilisateur(), await nouvelUtilisateur()];
    await enregistrerAbonnement(db, ancien, abonnement(4));

    await enregistrerAbonnement(db, nouveau, abonnement(4));

    expect(await lireAbonnements(db, ancien)).toEqual([]);
    expect(await lireAbonnements(db, nouveau)).toEqual([abonnement(4)]);
  });

  it("un utilisateur ne retire que ses propres appareils", async () => {
    const [proprietaire, autre] = [await nouvelUtilisateur(), await nouvelUtilisateur()];
    await enregistrerAbonnement(db, proprietaire, abonnement(5));

    await supprimerAbonnement(db, autre, abonnement(5).endpoint);
    expect(await lireAbonnements(db, proprietaire)).toEqual([abonnement(5)]);

    await supprimerAbonnement(db, proprietaire, abonnement(5).endpoint);
    expect(await lireAbonnements(db, proprietaire)).toEqual([]);
  });

  it("supprime un abonnement expiré, quel que soit son utilisateur", async () => {
    const id = await nouvelUtilisateur();
    await enregistrerAbonnement(db, id, abonnement(6));
    await enregistrerAbonnement(db, id, abonnement(7));

    await supprimerAbonnementExpire(db, abonnement(6).endpoint);

    expect(await lireAbonnements(db, id)).toEqual([abonnement(7)]);
  });

  it("efface les appareils d'un utilisateur avec son compte", async () => {
    const id = await nouvelUtilisateur();
    await enregistrerAbonnement(db, id, abonnement(8));

    await db.query("delete from public.utilisateurs where id = $1", [id]);

    const { rows } = await db.query("select 1 from public.abonnements_push where utilisateur_id = $1", [id]);
    expect(rows).toEqual([]);
  });

  it("active RLS sur la table", async () => {
    const { rows } = await db.query<{ rls: boolean }>(
      "select relrowsecurity as rls from pg_class where oid = 'public.abonnements_push'::regclass",
    );
    expect(rows).toEqual([{ rls: true }]);
  });
});
