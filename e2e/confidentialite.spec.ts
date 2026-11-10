import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

for (const chemin of ["/", "/historique", "/iles/guadeloupe/alerte"]) {
  test(`le pied de la page ${chemin} mène à la page de confidentialité`, async ({ page }) => {
    await page.goto(chemin);
    await page.getByRole("contentinfo").getByRole("link", { name: "Confidentialité" }).click();

    await expect(page).toHaveURL(/\/confidentialite$/);
    await expect(page.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeVisible();
  });
}

test("la page de confidentialité est accessible sans compte et nomme les tiers", async ({ page }) => {
  await page.goto("/confidentialite");

  await expect(page.getByRole("region", { name: "Qui voit votre adresse IP" })).toContainText("OpenFreeMap");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`la page de confidentialité respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/confidentialite");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}
