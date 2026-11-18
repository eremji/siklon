import { type Page, expect, test } from "@playwright/test";

// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

// Relève toute violation de la CSP : événements de la page et messages de la console.
async function surveillerCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  await page.exposeFunction("signalerViolationCsp", (texte: string) => violations.push(texte));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { signalerViolationCsp: (t: string) => void }).signalerViolationCsp(
        `${e.violatedDirective} ${e.blockedURI}`,
      );
    });
  });
  return violations;
}

test("les pages sont servies avec une CSP et les en-têtes de sécurité, sans X-Powered-By", async ({ page }) => {
  const reponse = await page.goto("/");
  const entetes = reponse!.headers();

  expect(entetes["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(entetes["content-security-policy"]).toContain("connect-src 'self' https://tiles.openfreemap.org");
  expect(entetes["x-content-type-options"]).toBe("nosniff");
  expect(entetes["x-frame-options"]).toBe("DENY");
  expect(entetes["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(entetes["permissions-policy"]).toContain("geolocation=()");
  expect(entetes["strict-transport-security"]).toContain("max-age=");
  expect(entetes["x-powered-by"]).toBeUndefined();
});

test("la carte interactive se charge sans violation de la CSP", async ({ page, context, baseURL }) => {
  const violations = await surveillerCsp(page);
  await context.addCookies([{ name: "siklon-fixture-nhc", value: "actifs", url: baseURL ?? "http://localhost:3000" }]);
  await page.goto("/");

  await expect(page.getByRole("group", { name: /^Kyle/ })).toBeAttached();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeAttached();
  expect(violations).toEqual([]);
});

// Fiche d'un système actif et délai avant passage : lus dans la fixture NHC « actifs ».
const PAGES = [
  "/iles",
  "/iles/guadeloupe",
  "/iles/guadeloupe/alerte",
  "/iles/dominique/alerte",
  "/systemes/al112026",
  "/historique",
  "/compte",
  "/compte/connexion",
  "/compte/inscription",
];

for (const chemin of PAGES) {
  test(`la page ${chemin} s'affiche sans violation de la CSP`, async ({ page, context, baseURL }) => {
    const violations = await surveillerCsp(page);
    await context.addCookies([{ name: "siklon-fixture-nhc", value: "actifs", url: baseURL ?? "http://localhost:3000" }]);
    await page.goto(chemin);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Laisse le temps aux scripts (carte, compte à rebours) de s'exécuter.
    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });
}

test("le formulaire de filtres de l'historique reste envoyable sous la CSP", async ({ page }) => {
  const violations = await surveillerCsp(page);
  await page.goto("/iles/guadeloupe/historique");
  // Sans base locale, la page affiche « indisponible » sans formulaire : rien à vérifier ici.
  const filtrer = page.getByRole("button", { name: "Filtrer" });
  test.skip(!(await filtrer.isVisible()), "historique indisponible sans base Postgres");

  await page.getByLabel("De (année)").fill("1990");
  await filtrer.click();
  await expect(page).toHaveURL(/de=1990/);
  expect(violations).toEqual([]);
});
