import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import { randomInt } from "node:crypto";

// Comptes (US-05). Base Postgres locale de test (voir playwright.config.ts), jamais celle du site.
// Chaque test se présente avec sa propre adresse IP : la limitation des tentatives (par IP) ne
// mélange pas les tests entre eux. En production, Vercel impose l'en-tête x-forwarded-for.
test.beforeEach(async ({ page }) => {
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
});

const MOT_DE_PASSE = "un mot de passe solide";
const nouvelEmail = (testInfo: { project: { name: string } }) =>
  `e2e-${testInfo.project.name}-${Date.now()}-${randomInt(1e6)}@exemple.org`;

// Next.js a son propre role="alert" (annonce des changements de page) : on vise celui du formulaire.
const alerte = (page: Page) => page.locator("form [role=alert]");
// Next.js garde la page précédente, cachée, dans le DOM : on ne cherche que le texte visible.
const texteVisible = (page: Page, texte: string) => page.getByText(texte, { exact: true }).filter({ visible: true });
const champ = (page: Page, libelle: string) => page.getByLabel(libelle, { exact: true }).filter({ visible: true });

// Envoie le formulaire et attend que React l'ait vidé, ce qu'il fait un peu après la réponse de la
// server action : remplir l'essai suivant plus tôt le ferait effacer.
async function envoyer(page: Page, bouton: string) {
  await Promise.all([
    page.waitForResponse((reponse) => reponse.request().method() === "POST"),
    page.getByRole("button", { name: bouton }).click(),
  ]);
  await expect(page.locator("form input[type=password]").filter({ visible: true })).toHaveValue("");
}

async function inscrire(page: Page, email: string, langue: "Français" | "English" = "Français") {
  await page.goto("/compte/inscription");
  await champ(page, "Adresse email").fill(email);
  await champ(page, "Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("radio", { name: langue }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

test("la barre de navigation mène à la page Compte, qui invite à se connecter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Compte" }).click();

  await expect(page).toHaveURL("/compte");
  await expect(page.getByRole("heading", { level: 1, name: "Compte" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer un compte" })).toBeVisible();
});

test("créer un compte, se déconnecter, puis se reconnecter", async ({ page, context }, testInfo) => {
  const email = nouvelEmail(testInfo);
  await inscrire(page, email, "English");

  await expect(page).toHaveURL("/compte");
  await expect(texteVisible(page, email)).toBeVisible();
  await expect(texteVisible(page, "Non confirmée")).toBeVisible();
  await expect(texteVisible(page, "English")).toBeVisible();

  // Un seul cookie, celui de la session, protégé du JavaScript de la page.
  const cookies = (await context.cookies()).filter((c) => c.name.startsWith("siklon."));
  expect(cookies.map((c) => c.name)).toEqual(["siklon.session_token"]);
  expect(cookies[0].httpOnly).toBe(true);
  expect(cookies[0].sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  expect((await context.cookies()).filter((c) => c.name.startsWith("siklon."))).toEqual([]);

  await page.getByRole("link", { name: "Se connecter" }).click();
  await champ(page, "Adresse email").fill(email);
  await champ(page, "Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/compte");
  await expect(texteVisible(page, email)).toBeVisible();
});

test("le navigateur refuse un mot de passe de moins de 12 caractères", async ({ page }, testInfo) => {
  await page.goto("/compte/inscription");
  await champ(page, "Adresse email").fill(nouvelEmail(testInfo));
  await champ(page, "Mot de passe").fill("onze-caract");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL("/compte/inscription");
  expect(await champ(page, "Mot de passe").evaluate((champ: HTMLInputElement) => champ.validity.tooShort)).toBe(true);
});

test("une adresse déjà inscrite est signalée", async ({ page }, testInfo) => {
  const email = nouvelEmail(testInfo);
  await inscrire(page, email);
  await page.getByRole("button", { name: "Se déconnecter" }).click();

  await inscrire(page, email);
  await expect(alerte(page)).toHaveText("Un compte existe déjà avec cette adresse email.");
  await expect(champ(page, "Adresse email")).toHaveValue(email);
});

test("un mauvais mot de passe est refusé, puis les tentatives répétées sont bloquées", async ({ page }, testInfo) => {
  await page.goto("/compte/connexion");
  const email = nouvelEmail(testInfo);
  for (let essai = 1; essai <= 5; essai++) {
    await champ(page, "Adresse email").fill(email);
    await champ(page, "Mot de passe").fill("mauvais mot de passe");
    await envoyer(page, "Se connecter");
    await expect(alerte(page)).toHaveText("Email ou mot de passe incorrect.");
  }
  await champ(page, "Adresse email").fill(email);
  await champ(page, "Mot de passe").fill("mauvais mot de passe");
  await envoyer(page, "Se connecter");
  await expect(alerte(page)).toHaveText(/^Trop de tentatives\. Réessayez dans \d+ minutes?\.$/);
});

// Les formulaires marchent avant le chargement du JavaScript (connexion lente). La page Compte, elle,
// diffuse son contenu derrière <Suspense>, qui s'affiche par un script : on vérifie ici la session.
test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("l'inscription crée le compte et ouvre la session", async ({ page, context }, testInfo) => {
    await inscrire(page, nouvelEmail(testInfo));
    await expect(page).toHaveURL("/compte");
    expect((await context.cookies()).map((c) => c.name)).toContain("siklon.session_token");
  });
});

for (const chemin of ["/compte", "/compte/connexion", "/compte/inscription"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`la page ${chemin} respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(chemin);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
}

test("la page Compte, connecté, respecte WCAG AA", async ({ page }, testInfo) => {
  await inscrire(page, nouvelEmail(testInfo));
  await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
});
