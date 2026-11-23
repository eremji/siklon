import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// US-10 : la langue est le premier segment de l'adresse ; sans elle, la langue du navigateur.

test.describe("navigateur en anglais", () => {
  test.use({ locale: "en-US" });

  test("l'accueil mène à la version anglaise", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("la navigation reste dans la langue de la page", async ({ page }) => {
    await page.goto("/en");
    const barre = page.getByRole("navigation", { name: "Main navigation" });
    await barre.getByRole("link", { name: "My island" }).click();
    await expect(page).toHaveURL("/en/iles");
    await page.getByRole("link", { name: "Guadeloupe" }).filter({ visible: true }).click();
    await expect(page).toHaveURL("/en/iles/guadeloupe");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("navigateur en français", () => {
  test.use({ locale: "fr-FR" });

  test("l'accueil mène à la version française", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("un ancien lien sans langue mène à la même page, paramètres compris", async ({ page }) => {
    await page.goto("/iles/guadeloupe/historique?categorie=5");
    await expect(page).toHaveURL("/fr/iles/guadeloupe/historique?categorie=5");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("une adresse en anglais s'affiche en anglais, même depuis un navigateur en français", async ({ page }) => {
    await page.goto("/en/iles");
    await expect(page).toHaveURL("/en/iles");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("navigateur ni en français ni en anglais", () => {
  test.use({ locale: "de-DE" });

  test("l'accueil mène à la version française", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/fr");
  });
});

test("une langue inconnue dans l'adresse donne une page introuvable", async ({ page }) => {
  const reponse = await page.goto("/es/iles");
  expect(reponse?.status()).toBe(404);
});

test.describe("bascule de langue", () => {
  test.use({ locale: "fr-FR" });

  test("le pied de page ouvre la même page en anglais, et le choix est gardé", async ({ page, context }) => {
    await page.goto("/fr/iles/guadeloupe");
    await page.getByRole("contentinfo").getByRole("link", { name: "English" }).click();

    await expect(page).toHaveURL("/en/iles/guadeloupe");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const barre = page.getByRole("navigation", { name: "Main navigation" });
    await expect(barre.getByRole("link", { name: "My island" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(page.getByText("Siklon does not replace official instructions. Follow local authorities.")).toBeVisible();
    expect((await context.cookies()).find((c) => c.name === "siklon-langue")?.value).toBe("en");

    // Navigateur en français, mais l'anglais a été choisi : une adresse sans langue suit le choix.
    await page.goto("/");
    await expect(page).toHaveURL("/en");

    await page.getByRole("contentinfo").getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL("/fr");
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
    await page.goto("/iles");
    await expect(page).toHaveURL("/fr/iles");
  });

  test("la bascule fonctionne sans JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/fr/compte/connexion");
    await page.getByRole("contentinfo").getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL("/en/compte/connexion");
    await context.close();
  });

  test("le lien de bascule offre une zone tactile d'au moins 44 px", async ({ page }) => {
    await page.goto("/fr");
    const boite = await page.getByRole("contentinfo").getByRole("link", { name: "English" }).boundingBox();
    expect(boite?.height).toBeGreaterThanOrEqual(44);
  });
});

for (const langue of ["fr", "en"] as const) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`le pied de page et la navigation en ${langue} respectent WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`/${langue}/iles`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .include("footer")
        .include("nav")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
}
