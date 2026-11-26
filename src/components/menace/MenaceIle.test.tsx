import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import { trouverIle } from "@/lib/iles";
import points from "@/lib/nhc/__fixtures__/prevision-at1-points.json";
import type { EtatFlux } from "@/lib/nhc/client";
import { lirePositionsPrevues } from "@/lib/nhc/positions";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { MenaceIle } from "./MenaceIle";

const luLe = "2026-09-10T16:00:00.000Z";
const guadeloupe = trouverIle("guadeloupe")!;
const dominique = trouverIle("dominique")!;
const martinique = trouverIle("martinique")!;
const positionsKyle = { al112026: lirePositionsPrevues(points, "AT1")! };

function systeme(partiel: Partial<SystemeActif> = {}): SystemeActif {
  return {
    id: "al112026",
    emplacement: "AT1",
    nom: "Kyle",
    classification: "HU",
    ventKt: 120,
    pressionHpa: 948,
    latitude: 16.8,
    longitude: -58.2,
    avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" },
    ...partiel,
  };
}

const leah = systeme({ id: "al122026", emplacement: "AT2", nom: "Leah", classification: "TS", ventKt: 45 });

function ok(systemes: SystemeActif[], rejetes = 0): EtatFlux {
  return { etat: "ok", systemes, rejetes, luLe };
}

