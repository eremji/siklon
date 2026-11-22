import { describe, expect, it } from "vitest";
import { QUOTA_EMAILS_JOUR, RADIUS_IMPACT_KM, RADIUS_WATCH_KM, RAYON_TERRE_KM, RESERVE_EMAILS_AUTH } from "./constantes";

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

  it("suit le quota quotidien de l'offre gratuite de Brevo, en gardant une réserve aux e-mails de connexion", () => {
    expect(QUOTA_EMAILS_JOUR).toBe(300);
    expect(RESERVE_EMAILS_AUTH).toBe(50);
    expect(RESERVE_EMAILS_AUTH).toBeLessThan(QUOTA_EMAILS_JOUR);
  });
});
