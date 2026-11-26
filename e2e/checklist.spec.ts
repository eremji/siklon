import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { randomInt } from "node:crypto";

// Choisit la fixture de vigilance lue par le serveur (voir src/lib/vigilance/fixtures.ts).
async function fixtureVigilance(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-vigilance", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

// Next.js garde la page précédente cachée dans le DOM : on ne cherche que les éléments visibles.
const visible = (page: Page, texte: string | RegExp) => page.getByText(texte).filter({ visible: true });
const titre = (page: Page, niveau: number, nom: string) =>
  page.getByRole("heading", { level: niveau, name: nom }).filter({ visible: true });

test("la checklist d'une île française suit la vigilance en cours et cite ses sources", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "orange");
  await page.goto("/iles/guadeloupe/checklist");

  const entete = page.locator("header", { has: titre(page, 1, "Guadeloupe") });
  await expect(entete.getByText("Vigilance orange")).toBeVisible();
  await expect(visible(page, "Source : Météo-France, mise à jour du 9 novembre à 05 h 42")).toBeVisible();

  await expect(titre(page, 2, "Checklist de préparation")).toBeVisible();
  await expect(titre(page, 3, "Vigilance orange : préparez-vous")).toBeVisible();
  const liste = page.getByRole("list", { name: "Liste en cours : Vigilance orange : préparez-vous" });
  await expect(liste.getByText("Faire le plein de carburant.")).toBeVisible();
  await expect(liste.getByText(/^Source : /).first()).toBeVisible();

  await expect(visible(page, /^Si ce n'est pas encore fait : /)).toHaveCount(2);
  await expect(
    page.getByRole("list", { name: "Sources de la checklist" }).getByRole("link", { name: /Préfecture de Guadeloupe : Dépliant/ }),
  ).toHaveAttribute("href", /guadeloupe\.gouv\.fr/);
  await expect(visible(page, "Siklon ne remplace pas les consignes officielles.")).toBeVisible();
});

test("une liste repliée s'ouvre au clic", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "jaune");
  await page.goto("/iles/martinique/checklist");

  const rappel = visible(page, "Si ce n'est pas encore fait : Avant la saison cyclonique (juin à novembre)");
  await expect(page.getByText(/^Eau potable : 3 litres/).filter({ visible: true })).toHaveCount(0);
  await rappel.click();
  await expect(visible(page, /^Eau potable : 3 litres par personne et par jour/)).toBeVisible();
});

