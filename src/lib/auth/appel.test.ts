// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cookiesDeLaReponse, messageErreur, requeteAuth } from "./appel";

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
  ])("statut %i, %o → %s", (statut, corps, attendu) => {
    expect(messageErreur(statut, corps, new Headers())).toBe(attendu);
  });

  it("indique le délai à attendre après trop de tentatives, en minutes arrondies au-dessus", () => {
    expect(messageErreur(429, {}, new Headers({ "x-retry-after": "61" }))).toBe(
      "Trop de tentatives. Réessayez dans 2 minutes.",
    );
    expect(messageErreur(429, {}, new Headers({ "x-retry-after": "5" }))).toBe(
      "Trop de tentatives. Réessayez dans 1 minute.",
    );
  });

  it("donne un message générique pour toute autre erreur, sans détail technique", () => {
    expect(messageErreur(500, { message: "relation utilisateurs does not exist" }, new Headers())).toBe(
      "Une erreur est survenue. Réessayez dans quelques instants.",
    );
  });
});
