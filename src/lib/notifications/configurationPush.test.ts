// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ConfigurationPushError, lireClesVapid } from "./configurationPush";

const COMPLET = {
  VAPID_PUBLIC_KEY: "BPublique",
  VAPID_PRIVATE_KEY: "privee",
  VAPID_SUBJECT: "mailto:alertes@exemple.org",
};

describe("clés VAPID", () => {
  it("lit les trois variables", () => {
    expect(lireClesVapid(COMPLET)).toEqual({ publicKey: "BPublique", privateKey: "privee", subject: "mailto:alertes@exemple.org" });
  });

  it("rend null quand le web push n'est pas configuré (développement)", () => {
    expect(lireClesVapid({})).toBeNull();
  });

  it.each(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"])("refuse une configuration sans %s", (nom) => {
    expect(() => lireClesVapid({ ...COMPLET, [nom]: "" })).toThrow(ConfigurationPushError);
  });

  it("refuse un sujet qui n'est ni une adresse mailto: ni une adresse https:", () => {
    expect(() => lireClesVapid({ ...COMPLET, VAPID_SUBJECT: "alertes@exemple.org" })).toThrow(ConfigurationPushError);
  });

  it("ne cite jamais la clé privée dans l'erreur", () => {
    expect(() => lireClesVapid({ ...COMPLET, VAPID_SUBJECT: "" })).toThrow(/^(?!.*privee)/);
  });
});
