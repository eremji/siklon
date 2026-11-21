// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const appelerAuth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((chemin: string) => {
    throw new Error(`redirection vers ${chemin}`);
  }),
);
const utilisateurCourant = vi.hoisted(() => vi.fn());
const confirmerEmail = vi.hoisted(() => vi.fn());
const ilesSuivies = vi.hoisted(() => ({ enregistrer: vi.fn(), lire: vi.fn() }));
const pool = vi.hoisted(() => ({ nom: "pool des comptes" }));
const abonnements = vi.hoisted(() => ({ enregistrer: vi.fn(), supprimer: vi.fn() }));
vi.mock("@/lib/auth/serveur", () => ({ appelerAuth, confirmerEmail, utilisateurCourant }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: () => pool }));
vi.mock("@/lib/db/ilesSuivies", async (original) => ({
  ...(await original<typeof import("@/lib/db/ilesSuivies")>()),
  enregistrerIlesSuivies: ilesSuivies.enregistrer,
  lireIlesSuivies: ilesSuivies.lire,
}));

vi.mock("@/lib/db/abonnementsPush", () => ({
  enregistrerAbonnement: abonnements.enregistrer,
  supprimerAbonnement: abonnements.supprimer,
}));

const {
  abonnerAppareil,
  confirmerAdresse,
  desabonnerAppareil,
  connecter,
  deconnecter,
  demanderReinitialisation,
  enregistrerIles,
  inscrire,
  reinitialiserMotDePasse,
  renvoyerConfirmation,
  supprimerCompte,
} = await import("./actions");
const { IleInconnueError } = await import("@/lib/db/ilesSuivies");

const formulaire = (champs: Record<string, string>) => {
  const donnees = new FormData();
  for (const [nom, valeur] of Object.entries(champs)) donnees.set(nom, valeur);
  return donnees;
};

beforeEach(() => {
  appelerAuth.mockReset();
  utilisateurCourant.mockReset();
  confirmerEmail.mockReset();
  ilesSuivies.enregistrer.mockReset();
  ilesSuivies.lire.mockReset();
  abonnements.enregistrer.mockReset();
  abonnements.supprimer.mockReset();
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

describe("confirmerAdresse", () => {
  it("confirme l'adresse avec le jeton du lien", async () => {
    confirmerEmail.mockResolvedValue({ ok: true });
    expect(await confirmerAdresse({}, formulaire({ jeton: "jeton-1" }))).toEqual({
      confirmation: "Votre adresse est confirmée.",
    });
    expect(confirmerEmail).toHaveBeenCalledWith("jeton-1");
  });

  it("renvoie le message d'erreur d'un lien expiré", async () => {
    confirmerEmail.mockResolvedValue({ ok: false, message: "Ce lien a expiré. Demandez-en un nouveau." });
    expect(await confirmerAdresse({}, formulaire({ jeton: "vieux" }))).toEqual({
      message: "Ce lien a expiré. Demandez-en un nouveau.",
    });
  });

  it("refuse un formulaire sans jeton, sans appeler le serveur d'authentification", async () => {
    expect(await confirmerAdresse({}, formulaire({}))).toEqual({
      message: "Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau.",
    });
    expect(confirmerEmail).not.toHaveBeenCalled();
  });
});

describe("renvoyerConfirmation", () => {
  it("renvoie un lien à l'adresse de l'utilisateur connecté", async () => {
    utilisateurCourant.mockResolvedValue({ id: "id-1", email: "a@b.fr", emailVerifie: false, langue: "fr" });
    appelerAuth.mockResolvedValue({ ok: true });
    expect(await renvoyerConfirmation()).toEqual({
      confirmation: "Un nouveau lien vient d'être envoyé à a@b.fr.",
    });
    expect(appelerAuth).toHaveBeenCalledWith("/send-verification-email", { email: "a@b.fr" });
  });

  it("sans session, n'envoie rien", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await renvoyerConfirmation()).toEqual({
      message: "Votre session a expiré. Reconnectez-vous pour recevoir un nouveau lien.",
    });
    expect(appelerAuth).not.toHaveBeenCalled();
  });
});

