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
    const barre = page.getByRole("navigation", { name: "Navigation principale" });
    await barre.getByRole("link", { name: "Mon île" }).click();
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
