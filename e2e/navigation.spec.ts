import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

test("la barre de navigation mène de l'accueil à Mon île et retour", async ({ page }) => {
  await page.goto("/");
  const barre = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(barre.getByRole("link", { name: "Carte" })).toHaveAttribute("aria-current", "page");

  await barre.getByRole("link", { name: "Mon île" }).click();
  await expect(page).toHaveURL("/iles");
  await expect(barre.getByRole("link", { name: "Mon île" })).toHaveAttribute("aria-current", "page");
  await expect(barre.getByRole("link", { name: "Carte" })).not.toHaveAttribute("aria-current");

  await barre.getByRole("link", { name: "Carte" }).click();
  await expect(page).toHaveURL("/");
});

test("la barre de navigation offre des zones tactiles d'au moins 44 px", async ({ page }) => {
  await page.goto("/iles");
  const liens = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link");
  await expect(liens).toHaveCount(3);
  for (const lien of await liens.all()) {
    const boite = await lien.boundingBox();
    expect(boite?.height).toBeGreaterThanOrEqual(44);
    expect(boite?.width).toBeGreaterThanOrEqual(44);
  }
});

test("la barre de navigation ne masque pas le bas de la page", async ({ page }) => {
  await page.goto("/iles");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  // Le pied de page (lien Confidentialité) est le dernier élément : il doit rester au-dessus de la barre.
  const pied = await page.getByRole("contentinfo").getByRole("link", { name: "Confidentialité" }).boundingBox();
  const barre = await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox();
  expect(pied!.y + pied!.height).toBeLessThanOrEqual(barre!.y);
});

test("la page alerte d'une île renvoie vers la page de l'île", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "siklon-fixture-vigilance", value: "vert", url: baseURL ?? "http://localhost:3000" }]);
  await page.goto("/iles/guadeloupe/alerte");

  await page.getByRole("link", { name: "Guadeloupe : menaces en cours" }).click();
  await expect(page).toHaveURL("/iles/guadeloupe");
  await expect(page.getByRole("heading", { level: 1, name: "Guadeloupe" })).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`la barre de navigation respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/iles");
    const { violations } = await new AxeBuilder({ page })
      .include("nav[aria-label='Navigation principale']")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}
