import { type BrowserContext, expect, test } from "@playwright/test";

// Choisit la fixture NHC lue par le serveur (voir src/lib/nhc/source.ts).
// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

test("la carte liste chaque système actif avec son nom, son type et sa catégorie", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/");

  const systemes = page.getByRole("list", { name: "Systèmes actifs" }).getByRole("listitem");
  await expect(systemes).toHaveCount(3);
  await expect(systemes.nth(0)).toContainText("Kyle");
  await expect(systemes.nth(0)).toContainText("Ouragan de catégorie 4");
  await expect(systemes.nth(1)).toContainText("Tempête tropicale");
  await expect(systemes.nth(2)).toContainText("Dépression tropicale");
});

test("la carte indique clairement qu'aucun système n'est actif", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "vide");
  await page.goto("/");

  await expect(page.getByText("Aucun système actif dans l'Atlantique.")).toBeVisible();
});

test("la carte signale un flux NHC indisponible sans dire qu'aucun système n'est actif", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "indisponible");
  await page.goto("/");

  await expect(
    page.getByRole("alert").filter({ hasText: "Les données du NHC sont momentanément indisponibles." }),
  ).toBeVisible();
  await expect(page.getByText(/Aucun système actif/)).toHaveCount(0);
});

test("la carte affiche l'heure du dernier avis NHC et signale un avis de plus de 6 h", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "actifs");
  // Fixture : avis de Kyle à 15 h UTC, de Thirteen à 12 h UTC ; il est 19 h UTC.
  await page.clock.setFixedTime(new Date("2026-09-10T19:00:00.000Z"));
  await page.goto("/");

  await expect(page.getByText("Source : NHC, dernier avis le 10 septembre à 11 h 00")).toBeVisible();
  const systemes = page.getByRole("list", { name: "Systèmes actifs" }).getByRole("listitem");
  await expect(systemes.filter({ hasText: "Thirteen" })).toContainText("Données possiblement obsolètes");
  await expect(systemes.filter({ hasText: "Kyle" })).not.toContainText("Données possiblement obsolètes");
});

test("la carte place chaque système actif sur la carte interactive", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/");

  const carte = page.getByRole("region", { name: "Carte des systèmes actifs" });
  await expect(carte.locator("canvas")).toBeVisible();
  for (const nom of ["Kyle", "Leah", "Thirteen"]) {
    await expect(carte.getByText(nom, { exact: true })).toBeVisible();
  }
});

test.describe("sur un écran de 360 px", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("la page reste utilisable sans défilement horizontal", async ({ page, context, baseURL }) => {
    await fixtureNhc(context, baseURL, "actifs");
    await page.goto("/");

    await expect(page.getByRole("region", { name: "Carte des systèmes actifs" }).locator("canvas")).toBeVisible();
    await expect(page.getByRole("list", { name: "Systèmes actifs" })).toBeVisible();
    const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largeur).toBeLessThanOrEqual(360);
  });
});
