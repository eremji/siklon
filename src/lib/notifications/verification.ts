// Vérification planifiée des alertes (US-07) : lit les sources, détecte les événements de chaque île
// (entrée d'un système dans le rayon, changement de niveau d'alerte) et prévient ceux qui la suivent.
// Appelée chaque minute (route /api/alertes/verifier). Deux vérifications simultanées ne préviennent
// qu'une fois : le niveau est enregistré par compare-and-set, chaque envoi réservé par canal.
import type { Executeur } from "../db/historique";
import { destinataires, enregistrerNiveau, lireNiveauxIles } from "../db/notifications";
import { type Emprise, type FichierVigilance, ILES, type Ile } from "../iles";
import type { EtatAlertesNhc } from "../nhc/alertes";
import type { EtatFlux } from "../nhc/client";
import { evaluerMenaces } from "../nhc/menace";
import type { PositionsPrevues } from "../nhc/positions";
import type { SystemeActif } from "../nhc/systemes";
import type { EtatVigilance } from "../vigilance/vigilance";
import {
  type Evenement,
  type NiveauAlerte,
  type ObservationNiveau,
  changementNiveau,
  entreesRayon,
  niveauNhc,
  niveauVigilance,
} from "./evenements";
import type { AlertePush, BilanPush } from "./push";
import { contenuNotification } from "./textes";

/** Sources lues par la vérification : caches partagés en production, simulées dans les tests. */
export interface SourcesAlertes {
  flux(): Promise<EtatFlux>;
  positions(systemes: SystemeActif[]): Promise<Record<string, PositionsPrevues>>;
  vigilance(fichier: FichierVigilance): Promise<EtatVigilance>;
  alertesNhc(ile: Ile, emprise: Emprise, flux: EtatFlux): Promise<EtatAlertesNhc>;
}

export interface BilanVerification {
  evenements: number;
  envoyes: number;
  echecs: number;
}

/** Type de l'erreur seulement : son message peut citer une adresse ou une donnée reçue. */
function typeErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.name : "inconnue";
}

async function lireFlux(sources: SourcesAlertes): Promise<EtatFlux> {
  try {
    return await sources.flux();
  } catch (erreur) {
    console.error(`[alertes] flux NHC illisible (${typeErreur(erreur)})`);
    return { etat: "indisponible", luLe: new Date().toISOString() };
  }
}

async function observerNiveau(
  ile: Ile,
  flux: EtatFlux,
  sources: SourcesAlertes,
  vigilances: Map<FichierVigilance, Promise<EtatVigilance>>,
): Promise<ObservationNiveau | null> {
  try {
    if (ile.alerte.source === "nhc") return niveauNhc(await sources.alertesNhc(ile, ile.alerte.emprise, flux));
    const { fichier } = ile.alerte;
    // Saint-Martin et Saint-Barthélemy partagent un fichier : une seule lecture.
    if (!vigilances.has(fichier)) vigilances.set(fichier, sources.vigilance(fichier));
    return niveauVigilance(await (vigilances.get(fichier) as Promise<EtatVigilance>));
  } catch (erreur) {
    console.error(`[alertes] niveau de ${ile.slug} illisible (${typeErreur(erreur)})`);
    return null;
  }
}

/**
 * Enregistre le niveau observé s'il diffère du dernier connu, et rend l'événement à notifier.
 * Le premier niveau connu d'une île est enregistré ; il n'est notifié que s'il y a une alerte.
 */
async function evenementNiveau(
  db: Executeur,
  ile: Ile,
  precedent: NiveauAlerte | undefined,
  observation: ObservationNiveau | null,
): Promise<Evenement | null> {
  if (!observation || observation.niveau === precedent) return null;
  const ecrit = await enregistrerNiveau(db, ile.slug, precedent, observation);
  // Une autre vérification a déjà enregistré ce changement : elle prévient, pas celle-ci.
  return ecrit ? changementNiveau(ile, precedent, observation) : null;
}

export async function verifierAlertes(
  db: Executeur,
  sources: SourcesAlertes,
  { envoyer, base }: { envoyer: (alerte: AlertePush) => Promise<BilanPush>; base: string },
): Promise<BilanVerification> {
  const bilan: BilanVerification = { evenements: 0, envoyes: 0, echecs: 0 };
  const flux = await lireFlux(sources);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const positions = systemes.length > 0 ? await sources.positions(systemes) : {};
  const niveaux = await lireNiveauxIles(db);
  const vigilances = new Map<FichierVigilance, Promise<EtatVigilance>>();

  for (const ile of ILES) {
    const evenements: Evenement[] = entreesRayon(ile, evaluerMenaces(ile, systemes, positions).menaces);
    const observation = await observerNiveau(ile, flux, sources, vigilances);
    const niveau = await evenementNiveau(db, ile, niveaux.get(ile.slug), observation);
    if (niveau) evenements.push(niveau);
    if (evenements.length === 0) continue;

    bilan.evenements += evenements.length;
    const abonnes = await destinataires(db, ile.slug);
    for (const evenement of evenements) {
      const contenu = contenuNotification(evenement, base);
      for (const destinataire of abonnes) {
        try {
          const resultat = await envoyer({ destinataire, cle: evenement.cle, contenu });
          bilan.envoyes += resultat.envoyes;
          bilan.echecs += resultat.echecs;
        } catch (erreur) {
          bilan.echecs += 1;
          console.error(`[alertes] échec d'un envoi pour ${ile.slug} (${typeErreur(erreur)})`);
        }
      }
    }
  }
  return bilan;
}
