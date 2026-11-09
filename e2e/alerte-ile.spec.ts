import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, test } from "@playwright/test";

// Choisit la fixture de vigilance lue par le serveur (voir src/lib/vigilance/fixtures.ts).
async function fixtureVigilance(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-vigilance", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

test("la page d'une île française affiche la vigilance en cours, sa source et son heure", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureVigilance(context, baseURL, "orange");
  await page.goto("/iles/guadeloupe/alerte");

  const entete = page.locator("header", { has: page.getByRole("heading", { level: 1, name: "Guadeloupe" }) });
  await expect(entete.getByText("Vigilance orange")).toBeVisible();
  await expect(entete.getByText("Préparez-vous")).toBeVisible();
  await expect(page.getByText("Source : Météo-France, mise à jour du 9 novembre à 05 h 42")).toBeVisible();
  await expect(page.getByRole("link", { name: "Consulter la vigilance sur le site de Météo-France" })).toHaveAttribute(
    "href",
    "https://meteofrance.gp/fr/vigilance/guadeloupe",
  );
  await expect(page.getByText("Siklon ne remplace pas les consignes officielles.")).toBeVisible();
});

test("la page indique qu'aucune alerte n'est en cours en vigilance verte", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "vert");
  await page.goto("/iles/martinique/alerte");

  await expect(page.getByText("Vigilance verte")).toBeVisible();
  await expect(page.getByText("Aucune alerte en cours pour Martinique.")).toBeVisible();
});

test("la page signale un flux indisponible sans afficher de niveau", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "indisponible");
  await page.goto("/iles/saint-barthelemy/alerte");

  await expect(page.getByText("Niveau de vigilance indisponible")).toBeVisible();
  await expect(page.getByText(/^Vigilance /)).toHaveCount(0);
});

test("la page d'une île non française annonce les alertes NHC à venir", async ({ page }) => {
  await page.goto("/iles/dominique/alerte");

  await expect(page.getByRole("heading", { level: 1, name: "Dominique" })).toBeVisible();
  await expect(page.getByText("Alertes NHC bientôt disponibles")).toBeVisible();
  await expect(page.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toBeVisible();
});

// L'île est lue sous Suspense (App Shell commun) : la page 404 arrive en streaming, avec un statut 200.
test("une île inconnue affiche une page introuvable, non indexée", async ({ page }) => {
  await page.goto("/iles/atlantide/alerte");

  await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.getByText(/^Vigilance /)).toHaveCount(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const fixture of ["vert", "jaune", "orange", "rouge", "violet", "gris", "indisponible"]) {
    test(`la page d'alerte (${fixture}) respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await fixtureVigilance(context, baseURL, fixture);
      await page.emulateMedia({ colorScheme });
      await page.goto("/iles/saint-martin/alerte");
      await expect(page.getByRole("heading", { level: 1, name: "Saint-Martin" })).toBeVisible();

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
}
