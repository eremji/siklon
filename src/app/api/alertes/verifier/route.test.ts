// @vitest-environment node
// Route appelée chaque minute par pg_cron (Supabase) pour vérifier les alertes (US-07).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifierAlertes = vi.hoisted(() => vi.fn());
const pool = vi.hoisted(() => ({ nom: "pool des comptes" }));
const sources = vi.hoisted(() => ({ nom: "sources des alertes" }));
vi.mock("@/lib/notifications/verification", () => ({ verifierAlertes }));
vi.mock("@/lib/notifications/sources", () => ({ sourcesAlertes: () => sources }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: () => pool }));

const { POST } = await import("./route");

const SECRET = "secret-de-test-de-la-verification-0123456789";
const ENV = {
  ALERTES_CRON_SECRET: SECRET,
  VAPID_PUBLIC_KEY: "BPublique",
  VAPID_PRIVATE_KEY: "privee",
  VAPID_SUBJECT: "https://siklon.exemple",
  BETTER_AUTH_URL: "https://siklon.exemple",
  BETTER_AUTH_SECRET: "secret-better-auth-de-test-0123456789",
};

const requete = (autorisation?: string) =>
  new Request("https://siklon.exemple/api/alertes/verifier", {
    method: "POST",
    headers: autorisation ? { authorization: autorisation } : {},
  });

beforeEach(() => {
  verifierAlertes.mockReset();
  verifierAlertes.mockResolvedValue({ evenements: 2, envoyes: 3, echecs: 1 });
  for (const [nom, valeur] of Object.entries(ENV)) vi.stubEnv(nom, valeur);
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/alertes/verifier", () => {
  it("vérifie les alertes avec le bon secret et rend le bilan", async () => {
    const reponse = await POST(requete(`Bearer ${SECRET}`));

    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ evenements: 2, envoyes: 3, echecs: 1 });
    expect(verifierAlertes).toHaveBeenCalledWith(pool, sources, { envoyer: expect.any(Function), base: "https://siklon.exemple" });
    expect(console.info).toHaveBeenCalledWith("[alertes] 2 événement(s), 3 notification(s) envoyée(s), 1 échec(s)");
  });

  it.each([
    ["sans en-tête", undefined],
    ["avec un autre secret", "Bearer un-autre-secret-de-la-meme-longueur-0123"],
    ["avec le secret sans « Bearer »", SECRET],
  ])("refuse une requête %s, sans rien vérifier", async (_cas, autorisation) => {
    const reponse = await POST(requete(autorisation));

    expect(reponse.status).toBe(401);
    expect(verifierAlertes).not.toHaveBeenCalled();
  });

  it("répond 503 si le secret n'est pas configuré (aucune requête ne peut passer)", async () => {
    vi.stubEnv("ALERTES_CRON_SECRET", "");

    const reponse = await POST(requete("Bearer "));

    expect(reponse.status).toBe(503);
    expect(verifierAlertes).not.toHaveBeenCalled();
  });

  it("refuse un secret trop court pour être sûr", async () => {
    vi.stubEnv("ALERTES_CRON_SECRET", "court");

    expect((await POST(requete("Bearer court"))).status).toBe(503);
    expect(verifierAlertes).not.toHaveBeenCalled();
  });

  it("répond 503 si le web push n'est pas configuré : aucun canal pour prévenir", async () => {
    for (const nom of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]) vi.stubEnv(nom, "");

    const reponse = await POST(requete(`Bearer ${SECRET}`));

    expect(reponse.status).toBe(503);
    expect(verifierAlertes).not.toHaveBeenCalled();
  });
});
