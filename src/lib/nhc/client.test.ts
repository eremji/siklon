import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import actifs from "./__fixtures__/current-storms-actifs.json";
import { DELAI_MAX_MS, URL_CURRENT_STORMS, chargerSystemesActifs } from "./client";

const maintenant = () => new Date("2026-09-10T16:00:00.000Z");

function reponse(corps: string, status = 200) {
  return new Response(corps, { status, headers: { "content-type": "application/json" } });
}

describe("chargerSystemesActifs", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchSimule);
  });

  afterEach(() => {
    warn.mockRestore();
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
  });

  it("interroge l'URL officielle du NHC, sans suivre de redirection et avec un délai maximal", async () => {
    fetchSimule.mockResolvedValue(reponse(JSON.stringify(actifs)));
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await chargerSystemesActifs({ maintenant });

    expect(fetchSimule).toHaveBeenCalledWith(
      URL_CURRENT_STORMS,
      expect.objectContaining({ redirect: "error", cache: "no-store", signal: expect.any(AbortSignal) }),
    );
    expect(timeout).toHaveBeenCalledWith(DELAI_MAX_MS);
    expect(new URL(URL_CURRENT_STORMS).hostname).toBe("www.nhc.noaa.gov");
  });

  it("renvoie les systèmes validés et l'heure de lecture du flux", async () => {
    fetchSimule.mockResolvedValue(reponse(JSON.stringify(actifs)));

    const resultat = await chargerSystemesActifs({ maintenant });

    expect(resultat).toMatchObject({ etat: "ok", rejetes: 0, luLe: "2026-09-10T16:00:00.000Z" });
    expect(resultat.etat === "ok" && resultat.systemes.map((s) => s.nom)).toEqual(["Kyle", "Leah", "Thirteen"]);
  });

  it.each([
    ["le serveur répond en erreur", () => fetchSimule.mockResolvedValue(reponse("Service Unavailable", 503))],
    ["la réponse n'est pas du JSON", () => fetchSimule.mockResolvedValue(reponse("<html>"))],
    ["le schéma est invalide", () => fetchSimule.mockResolvedValue(reponse(JSON.stringify({ storms: [] })))],
    ["la requête échoue ou dépasse le délai", () => fetchSimule.mockRejectedValue(new DOMException("", "TimeoutError"))],
  ])("signale le flux indisponible quand %s", async (_cas, preparer) => {
    preparer();

    const resultat = await chargerSystemesActifs({ maintenant });

    expect(resultat).toEqual({ etat: "indisponible", luLe: "2026-09-10T16:00:00.000Z" });
    expect(warn).toHaveBeenCalled();
  });

  it("ne recopie pas la réponse reçue dans le journal", async () => {
    fetchSimule.mockResolvedValue(reponse("secret"));

    await chargerSystemesActifs({ maintenant });

    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
  });
});
