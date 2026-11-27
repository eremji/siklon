import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, type Page, expect, test } from "@playwright/test";

// Partager une alerte (US-21). Les flux viennent des fixtures locales, jamais du réseau.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

async function fixtureNhc(context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: "actifs", url: baseURL ?? "http://localhost:3000" }]);
}

const origine = (baseURL: string | undefined) => new URL(baseURL ?? "http://localhost:3000").origin;

/** Partage du téléphone simulé ; rend les textes partagés. */
async function partageSimule(page: Page) {
  await page.addInitScript(() => {
    const appels: ShareData[] = [];
    Object.assign(window, { appelsPartage: appels });
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: async (donnees: ShareData) => {
        appels.push(donnees);
      },
    });
  });
  return () => page.evaluate(() => (window as unknown as { appelsPartage: ShareData[] }).appelsPartage.map(({ text }) => text));
}

// US-11 : « ancien », le NHC ne répond plus ; la page montre le flux lu une heure plus tôt et les positions gardées.
async function nhcAncien(context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: "ancien", url: baseURL ?? "http://localhost:3000" }]);
}

test("le bouton Partager de la fiche ouvre le partage du téléphone avec le message officiel et un lien sans langue", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL);
  // Deux heures après l'avis n° 14 de Kyle : l'avis n'est pas encore ancien.
  await page.clock.setFixedTime(new Date("2026-09-10T17:00:00.000Z"));
  // Partage du téléphone simulé : chaque appel est gardé pour être vérifié.
  await page.addInitScript(() => {
    const appels: ShareData[] = [];
    Object.assign(window, { appelsPartage: appels });
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: async (donnees: ShareData) => {
        appels.push(donnees);
      },
    });
  });
  await page.goto("/systemes/al112026");

  await page.getByRole("button", { name: "Partager cette alerte" }).click();

  const appels = await page.evaluate(() => (window as unknown as { appelsPartage: ShareData[] }).appelsPartage);
  expect(appels).toEqual([
    {
      title: "Ouragan Kyle · Siklon",
      text:
        "Ouragan Kyle (cat. 4) : vents maximaux de 220 km/h, se déplace vers l'ouest-nord-ouest à 19 km/h. " +
        "Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure des Antilles françaises).",
      url: `${origine(baseURL)}/systemes/al112026`,
    },
  ]);
});

test("quand la mise à jour du NHC échoue, le partage de la fiche garde la donnée et le dit avec son heure (US-11)", async ({
  page,
  context,
  baseURL,
}) => {
  await nhcAncien(context, baseURL);
  const textes = await partageSimule(page);
  await page.goto("/systemes/al112026");

  await page.getByRole("button", { name: "Partager cette alerte" }).click();

  const [texte] = await textes();
  expect(texte).toMatch(/^Ouragan Kyle \(cat\. 4\) : vents maximaux de 220 km\/h/);
  expect(texte).toMatch(
    /Dernière donnée NHC lue le .+ à \d{2} h \d{2} \(heure des Antilles françaises\) : la mise à jour a échoué\./,
  );
});

test("sans partage natif, le bouton copie le lien et le confirme à l'écran", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: origine(baseURL) });
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: undefined });
  });
  await page.goto("/systemes/al112026");

  await page.getByRole("button", { name: "Partager cette alerte" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Lien copié" })).toHaveText(
    "Lien copié. Collez-le dans WhatsApp ou un SMS.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${origine(baseURL)}/systemes/al112026`);
  const resultats = await new AxeBuilder({ page }).analyze();
  expect(resultats.violations).toEqual([]);
});

test("le lien partagé ouvre la fiche dans la langue du destinataire", async ({ browser, baseURL }) => {
  const contexte = await browser.newContext({ locale: "en-US" });
  await fixtureNhc(contexte, baseURL);
  const page = await contexte.newPage();

  await page.goto(`${origine(baseURL)}/systemes/al112026`);

  await expect(page).toHaveURL(/\/en\/systemes\/al112026$/);
  await expect(page.getByRole("button", { name: "Share this alert" })).toBeVisible();
  await contexte.close();
});

