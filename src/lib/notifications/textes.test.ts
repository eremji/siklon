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
  systeme: { id: "al052026", nom: "Kyle", classification: "HU", ventKt: 100 },
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
  const contenu = contenuNotification(RAYON, BASE, "fr");

  it("nomme l'île et le système", () => {
    expect(contenu.langue).toBe("fr");
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

  it("renvoie vers la fiche du système en français et l'avis officiel", () => {
    expect(contenu.lien).toBe("https://siklon.example/fr/systemes/al052026");
    expect(contenu.source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml" });
  });

  it("renvoie vers le site du NHC quand l'avis n'a pas d'adresse", () => {
    const { source } = contenuNotification({ ...RAYON, avis: { numero: "12", emisLe: RAYON.avis.emisLe } }, BASE, "fr");
    expect(source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/" });
  });
});

describe("changement de vigilance Météo-France", () => {
  it("donne le nouveau niveau, sa consigne et l'heure de mise à jour", () => {
    const contenu = contenuNotification(niveau(guadeloupe, "jaune", "orange"), BASE, "fr");

    expect(contenu.titre).toBe("Guadeloupe : Vigilance orange");
    expect(contenu.corps).toBe(
      "Préparez-vous. Météo-France passe de la vigilance jaune à la vigilance orange (mise à jour du 10 septembre à 12 h 00).",
    );
  });

  it("annonce la fin de la vigilance", () => {
    expect(contenuNotification(niveau(guadeloupe, "orange", "vert"), BASE, "fr").corps).toMatch(
      /^Pas de vigilance\. Météo-France passe de la vigilance orange à la vigilance verte/,
    );
  });

  it("renvoie vers la page d'alerte de l'île et la page Météo-France correspondante", () => {
    const contenu = contenuNotification(niveau(martinique, "vert", "jaune"), BASE, "fr");

    expect(contenu.lien).toBe("https://siklon.example/fr/iles/martinique/alerte");
    expect(contenu.source).toEqual({ nom: "Météo-France", url: "https://meteofrance.mq/fr/vigilance" });
  });
});

describe("changement de veille ou d'avertissement NHC", () => {
  it("donne le type d'alerte, son terme d'origine et ce qu'il annonce", () => {
    const contenu = contenuNotification(niveau(portoRico, "TWA", "HWR"), BASE, "fr");

    expect(contenu.titre).toBe("Porto Rico : Avertissement d'ouragan (Hurricane Warning)");
    expect(contenu.corps).toBe(
      "Le NHC a émis pour l'île un avertissement d'ouragan (Hurricane Warning) : conditions attendues. Avis du 10 septembre à 12 h 00.",
    );
  });

  it("dit qu'une veille annonce des conditions possibles", () => {
    expect(contenuNotification(niveau(portoRico, "aucune", "TWA"), BASE, "fr").corps).toContain(
      "une veille de tempête tropicale (Tropical Storm Watch) : conditions possibles.",
    );
  });

  it("annonce la fin des veilles et avertissements", () => {
    const contenu = contenuNotification(niveau(portoRico, "HWR", "aucune"), BASE, "fr");

    expect(contenu.titre).toBe("Porto Rico : fin des veilles et avertissements");
    expect(contenu.corps).toBe("Le NHC n'a plus de veille ni d'avertissement en cours pour l'île (lu le 10 septembre à 12 h 00).");
  });

  it("renvoie vers la page d'alerte de l'île et le site du NHC", () => {
    const contenu = contenuNotification(niveau(portoRico, "aucune", "TWA"), BASE, "fr");

    expect(contenu.lien).toBe("https://siklon.example/fr/iles/porto-rico/alerte");
    expect(contenu.source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/" });
  });
});

describe("en anglais (langue du compte)", () => {
  const dominique = trouverIle("dominique")!;

  it("rédige l'entrée dans le rayon avec le nom anglais de l'île et des formats anglais", () => {
    const contenu = contenuNotification({ ...RAYON, cle: "rayon:dominique:al052026", ile: dominique }, BASE, "en");

    expect(contenu.langue).toBe("en");
    expect(contenu.titre).toBe("Dominica: Category 3 hurricane Kyle threatens the island");
    expect(contenu.corps).toBe(
      [
        `This system is forecast to pass within ${RADIUS_WATCH_KM} km of your island.`,
        "For an average-sized cyclone, this alert comes before tropical-storm-force winds reach the island: now is the time to get prepared.",
        "Estimated closest approach: 12 September around 2 am, about 180 km away.",
        "Estimate based on NHC advisory 12 issued 10 September at 11:00 am.",
      ].join(" "),
    );
    expect(contenu.lien).toBe("https://siklon.example/en/systemes/al052026");
    expect(contenu.source).toEqual({ nom: "NHC", url: "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml" });
  });

  it("traduit la vigilance en gardant le terme d'origine de Météo-France", () => {
    const contenu = contenuNotification(niveau(guadeloupe, "jaune", "orange"), BASE, "en");

    expect(contenu.titre).toBe("Guadeloupe: Orange vigilance (Vigilance orange)");
    expect(contenu.corps).toBe(
      "Get prepared (Préparez-vous). Météo-France has moved from yellow vigilance to orange vigilance (updated 10 September at 12:00 pm).",
    );
    expect(contenu.lien).toBe("https://siklon.example/en/iles/guadeloupe/alerte");
    expect(contenu.source).toEqual({ nom: "Météo-France", url: "https://meteofrance.gp/fr/vigilance/guadeloupe" });
  });

  it("annonce la fin de la vigilance", () => {
    const contenu = contenuNotification(niveau(guadeloupe, "orange", "vert"), BASE, "en");

    expect(contenu.titre).toBe("Guadeloupe: Green vigilance (Vigilance verte)");
    expect(contenu.corps).toMatch(/^No vigilance \(Pas de vigilance\)\. Météo-France has moved from orange vigilance to green vigilance/);
  });

  it("donne le terme d'origine seul pour un avertissement ou une veille du NHC", () => {
    const avertissement = contenuNotification(niveau(portoRico, "TWA", "HWR"), BASE, "en");
    expect(avertissement.titre).toBe("Puerto Rico: Hurricane Warning");
    expect(avertissement.corps).toBe(
      "The NHC has issued a Hurricane Warning for the island: conditions expected. Advisory issued 10 September at 12:00 pm.",
    );
    expect(avertissement.lien).toBe("https://siklon.example/en/iles/porto-rico/alerte");

    expect(contenuNotification(niveau(portoRico, "aucune", "TWA"), BASE, "en").corps).toBe(
      "The NHC has issued a Tropical Storm Watch for the island: conditions possible. Advisory issued 10 September at 12:00 pm.",
    );
  });

  it("annonce la fin des veilles et avertissements", () => {
    const contenu = contenuNotification(niveau(portoRico, "HWR", "aucune"), BASE, "en");

    expect(contenu.titre).toBe("Puerto Rico: watches and warnings discontinued");
    expect(contenu.corps).toBe(
      "The NHC no longer has any watch or warning in effect for the island (read 10 September at 12:00 pm).",
    );
  });
});
