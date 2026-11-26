import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));

import Page, { generateMetadata } from "./page";

describe("Page de confidentialité", () => {
  it("porte un titre explicite", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeInTheDocument();
    expect((await generateMetadata()).title).toBe("Confidentialité · Siklon");
  });

  it("dit que le compte est facultatif et liste les seules données qu'il contient", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Ce que Siklon collecte" });
    expect(section).toHaveTextContent(/sans compte/i);
    expect(section).toHaveTextContent(/adresse email/i);
    expect(section).toHaveTextContent(/langue/i);
    expect(section).toHaveTextContent(/îles que vous suivez/i);
    expect(section).toHaveTextContent(/jamais en clair/i);
    expect(section).toHaveTextContent(/aucune mesure d'audience/i);
    expect(section).toHaveTextContent("Cette langue change si vous changez de langue en bas de page en étant connecté.");
  });

  it("explique ce que garde un appareil abonné aux alertes, et qui transmet ces alertes", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Alertes sur un appareil" });
    expect(section).toHaveTextContent(/seulement si vous le demandez/i);
    expect(section).toHaveTextContent(/service de notification de votre navigateur/i);
    expect(section).toHaveTextContent(/chiffrées/i);
    expect(section).toHaveTextContent(/se désabonner/i);
    expect(screen.getByRole("region", { name: "Supprimer vos données" })).toHaveTextContent(/appareils abonnés aux alertes/);
  });

  it("explique les alertes par e-mail : avec votre accord seulement, envoyées par Brevo, accord retirable", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Alertes par e-mail" });
    expect(section).toHaveTextContent(/seulement si vous cochez « Recevoir les alertes par e-mail »/);
    expect(section).toHaveTextContent(/Brevo/);
    expect(section).toHaveTextContent(/décochez/);
  });

  it("annonce le cookie de session, déposé seulement à la connexion, et celui, temporaire, de Google", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Cookies" });
    expect(section).toHaveTextContent(/si vous vous connectez/i);
    expect(section).toHaveTextContent(/7 jours/);
    expect(section).toHaveTextContent(/avec Google/);
    expect(section).toHaveTextContent(/quelques minutes/);
  });

  it("dit ce que Google reçoit et ce que Siklon garde d'une connexion avec Google", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Connexion avec Google" });
    expect(section).toHaveTextContent(/adresse email/);
    expect(section).toHaveTextContent(/ni votre nom, ni votre photo/);
    expect(section).toHaveTextContent(/n'accède à rien d'autre/);
    expect(section).toHaveTextContent(/Google sait que vous utilisez Siklon/);
    expect(within(section).getByRole("link", { name: /Google/ })).toHaveAttribute(
      "href",
      "https://policies.google.com/privacy?hl=fr",
    );
  });

  it("dit où sont gardées les données du compte, et combien de temps", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Où et combien de temps" });
    expect(section).toHaveTextContent("Supabase");
    expect(section).toHaveTextContent(/Paris/);
    expect(section).toHaveTextContent(/10 minutes/);
    expect(within(section).getByRole("link", { name: /Supabase/ })).toHaveAttribute(
      "href",
      "https://supabase.com/privacy",
    );
  });

  it("nomme le service qui envoie les emails du compte et ce qu'il reçoit", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Où et combien de temps" });
    expect(section).toHaveTextContent(/Brevo/);
    expect(section).toHaveTextContent(/confirmation de l'adresse/);
    expect(section).toHaveTextContent(/réinitialisation du mot de passe/);
    expect(within(section).getByRole("link", { name: /Brevo/ })).toHaveAttribute(
      "href",
      "https://www.brevo.com/fr/legal/privacypolicy/",
    );
  });

  it("nomme les tiers qui reçoivent l'adresse IP et ce qu'ils voient", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Qui voit votre adresse IP" });
    expect(section).toHaveTextContent("Vercel");
    expect(section).toHaveTextContent("OpenFreeMap");
    expect(section).toHaveTextContent(/zone de la carte/i);
    expect(within(section).getByRole("link", { name: /Vercel/ })).toHaveAttribute(
      "href",
      "https://vercel.com/legal/privacy-policy",
    );
  });

  it("explique comment supprimer son compte et toutes ses données", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Supprimer vos données" });
    expect(section).toHaveTextContent(/immédiatement/i);
    expect(section).toHaveTextContent(/toutes ses données/i);
    expect(section).toHaveTextContent(/îles suivies/i);
    expect(section).toHaveTextContent(/y compris chez Brevo/);
    expect(section).toHaveTextContent(/reconnecter avec Google/);
    expect(within(section).getByRole("link", { name: "page Compte" })).toHaveAttribute("href", "/fr/compte");
  });

  it("précise que les sources de données ne reçoivent rien du visiteur", async () => {
    render(await Page());
    const section = screen.getByRole("region", { name: "Sources de données" });
    for (const source of ["NHC", "NOAA", "Météo-France"]) expect(section).toHaveTextContent(source);
    expect(section).toHaveTextContent(/serveur de Siklon/);
  });

  it("rappelle de suivre les consignes officielles, comme chaque écran (DESIGN.md)", async () => {
    render(await Page());
    expect(
      screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales."),
    ).toBeInTheDocument();
  });

  it("indique sa date de mise à jour", async () => {
    render(await Page());
    expect(screen.getByText(/Mise à jour : 26 novembre 2026/)).toBeInTheDocument();
  });
});

