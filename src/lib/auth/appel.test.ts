// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cookiesDeLaReponse, messageErreur, messageErreurGoogle, requeteAuth } from "./appel";

describe("requeteAuth", () => {
  const entetes = new Headers({
    cookie: "siklon.session_token=abc",
    "x-forwarded-for": "203.0.113.9",
    origin: "https://pirate.example",
    authorization: "Bearer xyz",
  });

  it("vise la route Better Auth avec le corps en JSON", async () => {
    const requete = requeteAuth("https://siklon.example", "/sign-in/email", { email: "a@b.c" }, entetes);
    expect(requete.method).toBe("POST");
    expect(requete.url).toBe("https://siklon.example/api/auth/sign-in/email");
    expect(requete.headers.get("content-type")).toBe("application/json");
    expect(await requete.json()).toEqual({ email: "a@b.c" });
  });

  it("transmet le cookie et l'IP du visiteur, et rien d'autre", () => {
    const requete = requeteAuth("https://siklon.example", "/sign-out", {}, entetes);
    expect(requete.headers.get("cookie")).toBe("siklon.session_token=abc");
    expect(requete.headers.get("x-forwarded-for")).toBe("203.0.113.9");
    expect(requete.headers.get("authorization")).toBeNull();
  });

  it("se présente avec l'origine du site : Next.js a déjà vérifié celle de la server action", () => {
    const requete = requeteAuth("https://siklon.example", "/sign-out", {}, entetes);
    expect(requete.headers.get("origin")).toBe("https://siklon.example");
  });
});

