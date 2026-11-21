import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";

// Choisit la fixture de vigilance lue par le serveur (voir src/lib/vigilance/fixtures.ts).
async function fixtureVigilance(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-vigilance", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

// Next.js garde la page précédente cachée dans le DOM : on ne cherche que les éléments visibles.
const visible = (page: Page, texte: string | RegExp) => page.getByText(texte).filter({ visible: true });
const titre = (page: Page, niveau: number, nom: string) =>
  page.getByRole("heading", { level: niveau, name: nom }).filter({ visible: true });

test("la checklist d'une île française suit la vigilance en cours et cite ses sources", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "orange");
  await page.goto("/iles/guadeloupe/checklist");

  const entete = page.locator("header", { has: titre(page, 1, "Guadeloupe") });
  await expect(entete.getByText("Vigilance orange")).toBeVisible();
  await expect(visible(page, "Source : Météo-France, mise à jour du 9 novembre à 05 h 42")).toBeVisible();

  await expect(titre(page, 2, "Checklist de préparation")).toBeVisible();
  await expect(titre(page, 3, "Vigilance orange : préparez-vous")).toBeVisible();
  const liste = page.getByRole("list", { name: "Liste en cours : Vigilance orange : préparez-vous" });
  await expect(liste.getByText("Faire le plein de carburant.")).toBeVisible();
  await expect(liste.getByText(/^Source : /).first()).toBeVisible();

  await expect(visible(page, /^Si ce n'est pas encore fait : /)).toHaveCount(2);
  await expect(
    page.getByRole("list", { name: "Sources de la checklist" }).getByRole("link", { name: /Préfecture de Guadeloupe : Dépliant/ }),
  ).toHaveAttribute("href", /guadeloupe\.gouv\.fr/);
  await expect(visible(page, "Siklon ne remplace pas les consignes officielles.")).toBeVisible();
});

test("une liste repliée s'ouvre au clic", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "jaune");
  await page.goto("/iles/martinique/checklist");

  const rappel = visible(page, "Si ce n'est pas encore fait : Avant la saison cyclonique (juin à novembre)");
  await expect(page.getByText(/^Eau potable : 3 litres/).filter({ visible: true })).toHaveCount(0);
  await rappel.click();
  await expect(visible(page, /^Eau potable : 3 litres par personne et par jour/)).toBeVisible();
});

test("la checklist d'une île suivie par le NHC suit l'avertissement en cours", async ({ page }) => {
  await page.goto("/iles/dominique/checklist");

  await expect(page.locator("header", { has: titre(page, 1, "Dominique") }).getByText("Avertissement d'ouragan", { exact: true })).toBeVisible();
  await expect(titre(page, 3, "Vigilance rouge : protégez-vous")).toBeVisible();
  await expect(visible(page, /Suivez d'abord les consignes des autorités de Dominique\./)).toBeVisible();
});

test("la checklist reste consultable quand le niveau d'alerte est indisponible", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "indisponible");
  await page.goto("/iles/saint-barthelemy/checklist");

  await expect(visible(page, "Niveau de vigilance indisponible")).toBeVisible();
  await expect(visible(page, /^Niveau d'alerte indisponible : choisissez la liste/)).toBeVisible();
});

test("la page d'une île et sa page d'alerte mènent à la checklist", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "vert");
  await page.goto("/iles/guadeloupe");
  await page.getByRole("link", { name: "Checklist de préparation" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/iles\/guadeloupe\/checklist$/);

  await page.goto("/iles/guadeloupe/alerte");
  await page.getByRole("link", { name: "Checklist de préparation" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/iles\/guadeloupe\/checklist$/);
  await expect(titre(page, 3, "Avant la saison cyclonique (juin à novembre)")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const fixture of ["vert", "orange", "violet", "indisponible"]) {
    test(`la checklist (${fixture}) respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await fixtureVigilance(context, baseURL, fixture);
      await page.emulateMedia({ colorScheme });
      await page.goto("/iles/saint-martin/checklist");
      await expect(titre(page, 2, "Checklist de préparation")).toBeVisible();

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
}
