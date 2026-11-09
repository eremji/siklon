import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAINES, lireBulletin } from "./bulletin";

const texte = (nom: string) => readFileSync(join(__dirname, "__fixtures__", nom), "utf-8");
const guadeloupe = texte("CDPV85_TFFR_.txt");

/** Bulletin réel de la Guadeloupe, modifié par `modifier`. */
function variante(modifier: (bulletin: Record<string, unknown>) => void): string {
  const bulletin = JSON.parse(guadeloupe);
  modifier(bulletin);
  return JSON.stringify(bulletin);
}

/** Domaine VIGI971 (Guadeloupe entière) du bulletin modifié. */
function domaine(bulletin: Record<string, unknown>): Record<string, unknown> {
  const { domain_ids } = bulletin.timelaps as { domain_ids: Record<string, unknown>[] };
  return domain_ids.find((d) => d.domain_id === "VIGI971")!;
}

describe("lireBulletin", () => {
  it("associe chaque fichier au domaine de l'île entière", () => {
    expect(DOMAINES).toEqual({ CDPV85TFFR: "VIGI971", CDPV85TFFF: "VIGI972", CDPV85TFFJ: "VIGI978-977" });
  });

  it.each([
    ["CDPV85TFFR", "CDPV85_TFFR_.txt", "jaune", "2026-11-09T09:42:00.000Z"],
    ["CDPV85TFFF", "CDPV85_TFFF_.txt", "vert", "2026-11-09T09:48:00.000Z"],
    ["CDPV85TFFJ", "CDPV85_TFFJ_.txt", "vert", "2026-11-09T09:48:00.000Z"],
  ] as const)("lit le niveau et l'heure de mise à jour du bulletin réel %s", (fichier, nom, niveau, misAJour) => {
    expect(lireBulletin(texte(nom), fichier)).toEqual({ niveau, misAJour });
  });

  it("lit le niveau de l'île entière, pas celui d'une de ses zones", () => {
    const bulletin = variante((b) => {
      const zones = (b.timelaps as { domain_ids: Record<string, unknown>[] }).domain_ids;
      zones.find((d) => d.domain_id === "VIGI971-01")!.max_color_id = 4;
    });
    expect(lireBulletin(bulletin, "CDPV85TFFR").niveau).toBe("jaune");
  });

  it.each<[string, string]>([
    ["un JSON invalide", "{"],
    ["un tableau", "[]"],
    ["null", "null"],
    ["un autre type de bulletin", variante((b) => (b.warning_type = "vigilance4colors"))],
    ["une heure de mise à jour absente", variante((b) => delete b.update_time)],
    ["une heure de mise à jour illisible", variante((b) => (b.update_time = "hier"))],
    ["une heure de mise à jour impossible", variante((b) => (b.update_time = "2026-13-45T09:42:00Z"))],
    ["une heure de mise à jour sans fuseau UTC", variante((b) => (b.update_time = "2026-11-09T09:42:00"))],
    ["des zones absentes", variante((b) => delete b.timelaps)],
    ["des zones qui ne sont pas une liste", variante((b) => (b.timelaps = { domain_ids: {} }))],
    [
      "le domaine de l'île absent",
      variante((b) => (domaine(b).domain_id = "VIGI999")),
    ],
    [
      "le domaine de l'île en double",
      variante((b) => {
        const zones = (b.timelaps as { domain_ids: unknown[] }).domain_ids;
        zones.push(domaine(b));
      }),
    ],
    ["un code couleur inconnu", variante((b) => (domaine(b).max_color_id = 7))],
    ["un code couleur « sans objet »", variante((b) => (domaine(b).max_color_id = 0))],
    ["un code couleur en texte", variante((b) => (domaine(b).max_color_id = "2"))],
  ])("rejette %s", (_cas, bulletin) => {
    expect(() => lireBulletin(bulletin, "CDPV85TFFR")).toThrow();
  });
});
