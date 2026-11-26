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

test.describe("en anglais (US-10)", () => {
  const attendreResultatsEn = (page: Page) =>
    expect(page.getByRole("heading", { level: 2, name: /^\d+ storms?$/ })).toBeVisible();

  test("de la liste des îles à la fiche d'un cyclone, tout reste en anglais", async ({ page }) => {
    await page.goto("/en/historique");
    await expect(page).toHaveTitle("Hurricane history · Siklon");
    await expect(page.getByRole("heading", { level: 1, name: "Hurricane history" })).toBeVisible();
    await page.getByRole("link", { name: "Guadeloupe" }).filter({ visible: true }).click();

    await expect(page).toHaveURL("/en/iles/guadeloupe/historique");
    await expect(page.getByRole("heading", { level: 1, name: "Hurricane history: Guadeloupe" })).toBeVisible();
    await attendreResultatsEn(page);
    const premiere = entrees(page).first();
    await expect(premiere.getByText("Intensity near the island")).toBeVisible();
    await expect(premiere.getByText("Closest approach")).toBeVisible();
    await expect(page.getByText(/^Source: National Hurricane Center \(NHC\) HURDAT2 database, version of/)).toBeVisible();

    await page.getByLabel("Minimum intensity").selectOption("5");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/^[^?]*\/en\/iles\/guadeloupe\/historique\?.*categorie=5/);
    await attendreResultatsEn(page);
    const intensites = await entrees(page).getByText(/^Category \d hurricane$|^Storm$|^Depression$/).allTextContents();
    expect(intensites.length).toBeGreaterThan(0);
    for (const intensite of intensites) expect(intensite).toBe("Category 5 hurricane");

    await entrees(page).first().getByRole("link").click();
    await expect(page).toHaveURL(/\/en\/historique\/AL\d{6}\?ile=guadeloupe$/);
    await expect(page).toHaveTitle("Past storm · Siklon");
    await expect(page.getByRole("img", { name: /^Map of the track of .+, \d+ points, near Guadeloupe$/ })).toBeVisible();
    await expect(page.getByText("Peak intensity")).toBeVisible();
    await page.getByText("Show track points").click();
    await expect(page.getByRole("table", { name: /^Track points \(\d+\), times in UTC$/ })).toBeVisible();
    await page.getByRole("link", { name: "Guadeloupe history" }).click();
    await expect(page).toHaveURL("/en/iles/guadeloupe/historique");
  });

  test("la liste et la fiche en anglais respectent WCAG AA", async ({ page }) => {
    await page.goto("/en/iles/guadeloupe/historique");
    await attendreResultatsEn(page);
    let { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations, "liste").toEqual([]);

    await entrees(page).first().getByRole("link").click();
    await expect(page.getByRole("img", { name: /^Map of the track/ })).toBeVisible();
    await page.getByText("Show track points").click();
    ({ violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze());
    expect(violations, "fiche").toEqual([]);
  });
});

