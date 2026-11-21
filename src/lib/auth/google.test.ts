// @vitest-environment node
// Connexion avec Google (US-05) sur un vrai Postgres en mémoire. Google est imité : son point
// d'échange du code et ses clés publiques répondent depuis ce fichier, sans appel réseau.
import type { PGlite } from "@electric-sql/pglite";
import { betterAuth } from "better-auth";
import { createSign, generateKeyPairSync } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { baseMigree, poolPglite } from "../test/poolPglite";
import { DUREE_REAUTHENTIFICATION_MINUTES, optionsAuth } from "./options";

const DEMARRAGE_PGLITE_MS = 30_000;
const BASE = "http://localhost:3000";
const CLIENT = { clientId: "client-test.apps.googleusercontent.com", clientSecret: "secret-client-test" };

let db: PGlite;
let auth: ReturnType<typeof betterAuth<ReturnType<typeof optionsAuth>>>;
let ipSuivante = 1;
let ip: string;

// Clé de signature du faux Google et profil qu'il renvoie au prochain échange de code.
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "cle-test";
let profil: Record<string, unknown>;

const base64url = (valeur: object) => Buffer.from(JSON.stringify(valeur)).toString("base64url");
function jetonIdentite(revendications: Record<string, unknown>) {
  const maintenant = Math.floor(Date.now() / 1000);
  const corps = `${base64url({ alg: "RS256", kid: KID, typ: "JWT" })}.${base64url({
    iss: "https://accounts.google.com",
    aud: CLIENT.clientId,
    iat: maintenant,
    exp: maintenant + 3600,
    ...revendications,
  })}`;
  const signature = createSign("RSA-SHA256").update(corps).sign(privateKey).toString("base64url");
  return `${corps}.${signature}`;
}

const fauxGoogle = vi.fn(async (entree: RequestInfo | URL) => {
  const url = entree instanceof Request ? entree.url : String(entree);
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    return Response.json({
      access_token: "jeton-acces-google",
      refresh_token: "jeton-rafraichissement-google",
      id_token: jetonIdentite(profil),
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid email profile",
    });
  }
  if (url.startsWith("https://www.googleapis.com/oauth2/v3/certs")) {
    return Response.json({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }] });
  }
  throw new Error(`Appel réseau inattendu dans un test : ${url}`);
});

beforeAll(async () => {
  vi.stubGlobal("fetch", fauxGoogle);
  db = await baseMigree();
  await db.exec("set role siklon_comptes");
  const emails = { envoyer: async () => {}, effacer: async () => {} };
  auth = betterAuth(
    optionsAuth({ database: poolPglite(db), secret: "secret-de-test-".repeat(3), baseURL: BASE, emails, google: CLIENT }),
  );
}, DEMARRAGE_PGLITE_MS);

afterAll(async () => {
  vi.unstubAllGlobals();
  await db.close();
});

beforeEach(() => {
  ip = `198.51.100.${ipSuivante++}`;
});

const entetes = (cookie?: string) => ({
  "content-type": "application/json",
  origin: BASE,
  "x-forwarded-for": ip,
  ...(cookie ? { cookie } : {}),
});

const appeler = (chemin: string, corps: Record<string, unknown>, cookie?: string) =>
  auth.handler(new Request(`${BASE}/api/auth${chemin}`, { method: "POST", headers: entetes(cookie), body: JSON.stringify(corps) }));

const cookies = (reponse: Response) =>
  reponse.headers
    .getSetCookie()
    .map((ligne) => ligne.split(";")[0])
    .join("; ");

let numero = 0;
const nouvelEmail = () => `google${++numero}@exemple.org`;

/** Parcours complet : départ vers Google, retour sur le site avec un code. Renvoie la réponse du retour. */
async function connexionGoogle(email: string, { langue = "fr", emailVerifie = true } = {}) {
  profil = {
    sub: `sujet-${email}`,
    email,
    email_verified: emailVerifie,
    name: "Jeanne Exemple",
    picture: "https://lh3.googleusercontent.com/photo-test",
  };
  const depart = await appeler("/sign-in/social", {
    provider: "google",
    callbackURL: "/compte",
    errorCallbackURL: "/compte/connexion",
    additionalData: { langue },
  });
  const { url } = (await depart.json()) as { url: string };
  const etat = new URL(url).searchParams.get("state") ?? "";
  return auth.handler(
    new Request(`${BASE}/api/auth/callback/google?code=code-test&state=${encodeURIComponent(etat)}`, {
      headers: entetes(cookies(depart)),
    }),
  );
}

const utilisateur = async (email: string) =>
  (
    await db.query<{ id: string; nom: string; image: string | null; email_verifie: boolean; langue: string }>(
      "select id, nom, image, email_verifie, langue from utilisateurs where email = $1",
      [email],
    )
  ).rows[0];

