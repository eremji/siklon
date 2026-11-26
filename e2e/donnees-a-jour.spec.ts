import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, test } from "@playwright/test";

// US-11 : quand le NHC ne répond plus, les pages montrent la dernière donnée connue, avec son heure,
// et avertissent que la mise à jour a échoué. La fixture « ancien » simule un NHC muet dont la
// dernière lecture réussie date d'une heure (voir src/lib/nhc/source.ts).
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

const AVERTISSEMENT = /La mise à jour des données du NHC a échoué\. Dernière donnée connue, lue le .+ \(heure des Antilles françaises\)\./;

test("l'accueil montre les derniers systèmes connus et avertit que la mise à jour a échoué", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "ancien");
  await page.goto("/");

  await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT })).toBeVisible();
  await expect(page.getByRole("list", { name: "Systèmes actifs" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText(/momentanément indisponibles/)).toHaveCount(0);
});

test("l'avertissement existe en anglais", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "ancien");
  await page.goto("/en");

  await expect(
    page.getByRole("alert").filter({ hasText: /The NHC data update failed\. Last known data, read .+\./ }),
  ).toBeVisible();
});

test("la fiche d'un système et la page d'une île avertissent aussi", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "ancien");

  await page.goto("/systemes/al112026");
  await expect(page.getByRole("heading", { level: 1, name: "Kyle" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT })).toBeVisible();

  await page.goto("/iles/guadeloupe");
  await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT })).toBeVisible();
  await expect(page.getByRole("list", { name: "Systèmes qui menacent Guadeloupe" })).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`l'avertissement respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureNhc(context, baseURL, "ancien");
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .include("[role=alert]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}
