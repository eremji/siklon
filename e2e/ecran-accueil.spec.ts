import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Écran d'aide « Comment faire » : ajouter Siklon à l'écran d'accueil d'un iPhone (US-07c, #110).
const etapes = (page: import("@playwright/test").Page) =>
  page.getByRole("list", { name: "Étapes" }).filter({ visible: true }).getByRole("listitem");

test("l'écran d'aide donne les 4 étapes, puis ramène à la page Compte", async ({ page }) => {
  await page.goto("/compte/ecran-accueil");

  await expect(page.getByRole("heading", { level: 1, name: "Ajouter Siklon à l'écran d'accueil" })).toBeVisible();
  await expect(etapes(page)).toHaveCount(4);
  await expect(etapes(page).nth(0)).toContainText("Touchez le bouton Partager");
  await expect(etapes(page).nth(1)).toContainText("Touchez « Sur l'écran d'accueil »");
  await expect(etapes(page).nth(2)).toContainText("Touchez « Ajouter »");
  await expect(etapes(page).nth(3)).toContainText("Ouvrez Siklon depuis son icône");

  const compris = page.getByRole("link", { name: "J'ai compris" }).filter({ visible: true });
  expect((await compris.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await compris.click();
  await expect(page).toHaveURL("/fr/compte");
});

test("le lien Retour au compte a une zone tactile d'au moins 44 px", async ({ page }) => {
  await page.goto("/compte/ecran-accueil");
  const retour = page.getByRole("link", { name: "Retour au compte" }).filter({ visible: true });
  expect((await retour.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`l'écran d'aide respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/compte/ecran-accueil");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  });
}