describe("connexion avec Google", () => {
  it("envoie vers Google avec le client du site, l'adresse de retour et les seules portées utiles", async () => {
    const reponse = await appeler("/sign-in/social", { provider: "google", callbackURL: "/compte" });
    expect(reponse.status).toBe(200);
    const url = new URL(((await reponse.json()) as { url: string }).url);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(CLIENT.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(`${BASE}/api/auth/callback/google`);
    expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
  });

  it("crée le compte au premier retour, dans la langue choisie, avec l'adresse confirmée, et ouvre une session", async () => {
    const email = nouvelEmail();
    const reponse = await connexionGoogle(email, { langue: "en" });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("location")).toBe("/compte");
    expect(reponse.headers.get("set-cookie")).toMatch(/siklon\.session_token=[^;]/);
    expect(await utilisateur(email)).toMatchObject({ email_verifie: true, langue: "en" });
  });

  it("ne garde de Google ni le nom, ni la photo, ni les jetons d'accès (données minimales)", async () => {
    const email = nouvelEmail();
    await connexionGoogle(email);
    const { id, nom, image } = await utilisateur(email);
    expect({ nom, image }).toEqual({ nom: "", image: null });
    const { rows } = await db.query(
      "select fournisseur, jeton_acces, jeton_rafraichissement, jeton_identite from comptes_lies where utilisateur_id = $1",
      [id],
    );
    expect(rows).toEqual([{ fournisseur: "google", jeton_acces: null, jeton_rafraichissement: null, jeton_identite: null }]);
  });

  it("ne garde pas non plus les jetons lors des connexions suivantes", async () => {
    const email = nouvelEmail();
    await connexionGoogle(email);
    expect((await connexionGoogle(email)).headers.get("location")).toBe("/compte");
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from comptes_lies c join utilisateurs u on u.id = c.utilisateur_id
        where u.email = $1 and (jeton_acces is not null or jeton_rafraichissement is not null or jeton_identite is not null)`,
      [email],
    );
    expect(rows[0].n).toBe(0);
  });

  it("une langue inconnue retombe sur le français", async () => {
    const email = nouvelEmail();
    await connexionGoogle(email, { langue: "de" });
    expect((await utilisateur(email)).langue).toBe("fr");
  });

  it("relie Google à un compte email et mot de passe dont l'adresse est confirmée", async () => {
    const email = nouvelEmail();
    await appeler("/sign-up/email", { email, password: "un mot de passe solide", name: "", langue: "en" });
    await db.query("update utilisateurs set email_verifie = true where email = $1", [email]);

    const reponse = await connexionGoogle(email);
    expect(reponse.headers.get("location")).toBe("/compte");
    const { id, langue } = await utilisateur(email);
    expect(langue).toBe("en");
    const { rows } = await db.query<{ fournisseur: string }>(
      "select fournisseur from comptes_lies where utilisateur_id = $1 order by fournisseur",
      [id],
    );
    expect(rows.map((r) => r.fournisseur)).toEqual(["credential", "google"]);
  });

  it("un retour sans état valable renvoie sur la page de connexion du site, avec un code d'erreur", async () => {
    const reponse = await auth.handler(
      new Request(`${BASE}/api/auth/callback/google?code=code-test&state=etat-invente`, { headers: entetes() }),
    );
    expect(reponse.status).toBe(302);
    const retour = new URL(reponse.headers.get("location") ?? "", BASE);
    expect(retour.origin + retour.pathname).toBe(`${BASE}/compte/connexion`);
    expect(retour.searchParams.get("error")).toBeTruthy();
  });

  it("ne relie pas Google à un compte dont l'adresse n'est pas confirmée : quelqu'un a pu l'inscrire à la place de son titulaire", async () => {
    const email = nouvelEmail();
    await appeler("/sign-up/email", { email, password: "un mot de passe solide", name: "", langue: "fr" });

    const reponse = await connexionGoogle(email);
    const retour = new URL(reponse.headers.get("location") ?? "", BASE);
    expect(retour.pathname).toBe("/compte/connexion");
    expect(retour.searchParams.get("error")).toBe("account_not_linked");
    expect(reponse.headers.get("set-cookie") ?? "").not.toMatch(/siklon\.session_token=[^;]/);
    const { id } = await utilisateur(email);
    expect((await db.query("select 1 from comptes_lies where utilisateur_id = $1", [id])).rows).toHaveLength(1);
  });
});

describe("suppression d'un compte Google, sans mot de passe", () => {
  async function compteGoogle() {
    const email = nouvelEmail();
    const cookie = cookies(await connexionGoogle(email));
    return { email, cookie, id: (await utilisateur(email)).id };
  }

  it(`supprime sans mot de passe juste après une connexion avec Google (moins de ${DUREE_REAUTHENTIFICATION_MINUTES} minutes)`, async () => {
    const { id, cookie } = await compteGoogle();
    expect((await appeler("/delete-user", {}, cookie)).status).toBe(200);
    expect((await db.query("select 1 from utilisateurs where id = $1", [id])).rows).toHaveLength(0);
  });

  it("refuse si la connexion avec Google est plus ancienne : un téléphone laissé déverrouillé ne suffit pas", async () => {
    const { id, cookie } = await compteGoogle();
    await db.query(
      `update sessions set cree_le = now() - interval '${DUREE_REAUTHENTIFICATION_MINUTES + 1} minutes' where utilisateur_id = $1`,
      [id],
    );
    const reponse = await appeler("/delete-user", {}, cookie);
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "RECENT_SIGN_IN_REQUIRED" });
    expect((await db.query("select 1 from utilisateurs where id = $1", [id])).rows).toHaveLength(1);
  });

  it("exige toujours le mot de passe d'un compte qui en a un, même relié à Google", async () => {
    const email = nouvelEmail();
    await appeler("/sign-up/email", { email, password: "un mot de passe solide", name: "", langue: "fr" });
    await db.query("update utilisateurs set email_verifie = true where email = $1", [email]);
    const cookie = cookies(await connexionGoogle(email));
    const reponse = await appeler("/delete-user", {}, cookie);
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "PASSWORD_REQUIRED" });
  });
});
