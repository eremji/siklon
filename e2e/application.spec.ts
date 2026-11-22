import { expect, test } from "@playwright/test";

// Application installable (US-07b, #101) : sans manifeste, iOS refuse le web push.

test("le manifeste annonce une application standalone, et toutes ses icônes existent", async ({ request }) => {
  const reponse = await request.get("/manifest.webmanifest");
  expect(reponse.status()).toBe(200);
  const manifeste = await reponse.json();
  expect(manifeste).toMatchObject({ name: "Siklon", display: "standalone", start_url: "/", scope: "/" });

  for (const { src, sizes } of manifeste.icons as { src: string; sizes: string }[]) {
    const icone = await request.get(src);
    expect(icone.status(), src).toBe(200);
    expect(icone.headers()["content-type"], src).toBe("image/png");
    expect((await icone.body()).length, `${src} (${sizes})`).toBeGreaterThan(0);
  }
});

test("chaque page annonce le manifeste, l'icône Apple et la couleur du thème, sans être bloquée par la CSP", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(appleIcon).toMatch(/^\/apple-icon/);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Siklon");
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);

  const icone = await page.request.get(appleIcon ?? "");
  expect(icone.headers()["content-type"]).toBe("image/png");
  // Le navigateur charge le manifeste lui-même : la CSP (manifest-src via default-src) doit l'autoriser.
  expect(await page.evaluate(async () => (await fetch("/manifest.webmanifest")).ok)).toBe(true);
  expect(violations).toEqual([]);
});

test("le service worker couvre toute l'application installée", async ({ request }) => {
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toMatch(/javascript/);
  const manifeste = await (await request.get("/manifest.webmanifest")).json();
  // Le service worker est enregistré avec la portée « / » (AbonnementAppareil) : la même que l'application.
  expect(manifeste.scope).toBe("/");
});
