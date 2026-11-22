import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import { randomInt } from "node:crypto";
import { emailsRecus, lienRecu } from "./emails";

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

test("suivre des îles, puis en retirer une : le choix reste après rechargement", async ({ page }, testInfo) => {
  await inscrire(page, nouvelEmail(testInfo));
  const ile = (nom: string) => page.getByRole("checkbox", { name: nom, exact: true }).filter({ visible: true });
  const enregistrer = async () => {
    await page.getByRole("button", { name: "Enregistrer mes îles" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Vos îles sont enregistrées." })).toBeVisible();
  };

  await ile("Guadeloupe").check();
  await ile("Martinique").check();
  await enregistrer();
  await page.reload();
  await expect(ile("Guadeloupe")).toBeChecked();
  await expect(ile("Martinique")).toBeChecked();
  await expect(ile("Haïti")).not.toBeChecked();

  await ile("Guadeloupe").uncheck();
  await enregistrer();
  await page.reload();
  await expect(ile("Guadeloupe")).not.toBeChecked();
  await expect(ile("Martinique")).toBeChecked();
});

test("supprimer son compte efface tout : on ne peut plus s'y connecter", async ({ page, context }, testInfo) => {
  const email = nouvelEmail(testInfo);
  await inscrire(page, email);

  await champ(page, "Mot de passe actuel").fill("pas le bon mot de passe");
  await envoyer(page, "Supprimer définitivement mon compte");
  await expect(alerte(page)).toHaveText("Mot de passe incorrect.");
  await expect(texteVisible(page, email)).toBeVisible();

  await champ(page, "Mot de passe actuel").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page).toHaveURL("/compte/supprime");
  await expect(page.getByRole("status")).toContainText("toutes ses données ont été effacés");
  expect((await context.cookies()).filter((c) => c.name.startsWith("siklon."))).toEqual([]);
  // Le service d'envoi (ici le dossier local, Brevo en production) a effacé ses emails.
  expect(await emailsRecus(email)).toEqual([]);

  await page.goto("/compte/connexion");
  await champ(page, "Adresse email").fill(email);
  await champ(page, "Mot de passe").fill(MOT_DE_PASSE);
  await envoyer(page, "Se connecter");
  await expect(alerte(page)).toHaveText("Email ou mot de passe incorrect.");
});

// Le serveur écrit l'email juste après sa réponse (after) : on attend qu'il apparaisse.
async function suivreLien(page: Page, email: string, sujet: string) {
  let lien: string | null = null;
  await expect.poll(async () => (lien = await lienRecu(email, sujet))).not.toBeNull();
  await page.goto(lien ?? "");
}

test("confirmer son adresse avec le lien reçu par email", async ({ page }, testInfo) => {
  const email = nouvelEmail(testInfo);
  await inscrire(page, email);
  await expect(texteVisible(page, "Non confirmée")).toBeVisible();

  await suivreLien(page, email, "Confirmez votre adresse email");
  await expect(page).toHaveURL(/\/compte\/confirmer\?jeton=/);
  await page.getByRole("button", { name: "Confirmer mon adresse" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre adresse est confirmée." })).toBeVisible();

  await page.getByRole("link", { name: "Aller à mon compte" }).click();
  await expect(texteVisible(page, "Confirmée")).toBeVisible();
  await expect(page.getByRole("button", { name: "Renvoyer le lien de confirmation" })).toHaveCount(0);
});

test("renvoyer le lien de confirmation depuis la page Compte", async ({ page }, testInfo) => {
  const email = nouvelEmail(testInfo);
  await inscrire(page, email);
  await expect.poll(async () => (await emailsRecus(email)).length).toBe(1);

  await page.getByRole("button", { name: "Renvoyer le lien de confirmation" }).click();
  await expect(page.getByRole("status").filter({ hasText: `Un nouveau lien vient d'être envoyé à ${email}.` })).toBeVisible();
  await expect.poll(async () => (await emailsRecus(email)).length).toBe(2);
});

test("mot de passe oublié : choisir un nouveau mot de passe avec le lien reçu, puis se connecter", async ({
  page,
}, testInfo) => {
  const email = nouvelEmail(testInfo);
  const nouveau = "un tout nouveau mot de passe";
  await inscrire(page, email);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();

  await page.goto("/compte/connexion");
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  // Attendre la nouvelle page : sinon l'email irait dans le champ de la page de connexion, encore affichée.
  await expect(page.getByRole("heading", { level: 1, name: "Mot de passe oublié" })).toBeVisible();
  await champ(page, "Adresse email").fill(email);
  await page.getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Si un compte existe avec cette adresse" })).toBeVisible();

  await suivreLien(page, email, "Réinitialisez votre mot de passe");
  await champ(page, "Nouveau mot de passe").fill(nouveau);
  await page.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre mot de passe est changé." })).toBeVisible();

  await page.getByRole("link", { name: "Se connecter" }).filter({ visible: true }).click();
  await champ(page, "Adresse email").fill(email);
  await champ(page, "Mot de passe").fill(nouveau);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/compte");
  await expect(texteVisible(page, email)).toBeVisible();
});

test("un lien de réinitialisation ne sert qu'une fois", async ({ page }, testInfo) => {
  const email = nouvelEmail(testInfo);
  await inscrire(page, email);
  await expect(texteVisible(page, email)).toBeVisible();
  await page.goto("/compte/mot-de-passe-oublie");
  await champ(page, "Adresse email").fill(email);
  await page.getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Si un compte existe" })).toBeVisible();

  await suivreLien(page, email, "Réinitialisez votre mot de passe");
  const lien = page.url();
  await champ(page, "Nouveau mot de passe").fill("un tout nouveau mot de passe");
  await page.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre mot de passe est changé." })).toBeVisible();

  await page.goto(lien);
  await champ(page, "Nouveau mot de passe").fill("encore un autre mot de passe");
  await page.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(alerte(page)).toHaveText("Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau.");
});

// Connexion avec Google : le client est factice (playwright.config.ts) et la page de Google est
// interceptée, sans appel réseau. Le retour depuis Google est couvert par src/lib/auth/google.test.ts.
async function departVersGoogle(page: Page, bouton: string) {
  let depart: URL | undefined;
  await page.route("https://accounts.google.com/**", async (route) => {
    depart = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<title>Google (factice)</title><h1>Google</h1>" });
  });
  await page.getByRole("button", { name: bouton }).filter({ visible: true }).click();
  await expect(page).toHaveTitle("Google (factice)");
  return depart as URL;
}

test("se connecter avec Google : le bouton mène à Google avec le client du site et l'adresse de retour", async ({ page, baseURL }) => {
  await page.goto("/compte/connexion");
  await expect(page.getByRole("heading", { level: 1, name: "Se connecter" })).toBeVisible();
  const depart = await departVersGoogle(page, "Continuer avec Google");
  expect(depart.searchParams.get("client_id")).toBe("client-e2e.apps.googleusercontent.com");
  expect(depart.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/google`);
});

test("s'inscrire avec Google sans remplir l'email ni le mot de passe", async ({ page }) => {
  await page.goto("/compte/inscription");
  await expect(page.getByRole("heading", { level: 1, name: "Créer un compte" })).toBeVisible();
  await page.getByRole("radio", { name: "English" }).check();
  const depart = await departVersGoogle(page, "S'inscrire avec Google");
  expect(depart.origin).toBe("https://accounts.google.com");
});

test("l'adresse de retour de Google existe et renvoie une erreur sur la page de connexion", async ({ page }) => {
  // Google y renvoie le navigateur après la connexion (« URI de redirection autorisé » du client OAuth).
  const reponse = await page.request.get("/api/auth/callback/google?code=code-invente&state=etat-invente", {
    maxRedirects: 0,
  });
  expect(reponse.status()).toBe(302);
  const retour = new URL(reponse.headers().location ?? "", "http://localhost");
  expect(retour.pathname).toBe("/compte/connexion");
  expect(retour.searchParams.get("error")).toBeTruthy();
});

test("au retour de Google, un compte à l'adresse non confirmée est expliqué", async ({ page }) => {
  await page.goto("/compte/connexion?error=account_not_linked");
  await expect(page.getByRole("alert").filter({ hasText: "n'est pas confirmée" })).toBeVisible();
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

  test("le bouton Google mène à Google : la CSP autorise cette redirection du formulaire", async ({ page }) => {
    await page.goto("/compte/connexion");
    const depart = await departVersGoogle(page, "Continuer avec Google");
    expect(depart.origin).toBe("https://accounts.google.com");
  });
});

for (const chemin of [
  "/compte",
  "/compte/connexion",
  "/compte/connexion?error=account_not_linked",
  "/compte/inscription",
  "/compte/supprime",
  "/compte/mot-de-passe-oublie",
  "/compte/confirmer?jeton=exemple",
  "/compte/nouveau-mot-de-passe?jeton=exemple",
]) {
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

// Alertes sur l'appareil (US-07). Chromium sans service push en test : PushManager est simulé, mais le
// service worker public/sw.js est réellement enregistré, et l'abonnement passe par la vraie server action.
// Chromium headless répond toujours « denied » à Notification.permission : la demande de permission est
// simulée aussi, comme si l'utilisateur répondait « Autoriser ».
async function simulerServicePush(page: Page) {
  await page.addInitScript(() => {
    let permission: NotificationPermission = "default";
    Object.defineProperty(Notification, "permission", { get: () => permission });
    Notification.requestPermission = async () => (permission = "granted");
    const json = {
      endpoint: "https://fcm.googleapis.com/fcm/send/e2e-appareil",
      expirationTime: null,
      keys: {
        p256dh: "BKmIwmr-0tc5C7HbLJLg0wx1Tdcsgks-x8Sl5lVLxIjv3fD_nLWj8x56ijH9lDAE_8SCdK-OBQfWupvp1Q6AAX0",
        auth: "u7E1AkwHcPfe0opFBPQVxg",
      },
    };
    // L'abonnement survit au rechargement de la page, comme dans un vrai navigateur.
    const abonnement = {
      endpoint: json.endpoint,
      toJSON: () => json,
      unsubscribe: async () => {
        sessionStorage.removeItem("abonnement-e2e");
        return true;
      },
    };
    PushManager.prototype.getSubscription = async () =>
      (sessionStorage.getItem("abonnement-e2e") ? abonnement : null) as unknown as PushSubscription;
    PushManager.prototype.subscribe = async () => {
      sessionStorage.setItem("abonnement-e2e", "1");
      return abonnement as unknown as PushSubscription;
    };
  });
}

async function compteConfirme(page: Page, email: string) {
  await inscrire(page, email);
  await suivreLien(page, email, "Confirmez votre adresse email");
  await page.getByRole("button", { name: "Confirmer mon adresse" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre adresse est confirmée." })).toBeVisible();
  await page.goto("/compte");
}

const sectionAppareil = (page: Page) =>
  page.getByRole("region", { name: "Alertes sur cet appareil" }).filter({ visible: true });

test("recevoir les alertes sur cet appareil, puis se désabonner", async ({ page }, testInfo) => {
  await simulerServicePush(page);
  await compteConfirme(page, nouvelEmail(testInfo));
  const section = sectionAppareil(page);

  await section.getByRole("button", { name: "Recevoir les alertes sur cet appareil" }).click();
  await expect(section.getByText("Cet appareil reçoit les alertes.")).toBeVisible();
  await expect(section.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))?.active?.scriptURL)).toMatch(
    /\/sw\.js$/,
  );

  await page.reload();
  await section.getByRole("button", { name: "Se désabonner" }).click();
  await expect(section.getByRole("status")).toHaveText("Cet appareil ne recevra plus les alertes.");
  await expect(section.getByRole("button", { name: "Recevoir les alertes sur cet appareil" })).toBeVisible();
});

test("notifications bloquées : la page explique comment les autoriser", async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "denied" }));
  await compteConfirme(page, nouvelEmail(testInfo));

  await expect(sectionAppareil(page).getByText(/bloquées dans ce navigateur/)).toBeVisible();
  await expect(sectionAppareil(page).getByRole("button")).toHaveCount(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`les alertes sur l'appareil respectent WCAG AA en thème ${colorScheme === "light" ? "clair" : "sombre"}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    await simulerServicePush(page);
    await compteConfirme(page, nouvelEmail(testInfo));
    const section = sectionAppareil(page);
    const bouton = section.getByRole("button", { name: "Recevoir les alertes sur cet appareil" });
    // Zone tactile d'au moins 44 px (DESIGN.md).
    expect((await bouton.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    for (const etat of ["non abonné", "abonné"]) {
      if (etat === "abonné") {
        await bouton.click();
        await expect(section.getByRole("button", { name: "Se désabonner" })).toBeVisible();
      }
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations, etat).toEqual([]);
    }
  });
}
