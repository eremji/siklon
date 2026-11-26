// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const utilisateurCourant = vi.hoisted(() => vi.fn());
const cocher = vi.hoisted(() => vi.fn());
const base = vi.hoisted(() => ({ masquer: vi.fn(), ajouter: vi.fn(), cocherPerso: vi.fn(), supprimer: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ refresh }));
const pool = vi.hoisted(() => ({ nom: "pool des comptes" }));
vi.mock("@/lib/auth/serveur", () => ({ utilisateurCourant }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: () => pool }));
vi.mock("@/lib/db/checklist", async (original) => ({
  ...(await original<typeof import("@/lib/db/checklist")>()),
  cocherElement: cocher,
  masquerElement: base.masquer,
  ajouterElementPerso: base.ajouter,
  cocherElementPerso: base.cocherPerso,
  supprimerElementPerso: base.supprimer,
}));

const {
  ajouterElementChecklist,
  cocherElementChecklist,
  cocherElementPersoChecklist,
  masquerElementChecklist,
  supprimerElementChecklist,
} = await import("./actions");
const { ElementInconnuError, LimiteAtteinteError, TexteInvalideError } = await import("@/lib/db/checklist");

const formulaire = (champs: Record<string, string>) => {
  const donnees = new FormData();
  for (const [nom, valeur] of Object.entries(champs)) donnees.set(nom, valeur);
  return donnees;
};
const SESSION_EXPIREE = "Votre session a expiré. Reconnectez-vous pour enregistrer votre checklist.";

const utilisateur = { id: "u1", email: "a@exemple.org", emailVerifie: true, langue: "fr" };

beforeEach(() => {
  utilisateurCourant.mockReset();
  cocher.mockReset();
  for (const fonction of Object.values(base)) fonction.mockReset();
  refresh.mockReset();
});

describe("cocherElementChecklist", () => {
  it("enregistre l'état de l'élément pour l'utilisateur connecté", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    expect(await cocherElementChecklist("orange-carburant", true)).toEqual({ ok: true });
    expect(cocher).toHaveBeenCalledWith(pool, "u1", "orange-carburant", true);
  });

  it("refuse sans session, sans rien écrire", async () => {
    utilisateurCourant.mockResolvedValue(null);

    expect(await cocherElementChecklist("orange-carburant", true)).toEqual({
      ok: false,
      message: "Votre session a expiré. Reconnectez-vous pour enregistrer votre checklist.",
    });
    expect(cocher).not.toHaveBeenCalled();
  });

  it("refuse un élément inconnu", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    cocher.mockRejectedValue(new ElementInconnuError("x"));

    expect(await cocherElementChecklist("x", true)).toEqual({
      ok: false,
      message: "Cet élément ne fait pas partie de la checklist.",
    });
  });

  it("refuse une valeur qui n'est pas un booléen", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    expect(await cocherElementChecklist("vert-eau", "oui" as unknown as boolean)).toEqual({
      ok: false,
      message: "Cet élément ne fait pas partie de la checklist.",
    });
    expect(cocher).not.toHaveBeenCalled();
  });
});

describe("masquerElementChecklist", () => {
  it("masque l'élément, puis rafraîchit la page", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    expect(await masquerElementChecklist(null, formulaire({ element: "orange-bateaux", masque: "1" }))).toEqual({});
    expect(base.masquer).toHaveBeenCalledWith(pool, "u1", "orange-bateaux", true);
    expect(refresh).toHaveBeenCalled();
  });

  it("réaffiche l'élément", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    await masquerElementChecklist(null, formulaire({ element: "orange-bateaux", masque: "0" }));
    expect(base.masquer).toHaveBeenCalledWith(pool, "u1", "orange-bateaux", false);
  });

  it("refuse sans session, sans rien écrire", async () => {
    utilisateurCourant.mockResolvedValue(null);

    expect(await masquerElementChecklist(null, formulaire({ element: "orange-bateaux", masque: "1" }))).toEqual({
      message: SESSION_EXPIREE,
    });
    expect(base.masquer).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuse un élément inconnu", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    base.masquer.mockRejectedValue(new ElementInconnuError("x"));

    expect(await masquerElementChecklist(null, formulaire({ element: "x", masque: "1" }))).toEqual({
      message: "Cet élément ne fait pas partie de la checklist.",
    });
  });
});

