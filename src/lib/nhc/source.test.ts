import { describe, expect, it } from "vitest";
import { etatFixture, fixtureDemandee, positionsFixture, previsionsFixture, watchesFixture } from "./source";

describe("fixtureDemandee", () => {
  it("n'utilise jamais de fixture sans activation explicite", () => {
    expect(fixtureDemandee({}, "vide")).toBeNull();
    expect(fixtureDemandee({ NHC_FIXTURES: "true" }, "vide")).toBeNull();
  });

  it("n'utilise jamais de fixture sur Vercel, même activée", () => {
    expect(fixtureDemandee({ NHC_FIXTURES: "1", VERCEL_ENV: "production" }, "vide")).toBeNull();
    expect(fixtureDemandee({ NHC_FIXTURES: "1", VERCEL_ENV: "preview" }, "vide")).toBeNull();
  });

  it("choisit la fixture demandée par le cookie, sinon « actifs »", () => {
    const env = { NHC_FIXTURES: "1" };
    expect(fixtureDemandee(env, "vide")).toBe("vide");
    expect(fixtureDemandee(env, "indisponible")).toBe("indisponible");
    expect(fixtureDemandee(env, undefined)).toBe("actifs");
    expect(fixtureDemandee(env, "../../etc/passwd")).toBe("actifs");
  });
});

describe("etatFixture", () => {
  const luLe = "2026-09-10T16:00:00.000Z";

  it("lit les fixtures locales comme le vrai flux", () => {
    const actifs = etatFixture("actifs", luLe);
    expect(actifs.etat === "ok" && actifs.systemes.map((s) => s.nom)).toEqual(["Kyle", "Leah", "Thirteen"]);
    expect(etatFixture("vide", luLe)).toEqual({ etat: "ok", systemes: [], rejetes: 0, luLe });
    expect(etatFixture("indisponible", luLe)).toEqual({ etat: "indisponible", luLe });
  });
});

describe("previsionsFixture", () => {
  it("fournit la trajectoire et le cône de Kyle avec la fixture « actifs », rien sinon", () => {
    const actifs = previsionsFixture("actifs");
    expect(Object.keys(actifs)).toEqual(["al112026"]);
    expect(actifs.al112026).toMatchObject({ avis: "14" });
    expect(actifs.al112026.cone).toHaveLength(1);
    expect(actifs.al112026.trajectoire).toHaveLength(1);
    expect(previsionsFixture("vide")).toEqual({});
  });
});

describe("positionsFixture", () => {
  it("fournit les positions prévues de Kyle avec la fixture « actifs », rien sinon", () => {
    const actifs = positionsFixture("actifs");
    expect(Object.keys(actifs)).toEqual(["al112026"]);
    expect(actifs.al112026.avis.numero).toBe("14");
    expect(actifs.al112026.positions).toHaveLength(8);
    expect(positionsFixture("vide")).toEqual({});
    expect(positionsFixture("indisponible")).toEqual({});
  });
});

describe("watchesFixture", () => {
  it("fournit les watches/warnings de Kyle (AT1) et de Thirteen (AT3) avec la fixture « actifs »", async () => {
    const lire = watchesFixture("actifs");
    expect((await lire("AT1")).map((segment) => segment.code)).toEqual(["HWR", "HWR", "TWR", "TWR", "HWA", "HWA"]);
    expect(await lire("AT2")).toEqual([]);
    expect((await lire("AT3")).map((segment) => segment.code)).toEqual(["TWA"]);
  });

  it("ne fournit aucun watch ni warning avec les autres fixtures", async () => {
    expect(await watchesFixture("vide")("AT1")).toEqual([]);
    expect(await watchesFixture("indisponible")("AT1")).toEqual([]);
  });
});
