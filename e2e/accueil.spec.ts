import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

test("la page d'accueil affiche le nom de l'application et la mention officielle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Siklon" })).toBeVisible();
  await expect(page.getByText("Siklon ne remplace pas les consignes officielles.")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`la page d'accueil respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}
