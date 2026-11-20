import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page, { metadata } from "./page";

describe("Page de confidentialité", () => {
  it("porte un titre explicite", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeInTheDocument();
    expect(metadata.title).toBe("Confidentialité · Siklon");
  });

  it("dit que le compte est facultatif et liste les seules données qu'il contient", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Ce que Siklon collecte" });
    expect(section).toHaveTextContent(/sans compte/i);
    expect(section).toHaveTextContent(/adresse email/i);
    expect(section).toHaveTextContent(/langue/i);
    expect(section).toHaveTextContent(/îles que vous suivez/i);
    expect(section).toHaveTextContent(/jamais en clair/i);
    expect(section).toHaveTextContent(/aucune mesure d'audience/i);
  });

  it("annonce le cookie de session, déposé seulement à la connexion, et celui, temporaire, de Google", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Cookies" });
    expect(section).toHaveTextContent(/si vous vous connectez/i);
    expect(section).toHaveTextContent(/7 jours/);
    expect(section).toHaveTextContent(/avec Google/);
    expect(section).toHaveTextContent(/quelques minutes/);
  });

  it("dit ce que Google reçoit et ce que Siklon garde d'une connexion avec Google", () => {
    render(<Page />);
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

  it("dit où sont gardées les données du compte, et combien de temps", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Où et combien de temps" });
    expect(section).toHaveTextContent("Supabase");
    expect(section).toHaveTextContent(/Paris/);
    expect(section).toHaveTextContent(/10 minutes/);
    expect(within(section).getByRole("link", { name: /Supabase/ })).toHaveAttribute(
      "href",
      "https://supabase.com/privacy",
    );
  });

  it("nomme le service qui envoie les emails du compte et ce qu'il reçoit", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Où et combien de temps" });
    expect(section).toHaveTextContent(/Brevo/);
    expect(section).toHaveTextContent(/confirmation de l'adresse/);
    expect(section).toHaveTextContent(/réinitialisation du mot de passe/);
    expect(within(section).getByRole("link", { name: /Brevo/ })).toHaveAttribute(
      "href",
      "https://www.brevo.com/fr/legal/privacypolicy/",
    );
  });

  it("nomme les tiers qui reçoivent l'adresse IP et ce qu'ils voient", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Qui voit votre adresse IP" });
    expect(section).toHaveTextContent("Vercel");
    expect(section).toHaveTextContent("OpenFreeMap");
    expect(section).toHaveTextContent(/zone de la carte/i);
    expect(within(section).getByRole("link", { name: /Vercel/ })).toHaveAttribute(
      "href",
      "https://vercel.com/legal/privacy-policy",
    );
  });

  it("explique comment supprimer son compte et toutes ses données", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Supprimer vos données" });
    expect(section).toHaveTextContent(/immédiatement/i);
    expect(section).toHaveTextContent(/toutes ses données/i);
    expect(section).toHaveTextContent(/îles suivies/i);
    expect(section).toHaveTextContent(/y compris chez Brevo/);
    expect(section).toHaveTextContent(/reconnecter avec Google/);
    expect(within(section).getByRole("link", { name: "page Compte" })).toHaveAttribute("href", "/compte");
  });

  it("précise que les sources de données ne reçoivent rien du visiteur", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Sources de données" });
    for (const source of ["NHC", "NOAA", "Météo-France"]) expect(section).toHaveTextContent(source);
    expect(section).toHaveTextContent(/serveur de Siklon/);
  });

  it("rappelle de suivre les consignes officielles, comme chaque écran (DESIGN.md)", () => {
    render(<Page />);
    expect(
      screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales."),
    ).toBeInTheDocument();
  });

  it("indique sa date de mise à jour", () => {
    render(<Page />);
    expect(screen.getByText(/Mise à jour : 20 novembre 2026/)).toBeInTheDocument();
  });
});
