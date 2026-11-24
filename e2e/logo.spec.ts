import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Logo de Siklon (spirale et lettrage) en tête de l'accueil, de la connexion et de l'inscription,
// et icône SVG de l'onglet (US-07c, #110).
const logo = (page: import("@playwright/test").Page) => page.getByRole("img", { name: "Siklon" }).filter({ visible: true });

test("l'accueil porte le logo pour titre", async ({ page }) => {
  await page.goto("/fr");
  const titre = page.getByRole("heading", { level: 1, name: "Siklon" });
  await expect(titre).toBeVisible();
  await expect(titre.getByRole("img", { name: "Siklon" })).toBeVisible();
});

for (const [chemin, titre] of [
  ["/fr/compte/connexion", "Se connecter"],
  ["/fr/compte/inscription", "Créer un compte"],
] as const) {
  test(`le logo coiffe la page « ${titre} »`, async ({ page }) => {
    await page.goto(chemin);
    await expect(logo(page)).toBeVisible();
    const [boiteLogo, boiteTitre] = [
      await logo(page).boundingBox(),
      await page.getByRole("heading", { level: 1, name: titre }).boundingBox(),
    ];
    expect(boiteLogo?.y ?? Infinity).toBeLessThan(boiteTitre?.y ?? 0);
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`le logo prend les jetons du thème ${colorScheme === "light" ? "clair" : "sombre"}, contraste AA`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/fr");
    await expect(logo(page)).toBeVisible();
    const couleurs = await logo(page).evaluate((element) =>
      [...new Set([...element.querySelectorAll("path")].map((trace) => getComputedStyle(trace).fill))].sort(),
    );
    expect(couleurs).toEqual(
      colorScheme === "light" ? ["rgb(14, 94, 111)", "rgb(16, 41, 46)"] : ["rgb(230, 242, 240)", "rgb(94, 196, 201)"],
    );
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  });
}

test("l'onglet annonce l'icône SVG de Siklon", async ({ page, request }) => {
  await page.goto("/fr");
  const lien = page.locator('link[rel="icon"][type="image/svg+xml"]');
  await expect(lien).toHaveCount(1);
  const reponse = await request.get((await lien.getAttribute("href")) ?? "");
  expect(reponse.ok()).toBe(true);
  expect(await reponse.text()).toContain('fill="#5EC4C9"');
});
