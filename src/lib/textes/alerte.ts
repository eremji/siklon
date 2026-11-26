// Textes de la page Alerte d'une île : vigilance Météo-France (US-06) et watches/warnings NHC (US-06b).
// Libellés officiels : en anglais, la vigilance garde son terme d'origine français ; le NHC, son terme seul.
import type { CodeAlerte } from "@/lib/nhc/watches";
import { traductions } from "./traductions";

export const ALERTE = traductions(
  {
    page: {
      titreOnglet: (ile: string) => `Alerte en cours : ${ile} · Siklon`,
      introuvable: "Île introuvable · Siklon",
      chargement: "Chargement de l'île…",
      menaces: (ile: string) => `${ile} : menaces en cours`,
      checklist: "Checklist de préparation",
      chargementVigilance: "Chargement de la vigilance Météo-France…",
      chargementNhc: "Chargement des veilles et avertissements du NHC…",
    },
    vigilance: {
      indisponible: "Niveau de vigilance indisponible",
      aucune: (ile: string) => `Aucune alerte en cours pour ${ile}.`,
      source: (heure: string, fuseau: string) => `Source : Météo-France, mise à jour du ${heure} (${fuseau}).`,
      sourceSansHeure: "Source : Météo-France.",
      echec: (heure: string, fuseau: string) =>
        `La mise à jour de la vigilance Météo-France a échoué. Dernier niveau connu, publié le ${heure} (${fuseau}).`,
      fuseau: "heure des Antilles françaises",
      lien: "Consulter la vigilance sur le site de Météo-France",
    },
    nhc: {
      definitions: {
        HWR: "Conditions d'ouragan attendues, en général dans les 36 heures.",
        TWR: "Conditions de tempête tropicale attendues, en général dans les 36 heures.",
        HWA: "Conditions d'ouragan possibles, en général dans les 48 heures.",
        TWA: "Conditions de tempête tropicale possibles, en général dans les 48 heures.",
      } as Record<CodeAlerte, string>,
      indisponible: "Veilles et avertissements NHC indisponibles",
      aucune: "Aucune veille ni aucun avertissement",
      aucunePour: (ile: string) => `Aucune veille ni aucun avertissement NHC en cours pour ${ile}.`,
      liste: "Veilles et avertissements NHC en cours",
      avis: (numero: string, heure: string) => `Avis n° ${numero} du NHC, émis le ${heure}.`,
      source: (heure: string, fuseau: string) => `Source : NHC, données lues le ${heure} (${fuseau}).`,
      echec: (heure: string, fuseau: string) =>
        `La mise à jour des veilles et avertissements du NHC a échoué. Dernière donnée connue, lue le ${heure} (${fuseau}).`,
      sourceSansHeure: "Source : NHC.",
      lien: "Consulter les alertes sur le site du NHC",
    },
  },
  {
    page: {
      titreOnglet: (ile: string) => `Current alert: ${ile} · Siklon`,
      introuvable: "Island not found · Siklon",
      chargement: "Loading island…",
      menaces: (ile: string) => `${ile}: current threats`,
      checklist: "Preparedness checklist",
      chargementVigilance: "Loading Météo-France vigilance…",
      chargementNhc: "Loading NHC watches and warnings…",
    },
    vigilance: {
      indisponible: "Vigilance level unavailable",
      aucune: (ile: string) => `No alert in effect for ${ile}.`,
      source: (heure: string, fuseau: string) => `Source: Météo-France, updated ${heure} (${fuseau}).`,
      sourceSansHeure: "Source: Météo-France.",
      echec: (heure: string, fuseau: string) =>
        `The Météo-France vigilance update failed. Last known level, issued ${heure} (${fuseau}).`,
      fuseau: "Atlantic Standard Time, UTC−4",
      lien: "See the vigilance on the Météo-France website (in French)",
    },
    nhc: {
      definitions: {
        HWR: "Hurricane conditions expected, generally within 36 hours.",
        TWR: "Tropical storm conditions expected, generally within 36 hours.",
        HWA: "Hurricane conditions possible, generally within 48 hours.",
        TWA: "Tropical storm conditions possible, generally within 48 hours.",
      },
      indisponible: "NHC watches and warnings unavailable",
      aucune: "No watches or warnings",
      aucunePour: (ile: string) => `No NHC watches or warnings in effect for ${ile}.`,
      liste: "NHC watches and warnings in effect",
      avis: (numero: string, heure: string) => `NHC advisory ${numero}, issued ${heure}.`,
      source: (heure: string, fuseau: string) => `Source: NHC, data read ${heure} (${fuseau}).`,
      echec: (heure: string, fuseau: string) =>
        `The NHC watches and warnings update failed. Last known data, read ${heure} (${fuseau}).`,
      sourceSansHeure: "Source: NHC.",
      lien: "See the alerts on the NHC website",
    },
  },
);
