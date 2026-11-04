import { describe, expect, it } from "vitest";
import { RADIUS_IMPACT_KM, RADIUS_WATCH_KM, RAYON_TERRE_KM } from "./constantes";

describe("constantes de SPEC.md", () => {
  it("fixe le rayon d'impact à 120 km", () => {
    expect(RADIUS_IMPACT_KM).toBe(120);
  });

  it("fixe le rayon de surveillance à 300 km", () => {
    expect(RADIUS_WATCH_KM).toBe(300);
  });

  it("garde le rayon d'impact plus petit que le rayon de surveillance", () => {
    expect(RADIUS_IMPACT_KM).toBeLessThan(RADIUS_WATCH_KM);
  });

  it("utilise le rayon terrestre moyen de l'UGGI", () => {
    expect(RAYON_TERRE_KM).toBe(6371.0088);
  });
});
