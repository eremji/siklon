"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as CarteMapLibre } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emprise } from "@/lib/carte/emprise";
import { type CouleursCarte, JETONS_CARTE, styleCarte } from "@/lib/carte/style";
import type { Prevision } from "@/lib/nhc/previsions";
import { type SystemeActif, descriptionSysteme } from "@/lib/nhc/systemes";
import { Pastille } from "@/components/systemes/Pastille";

// Textes d'interface de MapLibre, en français.
const TEXTES_CARTE = {
  "Map.Title": "Carte interactive des systèmes actifs",
  "AttributionControl.ToggleAttribution": "Afficher ou masquer les crédits de la carte",
  "AttributionControl.MapFeedback": "Signaler une erreur sur la carte",
};

interface Ancre {
  systeme: SystemeActif;
  element: HTMLElement;
}

function lireCouleurs(): CouleursCarte {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(JETONS_CARTE).map(([couleur, jeton]) => [couleur, style.getPropertyValue(jeton).trim()]),
  ) as unknown as CouleursCarte;
}

// MapLibre 6 type chaque propriété de peinture ; Object.entries perd ce typage.
type EntreePeinture = [Parameters<CarteMapLibre["setPaintProperty"]>[1], Parameters<CarteMapLibre["setPaintProperty"]>[2]];

// Le thème suit le téléphone : les couleurs de la carte suivent les jetons.
function repeindre(carte: CarteMapLibre) {
  const { layers } = styleCarte(lireCouleurs());
  for (const couche of layers) {
    for (const [propriete, valeur] of Object.entries(couche.paint) as EntreePeinture[]) {
      carte.setPaintProperty(couche.id, propriete, valeur);
    }
  }
}

// Positions à montrer : chaque système et les points de sa trajectoire prévue.
function pointsAMontrer(systemes: SystemeActif[], previsions: Prevision[]) {
  const trajectoires = previsions.flatMap((p) => p.trajectoire.flat()).map(([longitude, latitude]) => ({ longitude, latitude }));
  return [...systemes, ...trajectoires];
}

// Valeur par défaut stable : un nouvel objet relancerait l'effet à chaque rendu.
const AUCUNE_PREVISION: Record<string, Prevision> = {};

export function CarteSystemes({
  systemes,
  previsions = AUCUNE_PREVISION,
}: {
  systemes: SystemeActif[];
  // Prévisions disponibles, par identifiant de système.
  previsions?: Record<string, Prevision>;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [ancres, setAncres] = useState<Ancre[]>([]);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let carte: CarteMapLibre | undefined;
    let annule = false;
    const theme = window.matchMedia?.("(prefers-color-scheme: dark)");
    const surTheme = () => carte && repeindre(carte);

    const liste = Object.values(previsions);

    // MapLibre n'est chargé que dans le navigateur, après l'affichage de la liste.
    import("maplibre-gl")
      .then(({ Map, Marker }) => {
        if (annule || !conteneur.current) return;
        carte = new Map({
          container: conteneur.current,
          style: styleCarte(lireCouleurs(), liste),
          bounds: emprise(pointsAMontrer(systemes, liste)),
          // Place pour la pastille et, à droite, pour le nom du système.
          fitBoundsOptions: { padding: { top: 32, bottom: 32, left: 32, right: 96 } },
          attributionControl: { compact: true },
          locale: TEXTES_CARTE,
        });
        const nouvelles = systemes.map((systeme) => {
          const element = document.createElement("div");
          // Marqueur non cliquable : MapLibre en ferait un « button » nommé « Map marker ».
          element.setAttribute("role", "group");
          element.setAttribute("aria-label", `${systeme.nom}, ${descriptionSysteme(systeme)}`);
          new Marker({ element }).setLngLat([systeme.longitude, systeme.latitude]).addTo(carte!);
          return { systeme, element };
        });
        setAncres(nouvelles);
        theme?.addEventListener("change", surTheme);
      })
      .catch(() => {
        if (!annule) setEchec(true);
      });

    return () => {
      annule = true;
      theme?.removeEventListener("change", surTheme);
      carte?.remove();
    };
  }, [systemes, previsions]);

  return (
    <div role="region" aria-label="Carte des systèmes actifs" className="relative">
      {echec ? (
        <p role="status" className="rounded-2xl bg-surface p-4 text-base">
          La carte interactive n&apos;a pas pu s&apos;afficher. La liste des systèmes reste à jour ci-dessous.
        </p>
      ) : (
        <div ref={conteneur} className="h-72 w-full overflow-hidden rounded-2xl bg-sea" />
      )}
      {ancres.map(({ systeme, element }) =>
        createPortal(
          // La pastille est centrée sur la position ; le nom déborde à sa droite.
          <div className="relative">
            <Pastille systeme={systeme} petite />
            <span className="absolute top-1/2 left-full ml-1 -translate-y-1/2 rounded-full bg-surface px-2 py-0.5 text-sm font-bold whitespace-nowrap text-foreground">
              {systeme.nom}
            </span>
          </div>,
          element,
          systeme.id,
        ),
      )}
    </div>
  );
}
