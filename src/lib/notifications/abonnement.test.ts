// @vitest-environment node
import { createECDH, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { lireAbonnement } from "./abonnement";

// Clés comme celles d'un vrai navigateur : point P-256 non compressé (65 octets) et secret de 16 octets.
const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const P256DH = ecdh.getPublicKey().toString("base64url");
const AUTH = randomBytes(16).toString("base64url");

function abonnement(endpoint: string, keys: Record<string, unknown> = { p256dh: P256DH, auth: AUTH }) {
  // Forme de PushSubscription.toJSON().
  return { endpoint, expirationTime: null, keys };
}

describe("lecture de l'abonnement envoyé par le navigateur", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc:APA91b",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
    "https://web.push.apple.com/QGuQyavXutnMH",
  ])("accepte un abonnement d'un service push connu : %s", (endpoint) => {
    expect(lireAbonnement(abonnement(endpoint))).toEqual({ endpoint, cles: { p256dh: P256DH, auth: AUTH } });
  });

  it.each([
    ["en http", "http://fcm.googleapis.com/fcm/send/abc"],
    ["vers un autre site", "https://exemple.org/push"],
    ["vers une adresse interne", "https://127.0.0.1/push"],
    ["qui imite un service connu", "https://fcm.googleapis.com.exemple.org/fcm/send/abc"],
    ["avec un identifiant dans l'adresse", "https://moi@fcm.googleapis.com/fcm/send/abc"],
    ["avec un port", "https://fcm.googleapis.com:8443/fcm/send/abc"],
    ["qui n'est pas une adresse", "pas une adresse"],
    ["trop long", `https://fcm.googleapis.com/fcm/send/${"a".repeat(2048)}`],
  ])("refuse un endpoint %s", (_cas, endpoint) => {
    expect(lireAbonnement(abonnement(endpoint))).toBeNull();
  });

  it.each([
    ["sans clés", {}],
    ["avec une clé p256dh trop courte", { p256dh: randomBytes(32).toString("base64url"), auth: AUTH }],
    ["avec une clé auth trop longue", { p256dh: P256DH, auth: randomBytes(32).toString("base64url") }],
    ["avec une clé hors base64url", { p256dh: `${P256DH.slice(0, -1)}+`, auth: AUTH }],
    ["avec une clé qui n'est pas un texte", { p256dh: 42, auth: AUTH }],
  ])("refuse un abonnement %s", (_cas, keys) => {
    expect(lireAbonnement(abonnement("https://fcm.googleapis.com/fcm/send/abc", keys))).toBeNull();
  });

  it.each([null, "texte", 42, { endpoint: 42 }])("refuse une valeur qui n'a pas la forme d'un abonnement : %j", (valeur) => {
    expect(lireAbonnement(valeur)).toBeNull();
  });
});
