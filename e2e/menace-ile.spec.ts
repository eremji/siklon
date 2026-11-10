import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, test } from "@playwright/test";
import { RADIUS_WATCH_KM } from "../src/lib/constantes";

// Choisit la fixture NHC lue par le serveur (voir src/lib/nhc/source.ts).
async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

test("le visiteur choisit son île dans la liste des îles", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "actifs");
  await page.goto("/iles");

  await page.getByRole("link", { name: "Guadeloupe" }).click();

  await expect(page).toHaveURL(/\/iles\/guadeloupe$/);
  await expect(page.getByRole("heading", { level: 1, name: "Guadeloupe" })).toBeVisible();
});

test("la page d'une île menacée affiche le délai, l'heure et la distance du plus proche passage, avec l'avis NHC", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "actifs");
  // Fixture : avis n° 14 de Kyle émis à 15 h UTC ; il est 19 h UTC.
  await page.clock.setFixedTime(new Date("2026-09-10T19:00:00.000Z"));
  await page.goto("/iles/guadeloupe");

  const menace = page.getByRole("list", { name: "Systèmes qui menacent Guadeloupe" }).getByRole("listitem");
  await expect(menace).toHaveCount(1);
  await expect(menace).toContainText("Kyle");
  await expect(menace.getByText("Dans environ 12 h")).toBeVisible();
  await expect(menace).toContainText(
    "Plus proche passage estimé : 11 septembre vers 3 h, à environ 180 km de Pointe-à-Pitre.",
  );
  await expect(menace).toContainText(
    "Estimation Siklon calculée à partir des positions prévues de l'avis NHC n° 14 du 10 septembre à 11 h 00 (heure locale).",
  );
  await expect(page.getByText(`Systèmes dont la trajectoire prévue passe à moins de ${RADIUS_WATCH_KM} km de Pointe-à-Pitre`)).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Prévisions indisponibles pour Leah et Thirteen" })).toBeVisible();
  await expect(page.getByText("Siklon ne remplace pas les consignes officielles.")).toBeVisible();

  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});

test("la page indique qu'aucun système ne menace l'île", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "vide");
  await page.goto("/iles/martinique");

  await expect(page.getByText("Aucun système ne menace Martinique pour le moment.")).toBeVisible();
  await expect(page.getByRole("list", { name: /Systèmes qui menacent/ })).toHaveCount(0);
});

test("une trajectoire prévue hors du rayon ne menace pas l'île", async ({ page, context, baseURL }) => {
  await fixtureNhc(context, baseURL, "actifs");
  // Kyle passe à environ 335 km de Fort-de-France, au-delà de RADIUS_WATCH_KM.
  await page.goto("/iles/martinique");

  await expect(page.getByText("Aucun système dont la prévision est disponible ne menace Martinique.")).toBeVisible();
  await expect(page.getByRole("list", { name: /Systèmes qui menacent/ })).toHaveCount(0);
});

test("la page signale un flux NHC indisponible sans conclure à l'absence de menace", async ({
  page,
  context,
  baseURL,
}) => {
  await fixtureNhc(context, baseURL, "indisponible");
  await page.goto("/iles/guadeloupe");

  await expect(
    page.getByRole("alert").filter({ hasText: "Les données du NHC sont momentanément indisponibles" }),
  ).toBeVisible();
  await expect(page.getByText(/Aucun système/)).toHaveCount(0);
});