describe("ajouterElementChecklist", () => {
  it("ajoute l'élément, puis rafraîchit la page", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    expect(await ajouterElementChecklist(null, formulaire({ texte: "Croquettes du chien" }))).toEqual({ ajoute: true });
    expect(base.ajouter).toHaveBeenCalledWith(pool, "u1", "Croquettes du chien");
    expect(refresh).toHaveBeenCalled();
  });

  it("refuse sans session", async () => {
    utilisateurCourant.mockResolvedValue(null);

    expect(await ajouterElementChecklist(null, formulaire({ texte: "Croquettes" }))).toEqual({
      message: SESSION_EXPIREE,
      texte: "Croquettes",
    });
    expect(base.ajouter).not.toHaveBeenCalled();
  });

  it("explique un texte vide ou trop long, et garde la saisie", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    base.ajouter.mockRejectedValue(new TexteInvalideError());

    expect(await ajouterElementChecklist(null, formulaire({ texte: "   " }))).toEqual({
      message: "Écrivez un élément de 1 à 200 caractères.",
      texte: "   ",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("explique que la limite est atteinte", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    base.ajouter.mockRejectedValue(new LimiteAtteinteError());

    expect(await ajouterElementChecklist(null, formulaire({ texte: "Un de trop" }))).toEqual({
      message: "Vous avez déjà ajouté 50 éléments. Supprimez-en un pour en ajouter un autre.",
      texte: "Un de trop",
    });
  });
});

describe("cocherElementPersoChecklist", () => {
  it("coche l'élément ajouté de l'utilisateur connecté", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    expect(await cocherElementPersoChecklist("id-1", true)).toEqual({ ok: true });
    expect(base.cocherPerso).toHaveBeenCalledWith(pool, "u1", "id-1", true);
  });

  it("refuse un élément qui n'appartient pas à l'utilisateur", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    base.cocherPerso.mockRejectedValue(new ElementInconnuError("id-1"));

    expect(await cocherElementPersoChecklist("id-1", true)).toEqual({
      ok: false,
      message: "Cet élément ne fait pas partie de la checklist.",
    });
  });

  it("refuse sans session", async () => {
    utilisateurCourant.mockResolvedValue(null);

    expect(await cocherElementPersoChecklist("id-1", true)).toEqual({ ok: false, message: SESSION_EXPIREE });
    expect(base.cocherPerso).not.toHaveBeenCalled();
  });
});

describe("supprimerElementChecklist", () => {
  it("supprime l'élément ajouté, puis rafraîchit la page", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);

    expect(await supprimerElementChecklist(null, formulaire({ id: "id-1" }))).toEqual({});
    expect(base.supprimer).toHaveBeenCalledWith(pool, "u1", "id-1");
    expect(refresh).toHaveBeenCalled();
  });

  it("refuse un élément qui n'appartient pas à l'utilisateur", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    base.supprimer.mockRejectedValue(new ElementInconnuError("id-1"));

    expect(await supprimerElementChecklist(null, formulaire({ id: "id-1" }))).toEqual({
      message: "Cet élément ne fait pas partie de la checklist.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("messages en anglais (US-10)", () => {
  const SESSION_EXPIREE_EN = "Your session has expired. Sign in again to save your checklist.";
  const ELEMENT_INCONNU_EN = "This item is not part of the checklist.";

  it("répond dans la langue de la page à une case cochée", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await cocherElementChecklist("orange-carburant", true, "en")).toEqual({ ok: false, message: SESSION_EXPIREE_EN });
    expect(await cocherElementPersoChecklist("id-1", true, "en")).toEqual({ ok: false, message: SESSION_EXPIREE_EN });

    utilisateurCourant.mockResolvedValue(utilisateur);
    expect(await cocherElementChecklist("vert-eau", "oui" as unknown as boolean, "en")).toEqual({
      ok: false,
      message: ELEMENT_INCONNU_EN,
    });
  });

  it("garde le français pour une langue inconnue", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await cocherElementChecklist("orange-carburant", true, "de" as "en")).toEqual({ ok: false, message: SESSION_EXPIREE });
  });

  it("lit la langue du formulaire (champ caché langueInterface)", async () => {
    utilisateurCourant.mockResolvedValue(null);
    expect(await masquerElementChecklist(null, formulaire({ element: "x", masque: "1", langueInterface: "en" }))).toEqual({
      message: SESSION_EXPIREE_EN,
    });
    expect(await ajouterElementChecklist(null, formulaire({ texte: "Dog food", langueInterface: "en" }))).toEqual({
      message: SESSION_EXPIREE_EN,
      texte: "Dog food",
    });

    utilisateurCourant.mockResolvedValue(utilisateur);
    base.supprimer.mockRejectedValue(new ElementInconnuError("id-1"));
    expect(await supprimerElementChecklist(null, formulaire({ id: "id-1", langueInterface: "en" }))).toEqual({
      message: ELEMENT_INCONNU_EN,
    });
  });

  it("explique en anglais un texte refusé et la limite atteinte", async () => {
    utilisateurCourant.mockResolvedValue(utilisateur);
    base.ajouter.mockRejectedValueOnce(new TexteInvalideError());
    expect(await ajouterElementChecklist(null, formulaire({ texte: " ", langueInterface: "en" }))).toEqual({
      message: "Write an item of 1 to 200 characters.",
      texte: " ",
    });

    base.ajouter.mockRejectedValueOnce(new LimiteAtteinteError());
    expect(await ajouterElementChecklist(null, formulaire({ texte: "One too many", langueInterface: "en" }))).toEqual({
      message: "You have already added 50 items. Delete one to add another.",
      texte: "One too many",
    });
  });
});
