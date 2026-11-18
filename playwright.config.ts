import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "on-first-retry" },
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
    },
  },
});
