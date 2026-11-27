// @vitest-environment node
// Route de santé publique (#164), lue par le surveillant GitHub Actions : elle dit seulement si le journal
// des lectures est à jour, sans rien d'autre (ni heure, ni contenu, ni détail d'erreur).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lireDerniereEcriture = vi.hoisted(() => vi.fn());
const pool = vi.hoisted(() => ({ nom: "pool de lecture" }));
vi.mock("@/lib/db/dernieresLectures", () => ({ lireDerniereEcriture }));
vi.mock("@/lib/db/pool", () => ({ connexion: () => pool }));
vi.mock("next/server", () => ({ connection: async () => {} }));

const { GET } = await import("./route");

const MAINTENANT = new Date("2026-09-10T15:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ now: MAINTENANT, toFake: ["Date"] });
  lireDerniereEcriture.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/sante", () => {
  it("répond 200 « a-jour » quand le journal vient d'être écrit", async () => {
    lireDerniereEcriture.mockResolvedValue("2026-09-10T14:59:00.000Z");

    const reponse = await GET();

    expect(lireDerniereEcriture).toHaveBeenCalledWith(pool);
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ etat: "a-jour" });
    expect(reponse.headers.get("cache-control")).toBe("no-store");
  });

  it("répond 503 « en-retard » quand le journal n'est plus alimenté, sans donner l'heure", async () => {
    lireDerniereEcriture.mockResolvedValue("2026-09-10T13:00:00.000Z");

    const reponse = await GET();

    expect(reponse.status).toBe(503);
    expect(await reponse.json()).toEqual({ etat: "en-retard" });
  });

  it("répond 503 « en-retard » sans détail quand la base ne répond pas", async () => {
    lireDerniereEcriture.mockRejectedValue(new Error("connexion refusée à db.secret.supabase.co"));

    const reponse = await GET();

    expect(reponse.status).toBe(503);
    expect(await reponse.text()).toBe(JSON.stringify({ etat: "en-retard" }));
  });
});
