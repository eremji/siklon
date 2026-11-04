import { type BrowserContext, expect, test } from "@playwright/test";

// Choisit la fixture NHC lue par le serveur (voir src/lib/nhc/source.ts).
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
