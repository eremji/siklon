import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emprise } from "@/lib/carte/emprise";
import type { styleCarte } from "@/lib/carte/style";
import type { Prevision } from "@/lib/nhc/previsions";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { CarteSystemes } from "./CarteSystemes";

// jsdom n'a pas WebGL : MapLibre est remplacé par un double qui enregistre les appels.
const espion = vi.hoisted(() => ({
  options: [] as Record<string, unknown>[],
  marqueurs: [] as { lngLat: [number, number]; element: HTMLElement }[],
  retraits: 0,
  echoue: false,
}));

vi.mock("maplibre-gl", () => {
  class Map {
    constructor(options: Record<string, unknown> & { container: HTMLElement }) {
      if (espion.echoue) throw new Error("WebGL indisponible");
      espion.options.push(options);
      this.container = options.container;
    }
    container: HTMLElement;
    remove() {
      espion.retraits += 1;
    }
    setPaintProperty() {}
  }
  class Marker {
    element: HTMLElement;
    lngLat: [number, number] = [0, 0];
    constructor({ element }: { element: HTMLElement }) {
      this.element = element;
    }
    setLngLat(lngLat: [number, number]) {
      this.lngLat = lngLat;
      return this;
    }
    addTo(carte: Map) {
      carte.container.appendChild(this.element);
      espion.marqueurs.push(this);
      return this;
    }
  }
  return { Map, Marker };
});

const systemes: SystemeActif[] = [
  {
    id: "al112026",
    emplacement: "AT1",
    nom: "Kyle",
    classification: "HU",
    ventKt: 120,
    pressionHpa: 948,
    latitude: 16.8,
    longitude: -58.2,
    avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" },
  },
  {
    id: "al122026",
    emplacement: "AT2",
    nom: "Leah",
    classification: "TS",
    ventKt: 45,
    pressionHpa: 1002,
    latitude: 12.4,
    longitude: -41.0,
    avis: { numero: "3", emisLe: "2026-09-10T15:00:00.000Z" },
  },
];

describe("CarteSystemes", () => {
  afterEach(() => {
    espion.options = [];
    espion.marqueurs = [];
    espion.retraits = 0;
    espion.echoue = false;
  });

  it("ouvre la carte sur une emprise qui montre tous les systèmes", async () => {
    render(<CarteSystemes systemes={systemes} />);

    await waitFor(() => expect(espion.options).toHaveLength(1));
    expect(espion.options[0]).toMatchObject({ bounds: emprise(systemes) });
  });

  it("place chaque système à sa position, avec son nom", async () => {
    render(<CarteSystemes systemes={systemes} />);

    const carte = screen.getByRole("region", { name: "Carte des systèmes actifs" });
    expect(await within(carte).findByText("Kyle")).toBeInTheDocument();
    expect(within(carte).getByText("Leah")).toBeInTheDocument();
    expect(espion.marqueurs.map((m) => m.lngLat)).toEqual([
      [-58.2, 16.8],
      [-41.0, 12.4],
    ]);
  });

  it("trace la trajectoire et le cône, et élargit la vue pour les montrer", async () => {
    const prevision: Prevision = {
      avis: "14",
      trajectoire: [
        [
          [-58.2, 16.8],
          [-75.0, 24.1],
        ],
      ],
      cone: [],
    };
    render(<CarteSystemes systemes={systemes} previsions={{ al112026: prevision }} />);

    await waitFor(() => expect(espion.options).toHaveLength(1));
    const { style, bounds } = espion.options[0] as { style: ReturnType<typeof styleCarte>; bounds: unknown };
    expect(style.sources.previsions.data.features).toHaveLength(1);
    expect(bounds).toEqual(
      emprise([
        ...systemes,
        { longitude: -58.2, latitude: 16.8 },
        { longitude: -75.0, latitude: 24.1 },
      ]),
    );
  });

  it("décrit chaque marqueur en français, sans le présenter comme un bouton", async () => {
    render(<CarteSystemes systemes={systemes} />);

    await waitFor(() => expect(espion.marqueurs).toHaveLength(2));
    expect(espion.marqueurs[0].element).toHaveAttribute("role", "group");
    expect(espion.marqueurs[0].element).toHaveAttribute("aria-label", "Kyle, Ouragan de catégorie 4");
    expect(espion.options[0]).toMatchObject({ locale: { "Map.Title": "Carte interactive des systèmes actifs" } });
  });

  it("libère la carte quand le composant disparaît", async () => {
    const { unmount } = render(<CarteSystemes systemes={systemes} />);
    await waitFor(() => expect(espion.options).toHaveLength(1));
    const avant = espion.retraits;

    unmount();

    expect(espion.retraits).toBe(avant + 1);
  });

  it("renvoie vers la liste quand la carte interactive ne peut pas s'afficher", async () => {
    espion.echoue = true;
    render(<CarteSystemes systemes={systemes} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "La carte interactive n'a pas pu s'afficher. La liste des systèmes reste à jour ci-dessous.",
    );
  });
});
