// @vitest-environment node
// Comportement de l'authentification (US-05) sur un vrai Postgres en mémoire, avec les migrations
// du dépôt et le rôle siklon_comptes du site : on passe par le routeur HTTP de Better Auth, comme
// le navigateur, pour que la limitation des tentatives s'applique.
import type { PGlite } from "@electric-sql/pglite";
import { betterAuth } from "better-auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { baseMigree, poolPglite } from "../test/poolPglite";
import { LIMITES_TENTATIVES, optionsAuth } from "./options";

// Démarrer PGlite et appliquer les migrations prend plusieurs secondes quand les fichiers tournent en parallèle.
const DEMARRAGE_PGLITE_MS = 30_000;

const BASE = "http://localhost:3000";
let db: PGlite;
let auth: ReturnType<typeof betterAuth<ReturnType<typeof optionsAuth>>>;
let ipSuivante = 1;
let ip: string;

beforeAll(async () => {
  db = await baseMigree();
  await db.exec("set role siklon_comptes");
  auth = betterAuth(optionsAuth({ database: poolPglite(db), secret: "secret-de-test-".repeat(3), baseURL: BASE }));
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  await db.close();
});

// Chaque test part d'une adresse IP neuve, pour que les compteurs ne se mélangent pas.
beforeEach(() => {
  ip = `203.0.113.${ipSuivante++}`;
});

const appeler = (chemin: string, corps: Record<string, unknown>) =>
  auth.handler(
    new Request(`${BASE}/api/auth${chemin}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, "x-forwarded-for": ip },
      body: JSON.stringify(corps),
    }),
  );

let numero = 0;
const nouvelEmail = () => `personne${++numero}@exemple.org`;
const inscrire = (email: string, password: string, langue = "fr") =>
  appeler("/sign-up/email", { email, password, name: "", langue });

describe("inscription par email et mot de passe", () => {
  it("refuse un mot de passe de moins de 12 caractères", async () => {
    const reponse = await inscrire(nouvelEmail(), "onze-caract");
    expect(reponse.status).toBe(400);
  });

  it("accepte un mot de passe de 12 caractères et ouvre une session", async () => {
    const reponse = await inscrire(nouvelEmail(), "douze-carac!");
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("set-cookie")).toMatch(/siklon\.session_token=/);
  });

  it("ne stocke jamais le mot de passe en clair", async () => {
    const email = nouvelEmail();
    await inscrire(email, "un mot de passe solide");
    const { rows } = await db.query<{ mot_de_passe_hache: string }>(
      "select c.mot_de_passe_hache from comptes_lies c join utilisateurs u on u.id = c.utilisateur_id where u.email = $1",
      [email],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].mot_de_passe_hache).not.toContain("un mot de passe solide");
    expect(rows[0].mot_de_passe_hache).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it("enregistre la langue choisie, l'adresse non confirmée, et aucune donnée superflue", async () => {
    const email = nouvelEmail();
    await inscrire(email, "un mot de passe solide", "en");
    const { rows } = await db.query("select nom, image, langue, email_verifie from utilisateurs where email = $1", [
      email,
    ]);
    expect(rows).toEqual([{ nom: "", image: null, langue: "en", email_verifie: false }]);
  });

  it("refuse une langue autre que fr ou en", async () => {
    const email = nouvelEmail();
    const reponse = await inscrire(email, "un mot de passe solide", "de");
    expect(reponse.status).toBe(422);
    expect((await db.query("select 1 from utilisateurs where email = $1", [email])).rows).toEqual([]);
  });

  it("ne garde ni l'adresse IP ni le navigateur dans la session", async () => {
    const email = nouvelEmail();
    await inscrire(email, "un mot de passe solide");
    const { rows } = await db.query(
      "select s.adresse_ip, s.agent_utilisateur from sessions s join utilisateurs u on u.id = s.utilisateur_id where u.email = $1",
      [email],
    );
    expect(rows).toEqual([{ adresse_ip: null, agent_utilisateur: null }]);
  });
});

describe("connexion", () => {
  it("connecte avec le bon mot de passe, refuse un mauvais", async () => {
    const email = nouvelEmail();
    await inscrire(email, "un mot de passe solide");
    expect((await appeler("/sign-in/email", { email, password: "un mot de passe solide" })).status).toBe(200);
    expect((await appeler("/sign-in/email", { email, password: "un autre mot de passe" })).status).toBe(401);
  });
});

describe("limitation des tentatives", () => {
  it(`bloque la connexion au-delà de ${LIMITES_TENTATIVES.connexion.max} tentatives par minute et par IP`, async () => {
    const email = nouvelEmail();
    const statuts = [];
    for (let i = 0; i <= LIMITES_TENTATIVES.connexion.max; i++) {
      statuts.push((await appeler("/sign-in/email", { email, password: "mauvais mot de passe" })).status);
    }
    expect(statuts.slice(0, -1).every((s) => s === 401)).toBe(true);
    expect(statuts.at(-1)).toBe(429);
  });

  it("garde les compteurs en base, partagés entre toutes les instances du site", async () => {
    await appeler("/sign-in/email", { email: nouvelEmail(), password: "mauvais mot de passe" });
    const { rows } = await db.query("select nombre from limites_tentatives where cle like '%' || $1 || '%'", [ip]);
    expect(rows).toEqual([{ nombre: 1 }]);
  });

  it("ne bloque pas une autre adresse IP", async () => {
    const email = nouvelEmail();
    for (let i = 0; i <= LIMITES_TENTATIVES.connexion.max; i++) {
      await appeler("/sign-in/email", { email, password: "mauvais mot de passe" });
    }
    ip = "198.51.100.7";
    expect((await appeler("/sign-in/email", { email, password: "mauvais mot de passe" })).status).toBe(401);
  });

  it(`bloque l'inscription au-delà de ${LIMITES_TENTATIVES.inscription.max} comptes par IP`, async () => {
    const statuts = [];
    for (let i = 0; i <= LIMITES_TENTATIVES.inscription.max; i++) {
      statuts.push((await inscrire(nouvelEmail(), "un mot de passe solide")).status);
    }
    expect(statuts.at(-1)).toBe(429);
  });
});