describe("cookiesDeLaReponse", () => {
  it("relit chaque cookie posé par Better Auth avec ses attributs", () => {
    const entetes = new Headers();
    entetes.append(
      "set-cookie",
      "siklon.session_token=jeton.signe; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    entetes.append("set-cookie", "siklon.session_data=; Max-Age=0; Path=/");
    expect(cookiesDeLaReponse(entetes)).toEqual([
      {
        nom: "siklon.session_token",
        valeur: "jeton.signe",
        options: expect.objectContaining({ maxAge: 604800, path: "/", httpOnly: true, secure: true, sameSite: "lax" }),
      },
      { nom: "siklon.session_data", valeur: "", options: expect.objectContaining({ maxAge: 0, path: "/" }) },
    ]);
  });

  it("ne renvoie rien sans cookie", () => {
    expect(cookiesDeLaReponse(new Headers())).toEqual([]);
  });
});

describe("messageErreur", () => {
  it.each([
    [400, { code: "PASSWORD_TOO_SHORT" }, "Le mot de passe doit faire au moins 12 caractères."],
    [400, { code: "PASSWORD_TOO_LONG" }, "Le mot de passe doit faire au plus 128 caractères."],
    [400, { code: "INVALID_EMAIL" }, "Cette adresse email n'est pas valide."],
    [422, { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }, "Un compte existe déjà avec cette adresse email."],
    [401, { code: "INVALID_EMAIL_OR_PASSWORD" }, "Email ou mot de passe incorrect."],
    [400, { code: "INVALID_PASSWORD" }, "Mot de passe incorrect."],
    [400, { code: "PASSWORD_REQUIRED" }, "Saisissez votre mot de passe pour confirmer."],
    [400, { code: "INVALID_TOKEN" }, "Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau."],
    [401, { code: "TOKEN_EXPIRED" }, "Ce lien a expiré. Demandez-en un nouveau."],
    [400, { code: "EMAIL_ALREADY_VERIFIED" }, "Votre adresse est déjà confirmée."],
    [
      400,
      { code: "RECENT_SIGN_IN_REQUIRED" },
      "Pour confirmer, reconnectez-vous avec Google, puis supprimez votre compte dans les 10 minutes.",
    ],
  ])("statut %i, %o → %s", (statut, corps, attendu) => {
    expect(messageErreur(statut, corps, new Headers(), "fr")).toBe(attendu);
  });

  it("indique le délai à attendre après trop de tentatives, en minutes arrondies au-dessus", () => {
    expect(messageErreur(429, {}, new Headers({ "x-retry-after": "61" }), "fr")).toBe(
      "Trop de tentatives. Réessayez dans 2 minutes.",
    );
    expect(messageErreur(429, {}, new Headers({ "x-retry-after": "5" }), "fr")).toBe(
      "Trop de tentatives. Réessayez dans 1 minute.",
    );
  });

  it("donne un message générique pour toute autre erreur, sans détail technique", () => {
    expect(messageErreur(500, { message: "relation utilisateurs does not exist" }, new Headers(), "fr")).toBe(
      "Une erreur est survenue. Réessayez dans quelques instants.",
    );
  });
});

describe("messageErreurGoogle", () => {
  it.each([
    [
      "account_not_linked",
      "Un compte existe déjà avec cette adresse, mais elle n'est pas confirmée. Connectez-vous avec votre mot de passe et confirmez votre adresse : vous pourrez ensuite utiliser Google.",
    ],
    ["access_denied", "Connexion avec Google annulée."],
    ["depart_impossible", "La connexion avec Google n'a pas pu démarrer. Réessayez dans quelques instants."],
    ["state_mismatch", "La connexion avec Google n'a pas abouti. Réessayez."],
    ["<script>", "La connexion avec Google n'a pas abouti. Réessayez."],
  ])("%s → %s", (code, attendu) => {
    expect(messageErreurGoogle(code, "fr")).toBe(attendu);
  });
});

describe("messages d'erreur en anglais (US-10)", () => {
  it.each([
    [400, { code: "PASSWORD_TOO_SHORT" }, "The password must be at least 12 characters long."],
    [400, { code: "PASSWORD_TOO_LONG" }, "The password must be at most 128 characters long."],
    [400, { code: "INVALID_EMAIL" }, "This email address is not valid."],
    [422, { code: "USER_ALREADY_EXISTS" }, "An account already exists with this email address."],
    [401, { code: "INVALID_EMAIL_OR_PASSWORD" }, "Incorrect email or password."],
    [400, { code: "INVALID_PASSWORD" }, "Incorrect password."],
    [400, { code: "PASSWORD_REQUIRED" }, "Enter your password to confirm."],
    [400, { code: "INVALID_TOKEN" }, "This link is not valid or has already been used. Request a new one."],
    [401, { code: "TOKEN_EXPIRED" }, "This link has expired. Request a new one."],
    [404, { code: "USER_NOT_FOUND" }, "This account no longer exists."],
    [400, { code: "EMAIL_ALREADY_VERIFIED" }, "Your address is already confirmed."],
    [
      400,
      { code: "RECENT_SIGN_IN_REQUIRED" },
      "To confirm, sign in again with Google, then delete your account within 10 minutes.",
    ],
    [500, {}, "Something went wrong. Please try again in a few moments."],
  ])("statut %i, %o → %s", (statut, corps, attendu) => {
    expect(messageErreur(statut, corps, new Headers(), "en")).toBe(attendu);
  });

  it("trop de tentatives, au singulier et au pluriel", () => {
    expect(messageErreur(429, {}, new Headers({ "x-retry-after": "61" }), "en")).toBe("Too many attempts. Try again in 2 minutes.");
    expect(messageErreur(429, {}, new Headers({ "x-retry-after": "5" }), "en")).toBe("Too many attempts. Try again in 1 minute.");
  });

  it.each([
    [
      "account_not_linked",
      "An account already exists with this address, but it is not confirmed. Sign in with your password and confirm your address: you can then use Google.",
    ],
    ["access_denied", "Google sign-in cancelled."],
    ["depart_impossible", "Google sign-in could not start. Please try again in a few moments."],
    ["state_mismatch", "Google sign-in did not complete. Please try again."],
  ])("Google : %s → %s", (code, attendu) => {
    expect(messageErreurGoogle(code, "en")).toBe(attendu);
  });
});

