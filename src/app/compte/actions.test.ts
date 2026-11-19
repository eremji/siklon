// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const appelerAuth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((chemin: string) => {
    throw new Error(`redirection vers ${chemin}`);
  }),
);
const utilisateurCourant = vi.hoisted(() => vi.fn());
const ilesSuivies = vi.hoisted(() => ({ enregistrer: vi.fn(), lire: vi.fn() }));
const pool = vi.hoisted(() => ({ nom: "pool des comptes" }));
vi.mock("@/lib/auth/serveur", () => ({ appelerAuth, utilisateurCourant }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: () => pool }));
vi.mock("@/lib/db/ilesSuivies", async (original) => ({
  ...(await original<typeof import("@/lib/db/ilesSuivies")>()),
  enregistrerIlesSuivies: ilesSuivies.enregistrer,
  lireIlesSuivies: ilesSuivies.lire,
}));

const { connecter, deconnecter, enregistrerIles, inscrire, supprimerCompte } = await import("./actions");
const { IleInconnueError } = await import("@/lib/db/ilesSuivies");

const formulaire = (champs: Record<string, string>) => {
  const donnees = new FormData();
  for (const [nom, valeur] of Object.entries(champs)) donnees.set(nom, valeur);
  return donnees;
};

beforeEach(() => {
  appelerAuth.mockReset();
  utilisateurCourant.mockReset();
  ilesSuivies.enregistrer.mockReset();
  ilesSuivies.lire.mockReset();
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

describe("enregistrerIles", () => {
  const UTILISATEUR = { id: "id-1", email: "a@b.fr", emailVerifie: false, langue: "fr" };
  const cochees = (...iles: string[]) => {
    const donnees = new FormData();
    for (const ile of iles) donnees.append("ile", ile);
    return donnees;
  };

  it("enregistre les îles cochées pour l'utilisateur connecté et confirme", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    ilesSuivies.lire.mockResolvedValue(["guadeloupe", "martinique"]);
    const etat = await enregistrerIles({}, cochees("martinique", "guadeloupe"));
    expect(ilesSuivies.enregistrer).toHaveBeenCalledWith(pool, "id-1", ["martinique", "guadeloupe"]);
    expect(etat).toEqual({ confirmation: "Vos îles sont enregistrées.", iles: ["guadeloupe", "martinique"] });
  });

  it("aucune île cochée : les retire toutes", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    ilesSuivies.lire.mockResolvedValue([]);
    expect(await enregistrerIles({}, cochees())).toEqual({ confirmation: "Vos îles sont enregistrées.", iles: [] });
    expect(ilesSuivies.enregistrer).toHaveBeenCalledWith(pool, "id-1", []);
  });

  it("sans session, n'enregistre rien et invite à se reconnecter", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await enregistrerIles({}, cochees("guadeloupe"))).toEqual({
      message: "Votre session a expiré. Reconnectez-vous pour enregistrer vos îles.",
    });
    expect(ilesSuivies.enregistrer).not.toHaveBeenCalled();
  });

  it("refuse une île inconnue", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    ilesSuivies.enregistrer.mockRejectedValue(new IleInconnueError("atlantide"));
    expect(await enregistrerIles({ iles: ["guadeloupe"] }, cochees("atlantide"))).toEqual({
      message: "Cette île ne fait pas partie de la liste.",
      iles: ["guadeloupe"],
    });
  });
});