describe("demanderReinitialisation", () => {
  it("demande le lien et répond pareil, que l'adresse ait un compte ou non", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    expect(await demanderReinitialisation({}, formulaire({ email: " a@b.fr " }))).toEqual({
      confirmation:
        "Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient de lui être envoyé. Il reste valable 1 heure.",
    });
    expect(appelerAuth).toHaveBeenCalledWith("/request-password-reset", { email: "a@b.fr" });
  });

  it("renvoie le message d'erreur et l'email saisi", async () => {
    appelerAuth.mockResolvedValue({ ok: false, message: "Trop de tentatives. Réessayez dans 10 minutes." });
    expect(await demanderReinitialisation({}, formulaire({ email: "a@b.fr" }))).toEqual({
      message: "Trop de tentatives. Réessayez dans 10 minutes.",
      email: "a@b.fr",
    });
  });
});

describe("reinitialiserMotDePasse", () => {
  it("change le mot de passe avec le jeton du lien", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    expect(
      await reinitialiserMotDePasse({}, formulaire({ jeton: "jeton-1", motDePasse: "un tout nouveau mot de passe" })),
    ).toEqual({ confirmation: "Votre mot de passe est changé. Connectez-vous avec le nouveau." });
    expect(appelerAuth).toHaveBeenCalledWith("/reset-password", {
      token: "jeton-1",
      newPassword: "un tout nouveau mot de passe",
    });
  });

  it("renvoie le message d'erreur d'un lien qui a déjà servi", async () => {
    appelerAuth.mockResolvedValue({ ok: false, message: "Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau." });
    expect(await reinitialiserMotDePasse({}, formulaire({ jeton: "jeton-1", motDePasse: "x".repeat(12) }))).toEqual({
      message: "Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau.",
    });
  });
});

const UTILISATEUR = { id: "id-1", email: "a@b.fr", emailVerifie: true, langue: "fr" };
// Forme de PushSubscription.toJSON() : clé P-256 de 65 octets et secret de 16 octets.
const ABONNEMENT = {
  endpoint: "https://fcm.googleapis.com/fcm/send/appareil",
  expirationTime: null,
  keys: { p256dh: Buffer.alloc(65, 4).toString("base64url"), auth: Buffer.alloc(16, 1).toString("base64url") },
};

describe("abonnerAppareil", () => {
  it("enregistre l'appareil pour l'utilisateur connecté", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    expect(await abonnerAppareil(ABONNEMENT)).toEqual({ ok: true });
    expect(abonnements.enregistrer).toHaveBeenCalledWith(pool, "id-1", {
      endpoint: ABONNEMENT.endpoint,
      cles: ABONNEMENT.keys,
    });
  });

  it("sans session, n'enregistre rien et invite à se reconnecter", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await abonnerAppareil(ABONNEMENT)).toEqual({
      ok: false,
      message: "Votre session a expiré. Reconnectez-vous pour recevoir les alertes.",
    });
    expect(abonnements.enregistrer).not.toHaveBeenCalled();
  });

  it("refuse une adresse non confirmée : les alertes ne partent que vers une adresse confirmée", async () => {
    utilisateurCourant.mockResolvedValue({ ...UTILISATEUR, emailVerifie: false });
    expect(await abonnerAppareil(ABONNEMENT)).toEqual({
      ok: false,
      message: "Confirmez d'abord votre adresse email pour recevoir les alertes.",
    });
    expect(abonnements.enregistrer).not.toHaveBeenCalled();
  });

  it("refuse un abonnement qui ne vient pas d'un service push de navigateur", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    expect(await abonnerAppareil({ ...ABONNEMENT, endpoint: "https://exemple.org/push" })).toEqual({
      ok: false,
      message: "Cet appareil n'a pas pu être abonné. Réessayez plus tard.",
    });
    expect(abonnements.enregistrer).not.toHaveBeenCalled();
  });
});

describe("desabonnerAppareil", () => {
  it("retire l'appareil de l'utilisateur connecté", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    expect(await desabonnerAppareil(ABONNEMENT.endpoint)).toEqual({ ok: true });
    expect(abonnements.supprimer).toHaveBeenCalledWith(pool, "id-1", ABONNEMENT.endpoint);
  });

  it("sans session, ne retire rien", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await desabonnerAppareil(ABONNEMENT.endpoint)).toEqual({
      ok: false,
      message: "Votre session a expiré. Reconnectez-vous pour gérer vos alertes.",
    });
    expect(abonnements.supprimer).not.toHaveBeenCalled();
  });

  it("ignore une valeur qui n'est pas un texte", async () => {
    utilisateurCourant.mockResolvedValue(UTILISATEUR);
    expect(await desabonnerAppareil(42)).toEqual({ ok: true });
    expect(abonnements.supprimer).not.toHaveBeenCalled();
  });
});
