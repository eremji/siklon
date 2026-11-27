// Surveillant du journal des lectures (#164), lancé toutes les 15 minutes par GitHub Actions : il lit la
// route de santé du site et ouvre une issue à la panne, la ferme au retour. Sans réseau : fetch simulé.
import { describe, expect, it, vi } from "vitest";
import { type IssuesAlerte, issuesGitHub, lireSante, surveillerJournal, TITRE_ALERTE } from "./surveillance";

const reponse = (status: number, corps?: unknown) =>
  new Response(corps === undefined ? null : JSON.stringify(corps), { status });

describe("lecture de la route de santé", () => {
  it("lit /api/sante du site et rend son état", async () => {
    const recuperer = vi.fn().mockResolvedValue(reponse(200, { etat: "a-jour" }));

    expect(await lireSante("https://siklon.exemple/", recuperer)).toBe("a-jour");
    expect(recuperer).toHaveBeenCalledWith(
      "https://siklon.exemple/api/sante",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rend « en-retard » quand la route le dit", async () => {
    expect(await lireSante("https://siklon.exemple", async () => reponse(503, { etat: "en-retard" }))).toBe("en-retard");
  });

  it("rend « injoignable » quand le site ne répond pas ou répond autre chose", async () => {
    expect(await lireSante("https://siklon.exemple", async () => Promise.reject(new TypeError("fetch failed")))).toBe(
      "injoignable",
    );
    expect(await lireSante("https://siklon.exemple", async () => reponse(500))).toBe("injoignable");
    expect(await lireSante("https://siklon.exemple", async () => reponse(200, { etat: "inconnu" }))).toBe("injoignable");
  });
});

const fausseIssues = (ouverte: number | null) => {
  const issues = {
    ouverte: vi.fn<IssuesAlerte["ouverte"]>(async () => ouverte),
    ouvrir: vi.fn<IssuesAlerte["ouvrir"]>(async () => {}),
    fermer: vi.fn<IssuesAlerte["fermer"]>(async () => {}),
  } satisfies IssuesAlerte;
  return issues;
};

const MAINTENANT = new Date("2026-09-10T15:00:00.000Z");

describe("surveillance du journal", () => {
  it("ouvre une issue quand le journal est en retard et qu'aucune n'est ouverte", async () => {
    const issues = fausseIssues(null);

    expect(await surveillerJournal({ etat: "en-retard", issues, maintenant: MAINTENANT })).toBe("ouverte");
    expect(issues.ouvrir).toHaveBeenCalledWith(TITRE_ALERTE, expect.stringContaining("30 minutes"));
    const corps = issues.ouvrir.mock.calls[0]?.[1] ?? "";
    expect(corps).toContain("2026-09-10 15:00 UTC");
    expect(corps).toContain("cron.job_run_details");
  });

  it("ouvre aussi une issue quand le site est injoignable, en le disant", async () => {
    const issues = fausseIssues(null);

    expect(await surveillerJournal({ etat: "injoignable", issues, maintenant: MAINTENANT })).toBe("ouverte");
    expect(issues.ouvrir.mock.calls[0]?.[1]).toContain("n'a pas répondu");
  });

  it("n'ouvre pas une deuxième issue pour la même panne", async () => {
    const issues = fausseIssues(42);

    expect(await surveillerJournal({ etat: "en-retard", issues, maintenant: MAINTENANT })).toBe("aucune");
    expect(issues.ouvrir).not.toHaveBeenCalled();
    expect(issues.fermer).not.toHaveBeenCalled();
  });

  it("ferme l'issue ouverte au retour à la normale, avec l'heure", async () => {
    const issues = fausseIssues(42);

    expect(await surveillerJournal({ etat: "a-jour", issues, maintenant: MAINTENANT })).toBe("fermee");
    expect(issues.fermer).toHaveBeenCalledWith(42, expect.stringContaining("2026-09-10 15:00 UTC"));
  });

  it("ne fait rien quand tout va bien", async () => {
    const issues = fausseIssues(null);

    expect(await surveillerJournal({ etat: "a-jour", issues, maintenant: MAINTENANT })).toBe("aucune");
    expect(issues.ouvrir).not.toHaveBeenCalled();
  });
});

describe("issues GitHub de l'alerte", () => {
  const appels = () => {
    const recuperer = vi.fn<typeof fetch>();
    const issues = issuesGitHub({ depot: "eremji/siklon", jeton: "jeton-de-test", recuperer });
    return { recuperer, issues };
  };

  it("retrouve l'issue ouverte par le surveillant d'après son titre", async () => {
    const { recuperer, issues } = appels();
    recuperer.mockResolvedValue(
      reponse(200, [
        { number: 7, title: "Autre chose" },
        { number: 42, title: TITRE_ALERTE },
      ]),
    );

    expect(await issues.ouverte()).toBe(42);
    const [url, init] = recuperer.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.github.com/repos/eremji/siklon/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100",
    );
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer jeton-de-test");
  });

  it("ne retrouve rien quand aucune issue du surveillant n'est ouverte", async () => {
    const { recuperer, issues } = appels();
    recuperer.mockResolvedValue(reponse(200, [{ number: 7, title: "Autre chose" }]));

    expect(await issues.ouverte()).toBeNull();
  });

  it("ouvre une issue avec son titre et son texte", async () => {
    const { recuperer, issues } = appels();
    recuperer.mockResolvedValue(reponse(201, { number: 43 }));

    await issues.ouvrir(TITRE_ALERTE, "Texte");

    const [url, init] = recuperer.mock.calls[0] ?? [];
    expect(url).toBe("https://api.github.com/repos/eremji/siklon/issues");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ title: TITRE_ALERTE, body: "Texte" });
  });

  it("commente puis ferme l'issue", async () => {
    const { recuperer, issues } = appels();
    recuperer.mockResolvedValueOnce(reponse(201, {})).mockResolvedValueOnce(reponse(200, {}));

    await issues.fermer(42, "Retour à la normale");

    expect(recuperer.mock.calls.map(([url, init]) => [url, init?.method, JSON.parse(String(init?.body))])).toEqual([
      ["https://api.github.com/repos/eremji/siklon/issues/42/comments", "POST", { body: "Retour à la normale" }],
      ["https://api.github.com/repos/eremji/siklon/issues/42", "PATCH", { state: "closed", state_reason: "completed" }],
    ]);
  });

  it("échoue si GitHub refuse, pour que le job soit rouge", async () => {
    const { recuperer, issues } = appels();
    recuperer.mockResolvedValue(reponse(403, { message: "Resource not accessible by integration" }));

    await expect(issues.ouvrir(TITRE_ALERTE, "Texte")).rejects.toThrow("403");
  });
});
