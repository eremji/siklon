// Contenu d'une notification (US-07), commun à tous les canaux : titre, texte, lien vers la fiche
// concernée et source officielle avec son heure de mise à jour. Rédigé dans la langue du compte (US-10).
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import { nomIle } from "@/lib/iles";
import { type Langue, chemin } from "@/lib/langues";
import { formaterDistance, formaterHeureAvis, formaterHeurePassage } from "@/lib/menace/formatage";
import { TYPES_ALERTE } from "@/lib/nhc/alertes";
import { descriptionSysteme } from "@/lib/nhc/systemes";
import { estCode } from "@/lib/nhc/watches";
import { NOTIFICATIONS } from "@/lib/textes/notifications";
import { pageVigilance } from "@/lib/vigilance/fichiers";
import { estNiveau, infoNiveau } from "@/lib/vigilance/niveaux";
import type { Evenement, EvenementNiveau, EvenementRayon } from "./evenements";

export interface ContenuNotification {
  titre: string;
  corps: string;
  /** Adresse absolue de la fiche concernée sur Siklon, dans la langue du contenu. */
  lien: string;
  source: { nom: string; url: string };
  /** Langue dans laquelle le contenu est rédigé : celle du compte du destinataire. */
  langue: Langue;
}

const SITE_NHC = "https://www.nhc.noaa.gov/";

function minuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

function contenuRayon({ ile, systeme, passage, avis }: EvenementRayon, base: string, langue: Langue): ContenuNotification {
  const textes = NOTIFICATIONS[langue].rayon;
  return {
    titre: textes.titre(nomIle(ile, langue), `${descriptionSysteme(systeme, langue)} ${systeme.nom}`),
    corps: [
      textes.rayon(RADIUS_WATCH_KM),
      textes.conseil,
      textes.passage(formaterHeurePassage(passage.heure, ile.fuseau, langue), formaterDistance(passage.distanceKm, langue)),
      textes.avis(avis.numero, formaterHeureAvis(avis.emisLe, ile.fuseau, langue)),
    ].join(" "),
    lien: `${base}${chemin(langue, `/systemes/${systeme.id}`)}`,
    source: { nom: "NHC", url: avis.url ?? SITE_NHC },
    langue,
  };
}

function contenuNiveau(
  { ile, precedent, niveau, misAJour }: EvenementNiveau,
  base: string,
  langue: Langue,
): ContenuNotification {
  const textes = NOTIFICATIONS[langue];
  const nom = nomIle(ile, langue);
  const heure = formaterHeureAvis(misAJour, ile.fuseau, langue);
  const lien = `${base}${chemin(langue, `/iles/${ile.slug}/alerte`)}`;

  if (ile.alerte.source === "meteo-france" && estNiveau(niveau) && estNiveau(precedent)) {
    const { libelle, consigne } = infoNiveau(niveau, langue);
    // Terme d'origine de Météo-France, cité à côté de la traduction (US-10).
    const origine = infoNiveau(niveau, "fr");
    return {
      titre: textes.vigilance.titre(nom, origine.libelle, libelle),
      corps: textes.vigilance.corps(
        consigne,
        origine.consigne,
        minuscule(infoNiveau(precedent, langue).libelle),
        minuscule(libelle),
        heure,
      ),
      lien,
      source: { nom: "Météo-France", url: pageVigilance(ile.alerte.fichier) },
      langue,
    };
  }

  const source = { nom: "NHC", url: SITE_NHC };
  if (!estCode(niveau)) {
    return { titre: textes.nhc.finTitre(nom), corps: textes.nhc.finCorps(heure), lien, source, langue };
  }
  const { libelle, origine, nature } = TYPES_ALERTE[niveau];
  return {
    titre: textes.nhc.titre(nom, libelle, origine),
    corps: textes.nhc.corps(minuscule(libelle), origine, nature === "avertissement", heure),
    lien,
    source,
    langue,
  };
}

export function contenuNotification(evenement: Evenement, base: string, langue: Langue): ContenuNotification {
  return evenement.type === "entree-rayon" ? contenuRayon(evenement, base, langue) : contenuNiveau(evenement, base, langue);
}
