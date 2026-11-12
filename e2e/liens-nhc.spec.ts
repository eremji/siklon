import { type BrowserContext, expect, test } from "@playwright/test";

// Les tests n'appellent pas le réseau : les tuiles du fond de carte sont refusées.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => route.abort());
});

async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

// DESIGN.md : zones tactiles de 44 px minimum, y compris pour un lien placé dans une phrase.
for (const chemin of ["/", "/iles/guadeloupe", "/systemes/al112026"]) {
  test(`le lien nhc.noaa.gov du texte de ${chemin} fait au moins 44 px de haut`, async ({ page, context, baseURL }) => {
    await fixtureNhc(context, baseURL, "indisponible");
    await page.goto(chemin);

    const liens = page.getByRole("link", { name: "nhc.noaa.gov", exact: true });
    await expect(liens.first()).toBeVisible();
    for (const lien of await liens.all()) {
      expect((await lien.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
}
