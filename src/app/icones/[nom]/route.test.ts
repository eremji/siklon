// @vitest-environment node
// Icônes du manifeste (US-07b, #101), dessinées par next/og à partir des jetons de DESIGN.md.
import { describe, expect, it } from "vitest";
import { ICONES } from "@/lib/pwa/icones";
import { GET, generateStaticParams } from "./route";

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Largeur et hauteur lues dans l'en-tête IHDR d'un PNG. */
function dimensions(octets: Uint8Array): { largeur: number; hauteur: number } {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  return { largeur: vue.getUint32(16), hauteur: vue.getUint32(20) };
}

const appeler = (nom: string) => GET(new Request(`https://siklon.exemple/icones/${nom}`), { params: Promise.resolve({ nom }) });

describe("icônes du manifeste", () => {
  it("sont toutes générées au build", () => {
    expect(generateStaticParams()).toEqual(ICONES.map(({ nom }) => ({ nom })));
  });

  it.each(ICONES.map((icone) => [icone.nom, icone.taille] as const))("%s est un PNG de %i px de côté", async (nom, taille) => {
    const reponse = await appeler(nom);

    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("content-type")).toBe("image/png");
    const octets = new Uint8Array(await reponse.arrayBuffer());
    expect([...octets.slice(0, 8)]).toEqual(SIGNATURE_PNG);
    expect(dimensions(octets)).toEqual({ largeur: taille, hauteur: taille });
  }, 30_000);

  it("répond 404 pour une icône inconnue", async () => {
    expect((await appeler("1024.png")).status).toBe(404);
  });
});
