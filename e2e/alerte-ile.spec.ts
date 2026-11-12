import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";

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

// Choisit la fixture NHC lue par le serveur (voir src/lib/nhc/source.ts) ; « actifs » par défaut.
async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

function enteteIle(page: Page, nom: string) {
  return page.locator("header", { has: page.getByRole("heading", { level: 1, name: nom }) });
}

test("la page d'une île non française affiche le warning NHC en cours, son système, sa source et son heure", async ({
  page,
}) => {
  await page.goto("/iles/dominique/alerte");

  const entete = enteteIle(page, "Dominique");
  await expect(entete.getByText("Avertissement d'ouragan", { exact: true })).toBeVisible();
  await expect(entete.getByText("(Hurricane Warning)")).toBeVisible();
  await expect(entete.getByText("Conditions d'ouragan attendues, en général dans les 36 heures.")).toBeVisible();

  const alertes = page.getByRole("list", { name: "Veilles et avertissements NHC en cours" }).getByRole("listitem");
  await expect(alertes).toHaveCount(1);
  await expect(alertes.first().getByRole("link", { name: "Kyle" })).toHaveAttribute("href", "/systemes/al112026");
  await expect(alertes.first().getByText("(Ouragan de catégorie 4)")).toBeVisible();
  await expect(alertes.first().getByText("Avis n° 14 du NHC, émis le 10 septembre à 11 h 00.")).toBeVisible();
  await expect(page.getByText(/^Source : NHC, données lues le .+ \(heure des Antilles françaises\)\.$/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toHaveAttribute(
    "href",
    "https://www.nhc.noaa.gov/",
  );
  await expect(page.getByText(/^Vigilance /)).toHaveCount(0);
  await expect(page.getByText("Siklon ne remplace pas les consignes officielles.")).toBeVisible();
});

test("la page liste toutes les alertes NHC de l'île, de la plus grave à la moins grave", async ({ page }) => {
  await page.goto("/iles/sainte-lucie/alerte");

  await expect(enteteIle(page, "Sainte-Lucie").getByText("Avertissement de tempête tropicale", { exact: true })).toBeVisible();
  const alertes = page.getByRole("list", { name: "Veilles et avertissements NHC en cours" }).getByRole("listitem");
  await expect(alertes).toHaveCount(2);
  await expect(alertes.nth(0)).toContainText("Avertissement de tempête tropicale (Tropical Storm Warning)");
  await expect(alertes.nth(1)).toContainText("Veille d'ouragan (Hurricane Watch)");
});

test("la page rattache une veille pour l'ouest de Cuba à Cuba, avec son propre avis", async ({ page }) => {
  await page.goto("/iles/cuba/alerte");

  await expect(enteteIle(page, "Cuba").getByText("Veille de tempête tropicale", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Thirteen" })).toBeVisible();
  await expect(page.getByText("Avis n° 1 du NHC, émis le 10 septembre à 08 h 00.")).toBeVisible();
});

test("la page indique qu'aucune veille ni aucun avertissement NHC n'est en cours", async ({ page, context, baseURL }) => {
  await page.goto("/iles/barbade/alerte");
  await expect(page.getByText("Aucune veille ni aucun avertissement NHC en cours pour Barbade.")).toBeVisible();

  await fixtureNhc(context, baseURL, "vide");
  await page.goto("/iles/dominique/alerte");
  await expect(page.getByText("Aucune veille ni aucun avertissement NHC en cours pour Dominique.")).toBeVisible();
  await expect(page.getByText(/^Source : NHC, données lues le /)).toBeVisible();
});

test("la page signale des données NHC indisponibles sans afficher d'alerte", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "indisponible");
  await page.goto("/iles/dominique/alerte");

  await expect(page.getByText("Veilles et avertissements NHC indisponibles")).toBeVisible();
  await expect(page.getByText(/^(Avertissement|Veille) d/)).toHaveCount(0);
  await expect(page.getByText(/^Aucune veille/)).toHaveCount(0);
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

// En-têtes NHC (DESIGN.md) : avertissement d'ouragan, avertissement de tempête tropicale,
// veille d'ouragan, veille de tempête tropicale, aucune alerte, données indisponibles.
const PAGES_NHC = [
  { slug: "dominique", nom: "Dominique", fixture: "actifs", cas: "avertissement d'ouragan" },
  { slug: "sainte-lucie", nom: "Sainte-Lucie", fixture: "actifs", cas: "avertissement de tempête tropicale" },
  { slug: "porto-rico", nom: "Porto Rico", fixture: "actifs", cas: "veille d'ouragan" },
  { slug: "cuba", nom: "Cuba", fixture: "actifs", cas: "veille de tempête tropicale" },
  { slug: "barbade", nom: "Barbade", fixture: "actifs", cas: "aucune alerte" },
  { slug: "jamaique", nom: "Jamaïque", fixture: "indisponible", cas: "indisponible" },
];

for (const colorScheme of ["light", "dark"] as const) {
  for (const { slug, nom, fixture, cas } of PAGES_NHC) {
    test(`la page d'alerte NHC (${cas}) respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await fixtureNhc(context, baseURL, fixture);
      await page.emulateMedia({ colorScheme });
      await page.goto(`/iles/${slug}/alerte`);
      await expect(page.getByText(/^Source : NHC/)).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: nom })).toBeVisible();

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
}