describe("MenaceIle", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-09-10T19:00:00.000Z") }));
  afterEach(() => vi.useRealTimers());

  it("affiche, pour un système qui menace l'île, le délai, l'heure et la distance du plus proche passage", () => {
    render(<MenaceIle langue="fr" ile={guadeloupe} flux={ok([systeme()])} positions={positionsKyle} />);

    const menaces = within(screen.getByRole("list", { name: "Systèmes qui menacent Guadeloupe" })).getAllByRole(
      "listitem",
    );
    expect(menaces).toHaveLength(1);
    expect(menaces[0]).toHaveTextContent("Kyle");
    expect(menaces[0]).toHaveTextContent("Ouragan de catégorie 4");
    expect(menaces[0]).toHaveTextContent("Dans environ 12 h");
    expect(menaces[0]).toHaveTextContent(
      "Plus proche passage estimé : 11 septembre vers 3 h, à environ 180 km de Pointe-à-Pitre.",
    );
  });

  it("signale un avis NHC de plus de 6 h, avant le délai", () => {
    // Avis n° 14 émis à 15 h UTC ; il est 22 h UTC, soit 7 h plus tard.
    vi.setSystemTime(new Date("2026-09-10T22:00:00.000Z"));
    render(<MenaceIle langue="fr" ile={guadeloupe} flux={ok([systeme()])} positions={positionsKyle} />);

    const menace = within(screen.getByRole("list", { name: "Systèmes qui menacent Guadeloupe" })).getByRole(
      "listitem",
    );
    const avertissement = within(menace).getByText(
      "Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h.",
    );
    const delai = within(menace).getByText("Dans environ 9 h");
    expect(avertissement.compareDocumentPosition(delai) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("ne signale rien quand l'avis NHC a moins de 6 h", () => {
    render(<MenaceIle langue="fr" ile={guadeloupe} flux={ok([systeme()])} positions={positionsKyle} />);

    expect(screen.queryByText(/Données possiblement obsolètes/)).not.toBeInTheDocument();
  });

  it("présente le calcul comme une estimation, avec le numéro et l'heure de l'avis NHC utilisé", () => {
    render(<MenaceIle langue="fr" ile={guadeloupe} flux={ok([systeme()])} positions={positionsKyle} />);

    expect(
      screen.getByText(
        "Estimation Siklon calculée à partir des positions prévues de l'avis NHC n° 14 du 10 septembre à 11 h 00 (heure locale).",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "nhc.noaa.gov" })).toHaveAttribute("href", "https://www.nhc.noaa.gov/");
  });

  it("explique le rayon de menace, mesuré depuis le point de référence de l'île", () => {
    render(<MenaceIle langue="fr" ile={guadeloupe} flux={ok([systeme()])} positions={positionsKyle} />);

    expect(
      screen.getByText(
        `Systèmes dont la trajectoire prévue passe à moins de ${RADIUS_WATCH_KM} km de Pointe-à-Pitre dans les 5 prochains jours.`,
      ),
    ).toBeInTheDocument();
  });

  it("indique qu'aucun système ne menace l'île quand aucun système n'est actif", () => {
    render(<MenaceIle langue="fr" ile={martinique} flux={ok([])} positions={{}} />);

    expect(screen.getByText("Aucun système ne menace Martinique pour le moment.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("indique qu'aucun système ne menace l'île quand les trajectoires prévues restent hors du rayon", () => {
    render(<MenaceIle langue="fr" ile={martinique} flux={ok([systeme()])} positions={positionsKyle} />);

    expect(screen.getByText("Aucun système ne menace Martinique pour le moment.")).toBeInTheDocument();
  });

  it("ne conclut pas à l'absence de menace quand des prévisions manquent, et nomme les systèmes concernés", () => {
    render(<MenaceIle langue="fr" ile={martinique} flux={ok([systeme(), leah])} positions={positionsKyle} />);

    expect(
      screen.getByText("Aucun système dont la prévision est disponible ne menace Martinique."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Prévision indisponible pour Leah : sa menace ne peut pas être évaluée.",
    );
    expect(screen.queryByText(/pour le moment/)).not.toBeInTheDocument();
  });

  it("présente les prévisions manquantes sur un fond neutre, pas celui des échéances proches (DESIGN.md)", () => {
    render(<MenaceIle langue="fr" ile={martinique} flux={ok([systeme(), leah])} positions={positionsKyle} />);

    const encadre = screen.getByRole("alert");
    expect(encadre).toHaveClass("bg-soft");
    expect(encadre).not.toHaveClass("bg-danger-soft");
  });

  it("signale les systèmes écartés du flux NHC", () => {
    render(<MenaceIle langue="fr" ile={martinique} flux={ok([], 2)} positions={{}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("2 systèmes n'ont pas pu être lus");
    expect(screen.queryByText(/pour le moment/)).not.toBeInTheDocument();
  });

  it("signale un flux NHC indisponible sans dire qu'aucun système ne menace l'île", () => {
    render(<MenaceIle langue="fr" ile={guadeloupe} flux={{ etat: "indisponible", luLe }} positions={{}} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Les données du NHC sont momentanément indisponibles : la menace ne peut pas être évaluée.",
    );
    expect(screen.queryByText(/Aucun système/)).not.toBeInTheDocument();
  });
});

describe("MenaceIle en anglais (US-10)", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-09-10T19:00:00.000Z") }));
  afterEach(() => vi.useRealTimers());

  const thirteen = systeme({ id: "al132026", emplacement: "AT3", nom: "Thirteen", classification: "TD", ventKt: 30 });

  function rendreEnAnglais(...[props]: Parameters<typeof MenaceIle>) {
    render(
      <FournisseurLangue langue="en">
        <MenaceIle {...props} />
      </FournisseurLangue>,
    );
  }

  it("présente la menace, le délai, le plus proche passage et l'avis NHC en anglais", () => {
    rendreEnAnglais({ langue: "en", ile: guadeloupe, flux: ok([systeme()]), positions: positionsKyle });

    expect(
      screen.getByText(
        `Systems whose forecast track passes within ${RADIUS_WATCH_KM} km of Pointe-à-Pitre in the next 5 days.`,
      ),
    ).toBeInTheDocument();
    const menace = within(screen.getByRole("list", { name: "Systems threatening Guadeloupe" })).getByRole("listitem");
    expect(menace).toHaveTextContent("Category 4 hurricane");
    expect(within(menace).getByText("In about 12 hours")).toBeInTheDocument();
    expect(menace).toHaveTextContent(
      "Closest estimated approach: 11 September around 3 am, about 180 km from Pointe-à-Pitre.",
    );
    expect(menace).toHaveTextContent(
      "Siklon estimate based on the forecast positions in NHC advisory 14 issued 10 September at 11:00 am (local time).",
    );
    expect(screen.getByText(/^Source: NHC forecast positions/)).toHaveTextContent(
      "Source: NHC forecast positions (nhc.noaa.gov). The time and distance are estimates, not official forecasts.",
    );
  });

  it("donne le nom anglais de l'île quand aucun système ne la menace", () => {
    rendreEnAnglais({ langue: "en", ile: dominique, flux: ok([]), positions: {} });

    expect(screen.getByText("No system is threatening Dominica at the moment.")).toBeInTheDocument();
  });

  it("nomme en anglais les systèmes sans prévision et les systèmes illisibles", () => {
    rendreEnAnglais({
      langue: "en",
      ile: martinique,
      flux: ok([systeme(), leah, thirteen], 3),
      positions: positionsKyle,
    });

    const alerte = screen.getByRole("alert");
    expect(alerte).toHaveTextContent("Forecasts unavailable for Leah and Thirteen: their threat cannot be assessed.");
    expect(alerte).toHaveTextContent("3 systems could not be read: their threat cannot be assessed.");
    expect(alerte).toHaveTextContent("See nhc.noaa.gov.");
    expect(screen.getByText("No system with an available forecast is threatening Martinique.")).toBeInTheDocument();
  });

  it("accorde au singulier un seul système sans prévision ou illisible", () => {
    rendreEnAnglais({ langue: "en", ile: dominique, flux: ok([leah], 1), positions: {} });

    const alerte = screen.getByRole("alert");
    expect(alerte).toHaveTextContent("Forecast unavailable for Leah: its threat cannot be assessed.");
    expect(alerte).toHaveTextContent("1 system could not be read: its threat cannot be assessed.");
  });

  it("signale en anglais un flux NHC indisponible", () => {
    rendreEnAnglais({ langue: "en", ile: guadeloupe, flux: { etat: "indisponible", luLe }, positions: {} });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "NHC data is temporarily unavailable: the threat cannot be assessed. See nhc.noaa.gov.",
    );
  });
});

describe("MenaceIle quand le NHC ne répond plus (US-11)", () => {
  it("évalue la menace sur la dernière donnée connue et avertit que la mise à jour a échoué (US-11)", () => {
    render(
      <MenaceIle
        langue="fr"
        ile={guadeloupe}
        flux={{ etat: "ok", systemes: [systeme()], rejetes: 0, luLe, echecLe: "2026-09-10T17:00:00.000Z" }}
        positions={positionsKyle}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("La mise à jour des données du NHC a échoué.");
    expect(screen.getByRole("list", { name: "Systèmes qui menacent Guadeloupe" })).toBeInTheDocument();
  });
});
