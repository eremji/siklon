// @vitest-environment node
import { describe, expect, it } from "vitest";
import { entetesSecurite, politiqueContenu } from "./entetes";

const directives = (csp: string) =>
  Object.fromEntries(
    csp
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [nom, ...valeurs] = d.split(/\s+/);
        return [nom, valeurs];
      }),
  );

describe("politiqueContenu (CSP)", () => {
  const csp = directives(politiqueContenu({ dev: false }));

  it("n'autorise par défaut que le site lui-même", () => {
    expect(csp["default-src"]).toEqual(["'self'"]);
  });

  it("limite les connexions au site et aux tuiles OpenFreeMap", () => {
    expect(csp["connect-src"]).toEqual(["'self'", "https://tiles.openfreemap.org"]);
  });

  it("n'autorise que les workers servis par le site (MapLibre)", () => {
    expect(csp["worker-src"]).toEqual(["'self'"]);
  });

  it("interdit plugins, changement de base, envoi de formulaire ailleurs et affichage en iframe", () => {
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    // Seule exception : le formulaire « Continuer avec Google » est redirigé vers Google (sans JavaScript).
    expect(csp["form-action"]).toEqual(["'self'", "https://accounts.google.com"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("n'autorise eval qu'en développement", () => {
    expect(csp["script-src"]).not.toContain("'unsafe-eval'");
    expect(directives(politiqueContenu({ dev: true }))["script-src"]).toContain("'unsafe-eval'");
  });

  it("ne force https qu'en production (Safari sur iOS charge sinon CSS et JS en https sur http://localhost)", () => {
    expect(csp["upgrade-insecure-requests"]).toEqual([]);
    expect(directives(politiqueContenu({ dev: true }))).not.toHaveProperty("upgrade-insecure-requests");
  });

  it("n'autorise aucun script d'un autre domaine", () => {
    expect(csp["script-src"].filter((source: string) => source.startsWith("http"))).toEqual([]);
  });
});

describe("entetesSecurite", () => {
  const entetes = Object.fromEntries(entetesSecurite({ dev: false }).map(({ key, value }) => [key, value]));

  it("envoie la CSP et les en-têtes de durcissement", () => {
    expect(entetes["Content-Security-Policy"]).toBe(politiqueContenu({ dev: false }));
    expect(entetes["X-Content-Type-Options"]).toBe("nosniff");
    expect(entetes["X-Frame-Options"]).toBe("DENY");
    expect(entetes["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(entetes["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(entetes["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("coupe les fonctions du navigateur dont Siklon n'a pas besoin", () => {
    for (const fonction of ["camera", "microphone", "geolocation", "payment", "usb", "browsing-topics"]) {
      expect(entetes["Permissions-Policy"]).toContain(`${fonction}=()`);
    }
  });
});
