// Contenu d'une notification (US-07), commun à tous les canaux : titre, texte, lien vers la fiche
// concernée et source officielle avec son heure de mise à jour.
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import type { Ile } from "@/lib/iles";
import { formaterDistance, formaterHeureAvis, formaterHeurePassage } from "@/lib/menace/formatage";
import { TYPES_ALERTE } from "@/lib/nhc/alertes";
import { estCode } from "@/lib/nhc/watches";
import { pageVigilance } from "@/lib/vigilance/fichiers";
import { estNiveau, infoNiveau } from "@/lib/vigilance/niveaux";
import type { Evenement, EvenementNiveau, EvenementRayon } from "./evenements";

export interface ContenuNotification {
  titre: string;
  corps: string;
  /** Adresse absolue de la fiche concernée sur Siklon. */
  lien: string;
  source: { nom: string; url: string };
}

const SITE_NHC = "https://www.nhc.noaa.gov/";

function minuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

function contenuRayon({ ile, systeme, passage, avis }: EvenementRayon, base: string): ContenuNotification {
  return {
    titre: `${ile.nom} : ${systeme.description} ${systeme.nom} menace l'île`,
    corps: [
      `Ce système est prévu à moins de ${RADIUS_WATCH_KM} km de votre île.`,
      "Pour un cyclone de taille moyenne, cette alerte arrive avant que les vents de tempête n'atteignent l'île : c'est le moment de se préparer.",
      `Plus proche passage estimé : ${formaterHeurePassage(passage.heure, ile.fuseau, "fr")}, à ${formaterDistance(passage.distanceKm, "fr")}.`,
      `Estimation d'après l'avis NHC n° ${avis.numero} du ${formaterHeureAvis(avis.emisLe, ile.fuseau, "fr")}.`,
    ].join(" "),
    lien: `${base}/systemes/${systeme.id}`,
    source: { nom: "NHC", url: avis.url ?? SITE_NHC },
  };
}

function lienAlerte(ile: Ile, base: string): string {
  return `${base}/iles/${ile.slug}/alerte`;
}

function contenuNiveau({ ile, precedent, niveau, misAJour }: EvenementNiveau, base: string): ContenuNotification {
  const heure = formaterHeureAvis(misAJour, ile.fuseau, "fr");

  if (ile.alerte.source === "meteo-france" && estNiveau(niveau) && estNiveau(precedent)) {
    const { libelle, consigne } = infoNiveau(niveau, "fr");
    return {
      titre: `${ile.nom} : ${libelle}`,
      corps: `${consigne}. Météo-France passe de la ${minuscule(infoNiveau(precedent, "fr").libelle)} à la ${minuscule(libelle)} (mise à jour du ${heure}).`,
      lien: lienAlerte(ile, base),
      source: { nom: "Météo-France", url: pageVigilance(ile.alerte.fichier) },
    };
  }

  const source = { nom: "NHC", url: SITE_NHC };
  if (!estCode(niveau)) {
    return {
      titre: `${ile.nom} : fin des veilles et avertissements`,
      corps: `Le NHC n'a plus de veille ni d'avertissement en cours pour l'île (lu le ${heure}).`,
      lien: lienAlerte(ile, base),
      source,
    };
  }
  const { libelle, origine, nature } = TYPES_ALERTE[niveau];
  const annonce = nature === "avertissement" ? "conditions attendues" : "conditions possibles";
  return {
    titre: `${ile.nom} : ${libelle} (${origine})`,
    corps: `Le NHC a émis pour l'île ${nature === "avertissement" ? "un" : "une"} ${minuscule(libelle)} (${origine}) : ${annonce}. Avis du ${heure}.`,
    lien: lienAlerte(ile, base),
    source,
  };
}

export function contenuNotification(evenement: Evenement, base: string): ContenuNotification {
  return evenement.type === "entree-rayon" ? contenuRayon(evenement, base) : contenuNiveau(evenement, base);
}