describe("Page de confidentialité en anglais (US-10)", () => {
  afterEach(() => {
    racine.langue = "fr";
  });

  const rendre = async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Page()}</FournisseurLangue>);
  };

  it("porte le titre et la description de l'onglet en anglais", async () => {
    racine.langue = "en";
    expect(await generateMetadata()).toEqual({
      title: "Privacy · Siklon",
      description: "The data Siklon collects, where it is kept, and the third parties that see your IP address.",
    });
  });

  it("donne les dix sections en anglais", async () => {
    await rendre();
    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toBeInTheDocument();
    for (const titre of [
      "What Siklon collects",
      "Alerts on a device",
      "Email alerts",
      "Signing in with Google",
      "Cookies",
      "Where and for how long",
      "Deleting your data",
      "Who sees your IP address",
      "Data sources",
    ]) {
      expect(screen.getByRole("region", { name: titre })).toBeInTheDocument();
    }
  });

  it("dit en anglais ce que contient le compte, et que sa langue suit la bascule", async () => {
    await rendre();
    const section = screen.getByRole("region", { name: "What Siklon collects" });
    expect(section).toHaveTextContent("Without an account, nothing: all information about cyclones and islands is available");
    expect(section).toHaveTextContent("only its hash (scrypt) is kept");
    expect(section).toHaveTextContent("This language changes if you switch language at the bottom of the page while signed in.");
  });

  it("garde les nombres calculés et les liens externes en version anglaise", async () => {
    await rendre();
    expect(screen.getByRole("region", { name: "Cookies" })).toHaveTextContent("for up to 7 days");
    const conservation = screen.getByRole("region", { name: "Where and for how long" });
    expect(conservation).toHaveTextContent("this counter is erased after 10 minutes");
    expect(within(conservation).getByRole("link", { name: "Brevo" })).toHaveAttribute(
      "href",
      "https://www.brevo.com/legal/privacypolicy/",
    );
    expect(
      within(screen.getByRole("region", { name: "Signing in with Google" })).getByRole("link", { name: "Google's privacy policy" }),
    ).toHaveAttribute("href", "https://policies.google.com/privacy?hl=en");
    const suppression = screen.getByRole("region", { name: "Deleting your data" });
    expect(suppression).toHaveTextContent("within the previous 10 minutes");
    expect(within(suppression).getByRole("link", { name: "Account page" })).toHaveAttribute("href", "/en/compte");
  });

  it("nomme Vercel et OpenFreeMap en anglais, et indique sa date de mise à jour", async () => {
    await rendre();
    const section = screen.getByRole("region", { name: "Who sees your IP address" });
    expect(section).toHaveTextContent("the area of the map you are looking at");
    expect(within(section).getByRole("link", { name: "Vercel's privacy policy" })).toHaveAttribute(
      "href",
      "https://vercel.com/legal/privacy-policy",
    );
    expect(screen.getByText("Last updated: 26 November 2026.")).toBeInTheDocument();
  });
});

