import { describe, expect, it } from "vitest";
import { etatFixture, fixtureDemandee, MIS_A_JOUR_FIXTURE } from "./fixtures";

describe("mode fixture de la vigilance (tests e2e)", () => {
  it("reste inactif sans VIGILANCE_FIXTURES=1", () => {
    expect(fixtureDemandee({}, "rouge")).toBeNull();
    expect(fixtureDemandee({ VIGILANCE_FIXTURES: "true" }, "rouge")).toBeNull();
  });

  it("reste inactif sur Vercel, même si la variable est définie", () => {
    expect(fixtureDemandee({ VIGILANCE_FIXTURES: "1", VERCEL_ENV: "preview" }, "rouge")).toBeNull();
  });

  it("choisit la fixture demandée, ou le vert par défaut", () => {
    expect(fixtureDemandee({ VIGILANCE_FIXTURES: "1" }, "violet")).toBe("violet");
    expect(fixtureDemandee({ VIGILANCE_FIXTURES: "1" }, "indisponible")).toBe("indisponible");
    expect(fixtureDemandee({ VIGILANCE_FIXTURES: "1" }, "inconnue")).toBe("vert");
    expect(fixtureDemandee({ VIGILANCE_FIXTURES: "1" }, undefined)).toBe("vert");
  });

  it("produit l'état correspondant", () => {
    expect(etatFixture("orange")).toEqual({ etat: "ok", niveau: "orange", misAJour: MIS_A_JOUR_FIXTURE });
    expect(etatFixture("indisponible")).toEqual({ etat: "indisponible" });
  });
});
