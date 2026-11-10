import { type BrowserContext, type Page, expect, test } from "@playwright/test";
import { TILEJSON, tuileVectorielle } from "./fixtures/tuile-vectorielle";

// #66 : les autres tests refusent les tuiles, donc le worker MapLibre n'y décode jamais rien.
// Ici, TileJSON et tuiles viennent de fixtures locales (bandes d'eau et de terre), sans réseau.
test.beforeEach(async ({ context }) => {
  // Au niveau du contexte : les tuiles sont demandées par le worker, pas par la page.
  await context.route(/^https:\/\/tiles\.openfreemap\.org\//, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/planet") return route.fulfill({ json: TILEJSON });
    if (url.pathname.endsWith(".pbf")) {
      return route.fulfill({ body: tuileVectorielle(), contentType: "application/x-protobuf" });
    }
    return route.abort();
  });
});

async function fixtureNhc(context: BrowserContext, baseURL: string | undefined, nom: string) {
  await context.addCookies([{ name: "siklon-fixture-nhc", value: nom, url: baseURL ?? "http://localhost:3000" }]);
}

// Part des pixels d'une capture proches de chaque couleur, calculée dans une page vierge
// (la CSP du site refuserait l'image en data:).
async function partsDeCouleurs(page: Page, capture: Buffer, couleurs: string[]): Promise<number[]> {
  const analyse = await page.context().newPage();
  try {
    return await analyse.evaluate(
      async ({ image, couleurs }) => {
        const toile = document.createElement("canvas");
        const contexte = toile.getContext("2d", { willReadFrequently: true })!;
        const versRvb = (couleur: string) => {
          contexte.fillStyle = couleur;
          contexte.fillRect(0, 0, 1, 1);
          return [...contexte.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        const cibles = couleurs.map(versRvb);
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${image}`)).blob());
        toile.width = bitmap.width;
        toile.height = bitmap.height;
        contexte.drawImage(bitmap, 0, 0);
        const { data } = contexte.getImageData(0, 0, toile.width, toile.height);
        const comptes = cibles.map(() => 0);
        for (let i = 0; i < data.length; i += 4) {
          cibles.forEach(([r, v, b], n) => {
            if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - v) + Math.abs(data[i + 2] - b) <= 12) comptes[n]++;
          });
        }
        return comptes.map((compte) => compte / (data.length / 4));
      },
      { image: capture.toString("base64"), couleurs },
    );
  } finally {
    await analyse.close();
  }
}

test("le fond de carte dessine la mer à partir des tuiles décodées par le worker MapLibre", async ({
  page,
  context,
  baseURL,
}) => {
  const erreursWorker: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /worker/i.test(message.text())) erreursWorker.push(message.text());
  });
  page.on("pageerror", (erreur) => {
    if (/worker/i.test(erreur.message)) erreursWorker.push(erreur.message);
  });
  let tuilesServies = 0;
  context.on("requestfinished", (requete) => {
    if (requete.url().endsWith(".pbf")) tuilesServies++;
  });
  // Aucun système : ni pastille ni cône ne recouvrent le fond de carte.
  await fixtureNhc(context, baseURL, "vide");
  await page.goto("/");

  const carte = page.getByRole("region", { name: "Carte des systèmes actifs" }).locator(".maplibregl-map");
  await expect(carte).toHaveAttribute("aria-busy", "false");
  const [mer, terre] = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ["--map-sea", "--map-land"].map((jeton) => style.getPropertyValue(jeton).trim());
  });

  // La mer vient des tuiles (bandes d'eau), la terre du fond dessiné par MapLibre.
  // Sans worker, la carte reste unie : toute couleur de terre, ou toute couleur du conteneur.
  await expect
    .poll(
      async () => Math.min(...(await partsDeCouleurs(page, await carte.locator("canvas").screenshot(), [mer, terre]))),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0.2);
  expect(tuilesServies).toBeGreaterThan(0);
  expect(erreursWorker).toEqual([]);
});
