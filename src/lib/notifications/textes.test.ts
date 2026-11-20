import { describe, expect, it } from "vitest";
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import { trouverIle } from "@/lib/iles";
import type { EvenementNiveau, EvenementRayon } from "./evenements";
import { contenuNotification } from "./textes";

const BASE = "https://siklon.example";
const guadeloupe = trouverIle("guadeloupe")!;
const martinique = trouverIle("martinique")!;
const portoRico = trouverIle("porto-rico")!;

const RAYON: EvenementRayon = {
  type: "entree-rayon",
  cle: "rayon:guadeloupe:al052026",
  ile: guadeloupe,
  systeme: { id: "al052026", nom: "Kyle", description: "Ouragan de catégorie 3" },
  passage: { heure: "2026-09-12T06:10:00.000Z", distanceKm: 183 },
  avis: { numero: "12", emisLe: "2026-09-10T15:00:00.000Z", url: "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml" },
};

function niveau(ile: EvenementNiveau["ile"], precedent: EvenementNiveau["precedent"], nouveau: EvenementNiveau["niveau"]) {
  return {
    type: "changement-niveau",
    cle: `niveau:${ile.slug}:${nouveau}:2026-09-10T16:00:00Z`,
    ile,
    precedent,
    niveau: nouveau,
    misAJour: "2026-09-10T16:00:00Z",
  } satisfies EvenementNiveau;
}

describe("entrée dans le rayon de menace", () => {
  const contenu = contenuNotification(RAYON, BASE);

  it("nomme l'île et le système", () => {
    expect(contenu.titre).toBe("Guadeloupe : Ouragan de catégorie 3 Kyle menace l'île");
  });

  it("explique le rayon avec la valeur de RADIUS_WATCH_KM", () => {
    expect(contenu.corps).toContain(`Ce système est prévu à moins de ${RADIUS_WATCH_KM} km de votre île.`);
    expect(contenu.corps).toContain(
      "Pour un cyclone de taille moyenne, cette alerte arrive avant que les vents de tempête n'atteignent l'île : c'est le moment de se préparer.",
    );
  });

  it("donne le passage estimé à l'heure de l'île, avec l'avis NHC utilisé", () => {
    expect(contenu.corps).toContain("Plus proche passage estimé : 12 septembre vers 2 h, à environ 180 km.");
    expect(contenu.corps).toContain("Estimation d'après l'avis NHC n° 12 du 10 septembre à 11 h 00.");
  });

  it("renvoie vers la fiche du système et l'avis officiel", () => {
    expect(contenu.lien).toBe("https://siklon.example/systemes/al052026");
    expect(contenu.source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml" });
  });

  it("renvoie vers le site du NHC quand l'avis n'a pas d'adresse", () => {
    const { source } = contenuNotification({ ...RAYON, avis: { numero: "12", emisLe: RAYON.avis.emisLe } }, BASE);
    expect(source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/" });
  });
});

describe("changement de vigilance Météo-France", () => {
  it("donne le nouveau niveau, sa consigne et l'heure de mise à jour", () => {
    const contenu = contenuNotification(niveau(guadeloupe, "jaune", "orange"), BASE);

    expect(contenu.titre).toBe("Guadeloupe : Vigilance orange");
    expect(contenu.corps).toBe(
      "Préparez-vous. Météo-France passe de la vigilance jaune à la vigilance orange (mise à jour du 10 septembre à 12 h 00).",
    );
  });

  it("annonce la fin de la vigilance", () => {
    expect(contenuNotification(niveau(guadeloupe, "orange", "vert"), BASE).corps).toMatch(
      /^Pas de vigilance\. Météo-France passe de la vigilance orange à la vigilance verte/,
    );
  });

  it("renvoie vers la page d'alerte de l'île et la page Météo-France correspondante", () => {
    const contenu = contenuNotification(niveau(martinique, "vert", "jaune"), BASE);

    expect(contenu.lien).toBe("https://siklon.example/iles/martinique/alerte");
    expect(contenu.source).toEqual({ nom: "Météo-France", url: "https://meteofrance.mq/fr/vigilance" });
  });
});

describe("changement de veille ou d'avertissement NHC", () => {
  it("donne le type d'alerte, son terme d'origine et ce qu'il annonce", () => {
    const contenu = contenuNotification(niveau(portoRico, "TWA", "HWR"), BASE);

    expect(contenu.titre).toBe("Porto Rico : Avertissement d'ouragan (Hurricane Warning)");
    expect(contenu.corps).toBe(
      "Le NHC a émis pour l'île un avertissement d'ouragan (Hurricane Warning) : conditions attendues. Avis du 10 septembre à 12 h 00.",
    );
  });

  it("dit qu'une veille annonce des conditions possibles", () => {
    expect(contenuNotification(niveau(portoRico, "aucune", "TWA"), BASE).corps).toContain(
      "une veille de tempête tropicale (Tropical Storm Watch) : conditions possibles.",
    );
  });

  it("annonce la fin des veilles et avertissements", () => {
    const contenu = contenuNotification(niveau(portoRico, "HWR", "aucune"), BASE);

    expect(contenu.titre).toBe("Porto Rico : fin des veilles et avertissements");
    expect(contenu.corps).toBe("Le NHC n'a plus de veille ni d'avertissement en cours pour l'île (lu le 10 septembre à 12 h 00).");
  });

  it("renvoie vers la page d'alerte de l'île et le site du NHC", () => {
    const contenu = contenuNotification(niveau(portoRico, "aucune", "TWA"), BASE);

    expect(contenu.lien).toBe("https://siklon.example/iles/porto-rico/alerte");
    expect(contenu.source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/" });
  });
});
