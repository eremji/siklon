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
  await expect(etapes(page).nth(0)).toContainText("touchez d'abord ≡ ou « ⋯ » à côté de l'adresse, puis Partager");
  await expect(etapes(page).nth(1)).toContainText("Touchez « Sur l'écran d'accueil »");
  await expect(etapes(page).nth(1)).toContainText("« En voir plus »");
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

// Feuille du bas qui propose d'ajouter Siklon à l'écran d'accueil (US-07c, #110, livraison 2).
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const NOM_FEUILLE = "Recevez les alertes de votre île sur votre iPhone";

const feuille = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: NOM_FEUILLE });

/** Le visiteur est déjà venu un autre jour : la proposition peut s'afficher sur toutes les pages. */
async function dejaVenuUnAutreJour(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("siklon-ecran-accueil")) {
      localStorage.setItem("siklon-ecran-accueil", JSON.stringify({ refus: 0, premiereVisite: "2026-01-01" }));
    }
  });
}

test.describe("sur iPhone, dans Safari : la feuille du bas", () => {
  test.use({ userAgent: IPHONE });

  test("n'apparaît pas à la première page vue, puis s'ouvre sur la page d'une île, titre en focus", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/fr/iles/guadeloupe");
    await expect(feuille(page)).toBeVisible();
    await expect(feuille(page).getByRole("heading", { level: 2, name: NOM_FEUILLE })).toBeFocused();
    await expect(feuille(page)).toContainText("même quand l'app est fermée");
  });

  test("garde le focus tant qu'elle est ouverte, se ferme avec Échap et ne revient pas", async ({ page }) => {
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr/iles/guadeloupe");
    await expect(feuille(page)).toBeVisible();

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Guadeloupe" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("se ferme avec « Plus tard » (48 px au moins)", async ({ page }) => {
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr");
    const plusTard = feuille(page).getByRole("button", { name: "Plus tard" });
    expect((await plusTard.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    await plusTard.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("se ferme avec la croix (44 px au moins)", async ({ page }) => {
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr");
    const fermer = feuille(page).getByRole("button", { name: "Fermer" });
    expect((await fermer.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await fermer.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("se ferme en la faisant glisser vers le bas", async ({ page }) => {
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr");
    // Mesurer la poignée une fois la feuille montée (animation de 220 ms).
    await feuille(page).evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
    const zone = await feuille(page).getByTestId("poignee-feuille").boundingBox();
    if (!zone) throw new Error("poignée introuvable");
    await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2);
    await page.mouse.down();
    await page.mouse.move(zone.x + zone.width / 2, zone.y + 160, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("« Voir en images » mène à l'écran d'aide", async ({ page }) => {
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr");
    await feuille(page).getByRole("link", { name: "Voir en images" }).click();
    await expect(page).toHaveURL("/fr/compte/ecran-accueil");
    await expect(page.getByRole("heading", { level: 1, name: "Ajouter Siklon à l'écran d'accueil" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("cède la place à un bandeau quand une vigilance est en cours sur la page", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "siklon-fixture-vigilance", value: "jaune", url: baseURL ?? "http://localhost:3000" }]);
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr/iles/guadeloupe/alerte");

    const bandeau = page.getByRole("region", { name: "Ajouter Siklon à l'écran d'accueil" }).filter({ visible: true });
    await expect(bandeau).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Après le niveau et la source de la vigilance.
    const source = page.getByText(/Source : Météo-France/).filter({ visible: true });
    const [yBandeau, ySource] = [(await bandeau.boundingBox())?.y ?? 0, (await source.boundingBox())?.y ?? 0];
    expect(yBandeau).toBeGreaterThan(ySource);
    await expect(bandeau.getByRole("link", { name: "Voir comment faire" })).toHaveAttribute("href", "/fr/compte/ecran-accueil");
  });

  test("s'ouvre sur la page d'alerte quand aucune vigilance n'est en cours", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "siklon-fixture-vigilance", value: "vert", url: baseURL ?? "http://localhost:3000" }]);
    await dejaVenuUnAutreJour(page);
    await page.goto("/fr/iles/guadeloupe/alerte");
    await expect(feuille(page)).toBeVisible();
    await expect(page.getByRole("region", { name: "Ajouter Siklon à l'écran d'accueil" })).toHaveCount(0);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`la feuille respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await dejaVenuUnAutreJour(page);
      await page.goto("/fr/iles/guadeloupe");
      await expect(feuille(page)).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
});

for (const [appareil, agent] of [
  ["Android", ANDROID],
  ["un ordinateur", undefined],
] as const) {
  test.describe(`sur ${appareil}`, () => {
    if (agent) test.use({ userAgent: agent });

    test("la feuille n'apparaît jamais", async ({ page }) => {
      await dejaVenuUnAutreJour(page);
      await page.goto("/fr/iles/guadeloupe");
      await expect(page.getByRole("heading", { level: 1, name: "Guadeloupe" })).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  });
}

test.describe("en anglais (US-10)", () => {
  test("l'écran d'aide donne les 4 étapes en anglais, ramène au compte et respecte WCAG AA", async ({ page }) => {
    await page.goto("/en/compte/ecran-accueil");

    await expect(page).toHaveTitle("Add Siklon to the Home Screen · Siklon");
    const etapes = page.getByRole("list", { name: "Steps" }).getByRole("listitem");
    await expect(etapes).toHaveCount(4);
    await expect(etapes.nth(1)).toContainText("Tap “Add to Home Screen”");
    await expect(page.getByRole("link", { name: "Back to account" })).toHaveAttribute("href", "/en/compte");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);

    await page.getByRole("link", { name: "Got it" }).click();
    await expect(page).toHaveURL("/en/compte");
  });
});
