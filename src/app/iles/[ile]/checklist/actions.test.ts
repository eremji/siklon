// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const utilisateurCourant = vi.hoisted(() => vi.fn());
const cocher = vi.hoisted(() => vi.fn());
const pool = vi.hoisted(() => ({ nom: "pool des comptes" }));
vi.mock("@/lib/auth/serveur", () => ({ utilisateurCourant }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: () => pool }));
vi.mock("@/lib/db/checklist", async (original) => ({
  ...(await original<typeof import("@/lib/db/checklist")>()),
  cocherElement: cocher,
}));

const { cocherElementChecklist } = await import("./actions");
const { ElementInconnuError } = await import("@/lib/db/checklist");

const utilisateur = { id: "u1", email: "a@exemple.org", emailVerifie: true, langue: "fr" };

beforeEach(() => {
  utilisateurCourant.mockReset();
  cocher.mockReset();
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
