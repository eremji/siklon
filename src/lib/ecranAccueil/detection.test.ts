import { describe, expect, it } from "vitest";
import { ouvertDepuisEcranAccueil, situationEcranAccueil, VERSION_IOS_MIN } from "./detection";

// Identifiants de navigateurs réels (US-07c, #110).
const IPHONE_SAFARI_17 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
// Safari 26 fige la version du système à 18_6 : seule « Version/ » donne la vraie version.
const IPHONE_SAFARI_26 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPHONE_SAFARI_16_3 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1";
const IPHONE_SAFARI_16_4 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
// iPad en « site pour ordinateur » (réglage par défaut) : il se présente comme un Mac.
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1";
const IPHONE_FIREFOX =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15";
const IPHONE_EDGE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/124.2478.71 Mobile/15E148 Safari/605.1.15";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0.0 (iPhone15,2; iOS 17_4; fr_FR; fr; scale=3.00; 1179x2556; 600000000)";
const IPHONE_FACEBOOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0.0.0;FBBV/600000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/fr_FR;FBOP/5]";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

describe("situationEcranAccueil", () => {
  it("iPhone dans Safari récent : il faut ajouter Siklon à l'écran d'accueil", () => {
    expect(situationEcranAccueil({ agent: IPHONE_SAFARI_17, pointsTactiles: 5, installe: false })).toEqual({
      etat: "a-installer",
      appareil: "iphone",
    });
  });

  it("Safari 26 : lit la version de Safari, pas celle du système figée à 18_6", () => {
    expect(situationEcranAccueil({ agent: IPHONE_SAFARI_26, pointsTactiles: 5, installe: false }).etat).toBe(
      "a-installer",
    );
  });

  it(`la version minimale est iOS ${VERSION_IOS_MIN} : 16.4 suffit, 16.3 est trop ancien`, () => {
    expect(situationEcranAccueil({ agent: IPHONE_SAFARI_16_4, pointsTactiles: 5, installe: false }).etat).toBe(
      "a-installer",
    );
    expect(situationEcranAccueil({ agent: IPHONE_SAFARI_16_3, pointsTactiles: 5, installe: false })).toEqual({
      etat: "ios-trop-ancien",
      appareil: "iphone",
    });
  });

  it("iPad dans Safari : reconnu comme iPad", () => {
    expect(situationEcranAccueil({ agent: IPAD_SAFARI, pointsTactiles: 5, installe: false })).toEqual({
      etat: "a-installer",
      appareil: "ipad",
    });
  });

  it("iPad qui se présente comme un Mac : reconnu par son écran tactile", () => {
    expect(situationEcranAccueil({ agent: MAC_SAFARI, pointsTactiles: 5, installe: false })).toEqual({
      etat: "a-installer",
      appareil: "ipad",
    });
  });

  it("vrai Mac (sans écran tactile) : non concerné", () => {
    expect(situationEcranAccueil({ agent: MAC_SAFARI, pointsTactiles: 0, installe: false })).toEqual({
      etat: "non-concerne",
    });
  });

  it.each([
    ["Chrome", IPHONE_CHROME],
    ["Firefox", IPHONE_FIREFOX],
    ["Edge", IPHONE_EDGE],
    ["Instagram", IPHONE_INSTAGRAM],
    ["Facebook", IPHONE_FACEBOOK],
  ])("iPhone dans %s : invite à ouvrir Siklon dans Safari", (_nom, agent) => {
    expect(situationEcranAccueil({ agent, pointsTactiles: 5, installe: false })).toEqual({
      etat: "ios-autre-navigateur",
      appareil: "iphone",
    });
  });

  it.each([
    ["Android", ANDROID_CHROME, 5],
    ["Windows", WINDOWS_CHROME, 0],
  ])("%s : non concerné (le web push marche dans le navigateur)", (_nom, agent, pointsTactiles) => {
    expect(situationEcranAccueil({ agent, pointsTactiles, installe: false })).toEqual({ etat: "non-concerne" });
  });

  it("déjà ouvert depuis l'écran d'accueil : installé, quel que soit le navigateur annoncé", () => {
    expect(situationEcranAccueil({ agent: IPHONE_SAFARI_17, pointsTactiles: 5, installe: true })).toEqual({
      etat: "installe",
    });
    expect(situationEcranAccueil({ agent: MAC_SAFARI, pointsTactiles: 5, installe: true })).toEqual({
      etat: "installe",
    });
  });
});

describe("ouvertDepuisEcranAccueil", () => {
  function fenetre({ standaloneCss = false, standaloneApple }: { standaloneCss?: boolean; standaloneApple?: boolean }) {
    return {
      matchMedia: (requete: string) => ({ matches: requete === "(display-mode: standalone)" && standaloneCss }),
      navigator: standaloneApple === undefined ? {} : { standalone: standaloneApple },
    };
  }

  it("onglet de navigateur : non", () => {
    expect(ouvertDepuisEcranAccueil(fenetre({}))).toBe(false);
    expect(ouvertDepuisEcranAccueil(fenetre({ standaloneApple: false }))).toBe(false);
  });

  it("display-mode: standalone : oui", () => {
    expect(ouvertDepuisEcranAccueil(fenetre({ standaloneCss: true }))).toBe(true);
  });

  it("navigator.standalone (Safari iOS) : oui", () => {
    expect(ouvertDepuisEcranAccueil(fenetre({ standaloneApple: true }))).toBe(true);
  });
});