// US-17 : saison à risque. Assertions valables sur la fixture e2e comme sur la vraie base HURDAT2.
test.describe("saison à risque (US-17)", () => {
  const bloc = (page: Page) => page.getByRole("region", { name: "Saison à risque" });
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  test("le bloc résume les passages par mois au-dessus de la liste", async ({ page }) => {
    await page.goto("/iles/guadeloupe/historique");
    await expect(bloc(page).getByRole("heading", { level: 2, name: "Saison à risque" })).toBeVisible();
    await expect(
      bloc(page).getByText(
        /^((\d+ passages sur \d+|Tous les passages) ont eu lieu (en|entre) .+\.|Le seul passage a eu lieu en .+\.|Aucun cyclone n'est passé près de l'île depuis 1966\.)/,
      ),
    ).toBeVisible();
    const valeurs = MOIS.map((mois) => `${mois} \\d+`).join(", ");
    await expect(bloc(page).getByRole("img", { name: new RegExp(`^Passages à moins de ${RADIUS_IMPACT_KM} km de Pointe-à-Pitre, par mois : ${valeurs}\\.$`) })).toBeVisible();
    await expect(bloc(page).locator("[data-mois]")).toHaveCount(12);
    await expect(bloc(page).getByText("Saison officielle : 1er juin au 30 novembre")).toBeVisible();
    await expect(bloc(page).getByText(/^Source : HURDAT2, NHC\. Import du \d{1,2} \S+ \d{4}\.$/)).toBeVisible();

    // Au-dessus de la liste.
    await attendreResultats(page);
    const hautBloc = (await bloc(page).boundingBox())!.y;
    const hautListe = (await entrees(page).first().boundingBox())!.y;
    expect(hautBloc).toBeLessThan(hautListe);
  });

  test("le tableau des 12 mois reprend les chiffres du graphique et de la mention", async ({ page }) => {
    await page.goto("/iles/guadeloupe/historique");
    await bloc(page).getByText("Afficher le tableau des 12 mois").click();
    const tableau = bloc(page).getByRole("table", { name: /^Passages à moins de \d+ km de Pointe-à-Pitre, par mois, de 1966 à \d{4}$/ });
    await expect(tableau).toBeVisible();
    const lignes = tableau.getByRole("row");
    await expect(lignes).toHaveCount(13);
    await expect(lignes.nth(6)).toContainText("Juin");
    await expect(lignes.nth(6)).toContainText("oui");
    await expect(lignes.nth(1)).toContainText("non");

    const comptes = (await tableau.locator("tbody tr td:first-of-type").allTextContents()).map(Number);
    expect(comptes).toEqual((await bloc(page).locator("[data-mois]").allTextContents()).map(Number));
    const total = comptes.reduce((a, b) => a + b, 0);
    await expect(
      bloc(page).getByText(new RegExp(`^${total} cyclones? passés? à moins de ${RADIUS_IMPACT_KM} km de Pointe-à-Pitre, de 1966 à \\d{4}, comptés au mois de leur plus proche passage \\(heure locale\\)\\.$`)),
    ).toBeVisible();
  });

  test("le bloc ne dépend pas des filtres de la liste", async ({ page }) => {
    await page.goto("/iles/guadeloupe/historique");
    const sansFiltre = await bloc(page).locator("[data-mois]").allTextContents();
    await page.goto("/iles/guadeloupe/historique?categorie=5&de=2000");
    await attendreResultats(page);
    await expect(bloc(page).locator("[data-mois]")).toHaveText(sansFiltre);
  });

  test("le bloc s'affiche pour les 13 îles", async ({ page }) => {
    await page.goto("/historique");
    const liens = page.getByRole("main").getByRole("listitem").getByRole("link");
    await expect(liens).toHaveCount(13);
    const adresses = await liens.evaluateAll((elements) => elements.map((a) => a.getAttribute("href")!));
    for (const adresse of adresses) {
      await page.goto(adresse);
      await expect(bloc(page).locator("[data-mois]"), adresse).toHaveCount(12);
    }
  });

  test("le bloc existe en anglais", async ({ page }) => {
    await page.goto("/en/iles/guadeloupe/historique");
    const risque = page.getByRole("region", { name: "Risk season" });
    await expect(risque.getByText("Official season: 1 June to 30 November")).toBeVisible();
    await risque.getByText("Show the 12-month table").click();
    await expect(risque.getByRole("table", { name: /^Passages within \d+ km of Pointe-à-Pitre, by month, from 1966 to \d{4}$/ })).toBeVisible();
    await expect(risque.getByText(/^Source: HURDAT2, NHC\. Imported on \d{1,2} \S+ \d{4}\.$/)).toBeVisible();
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`le bloc et son tableau respectent WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/iles/guadeloupe/historique");
      await bloc(page).getByText("Afficher le tableau des 12 mois").click();
      await expect(bloc(page).getByRole("table")).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .include("main section")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
});
