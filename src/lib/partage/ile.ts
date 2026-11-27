// Message partagé depuis la page d'une île menacée (US-21) : la menace est donnée comme une
// estimation Siklon (US-03), le niveau d'alerte tel que le publie la source officielle (US-06,
// US-06b), puis chaque source avec l'heure de sa donnée, à l'heure locale de l'île.
import { formaterJourHeure } from "@/lib/dates";
import { type Ile, nomIle, nomVille } from "@/lib/iles";
import type { Langue } from "@/lib/langues";
import { formaterDelai, formaterDistance } from "@/lib/menace/formatage";
import { type EtatAlertesNhc, TYPES_ALERTE } from "@/lib/nhc/alertes";
import { SEUIL_OBSOLESCENCE_H, estObsolete } from "@/lib/nhc/fraicheur";
import type { Menace } from "@/lib/nhc/menace";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { PARTAGE } from "@/lib/textes/partage";
import { SYSTEMES } from "@/lib/textes/systemes";
import { infoNiveau } from "@/lib/vigilance/niveaux";
import type { EtatVigilance } from "@/lib/vigilance/vigilance";
import { type ContenuPartage, nomComplet } from "./texte";

/** Niveau d'alerte officiel de l'île : vigilance Météo-France, ou watches/warnings NHC. */
export type AlerteIle = { source: "meteo-france"; etat: EtatVigilance } | { source: "nhc"; etat: EtatAlertesNhc };

/** Le bouton « Partager » s'affiche dès qu'un système menace l'île ou qu'une alerte officielle est en cours. */
export function ileMenacee(menaces: Menace<SystemeActif>[], alerte: AlerteIle): boolean {
  if (menaces.length > 0) return true;
  if (alerte.etat.etat !== "ok") return false;
  return alerte.source === "meteo-france" ? infoNiveau(alerte.etat.niveau, "fr").alerte : alerte.etat.alertes.length > 0;
}

/** « dans environ 12 h », ou null quand l'heure estimée du passage est atteinte. */
export function delaiPassage(heure: string, maintenant: Date, langue: Langue): string | null {
  if (Date.parse(heure) <= maintenant.getTime()) return null;
  const texte = formaterDelai(heure, maintenant, langue);
  return `${texte.charAt(0).toLowerCase()}${texte.slice(1)}`;
}

function phraseAlerte(nom: string, alerte: AlerteIle, langue: Langue): string | null {
  const textes = PARTAGE[langue];
  if (alerte.etat.etat !== "ok") return null;
  if (alerte.source === "meteo-france") {
    const { libelle, consigne } = infoNiveau(alerte.etat.niveau, langue);
    // En anglais, le terme d'origine de Météo-France reste écrit (US-10).
    const origine = langue === "fr" ? null : infoNiveau(alerte.etat.niveau, "fr");
    return textes.vigilance(nom, libelle, consigne, origine && `${origine.libelle} · ${origine.consigne}`);
  }
  const [plusGrave] = alerte.etat.alertes;
  if (!plusGrave) return textes.aucuneAlerteNhc(nom);
  const { libelle, origine } = TYPES_ALERTE[plusGrave.code];
  return textes.alerteNhc(nom, libelle, origine, plusGrave.systeme.nom);
}

/** « Sources : NHC, avis n° 14 du … ; Météo-France, mise à jour du … (heure locale). », ou null. */
export function sourcesIle(ile: Ile, menaces: Menace<SystemeActif>[], alerte: AlerteIle, langue: Langue): string | null {
  const textes = PARTAGE[langue];
  const heure = (iso: string) => formaterJourHeure(new Date(iso), ile.fuseau, langue);
  // Un avis NHC par système cité, qu'il vienne des positions prévues ou des watches/warnings.
  const avisNhc = new Map<string, { numero: string; emisLe: string }>();
  for (const { systeme, avis } of menaces) avisNhc.set(systeme.id, avis);
  if (alerte.source === "nhc" && alerte.etat.etat === "ok") {
    for (const { systeme, avis } of alerte.etat.alertes) if (!avisNhc.has(systeme.id)) avisNhc.set(systeme.id, avis);
  }
  const sources: string[] = [];
  if (avisNhc.size > 0) {
    sources.push(textes.avisNhc([...avisNhc.values()].map(({ numero, emisLe }) => textes.avis(numero, heure(emisLe)))));
  }
  if (alerte.source === "meteo-france" && alerte.etat.etat === "ok") sources.push(textes.meteoFrance(heure(alerte.etat.misAJour)));
  return sources.length > 0 ? textes.sources(sources, textes.heureLocale) : null;
}

/** Mise à jour NHC en échec (US-11) : heure locale de la dernière lecture réussie, ou null. */
export function echecNhcIle(ile: Ile, nhcAncien: string | null, langue: Langue): string | null {
  const textes = PARTAGE[langue];
  return nhcAncien && textes.echecNhc(formaterJourHeure(new Date(nhcAncien), ile.fuseau, langue), textes.heureLocale);
}

/** `nhcAncien` : heure de la dernière lecture NHC réussie quand une mise à jour a échoué (`derniereDonneeGardee`). */
export function partageIle(
  ile: Ile,
  menaces: Menace<SystemeActif>[],
  alerte: AlerteIle,
  langue: Langue,
  maintenant: Date,
  nhcAncien: string | null = null,
): ContenuPartage {
  const textes = PARTAGE[langue];
  const nom = nomIle(ile, langue);

  const phrases = menaces.map(({ systeme, passage }) =>
    textes.menace(
      nomComplet(systeme, langue),
      formaterDistance(passage.distanceKm, langue),
      nomVille(ile, langue),
      delaiPassage(passage.heure, maintenant, langue),
    ),
  );
  const niveau = phraseAlerte(nom, alerte, langue);
  if (niveau) phrases.push(niveau);

  const sources = sourcesIle(ile, menaces, alerte, langue);
  if (sources) phrases.push(sources);
  const echec = echecNhcIle(ile, nhcAncien, langue);
  if (echec) phrases.push(echec);

  if (menaces.some(({ avis }) => estObsolete(avis.emisLe, maintenant))) {
    phrases.push(SYSTEMES[langue].obsolescence(SEUIL_OBSOLESCENCE_H));
  }
  return { titre: textes.titre(nom), texte: phrases.join(" ") };
}
