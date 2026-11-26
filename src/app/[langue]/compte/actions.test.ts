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
const enregistrerAccordEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/serveur", () => ({ appelerAuth, confirmerEmail, utilisateurCourant }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: () => pool }));
vi.mock("@/lib/db/ilesSuivies", async (original) => ({
  ...(await original<typeof import("@/lib/db/ilesSuivies")>()),
  enregistrerIlesSuivies: ilesSuivies.enregistrer,
  lireIlesSuivies: ilesSuivies.lire,
}));

vi.mock("@/lib/db/notifications", () => ({ enregistrerAccordEmail }));

vi.mock("@/lib/db/abonnementsPush", () => ({
  enregistrerAbonnement: abonnements.enregistrer,
  supprimerAbonnement: abonnements.supprimer,
}));

const {
  abonnerAppareil,
  confirmerAdresse,
  desabonnerAppareil,
  connecter,
  connecterAvecGoogle,
  deconnecter,
  demanderReinitialisation,
  enregistrerAlertesEmail,
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
  enregistrerAccordEmail.mockReset();
  redirect.mockClear();
});

describe("inscrire", () => {
  it("crée le compte sans nom, avec la langue choisie, puis mène à la page Compte dans la langue de la page", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(
      inscrire(
        {},
        formulaire({ email: " a@b.fr ", motDePasse: "un mot de passe solide", langue: "en", langueInterface: "fr" }),
      ),
    ).rejects.toThrow(/^redirection vers \/fr\/compte$/);
    expect(appelerAuth).toHaveBeenCalledWith("/sign-up/email", {
      email: "a@b.fr",
      password: "un mot de passe solide",
      name: "",
      langue: "en",
    }, "fr");
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
  it("connecte puis mène à la page Compte dans la langue de la page", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(
      connecter({}, formulaire({ email: "a@b.fr", motDePasse: "un mot de passe solide", langueInterface: "en" })),
    ).rejects.toThrow(/^redirection vers \/en\/compte$/);
    expect(appelerAuth).toHaveBeenCalledWith("/sign-in/email", { email: "a@b.fr", password: "un mot de passe solide" }, "en");
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
  it("ferme la session puis revient à la page Compte dans la langue de la page", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(deconnecter(formulaire({ langueInterface: "en" }))).rejects.toThrow(/^redirection vers \/en\/compte$/);
    expect(appelerAuth).toHaveBeenCalledWith("/sign-out", {}, "en");
  });
});

describe("supprimerCompte", () => {
  it("supprime le compte avec le mot de passe, puis mène à la confirmation", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    await expect(
      supprimerCompte({}, formulaire({ motDePasse: "un mot de passe solide", langueInterface: "en" })),
    ).rejects.toThrow(/^redirection vers \/en\/compte\/supprime$/);
    expect(appelerAuth).toHaveBeenCalledWith("/delete-user", { password: "un mot de passe solide" }, "en");
  });

  it("sans champ mot de passe (compte Google seul), demande la suppression sans mot de passe", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    // Sans langue reçue (ancien formulaire, champ retiré…) : le français.
    await expect(supprimerCompte({}, formulaire({}))).rejects.toThrow(/^redirection vers \/fr\/compte\/supprime$/);
    expect(appelerAuth).toHaveBeenCalledWith("/delete-user", {}, "fr");
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

describe("enregistrerAlertesEmail", () => {
  const CONFIRME = { id: "id-1", email: "a@b.fr", emailVerifie: true, langue: "fr" };
  const formulaireAlertes = (coche: boolean) => {
    const donnees = new FormData();
    if (coche) donnees.set("email", "oui");
    return donnees;
  };

  it("case cochée : enregistre l'accord et confirme", async () => {
    utilisateurCourant.mockResolvedValue(CONFIRME);
    expect(await enregistrerAlertesEmail({}, formulaireAlertes(true))).toEqual({
      confirmation: "Vous recevrez les alertes par e-mail.",
      accord: true,
    });
    expect(enregistrerAccordEmail).toHaveBeenCalledWith(pool, "id-1", true);
  });

  it("case décochée : retire l'accord et confirme", async () => {
    utilisateurCourant.mockResolvedValue(CONFIRME);
    expect(await enregistrerAlertesEmail({ accord: true }, formulaireAlertes(false))).toEqual({
      confirmation: "Vous ne recevrez plus les alertes par e-mail.",
      accord: false,
    });
    expect(enregistrerAccordEmail).toHaveBeenCalledWith(pool, "id-1", false);
  });

  it("sans session, n'enregistre rien et invite à se reconnecter", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await enregistrerAlertesEmail({ accord: false }, formulaireAlertes(true))).toEqual({
      message: "Votre session a expiré. Reconnectez-vous pour gérer vos alertes.",
      accord: false,
    });
    expect(enregistrerAccordEmail).not.toHaveBeenCalled();
  });

  it("adresse non confirmée : n'enregistre rien", async () => {
    utilisateurCourant.mockResolvedValue({ ...CONFIRME, emailVerifie: false });
    expect(await enregistrerAlertesEmail({ accord: false }, formulaireAlertes(true))).toEqual({
      message: "Confirmez d'abord votre adresse email pour recevoir les alertes.",
      accord: false,
    });
    expect(enregistrerAccordEmail).not.toHaveBeenCalled();
  });
});

describe("confirmerAdresse", () => {
  it("confirme l'adresse avec le jeton du lien", async () => {
    confirmerEmail.mockResolvedValue({ ok: true });
    expect(await confirmerAdresse({}, formulaire({ jeton: "jeton-1" }))).toEqual({
      confirmation: "Votre adresse est confirmée.",
    });
    expect(confirmerEmail).toHaveBeenCalledWith("jeton-1", "fr");
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
    expect(appelerAuth).toHaveBeenCalledWith("/send-verification-email", { email: "a@b.fr" }, "fr");
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
    expect(appelerAuth).toHaveBeenCalledWith("/request-password-reset", { email: "a@b.fr" }, "fr");
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
    }, "fr");
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

describe("connecterAvecGoogle", () => {
  it("part vers Google avec la langue choisie, puis revient sur la page Compte dans la langue de la page", async () => {
    appelerAuth.mockResolvedValue({ ok: true, corps: { url: "https://accounts.google.com/o/oauth2/v2/auth?state=abc" } });
    await expect(
      connecterAvecGoogle(formulaire({ langue: "en", origine: "/compte/inscription", langueInterface: "fr" })),
    ).rejects.toThrow("redirection vers https://accounts.google.com/o/oauth2/v2/auth?state=abc");
    expect(appelerAuth).toHaveBeenCalledWith("/sign-in/social", {
      provider: "google",
      callbackURL: "/fr/compte",
      errorCallbackURL: "/fr/compte/inscription",
      additionalData: { langue: "en" },
    }, "fr");
  });

  it("en cas d'échec au retour, revient sur la page de départ ; une page inconnue devient la page de connexion", async () => {
    appelerAuth.mockResolvedValue({ ok: true, corps: { url: "https://accounts.google.com/x" } });
    await expect(connecterAvecGoogle(formulaire({ origine: "https://pirate.example" }))).rejects.toThrow();
    expect(appelerAuth).toHaveBeenCalledWith(
      "/sign-in/social",
      expect.objectContaining({ errorCallbackURL: "/fr/compte/connexion", additionalData: { langue: "fr" } }),
      "fr",
    );
  });

  it("si Better Auth refuse le départ (trop de tentatives…), revient sur la page avec une erreur", async () => {
    appelerAuth.mockResolvedValue({ ok: false, message: "Trop de tentatives. Réessayez dans 1 minute." });
    await expect(connecterAvecGoogle(formulaire({ origine: "/compte/connexion", langueInterface: "en" }))).rejects.toThrow(
      "redirection vers /en/compte/connexion?error=depart_impossible",
    );
  });

  it("ne suit jamais une adresse de départ qui ne serait pas celle de Google", async () => {
    appelerAuth.mockResolvedValue({ ok: true, corps: { url: "https://pirate.example/connexion" } });
    await expect(connecterAvecGoogle(formulaire({ origine: "/compte/connexion" }))).rejects.toThrow(
      "redirection vers /fr/compte/connexion?error=depart_impossible",
    );
  });
});

describe("messages des actions en anglais (US-10)", () => {
  const anglais = (champs: Record<string, string> = {}) => formulaire({ ...champs, langueInterface: "en" });
  const connecte = { id: "id-1", email: "a@b.fr", emailVerifie: true, langue: "en" };

  it("inscription : demande la langue en anglais, et transmet la langue de la page à Better Auth", async () => {
    expect(await inscrire({}, anglais({ email: "a@b.fr", langue: "es" }))).toEqual({
      message: "Choose French or English.",
      email: "a@b.fr",
    });
    appelerAuth.mockResolvedValue({ ok: false, message: "An account already exists with this email address." });
    await inscrire({}, anglais({ email: "a@b.fr", motDePasse: "un mot de passe solide", langue: "en" }));
    expect(appelerAuth).toHaveBeenCalledWith("/sign-up/email", expect.objectContaining({ langue: "en" }), "en");
  });

  it("îles : session expirée, île inconnue et confirmation", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await enregistrerIles({}, anglais())).toEqual({
      message: "Your session has expired. Sign in again to save your islands.",
    });
    utilisateurCourant.mockResolvedValue(connecte);
    ilesSuivies.enregistrer.mockRejectedValueOnce(new IleInconnueError("atlantide"));
    expect(await enregistrerIles({}, anglais({ ile: "atlantide" }))).toEqual({
      message: "This island is not on the list.",
      iles: undefined,
    });
    ilesSuivies.lire.mockResolvedValue(["haiti"]);
    expect(await enregistrerIles({}, anglais({ ile: "haiti" }))).toEqual({ confirmation: "Your islands are saved.", iles: ["haiti"] });
  });

  it("alertes par e-mail : adresse à confirmer, accord et retrait", async () => {
    utilisateurCourant.mockResolvedValue({ ...connecte, emailVerifie: false });
    expect(await enregistrerAlertesEmail({}, anglais({ email: "oui" }))).toEqual({
      message: "Confirm your email address first to receive alerts.",
      accord: undefined,
    });
    utilisateurCourant.mockResolvedValue(connecte);
    expect(await enregistrerAlertesEmail({}, anglais({ email: "oui" }))).toEqual({
      confirmation: "You will receive alerts by email.",
      accord: true,
    });
    expect(await enregistrerAlertesEmail({}, anglais())).toEqual({
      confirmation: "You will no longer receive alerts by email.",
      accord: false,
    });
  });

  it("confirmation d'adresse et renvoi du lien", async () => {
    expect(await confirmerAdresse({}, anglais())).toEqual({
      message: "This link is not valid or has already been used. Request a new one.",
    });
    confirmerEmail.mockResolvedValue({ ok: true });
    expect(await confirmerAdresse({}, anglais({ jeton: "jeton" }))).toEqual({ confirmation: "Your address is confirmed." });
    expect(confirmerEmail).toHaveBeenCalledWith("jeton", "en");

    utilisateurCourant.mockResolvedValue(null);
    expect(await renvoyerConfirmation({}, anglais())).toEqual({
      message: "Your session has expired. Sign in again to get a new link.",
    });
    utilisateurCourant.mockResolvedValue(connecte);
    appelerAuth.mockResolvedValue({ ok: true });
    expect(await renvoyerConfirmation({}, anglais())).toEqual({ confirmation: "A new link has just been sent to a@b.fr." });
  });

  it("mot de passe oublié et nouveau mot de passe", async () => {
    appelerAuth.mockResolvedValue({ ok: true });
    expect(await demanderReinitialisation({}, anglais({ email: "a@b.fr" }))).toEqual({
      confirmation:
        "If an account exists with this address, a link to choose a new password has just been sent to it. It is valid for 1 hour.",
    });
    expect(await reinitialiserMotDePasse({}, anglais({ jeton: "j", motDePasse: "un mot de passe solide" }))).toEqual({
      confirmation: "Your password has been changed. Sign in with the new one.",
    });
  });

  it("abonnement de l'appareil : messages dans la langue de la page", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await abonnerAppareil({}, "en")).toEqual({
      ok: false,
      message: "Your session has expired. Sign in again to receive alerts.",
    });
    expect(await desabonnerAppareil("https://push.example/x", "en")).toEqual({
      ok: false,
      message: "Your session has expired. Sign in again to manage your alerts.",
    });
    utilisateurCourant.mockResolvedValue({ ...connecte, emailVerifie: false });
    expect(await abonnerAppareil({}, "en")).toEqual({
      ok: false,
      message: "Confirm your email address first to receive alerts.",
    });
    utilisateurCourant.mockResolvedValue(connecte);
    expect(await abonnerAppareil({ endpoint: "pas une adresse" }, "en")).toEqual({
      ok: false,
      message: "This device could not be subscribed. Please try again later.",
    });
  });

  it("Google : sans langue cochée, le compte prend la langue de la page", async () => {
    appelerAuth.mockResolvedValue({ ok: true, corps: { url: "https://accounts.google.com/x" } });
    await expect(connecterAvecGoogle(anglais({ origine: "/compte/connexion" }))).rejects.toThrow();
    expect(appelerAuth).toHaveBeenCalledWith(
      "/sign-in/social",
      expect.objectContaining({ additionalData: { langue: "en" } }),
      "en",
    );
  });
});
