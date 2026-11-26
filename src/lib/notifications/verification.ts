// Vérification planifiée des alertes (US-07) : lit les sources, détecte les événements de chaque île
// (entrée d'un système dans le rayon, changement de niveau d'alerte) et prévient ceux qui la suivent.
// Appelée chaque minute (route /api/alertes/verifier) ; mémorise aussi le flux NHC, les niveaux de
// vigilance, les alertes NHC et les positions prévues lus en direct (US-11).
// Deux vérifications simultanées ne préviennent qu'une fois : le niveau est enregistré par
// compare-and-set, chaque envoi réservé par canal.
import { enregistrerLecture } from "../db/dernieresLectures";
import type { Executeur } from "../db/historique";
import { destinataires, enregistrerNiveau, lireNiveauxIles } from "../db/notifications";
import { type Emprise, type FichierVigilance, ILES, type Ile } from "../iles";
import type { Langue } from "../langues";
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
import type { AlertePush } from "./push";
import { type ContenuNotification, contenuNotification } from "./textes";

/** Sources lues par la vérification : caches partagés en production, simulées dans les tests. */
export interface SourcesAlertes {
  flux(): Promise<EtatFlux>;
  positions(systemes: SystemeActif[]): Promise<Record<string, PositionsPrevues>>;
  vigilance(fichier: FichierVigilance): Promise<EtatVigilance>;
  alertesNhc(ile: Ile, emprise: Emprise, flux: EtatFlux): Promise<EtatAlertesNhc>;
}

/** Résultat d'un envoi par un canal (web push, e-mail). */
export interface BilanEnvoi {
  envoyes: number;
  echecs: number;
}

/** Un canal de notification : envoie une alerte à un destinataire, une seule fois par alerte. */
export type Canal = (alerte: AlertePush) => Promise<BilanEnvoi>;

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
  alertesNhcLues: Map<string, EtatAlertesNhc>,
): Promise<ObservationNiveau | null> {
  try {
    if (ile.alerte.source === "nhc") {
      const etat = await sources.alertesNhc(ile, ile.alerte.emprise, flux);
      alertesNhcLues.set(ile.slug, etat);
      return niveauNhc(etat);
    }
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
 * Mémorise le flux lu en direct comme dernière lecture réussie (US-11) : les pages le montrent, avec son
 * heure, quand le NHC ne répond plus. Une panne d'écriture n'empêche pas de vérifier les alertes.
 */
async function memoriserFlux(db: Executeur, flux: EtatFlux): Promise<void> {
  if (flux.etat !== "ok" || flux.echecLe || flux.brut === undefined) return;
  try {
    await enregistrerLecture(db, "nhc-systemes", flux.brut, flux.luLe);
  } catch (erreur) {
    console.error(`[alertes] dernière lecture du flux NHC non mémorisée (${typeErreur(erreur)})`);
  }
}

/** Mémorise le niveau lu en direct de chaque fichier de vigilance (US-11), jamais un niveau de secours. */
async function memoriserVigilances(db: Executeur, vigilances: Map<FichierVigilance, Promise<EtatVigilance>>) {
  for (const [fichier, lecture] of vigilances) {
    const etat = await lecture.catch((): EtatVigilance => ({ etat: "indisponible" }));
    if (etat.etat !== "ok" || etat.echecLe) continue;
    try {
      const { niveau, misAJour } = etat;
      await enregistrerLecture(db, `vigilance:${fichier}`, { niveau, misAJour }, new Date().toISOString());
    } catch (erreur) {
      console.error(`[alertes] dernier niveau de ${fichier} non mémorisé (${typeErreur(erreur)})`);
    }
  }
}

/** Mémorise les alertes NHC lues en direct de chaque île sans vigilance (US-11), jamais des alertes de secours. */
async function memoriserAlertesNhc(db: Executeur, alertesNhcLues: Map<string, EtatAlertesNhc>) {
  for (const [slug, etat] of alertesNhcLues) {
    if (etat.etat !== "ok" || etat.echecLe) continue;
    try {
      await enregistrerLecture(db, `alertes-nhc:${slug}`, { alertes: etat.alertes }, etat.luLe);
    } catch (erreur) {
      console.error(`[alertes] dernières alertes NHC de ${slug} non mémorisées (${typeErreur(erreur)})`);
    }
  }
}

/** Mémorise les positions prévues lues en direct de chaque système (US-11), jamais des positions de secours. */
async function memoriserPositions(db: Executeur, positions: Record<string, PositionsPrevues>) {
  for (const [id, lues] of Object.entries(positions)) {
    if (lues.echecLe) continue;
    try {
      await enregistrerLecture(db, `positions:${id}`, lues, new Date().toISOString());
    } catch (erreur) {
      console.error(`[alertes] dernières positions de ${id} non mémorisées (${typeErreur(erreur)})`);
    }
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
  { canaux, base }: { canaux: Canal[]; base: string },
): Promise<BilanVerification> {
  const bilan: BilanVerification = { evenements: 0, envoyes: 0, echecs: 0 };
  const flux = await lireFlux(sources);
  await memoriserFlux(db, flux);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const positions = systemes.length > 0 ? await sources.positions(systemes) : {};
  const niveaux = await lireNiveauxIles(db);
  const vigilances = new Map<FichierVigilance, Promise<EtatVigilance>>();
  const alertesNhcLues = new Map<string, EtatAlertesNhc>();

  for (const ile of ILES) {
    const evenements: Evenement[] = entreesRayon(ile, evaluerMenaces(ile, systemes, positions).menaces);
    const observation = await observerNiveau(ile, flux, sources, vigilances, alertesNhcLues);
    const niveau = await evenementNiveau(db, ile, niveaux.get(ile.slug), observation);
    if (niveau) evenements.push(niveau);
    if (evenements.length === 0) continue;

    bilan.evenements += evenements.length;
    const abonnes = await destinataires(db, ile.slug);
    for (const evenement of evenements) {
      // Un contenu par langue de compte (US-10), rédigé une seule fois pour tous ceux qui la partagent.
      const contenus = new Map<Langue, ContenuNotification>();
      for (const destinataire of abonnes) {
        const { langue } = destinataire;
        const contenu = contenus.get(langue) ?? contenuNotification(evenement, base, langue);
        contenus.set(langue, contenu);
        // Chaque canal à part : une panne de l'un n'empêche pas l'autre de prévenir.
        for (const envoyer of canaux) {
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
  }
  await memoriserVigilances(db, vigilances);
  await memoriserAlertesNhc(db, alertesNhcLues);
  await memoriserPositions(db, positions);
  return bilan;
}