test.describe("page d'une île (US-21)", () => {
  async function vigilance(context: BrowserContext, baseURL: string | undefined, niveau: string) {
    await context.addCookies([{ name: "siklon-fixture-vigilance", value: niveau, url: baseURL ?? "http://localhost:3000" }]);
  }

  test("le bouton Partager d'une île menacée donne la menace estimée, la vigilance et les sources avec leur heure", async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureNhc(context, baseURL);
    await vigilance(context, baseURL, "rouge");
    // Fixture : avis n° 14 de Kyle émis à 15 h UTC ; il est 19 h UTC.
    await page.clock.setFixedTime(new Date("2026-09-10T19:00:00.000Z"));
    await page.addInitScript(() => {
      const appels: ShareData[] = [];
      Object.assign(window, { appelsPartage: appels });
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true,
        value: async (donnees: ShareData) => {
          appels.push(donnees);
        },
      });
    });
    await page.goto("/iles/guadeloupe");

    await page.getByRole("button", { name: "Partager cette alerte" }).click();

    const appels = await page.evaluate(() => (window as unknown as { appelsPartage: ShareData[] }).appelsPartage);
    expect(appels).toEqual([
      {
        title: "Guadeloupe · Siklon",
        text:
          "Ouragan Kyle (cat. 4) : passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h. " +
          "Guadeloupe : Vigilance rouge · Protégez-vous. " +
          "Sources : NHC, avis n° 14 du 10 septembre à 11 h 00 ; Météo-France, mise à jour du 9 novembre à 05 h 42 (heure locale).",
        url: `${origine(baseURL)}/iles/guadeloupe`,
      },
    ]);
  });

  test("quand la mise à jour du NHC échoue, le partage de l'île garde la menace et le dit avec son heure (US-11)", async ({
    page,
    context,
    baseURL,
  }) => {
    await nhcAncien(context, baseURL);
    await vigilance(context, baseURL, "rouge");
    await page.clock.setFixedTime(new Date("2026-09-10T19:00:00.000Z"));
    const textes = await partageSimule(page);
    await page.goto("/iles/guadeloupe");

    await page.getByRole("button", { name: "Partager cette alerte" }).click();

    // Les positions gardées de Kyle sont celles de son avis n° 14 (15 h UTC) : la plus ancienne donnée NHC.
    const [texte] = await textes();
    expect(texte).toMatch(/^Ouragan Kyle \(cat\. 4\) : passage estimé à environ 180 km de Pointe-à-Pitre/);
    expect(texte).toMatch(/\(heure locale\)\. Dernière donnée NHC lue le 10 septembre à 11 h 00 \(heure locale\) : la mise à jour a échoué\.$/);
  });

  test("sans système menaçant ni alerte, la page d'une île n'a pas de bouton Partager", async ({ page, context, baseURL }) => {
    await fixtureNhc(context, baseURL);
    await vigilance(context, baseURL, "vert");
    // Kyle passe à environ 335 km de Fort-de-France, au-delà de RADIUS_WATCH_KM.
    await page.goto("/iles/martinique");

    await expect(page.getByRole("list", { name: "Systèmes qui menacent Martinique" })).toHaveCount(0);
    await expect(page.getByText("Aucun système dont la prévision est disponible ne menace Martinique.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Partager cette alerte" })).toHaveCount(0);
  });

  test("une vigilance jaune suffit à proposer le partage, même sans système menaçant", async ({ page, context, baseURL }) => {
    await fixtureNhc(context, baseURL);
    await vigilance(context, baseURL, "jaune");
    await page.goto("/iles/martinique");

    await expect(page.getByRole("button", { name: "Partager cette alerte" })).toBeVisible();
  });

  test("une île sans vigilance Météo-France propose le partage pour son avertissement NHC, et respecte WCAG AA", async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureNhc(context, baseURL);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: origine(baseURL) });
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: undefined });
    });
    await page.goto("/iles/dominique");

    await page.getByRole("button", { name: "Partager cette alerte" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Lien copié" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${origine(baseURL)}/iles/dominique`);
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations).toEqual([]);
  });
});

test.describe("image d'aperçu du lien partagé (US-21)", () => {
  /**
   * Image annoncée par la page (og:image) telle que la lit l'aperçu de WhatsApp : Next sert aux robots
   * les métadonnées dans le HTML même. L'hôte de l'adresse vient du build ; seul son chemin est gardé.
   */
  async function apercuAnnonce(request: import("@playwright/test").APIRequestContext, chemin: string) {
    const html = await (await request.get(chemin, { headers: { "user-agent": "WhatsApp/2.23.20.0" } })).text();
    const meta = (propriete: string) => {
      const valeurs = [...html.matchAll(new RegExp(`<meta property="${propriete}" content="([^"]*)"`, "g"))].map((m) => m[1]);
      expect(valeurs, `une seule balise ${propriete}`).toHaveLength(1);
      return valeurs[0].replaceAll("&amp;", "&");
    };
    const url = new URL(meta("og:image"));
    return { chemin: `${url.pathname}${url.search}`, largeur: meta("og:image:width"), hauteur: meta("og:image:height") };
  }

  /** Dimensions lues dans l'en-tête PNG (IHDR). */
  const dimensionsPng = (octets: Buffer) => ({ largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) });

  test("la page d'une île annonce à WhatsApp une image PNG 1200 × 630 qui suit le dernier bulletin", async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureNhc(context, baseURL);
    await context.addCookies([{ name: "siklon-fixture-vigilance", value: "rouge", url: baseURL ?? "http://localhost:3000" }]);
    const apercu = await apercuAnnonce(page.request, "/fr/iles/guadeloupe");
    expect(apercu).toMatchObject({ largeur: "1200", hauteur: "630" });
    expect(apercu.chemin).toMatch(/^\/fr\/iles\/guadeloupe\/opengraph-image/);
    const rouge = await page.request.get(apercu.chemin);
    expect(rouge.status()).toBe(200);
    expect(rouge.headers()["content-type"]).toBe("image/png");
    // Un aperçu figé dans les caches ne suivrait plus le bulletin.
    expect(rouge.headers()["cache-control"] ?? "").not.toContain("immutable");
    const octetsRouge = await rouge.body();
    expect(dimensionsPng(octetsRouge)).toEqual({ largeur: 1200, hauteur: 630 });

    // Nouveau bulletin : la même adresse d'image donne le nouvel état.
    await context.addCookies([{ name: "siklon-fixture-vigilance", value: "vert", url: baseURL ?? "http://localhost:3000" }]);
    const vert = await page.request.get(apercu.chemin);
    expect(vert.status()).toBe(200);
    expect(Buffer.compare(await vert.body(), octetsRouge)).not.toBe(0);
  });

  test("la fiche d'un système annonce à WhatsApp une image PNG 1200 × 630", async ({ page, context, baseURL }) => {
    await fixtureNhc(context, baseURL);
    const apercu = await apercuAnnonce(page.request, "/fr/systemes/al112026");
    expect(apercu).toMatchObject({ largeur: "1200", hauteur: "630" });
    const reponse = await page.request.get(apercu.chemin);
    expect(reponse.status()).toBe(200);
    expect(reponse.headers()["content-type"]).toBe("image/png");
    expect(dimensionsPng(await reponse.body())).toEqual({ largeur: 1200, hauteur: 630 });
  });
});
