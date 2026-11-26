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

// Livraison 2 : la fixture vigilance « ancien » simule un Météo-France muet dont le dernier niveau lu est jaune.
async function fixtureVigilance(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-vigilance", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

const AVERTISSEMENT_VIGILANCE =
  /La mise à jour de la vigilance Météo-France a échoué\. Dernier niveau connu, publié le .+ \(heure des Antilles françaises\)\./;

test("la page Alerte garde le dernier niveau de vigilance connu et avertit que la mise à jour a échoué", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureVigilance(context, baseURL, "ancien");
  await page.goto("/iles/guadeloupe/alerte");

  await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT_VIGILANCE })).toBeVisible();
  await expect(page.getByText("Vigilance jaune")).toBeVisible();
  await expect(page.getByText("Niveau de vigilance indisponible")).toHaveCount(0);
});

test("l'avertissement de vigilance existe en anglais et sur la checklist", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "ancien");

  await page.goto("/en/iles/martinique/alerte");
  await expect(
    page.getByRole("alert").filter({ hasText: /The Météo-France vigilance update failed\. Last known level, issued .+\./ }),
  ).toBeVisible();

  await page.goto("/iles/guadeloupe/checklist");
  await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT_VIGILANCE })).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`l'avertissement de vigilance respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureVigilance(context, baseURL, "ancien");
    await page.emulateMedia({ colorScheme });
    await page.goto("/iles/guadeloupe/alerte");
    await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT_VIGILANCE })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .include("[role=alert]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}

// Livraison 3a : îles sans vigilance Météo-France, watches/warnings NHC tirés de la dernière donnée connue.
const AVERTISSEMENT_ALERTES_NHC =
  /La mise à jour des veilles et avertissements du NHC a échoué\. Dernière donnée connue, lue le .+ \(heure des Antilles françaises\)\./;

test("la page Alerte d'une île NHC garde les dernières alertes connues et avertit que la mise à jour a échoué", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "ancien");
  await page.goto("/iles/dominique/alerte");

  await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT_ALERTES_NHC })).toBeVisible();
  const entete = page.locator("header", { has: page.getByRole("heading", { level: 1, name: "Dominique" }) });
  await expect(entete.getByText("Avertissement d'ouragan", { exact: true })).toBeVisible();

  await page.goto("/en/iles/dominique/alerte");
  await expect(
    page.getByRole("alert").filter({ hasText: /The NHC watches and warnings update failed\. Last known data, read .+\./ }),
  ).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`l'avertissement des alertes NHC respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureNhc(context, baseURL, "ancien");
    await page.emulateMedia({ colorScheme });
    await page.goto("/iles/dominique/alerte");
    await expect(page.getByRole("alert").filter({ hasText: AVERTISSEMENT_ALERTES_NHC })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .include("[role=alert]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}
