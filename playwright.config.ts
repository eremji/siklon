import { defineConfig, devices } from "@playwright/test";
import { DOSSIER_EMAILS } from "./e2e/emails";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // Navigateur en français : les pages sans langue dans l'adresse mènent à /fr (US-10).
  use: { baseURL, trace: "on-first-retry", locale: "fr-FR" },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Les tests e2e lisent des fixtures locales, jamais les flux NHC et Météo-France réels.
      NHC_FIXTURES: "1",
      VIGILANCE_FIXTURES: "1",
      // Les comptes de test vont dans une base locale jetable, jamais dans celle du site : ces valeurs
      // l'emportent sur .env.local. Le secret n'en est pas un : il ne signe que des sessions de test.
      DATABASE_URL_COMPTES: process.env.E2E_DATABASE_URL_COMPTES ?? "postgresql://localhost:5432/siklon_e2e",
      BETTER_AUTH_SECRET: process.env.E2E_BETTER_AUTH_SECRET ?? "secret-des-tests-e2e-uniquement-0123456789",
      BETTER_AUTH_URL: baseURL,
      // Un seul serveur reçoit les requêtes de tous les workers : 3 connexions par pool (taille de
      // production, faite pour le pooler Supabase) saturent avec beaucoup de workers. Base locale seulement.
      DATABASE_POOL_MAX: "10",
      // Les emails sont écrits dans un dossier local, jamais envoyés (ignoré sur Vercel).
      EMAILS_DOSSIER: DOSSIER_EMAILS,
      // Clé publique VAPID jetable (sa clé privée n'a pas été gardée) : le service push du navigateur
      // est simulé dans les tests, rien n'est envoyé.
      VAPID_PUBLIC_KEY: "BFh258fWvy9FPy97fAgVR2gE7m4aCtYzcwVg2H8P_EvwD0uL61vjnZj7l9bIA7GXPAJ8rcUVANbb9bb4_eVPnuY",
      // Client Google factice : le bouton s'affiche, et les tests interceptent la page de Google.
      GOOGLE_CLIENT_ID: "client-e2e.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "secret-client-e2e",
    },
  },
});
