// @vitest-environment node
import { describe, expect, it } from "vitest";
import { IMAGES_DEMARRAGE } from "@/lib/pwa/demarrage";
import { GET, generateStaticParams } from "./route";

const appel = (nom: string) => GET(new Request(`http://localhost/demarrage/${nom}`), { params: Promise.resolve({ nom }) });

describe("images de démarrage (US-07c)", () => {
  it("sont toutes construites au build", () => {
    expect(generateStaticParams()).toEqual(IMAGES_DEMARRAGE.map(({ nom }) => ({ nom })));
  });

  it("dessinent un PNG aux dimensions de l'écran, en pixels réels", async () => {
    const reponse = await appel("375x667@2x-sombre.png");
    expect(reponse.headers.get("content-type")).toBe("image/png");
    const vue = new DataView(await reponse.arrayBuffer());
    expect(vue.getUint32(0)).toBe(0x89504e47);
    expect([vue.getUint32(16), vue.getUint32(20)]).toEqual([750, 1334]);
  }, 30_000);

  it("répondent 404 à un nom inconnu", async () => {
    expect((await appel("100x100@1x-clair.png")).status).toBe(404);
  });
});
