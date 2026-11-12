// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const appelerAuth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((chemin: string) => {
    throw new Error(`redirection vers ${chemin}`);
  }),
);
vi.mock("@/lib/auth/serveur", () => ({ appelerAuth }));
vi.mock("next/navigation", () => ({ redirect }));

const { connecter, deconnecter, inscrire, supprimerCompte } = await import("./actions");

const formulaire = (champs: Record<string, string>) => {
  const donnees = new FormData();
  for (const [nom, valeur] of Object.entries(champs)) donnees.set(nom, valeur);
  return donnees;
};

beforeEach(() => {
  appelerAuth.mockReset();
  redirect.mockClear();
});

describe("inscrire", () => {
  it("crée le compte sans nom, avec la langue choisie, puis mène à la page Compte", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(
      inscrire({}, formulaire({ email: " a@b.fr ", motDePasse: "un mot de passe solide", langue: "en" })),
    ).rejects.toThrow("redirection vers /compte");
    expect(appelerAuth).toHaveBeenCalledWith("/sign-up/email", {
      email: "a@b.fr",
      password: "un mot de passe solide",
      name: "",
      langue: "en",
    });
  });

  it("refuse une langue inconnue sans appeler le serveur d'authentification", async () => {
    const etat = await inscrire({}, formulaire({ email: "a@b.fr", motDePasse: "un mot de passe solide", langue: "de" }));
    expect(etat).toEqual({ message: "Choisissez le français ou l'anglais.", email: "a@b.fr" });
    expect(appelerAuth).not.toHaveBeenCalled();
  });

  it("renvoie le message d'erreur et l'email saisi, jamais le mot de passe", async () => {
    appelerAuth.mockResolvedValue({ ok: false, message: "Un compte existe déjà avec cette adresse email." });
    const etat = await inscrire({}, formulaire({ email: "a@b.fr", motDePasse: "un mot de passe solide", langue: "fr" }));
    expect(etat).toEqual({ message: "Un compte existe déjà avec cette adresse email.", email: "a@b.fr" });
  });
});

describe("connecter", () => {
  it("connecte puis mène à la page Compte", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(connecter({}, formulaire({ email: "a@b.fr", motDePasse: "un mot de passe solide" }))).rejects.toThrow(
      "redirection vers /compte",
    );
    expect(appelerAuth).toHaveBeenCalledWith("/sign-in/email", { email: "a@b.fr", password: "un mot de passe solide" });
  });

  it("renvoie le message d'erreur", async () => {
    appelerAuth.mockResolvedValue({ ok: false, message: "Email ou mot de passe incorrect." });
    expect(await connecter({}, formulaire({ email: "a@b.fr", motDePasse: "x" }))).toEqual({
      message: "Email ou mot de passe incorrect.",
      email: "a@b.fr",
    });
  });
});

describe("deconnecter", () => {
  it("ferme la session puis revient à la page Compte", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(deconnecter()).rejects.toThrow("redirection vers /compte");
    expect(appelerAuth).toHaveBeenCalledWith("/sign-out", {});
  });
});

describe("supprimerCompte", () => {
  it("supprime le compte avec le mot de passe, puis mène à la confirmation", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(supprimerCompte({}, formulaire({ motDePasse: "un mot de passe solide" }))).rejects.toThrow(
      "redirection vers /compte/supprime",
    );
    expect(appelerAuth).toHaveBeenCalledWith("/delete-user", { password: "un mot de passe solide" });
  });

  it("renvoie le message d'erreur sans rien supprimer", async () => {
    appelerAuth.mockResolvedValue({ ok: false, message: "Mot de passe incorrect." });
    expect(await supprimerCompte({}, formulaire({ motDePasse: "faux" }))).toEqual({ message: "Mot de passe incorrect." });
    expect(redirect).not.toHaveBeenCalled();
  });
});
