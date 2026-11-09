import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELAI_MAX_MS, telechargerArchive, telechargerControle, URL_CONTROLE, URL_FLUX } from "./client";
import { TAILLE_MAX_ARCHIVE } from "./controle";

const fixture = (nom: string) => readFileSync(join(__dirname, "__fixtures__", nom));
const CLE = "cle-de-test";

describe("client du flux vigilance outre-mer", () => {
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSimule);
  });

  afterEach(() => {
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
  });

  it("n'interroge que le portail Météo-France", () => {
    expect(new URL(URL_CONTROLE).hostname).toBe("public-api.meteofrance.fr");
    expect(new URL(URL_FLUX).hostname).toBe("public-api.meteofrance.fr");
  });

  describe("telechargerControle", () => {
    it("envoie la clé dans l'en-tête apikey, sans redirection et avec un délai maximal", async () => {
      fetchSimule.mockResolvedValue(new Response(fixture("controle.txt")));
      const timeout = vi.spyOn(AbortSignal, "timeout");

      await telechargerControle(CLE);

      expect(fetchSimule).toHaveBeenCalledWith(
        URL_CONTROLE,
        expect.objectContaining({
          headers: { apikey: CLE },
          redirect: "error",
          cache: "no-store",
          signal: expect.any(AbortSignal),
        }),
      );
      expect(timeout).toHaveBeenCalledWith(DELAI_MAX_MS);
    });

    it("renvoie le contrôle validé", async () => {
      fetchSimule.mockResolvedValue(new Response(fixture("controle.txt")));
      await expect(telechargerControle(CLE)).resolves.toEqual({ checksum: "1607393573", taille: 1079247 });
    });

    it("échoue sans appeler le réseau quand la clé manque", async () => {
      await expect(telechargerControle("")).rejects.toThrow(/METEOFRANCE_API_KEY/);
      await expect(telechargerControle(undefined)).rejects.toThrow(/METEOFRANCE_API_KEY/);
      expect(fetchSimule).not.toHaveBeenCalled();
    });

    it("échoue sur une erreur HTTP sans citer la clé", async () => {
      fetchSimule.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
      const erreur = await telechargerControle(CLE).catch((e: Error) => e);
      expect(erreur).toBeInstanceOf(Error);
      expect((erreur as Error).message).toMatch(/401/);
      expect((erreur as Error).message).not.toContain(CLE);
    });
  });

  describe("telechargerArchive", () => {
    it("renvoie les octets de l'archive", async () => {
      const zip = fixture("vigilance-om-antilles.zip");
      fetchSimule.mockResolvedValue(new Response(zip));

      const archive = await telechargerArchive(CLE);

      expect(fetchSimule).toHaveBeenCalledWith(
        URL_FLUX,
        expect.objectContaining({ headers: { apikey: CLE }, redirect: "error", cache: "no-store" }),
      );
      expect(Buffer.from(archive).equals(zip)).toBe(true);
    });

    it("échoue sur une erreur HTTP", async () => {
      fetchSimule.mockResolvedValue(new Response("Too Many Requests", { status: 429 }));
      await expect(telechargerArchive(CLE)).rejects.toThrow(/429/);
    });

    it("refuse une archive annoncée trop grosse sans la lire", async () => {
      const reponse = new Response("x", { headers: { "content-length": String(TAILLE_MAX_ARCHIVE + 1) } });
      const lecture = vi.spyOn(reponse, "arrayBuffer");
      fetchSimule.mockResolvedValue(reponse);

      await expect(telechargerArchive(CLE)).rejects.toThrow(/volumineuse/);
      expect(lecture).not.toHaveBeenCalled();
    });

    it("refuse une archive trop grosse une fois reçue", async () => {
      fetchSimule.mockResolvedValue(new Response(new Uint8Array(TAILLE_MAX_ARCHIVE + 1)));
      await expect(telechargerArchive(CLE)).rejects.toThrow(/volumineuse/);
    });
  });
});
