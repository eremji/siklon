// Événements qui déclenchent une notification (US-07) : entrée d'un système dans le rayon de
// menace d'une île (US-03) et changement de son niveau d'alerte (US-06). Fonctions pures : la
// lecture des sources, l'état conservé en base et l'envoi sont ailleurs.
import type { Ile } from "@/lib/iles";
import type { EtatAlertesNhc } from "@/lib/nhc/alertes";
import type { Menace, Passage } from "@/lib/nhc/menace";
import type { SystemeActif } from "@/lib/nhc/systemes";
import type { CodeAlerte } from "@/lib/nhc/watches";
import type { Niveau } from "@/lib/vigilance/niveaux";
import type { EtatVigilance } from "@/lib/vigilance/vigilance";

/** Niveau d'alerte d'une île : vigilance Météo-France, ou watch/warning NHC le plus grave. */
export type NiveauAlerte = Niveau | CodeAlerte | "aucune";

export interface ObservationNiveau {
  niveau: NiveauAlerte;
  /** Heure de mise à jour de la source (ISO 8601). */
  misAJour: string;
}

export interface EvenementRayon {
  type: "entree-rayon";
  /** Identifie l'alerte : une même clé n'est envoyée qu'une fois par canal. */
  cle: string;
  ile: Ile;
  // Classification et vent plutôt qu'une description : elle est rédigée dans la langue du destinataire (US-10).
  systeme: Pick<SystemeActif, "id" | "nom" | "classification" | "ventKt">;
  passage: Passage;
  avis: SystemeActif["avis"];
}

export interface EvenementNiveau {
  type: "changement-niveau";
  cle: string;
  ile: Ile;
  precedent: NiveauAlerte;
  niveau: NiveauAlerte;
  misAJour: string;
}

export type Evenement = EvenementRayon | EvenementNiveau;

/**
 * Un événement par système dont la trajectoire prévue passe dans le rayon de l'île. La clé ne
 * dépend que de l'île et du système : on ne prévient qu'une fois, même s'il sort puis revient.
 */
export function entreesRayon(ile: Ile, menaces: Menace<SystemeActif>[]): EvenementRayon[] {
  return menaces.map(({ systeme, passage }) => ({
    type: "entree-rayon",
    cle: `rayon:${ile.slug}:${systeme.id}`,
    ile,
    systeme: { id: systeme.id, nom: systeme.nom, classification: systeme.classification, ventKt: systeme.ventKt },
    passage,
    avis: systeme.avis,
  }));
}

export function niveauVigilance(etat: EtatVigilance): ObservationNiveau | null {
  return etat.etat === "ok" ? { niveau: etat.niveau, misAJour: etat.misAJour } : null;
}

/** Les alertes arrivent triées de la plus grave à la moins grave (chargerAlertesNhc). */
export function niveauNhc(etat: EtatAlertesNhc): ObservationNiveau | null {
  if (etat.etat === "indisponible") return null;
  const [plusGrave] = etat.alertes;
  return plusGrave ? { niveau: plusGrave.code, misAJour: plusGrave.avis.emisLe } : { niveau: "aucune", misAJour: etat.luLe };
}

export function niveauSansAlerte(ile: Ile): NiveauAlerte {
  return ile.alerte.source === "meteo-france" ? "vert" : "aucune";
}

/**
 * Événement si le niveau observé diffère du dernier niveau connu (le niveau sans alerte s'il n'y
 * en a pas). Source indisponible : rien, pour ne jamais annoncer à tort la fin d'une alerte.
 */
export function changementNiveau(
  ile: Ile,
  precedent: NiveauAlerte | undefined,
  actuel: ObservationNiveau | null,
): EvenementNiveau | null {
  if (!actuel) return null;
  const avant = precedent ?? niveauSansAlerte(ile);
  if (actuel.niveau === avant) return null;
  return {
    type: "changement-niveau",
    cle: `niveau:${ile.slug}:${actuel.niveau}:${actuel.misAJour}`,
    ile,
    precedent: avant,
    niveau: actuel.niveau,
    misAJour: actuel.misAJour,
  };
}
