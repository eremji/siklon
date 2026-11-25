import { expect, test } from "@playwright/test";

// Siklon ouvert depuis l'écran d'accueil (US-07c, #110, livraison 4) : écran de démarrage, barre
// d'état, zones sûres et moyen de revenir sans bouton Précédent du navigateur.

test("la barre d'état prend le fond --bg du thème, reste opaque, et le contenu ne passe pas dessous", async ({ page }) => {
  await page.goto("/fr");
  const couleurs = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((metas) => metas.map((meta) => `${meta.getAttribute("media")} ${meta.getAttribute("content")}`));
  expect(couleurs.sort()).toEqual(["(prefers-color-scheme: dark) #0B1F24", "(prefers-color-scheme: light) #F2F7F6"]);
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "default");
  // Sans viewport-fit=cover, iOS garde la page hors de la barre d'état et de la barre d'accueil.
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute("content", /viewport-fit=cover/);
});

test("chaque iPhone et iPad trouve son écran de démarrage, en clair et en sombre", async ({ page }) => {
  await page.goto("/fr");
  const liens = await page
    .locator('link[rel="apple-touch-startup-image"]')
    .evaluateAll((elements) => elements.map((lien) => ({ href: lien.getAttribute("href") ?? "", media: lien.getAttribute("media") ?? "" })));
  expect(liens.length).toBeGreaterThanOrEqual(40);
  expect(liens).toContainEqual({
    href: "/demarrage/390x844@3x-sombre.png",
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)",
  });
  for (const { href } of liens) {
    const image = await page.request.get(href);
    expect(image.status(), href).toBe(200);
    expect(image.headers()["content-type"], href).toBe("image/png");
  }
});

const PAGES = [
  "/fr",
  "/fr/systemes/al112026",
  "/fr/iles",
  "/fr/iles/guadeloupe",
  "/fr/iles/guadeloupe/alerte",
  "/fr/iles/guadeloupe/checklist",
  "/fr/iles/guadeloupe/historique",
  "/fr/historique",
  "/fr/historique/AL031899",
  "/fr/compte",
  "/fr/compte/connexion",
  "/fr/compte/inscription",
  "/fr/compte/mot-de-passe-oublie",
  "/fr/compte/ecran-accueil",
  "/fr/compte/supprime",
  "/fr/confidentialite",
];

test("sans bouton Précédent, chaque page garde la barre de navigation pour revenir", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: "actifs", url: baseURL ?? "http://localhost:3000" }]);
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
  for (const chemin of PAGES) {
    await page.goto(chemin);
    const navigation = page.getByRole("navigation", { name: "Navigation principale" }).filter({ visible: true });
    await expect(navigation, chemin).toBeVisible();
    await expect(navigation.getByRole("link"), chemin).toHaveCount(3);
  }
});
