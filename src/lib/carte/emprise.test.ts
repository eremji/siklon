import { describe, expect, it } from "vitest";
import { EMPRISE_ANTILLES, MARGE_DEGRES, emprise } from "./emprise";

describe("emprise", () => {
  it("montre les Antilles quand aucun système n'est actif", () => {
    expect(emprise([])).toEqual(EMPRISE_ANTILLES);
  });

  it("garde les Antilles quand les systèmes y sont déjà", () => {
    expect(emprise([{ latitude: 16.8, longitude: -62 }])).toEqual(EMPRISE_ANTILLES);
  });

  it("s'élargit pour montrer chaque système, avec une marge", () => {
    const [[ouest, sud], [est, nord]] = emprise([
      { latitude: 12.4, longitude: -41.0 },
      { latitude: 32.0, longitude: -71.5 },
    ]);

    expect(est).toBe(-41.0 + MARGE_DEGRES);
    expect(nord).toBe(32.0 + MARGE_DEGRES);
    expect(ouest).toBe(EMPRISE_ANTILLES[0][0]);
    expect(sud).toBe(EMPRISE_ANTILLES[0][1]);
  });
});