test("la checklist d'une île suivie par le NHC suit l'avertissement en cours", async ({ page }) => {
  await page.goto("/iles/dominique/checklist");

  await expect(page.locator("header", { has: titre(page, 1, "Dominique") }).getByText("Avertissement d'ouragan", { exact: true })).toBeVisible();
  await expect(titre(page, 3, "Vigilance rouge : protégez-vous")).toBeVisible();
  await expect(visible(page, /Suivez d'abord les consignes des autorités de Dominique\./)).toBeVisible();
});

test("la checklist reste consultable quand le niveau d'alerte est indisponible", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "indisponible");
  await page.goto("/iles/saint-barthelemy/checklist");

  await expect(visible(page, "Niveau de vigilance indisponible")).toBeVisible();
  await expect(visible(page, /^Niveau d'alerte indisponible : choisissez la liste/)).toBeVisible();
});

test("la page d'une île et sa page d'alerte mènent à la checklist", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "vert");
  await page.goto("/iles/guadeloupe");
  await page.getByRole("link", { name: "Checklist de préparation" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/iles\/guadeloupe\/checklist$/);

  await page.goto("/iles/guadeloupe/alerte");
  await page.getByRole("link", { name: "Checklist de préparation" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/iles\/guadeloupe\/checklist$/);
  await expect(titre(page, 3, "Avant la saison cyclonique (juin à novembre)")).toBeVisible();
});

// Inscription sans confirmer l'adresse : la session est ouverte, cela suffit pour cocher. Chaque test
// a sa propre adresse IP, pour ne pas cumuler la limitation des tentatives (voir compte.spec.ts).
async function connecterNouveauCompte(page: Page, projet: string) {
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await page.goto("/compte/inscription");
  await page.getByLabel("Adresse email", { exact: true }).filter({ visible: true }).fill(`e2e-checklist-${projet}-${Date.now()}-${randomInt(1e6)}@exemple.org`);
  await page.getByLabel("Mot de passe", { exact: true }).filter({ visible: true }).fill("un mot de passe solide");
  await page.getByRole("radio", { name: "Français" }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL("/fr/compte");
}

const caseVisible = (page: Page, nom: string) => page.getByRole("checkbox", { name: nom }).filter({ visible: true });

test("un visiteur voit la checklist sans case à cocher, avec une invitation à se connecter", async ({ page, context, baseURL }) => {
  await fixtureVigilance(context, baseURL, "orange");
  await page.goto("/iles/guadeloupe/checklist");

  await expect(titre(page, 3, "Vigilance orange : préparez-vous")).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("link", { name: "Connectez-vous pour cocher les éléments et garder votre progression" }).click();
  await expect(page).toHaveURL("/fr/compte/connexion");
});

test("un utilisateur connecté coche des éléments et les retrouve cochés, sur une autre île aussi", async (
  { page, context, baseURL },
  testInfo,
) => {
  await fixtureVigilance(context, baseURL, "orange");
  await connecterNouveauCompte(page, testInfo.project.name);
  await page.goto("/iles/guadeloupe/checklist");

  await expect(visible(page, /^Connectez-vous pour cocher/)).toHaveCount(0);
  const carburant = caseVisible(page, "Faire le plein de carburant.");
  await expect(carburant).not.toBeChecked();
  await Promise.all([page.waitForResponse((reponse) => reponse.request().method() === "POST"), carburant.check()]);
  await Promise.all([
    page.waitForResponse((reponse) => reponse.request().method() === "POST"),
    caseVisible(page, "Retirer de l'argent liquide.").check(),
  ]);
  await Promise.all([
    page.waitForResponse((reponse) => reponse.request().method() === "POST"),
    caseVisible(page, "Retirer de l'argent liquide.").uncheck(),
  ]);

  await page.reload();
  await expect(caseVisible(page, "Faire le plein de carburant.")).toBeChecked();
  await expect(caseVisible(page, "Retirer de l'argent liquide.")).not.toBeChecked();

  // L'état vaut pour le foyer : la même case est cochée sur la checklist d'une autre île.
  await page.goto("/iles/martinique/checklist");
  await expect(caseVisible(page, "Faire le plein de carburant.")).toBeChecked();
});

test("un utilisateur masque un élément, le retrouve masqué après rechargement, puis le réaffiche", async (
  { page, context, baseURL },
  testInfo,
) => {
  await fixtureVigilance(context, baseURL, "orange");
  await connecterNouveauCompte(page, testInfo.project.name);
  await page.goto("/iles/guadeloupe/checklist");

  const bateaux = "Mettre les bateaux à l'abri ou les sortir de l'eau.";
  await page.getByRole("button", { name: `Masquer : ${bateaux}` }).filter({ visible: true }).click();
  await expect(caseVisible(page, bateaux)).toHaveCount(0);
  await expect(visible(page, "Éléments masqués (1)")).toBeVisible();

  await page.reload();
  await expect(caseVisible(page, bateaux)).toHaveCount(0);
  await visible(page, "Éléments masqués (1)").click();
  await page.getByRole("button", { name: `Réafficher : ${bateaux}` }).filter({ visible: true }).click();
  await expect(caseVisible(page, bateaux)).toBeVisible();
  await expect(visible(page, /^Éléments masqués/)).toHaveCount(0);
});

test("un utilisateur ajoute ses éléments, les coche et les supprime", async ({ page, context, baseURL }, testInfo) => {
  await fixtureVigilance(context, baseURL, "jaune");
  await connecterNouveauCompte(page, testInfo.project.name);
  await page.goto("/iles/martinique/checklist");

  const champ = page.getByRole("textbox", { name: "Ajouter un élément" }).filter({ visible: true });
  await champ.fill("Croquettes du chien");
  await page.getByRole("button", { name: "Ajouter", exact: true }).filter({ visible: true }).click();
  await expect(caseVisible(page, "Croquettes du chien")).toBeVisible();
  await expect(champ).toHaveValue("");

  await Promise.all([
    page.waitForResponse((reponse) => reponse.request().method() === "POST"),
    caseVisible(page, "Croquettes du chien").check(),
  ]);
  // Mes éléments valent pour tous les niveaux et toutes les îles.
  await fixtureVigilance(context, baseURL, "rouge");
  await page.goto("/iles/guadeloupe/checklist");
  await expect(caseVisible(page, "Croquettes du chien")).toBeChecked();

  await page.getByRole("button", { name: "Supprimer : Croquettes du chien" }).filter({ visible: true }).click();
  await expect(caseVisible(page, "Croquettes du chien")).toHaveCount(0);
  await page.reload();
  await expect(caseVisible(page, "Croquettes du chien")).toHaveCount(0);
});

test("la checklist d'un utilisateur connecté respecte WCAG AA", async ({ page, context, baseURL }, testInfo) => {
  await fixtureVigilance(context, baseURL, "orange");
  await connecterNouveauCompte(page, testInfo.project.name);
  await page.goto("/iles/saint-martin/checklist");
  await caseVisible(page, "Faire le plein de carburant.").check();
  await page.getByRole("textbox", { name: "Ajouter un élément" }).filter({ visible: true }).fill("Croquettes du chien");
  await page.getByRole("button", { name: "Ajouter", exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Masquer : Retirer de l'argent liquide." }).filter({ visible: true }).click();
  await expect(visible(page, "Éléments masqués (1)")).toBeVisible();
  await visible(page, "Éléments masqués (1)").click();

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const fixture of ["vert", "orange", "violet", "indisponible"]) {
    test(`la checklist (${fixture}) respecte WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await fixtureVigilance(context, baseURL, fixture);
      await page.emulateMedia({ colorScheme });
      await page.goto("/iles/saint-martin/checklist");
      await expect(titre(page, 2, "Checklist de préparation")).toBeVisible();

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
}

test.describe("en anglais (US-10)", () => {
  const audit = async (page: Page) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations).toEqual([]);
    }
  };

  test("la checklist d'une île française est traduite, garde le terme d'origine et dit que ses sources sont françaises", async ({
    page,
    context,
    baseURL,
  }) => {
    await fixtureVigilance(context, baseURL, "orange");
    await page.goto("/en/iles/guadeloupe/checklist");

    await expect(page).toHaveTitle("Preparedness checklist: Guadeloupe · Siklon");
    await expect(page.getByRole("link", { name: "Guadeloupe: current threats" })).toHaveAttribute("href", "/en/iles/guadeloupe");
    await expect(page.locator("header", { has: titre(page, 1, "Guadeloupe") }).getByText("Orange vigilance")).toBeVisible();

    await expect(titre(page, 2, "Preparedness checklist")).toBeVisible();
    const enCours = titre(page, 3, "Orange vigilance: get prepared (Vigilance orange · Préparez-vous)");
    await expect(enCours.getByText("(Vigilance orange · Préparez-vous)")).toHaveAttribute("lang", "fr");
    await expect(visible(page, /^This checklist is translated from official French guides/)).toBeVisible();
    await expect(visible(page, "Threat becoming clearer, within 24 to 36 hours. (Prefecture of Guadeloupe)")).toBeVisible();
    const liste = page.getByRole("list", { name: "Current list: Orange vigilance: get prepared" });
    await expect(liste.getByText("Fill up with fuel.")).toBeVisible();
    await expect(liste.getByText(/^Source: /).first()).toBeVisible();
    await expect(visible(page, /^If not done yet: /)).toHaveCount(2);
    await expect(
      page.getByRole("list", { name: "Checklist sources" }).getByRole("link", { name: "Prefecture of Guadeloupe: Hurricane season leaflet (2023, in French)" }),
    ).toHaveAttribute("href", /guadeloupe\.gouv\.fr/);
    await expect(page.getByRole("link", { name: "Sign in to check off items and keep your progress" })).toHaveAttribute(
      "href",
      "/en/compte/connexion",
    );

    await audit(page);
  });

  test("la checklist d'une île suivie par le NHC est traduite", async ({ page }) => {
    await page.goto("/en/iles/dominique/checklist");

    await expect(page.locator("header", { has: titre(page, 1, "Dominica") }).getByText("Hurricane Warning", { exact: true })).toBeVisible();
    await expect(titre(page, 3, "Red vigilance: protect yourself (Vigilance rouge · Protégez-vous)")).toBeVisible();
    await expect(visible(page, /Follow the instructions of the authorities of Dominica first\.$/)).toBeVisible();
    await audit(page);
  });

  test("un utilisateur connecté coche, masque et ajoute en anglais ; l'état est le même en français", async (
    { page, context, baseURL },
    testInfo,
  ) => {
    await fixtureVigilance(context, baseURL, "orange");
    await connecterNouveauCompte(page, testInfo.project.name);
    await page.goto("/en/iles/guadeloupe/checklist");

    await Promise.all([
      page.waitForResponse((reponse) => reponse.request().method() === "POST"),
      caseVisible(page, "Fill up with fuel.").check(),
    ]);
    await page.getByRole("button", { name: "Hide: Withdraw cash." }).filter({ visible: true }).click();
    await expect(visible(page, "Hidden items (1)")).toBeVisible();
    await page.getByRole("textbox", { name: "Add an item" }).filter({ visible: true }).fill("Dog food");
    await page.getByRole("button", { name: "Add", exact: true }).filter({ visible: true }).click();
    await expect(caseVisible(page, "Dog food")).toBeVisible();
    await expect(page).toHaveURL("/en/iles/guadeloupe/checklist");
    await visible(page, "Hidden items (1)").click();
    await audit(page);

    // Mêmes identifiants dans les deux langues : la checklist française reprend le même état.
    await page.goto("/fr/iles/guadeloupe/checklist");
    await expect(caseVisible(page, "Faire le plein de carburant.")).toBeChecked();
    await expect(visible(page, "Éléments masqués (1)")).toBeVisible();
    await expect(caseVisible(page, "Dog food")).toBeVisible();
  });
});
