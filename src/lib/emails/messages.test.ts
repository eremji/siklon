import { describe, expect, it } from "vitest";
import { emailConfirmation, emailReinitialisation } from "./messages";

const LIEN = "https://siklon.example/compte/confirmer?jeton=abc%2Bdef";

describe("emailConfirmation", () => {
  it("rédige le message en français avec le lien, en texte et en HTML", () => {
    const message = emailConfirmation("fr", LIEN);
    expect(message.sujet).toBe("Confirmez votre adresse email · Siklon");
    expect(message.texte).toContain(LIEN);
    expect(message.html).toContain(`href="${LIEN}"`);
    expect(message.html).toContain('lang="fr"');
  });

  it("rédige le message en anglais quand c'est la langue choisie", () => {
    const message = emailConfirmation("en", LIEN);
    expect(message.sujet).toBe("Confirm your email address · Siklon");
    expect(message.html).toContain('lang="en"');
  });

  it("dit combien de temps le lien reste valable", () => {
    expect(emailConfirmation("fr", LIEN).texte).toContain("24 heures");
    expect(emailConfirmation("en", LIEN).texte).toContain("24 hours");
  });
});

describe("emailReinitialisation", () => {
  it("rédige le message avec le lien et sa durée de validité, dans les deux langues", () => {
    const fr = emailReinitialisation("fr", LIEN);
    expect(fr.sujet).toBe("Réinitialisez votre mot de passe · Siklon");
    expect(fr.texte).toContain(LIEN);
    expect(fr.texte).toContain("1 heure");
    const en = emailReinitialisation("en", LIEN);
    expect(en.sujet).toBe("Reset your password · Siklon");
    expect(en.texte).toContain("1 hour");
  });

  it("rassure la personne qui n'a rien demandé", () => {
    expect(emailReinitialisation("fr", LIEN).texte).toContain("Si vous n'avez rien demandé");
  });

  it("échappe le lien dans le HTML", () => {
    const message = emailReinitialisation("fr", 'https://siklon.example/?a=1&b="2"');
    expect(message.html).toContain('href="https://siklon.example/?a=1&amp;b=&quot;2&quot;"');
  });
});
