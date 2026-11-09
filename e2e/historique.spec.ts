// US-04 : historique des cyclones d'une île. Ces tests demandent une base importée : la fixture
// synthétique e2e/fixtures/ en CI, ou la vraie base HURDAT2 en local. Les assertions valent pour les deux.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const RADIUS_IMPACT_KM = 120; // Miroir de src/lib/constantes.ts (Playwright n'importe pas src/).

const entrees = (page: Page) => page.getByRole("main").getByRole("listitem");
const anneeDe = async (titre: string | null) => Number(titre?.trim().split(" ").at(-1));

/** Les résultats arrivent en streaming : attendre leur titre (« 3 cyclones ») avant de lire la liste. */
async function attendreResultats(page: Page) {
  await expect(page.getByRole("heading", { level: 2, name: /^\d+ cyclones?$/ })).toBeVisible();
}

async function annees(page: Page): Promise<number[]> {
  await attendreResultats(page);
  const titres = await entrees(page).getByRole("heading", { level: 3 }).allTextContents();
  return Promise.all(titres.map(anneeDe));
}

test("la page historique propose les 13 îles", async ({ page }) => {
  await page.goto("/historique");
  await expect(page.getByRole("heading", { level: 1, name: "Historique des cyclones" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(13);
  await page.getByRole("link", { name: "Guadeloupe" }).click();
  await expect(page).toHaveURL(/\/iles\/guadeloupe\/historique$/);
});

test("la liste d'une île contient des cyclones proches, du plus récent au plus ancien", async ({ page }) => {
  await page.goto("/iles/guadeloupe/historique");
  await expect(page.getByRole("heading", { level: 1, name: "Historique des cyclones : Guadeloupe" })).toBeVisible();
  await expect(entrees(page).first()).toBeVisible();

  const liste = await annees(page);
  expect(liste.length).toBeGreaterThan(0);
  expect(liste).toEqual([...liste].sort((a, b) => b - a));

  const premiere = entrees(page).first();
  await expect(premiere.getByText("Intensité près de l'île")).toBeVisible();
  await expect(premiere.getByText("Plus proche passage")).toBeVisible();
  const distance = await premiere.getByRole("definition").nth(1).textContent();
  expect(Number(distance?.match(/\d+/)?.[0] ?? 0)).toBeLessThanOrEqual(RADIUS_IMPACT_KM);
  await expect(page.getByText(/^Source : base HURDAT2 du National Hurricane Center \(NHC\), version du/)).toBeVisible();
});

test("la liste se filtre par catégorie minimale", async ({ page }) => {
  await page.goto("/iles/guadeloupe/historique");
  await page.getByLabel("Intensité minimale").selectOption("5");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page).toHaveURL(/categorie=5/);
  await expect(page.getByLabel("Intensité minimale")).toHaveValue("5");
  await attendreResultats(page);
  const intensites = await entrees(page).getByText(/^Ouragan de catégorie \d$|^Tempête$|^Dépression$/).allTextContents();
  expect(intensites.length).toBeGreaterThan(0);
  for (const intensite of intensites) expect(intensite).toBe("Ouragan de catégorie 5");
});

test("la liste se filtre par période", async ({ page }) => {
  await page.goto("/iles/guadeloupe/historique?de=1980&a=1999");
  const liste = await annees(page);
  expect(liste.length).toBeGreaterThan(0);
  for (const annee of liste) expect(annee).toBeGreaterThanOrEqual(1980);
  for (const annee of liste) expect(annee).toBeLessThanOrEqual(1999);
});

test("la fiche d'un cyclone affiche sa trajectoire sur une carte", async ({ page }) => {
  await page.goto("/iles/guadeloupe/historique");
  const titre = (await entrees(page).first().getByRole("heading", { level: 3 }).textContent())!.trim();
  await entrees(page).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/historique\/AL\d{6}\?ile=guadeloupe$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Carte de la trajectoire de .+, \d+ points, près de Guadeloupe$/ })).toBeVisible();
  await page.getByText("Voir les points de la trajectoire").click();
  await expect(page.getByRole("table", { name: /^Points de la trajectoire/ })).toBeVisible();
  await page.getByRole("link", { name: "Historique de Guadeloupe" }).click();
  await expect(page.getByRole("heading", { level: 3, name: titre })).toBeVisible();
});

test("une île inconnue affiche une page introuvable", async ({ page }) => {
  await page.goto("/iles/atlantide/historique");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Historique des cyclones :/ })).toHaveCount(0);
});

test("la liste tient sur un écran de 360 px sans défilement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/iles/guadeloupe/historique");
  await expect(entrees(page).first()).toBeVisible();
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(deborde).toBe(false);
});

for (const colorScheme of ["light", "dark"] as const) {
  const theme = colorScheme === "light" ? "clair" : "sombre";

  test(`la liste et la fiche respectent WCAG AA en thème ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    for (const chemin of ["/historique", "/iles/guadeloupe/historique"]) {
      await page.goto(chemin);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/Chargement/)).toHaveCount(0);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations, chemin).toEqual([]);
    }
    await entrees(page).first().getByRole("link").click();
    await expect(page.getByRole("img", { name: /^Carte de la trajectoire/ })).toBeVisible();
    await page.getByText("Voir les points de la trajectoire").click();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations, "fiche").toEqual([]);
  });
}
