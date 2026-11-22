// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { EnvoiEmailError, QuotaEmailsError, serviceBrevo } from "./brevo";

const EXPEDITEUR = { nom: "Siklon", email: "noreply@siklon.example" };
const MESSAGE = { a: "personne@exemple.org", sujet: "Sujet", texte: "Texte", html: "<p>HTML</p>" };

const reponse = (status: number, corps: unknown = {}) =>
  new Response(status === 204 ? null : JSON.stringify(corps), { status });

describe("serviceBrevo.envoyer", () => {
  it("envoie l'email transactionnel avec la clé dans l'en-tête api-key", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(201, { messageId: "<1@relay>" }));
    await serviceBrevo({ cleApi: "cle-de-test", expediteur: EXPEDITEUR, fetch }).envoyer(MESSAGE);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("api-key")).toBe("cle-de-test");
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: "Siklon", email: "noreply@siklon.example" },
      to: [{ email: "personne@exemple.org" }],
      subject: "Sujet",
      textContent: "Texte",
      htmlContent: "<p>HTML</p>",
    });
  });

  it("échoue avec le statut, sans l'adresse du destinataire dans le message", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(400, { code: "invalid_parameter", message: "personne@exemple.org" }));
    const envoi = serviceBrevo({ cleApi: "cle", expediteur: EXPEDITEUR, fetch }).envoyer(MESSAGE);
    await expect(envoi).rejects.toThrow(EnvoiEmailError);
    await expect(envoi).rejects.toThrow("Brevo a refusé l'envoi (400 invalid_parameter)");
    await expect(envoi).rejects.not.toThrow("personne@exemple.org");
  });

  // La doc de Brevo cite not_enough_credits pour un 400 de cet appel, et le 402 « Payment Required »
  // en général, sans dire lequel répond quand le quota quotidien est atteint : les deux sont reconnus.
  it.each([
    [400, { code: "not_enough_credits" }],
    [402, { code: "payment_required" }],
    [402, {}],
  ])("signale le quota atteint (%i %j) par une erreur à part, qui reste une erreur d'envoi", async (status, corps) => {
    const fetch = vi.fn().mockResolvedValue(reponse(status, corps));
    const envoi = serviceBrevo({ cleApi: "cle", expediteur: EXPEDITEUR, fetch }).envoyer(MESSAGE);
    await expect(envoi).rejects.toThrow(QuotaEmailsError);
    await expect(envoi).rejects.toThrow(EnvoiEmailError);
  });

  it("ne confond pas une autre erreur avec le quota", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(429, { code: "too_many_requests" }));
    await expect(serviceBrevo({ cleApi: "cle", expediteur: EXPEDITEUR, fetch }).envoyer(MESSAGE)).rejects.not.toThrow(
      QuotaEmailsError,
    );
  });
});

describe("serviceBrevo.effacer", () => {
  it("supprime les journaux d'envoi et le contact de l'adresse", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(204));
    await serviceBrevo({ cleApi: "cle", expediteur: EXPEDITEUR, fetch }).effacer("a+b@exemple.org");

    const appels = fetch.mock.calls.map(([url, init]) => `${init.method} ${url}`);
    expect(appels).toEqual([
      "DELETE https://api.brevo.com/v3/smtp/log/a%2Bb%40exemple.org",
      "DELETE https://api.brevo.com/v3/contacts/a%2Bb%40exemple.org?identifierType=email_id",
    ]);
  });

  it("accepte qu'il n'y ait ni journal ni contact à effacer", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(404, { code: "document_not_found" }));
    await expect(serviceBrevo({ cleApi: "cle", expediteur: EXPEDITEUR, fetch }).effacer("a@b.fr")).resolves.toBeUndefined();
  });

  it("échoue si Brevo refuse l'effacement", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(401, { code: "unauthorized" }));
    await expect(serviceBrevo({ cleApi: "cle", expediteur: EXPEDITEUR, fetch }).effacer("a@b.fr")).rejects.toThrow(
      "Brevo a refusé l'effacement (401 unauthorized)",
    );
  });
});
