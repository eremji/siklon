import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, type Locator, expect, test } from "@playwright/test";

// Choisit la fixture NHC lue par le serveur (voir src/lib/nhc/source.ts).
// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

// Valeur (dd) qui suit un libellé (dt).
function valeur(zone: Locator, libelle: string): Locator {
  return zone.locator("dt", { hasText: libelle }).locator("xpath=following-sibling::dd[1]");
}

test("la fiche d'un système s'ouvre depuis la liste et affiche son intensité et son déplacement en métrique", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/");
  await page.getByRole("link", { name: "Kyle" }).click();

  await expect(page).toHaveURL(/\/systemes\/al112026$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kyle" })).toBeVisible();
  // Après une navigation, Next garde la page précédente cachée dans le DOM : on cible la page visible.
  await expect(page.getByRole("main").getByText("Ouragan de catégorie 4")).toBeVisible();
  const mesures = page.getByRole("region", { name: "Intensité et déplacement" });
  await expect(valeur(mesures, "Vents maximaux soutenus")).toHaveText("220 km/h");
  await expect(valeur(mesures, "Pression centrale")).toHaveText("948 hPa");
  await expect(valeur(mesures, "Déplacement")).toHaveText("Vers l'ouest-nord-ouest à 19 km/h");
  await expect(valeur(mesures, "Position")).toHaveText("16,8° N, 58,2° O");
});

test("la fiche cite le numéro et l'heure de l'avis NHC, avec un lien vers l'avis officiel", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/systemes/al112026");

  await expect(
    page.getByText("Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure des Antilles françaises)."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Lire l'avis n° 14 sur le site du NHC/ })).toHaveAttribute(
    "href",
    "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml",
  );
  await expect(page.getByText("Siklon ne remplace pas les consignes officielles.")).toBeVisible();
});

test("la fiche garde consultables les valeurs d'origine du NHC", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/systemes/al112026");

  const origine = page.locator("details", { hasText: "Valeurs d'origine du NHC" });
  await expect(valeur(origine, "Vents maximaux soutenus")).toBeHidden();
  await origine.getByText("Valeurs d'origine du NHC").click();

  await expect(valeur(origine, "Vents maximaux soutenus")).toHaveText("120 nœuds (140 mph)");
  await expect(valeur(origine, "Pression centrale")).toHaveText("948 mb");
  await expect(valeur(origine, "Déplacement")).toHaveText("285° à 12 mph");
});

test("la fiche d'un système qui n'est plus actif le dit et renvoie vers la carte", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/systemes/al992026");

  await expect(page.getByRole("heading", { level: 1, name: "Système introuvable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir les systèmes actifs" })).toHaveAttribute("href", "/");
});

test("la fiche signale un flux NHC indisponible", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "indisponible");
  await page.goto("/systemes/al112026");

  await expect(
    page.getByRole("alert").filter({ hasText: "Les données du NHC sont momentanément indisponibles." }),
  ).toBeVisible();
});

test("une adresse de fiche mal formée mène à la page introuvable", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/systemes/inconnu");

  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kyle" })).toHaveCount(0);
});

test.describe("sur un écran de 360 px", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("la fiche reste lisible sans défilement horizontal", async ({ page, context, baseURL }) => {
    await fixtureNhc(context, baseURL, "actifs");
    await page.goto("/systemes/al112026");

    await expect(page.getByRole("heading", { level: 1, name: "Kyle" })).toBeVisible();
    const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largeur).toBeLessThanOrEqual(360);
  });
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`la fiche respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureNhc(context, baseURL, "actifs");
    await page.emulateMedia({ colorScheme });
    await page.goto("/systemes/al112026");
    await page.getByText("Valeurs d'origine du NHC").click();
    await expect(page.getByRole("heading", { level: 1, name: "Kyle" })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}
