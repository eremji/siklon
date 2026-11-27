// Contenu de l'image d'aperçu d'un lien partagé (US-21) : les mêmes données officielles que le message,
// avec la couleur du niveau d'alerte seulement pour une alerte réelle (DESIGN.md).
import { type Ile, nomIle, nomVille } from "@/lib/iles";
import type { Langue } from "@/lib/langues";
import { formaterDistance } from "@/lib/menace/formatage";
import { TYPES_ALERTE } from "@/lib/nhc/alertes";
import { SEUIL_OBSOLESCENCE_H, estObsolete, formaterHeureAntilles, libelleHeureAntilles } from "@/lib/nhc/fraicheur";
import type { Menace } from "@/lib/nhc/menace";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { COMMUN } from "@/lib/textes/commun";
import { ILES_TEXTES } from "@/lib/textes/iles";
import { PARTAGE } from "@/lib/textes/partage";
import { SYSTEMES } from "@/lib/textes/systemes";
import { ktVersKmh } from "@/lib/unites";
import { infoNiveau } from "@/lib/vigilance/niveaux";
import { COULEURS_NHC, COULEURS_VIGILANCE, type CouleursAlerte } from "./couleurs";
import { type AlerteIle, delaiPassage, echecNhcIle, sourcesIle } from "./ile";
import { deplacement, nomComplet } from "./texte";

export interface Apercu {
  titre: string;
  /** Niveau d'alerte officiel ; `couleurs` est null sans alerte en cours. */
  niveau: { libelle: string; origine: string | null; couleurs: CouleursAlerte | null } | null;
  lignes: { fort: string; detail: string }[];
  sources: string | null;
  avertissement: string | null;
  /** Mise à jour NHC en échec (US-11), avec l'heure de la dernière lecture réussie ; null si à jour. */
  echec: string | null;
  mention: string;
}

const majuscule = (texte: string) => `${texte.charAt(0).toUpperCase()}${texte.slice(1)}`;

function niveauIle(alerte: AlerteIle, langue: Langue): Apercu["niveau"] {
  if (alerte.etat.etat !== "ok") return null;
  if (alerte.source === "meteo-france") {
    const { niveau } = alerte.etat;
    const { libelle, consigne } = infoNiveau(niveau, langue);
    // En anglais, le terme d'origine de Météo-France reste écrit (US-10).
    const origine = langue === "fr" ? null : infoNiveau(niveau, "fr");
    return {
      libelle: `${libelle} · ${consigne}`,
      origine: origine && `${origine.libelle} · ${origine.consigne}`,
      couleurs: COULEURS_VIGILANCE[niveau],
    };
  }
  const [plusGrave] = alerte.etat.alertes;
  if (!plusGrave) return { libelle: PARTAGE[langue].apercuAucuneAlerteNhc, origine: null, couleurs: null };
  const { libelle, origine } = TYPES_ALERTE[plusGrave.code];
  return {
    libelle: langue === "fr" ? `${libelle} (${origine})` : origine,
    origine: null,
    couleurs: COULEURS_NHC[plusGrave.code],
  };
}

const avertissement = (avis: { emisLe: string }[], langue: Langue, maintenant: Date) =>
  avis.some(({ emisLe }) => estObsolete(emisLe, maintenant)) ? SYSTEMES[langue].obsolescence(SEUIL_OBSOLESCENCE_H) : null;

/** Aperçu du lien vers la page d'une île (US-03, US-06). */
export function apercuIle(
  ile: Ile,
  menaces: Menace<SystemeActif>[],
  alerte: AlerteIle,
  langue: Langue,
  maintenant: Date,
  nhcAncien: string | null = null,
): Apercu {
  const nom = nomIle(ile, langue);
  const lignes =
    menaces.length > 0
      ? menaces.map(({ systeme, passage }) => ({
          fort: nomComplet(systeme, langue),
          detail: PARTAGE[langue].apercuPassage(
            formaterDistance(passage.distanceKm, langue),
            nomVille(ile, langue),
            delaiPassage(passage.heure, maintenant, langue),
          ),
        }))
      : [{ fort: ILES_TEXTES[langue].menace.aucune(nom), detail: "" }];
  return {
    titre: nom,
    niveau: niveauIle(alerte, langue),
    lignes,
    sources: sourcesIle(ile, menaces, alerte, langue),
    avertissement: avertissement(menaces.map(({ avis }) => avis), langue, maintenant),
    echec: echecNhcIle(ile, nhcAncien, langue),
    mention: COMMUN[langue].mention,
  };
}

/** Aperçu du lien vers la fiche d'un système actif (US-02) : aucune couleur de vigilance. */
export function apercuSysteme(
  systeme: SystemeActif,
  langue: Langue,
  maintenant: Date,
  nhcAncien: string | null = null,
): Apercu {
  const textes = PARTAGE[langue];
  const { avis } = systeme;
  const mouvement = deplacement(systeme, langue);
  return {
    titre: nomComplet(systeme, langue),
    niveau: null,
    lignes: [{ fort: textes.apercuVents(ktVersKmh(systeme.ventKt)), detail: mouvement ? majuscule(mouvement) : "" }],
    sources: textes.sourceNhc(avis.numero, formaterHeureAntilles(avis.emisLe, langue), libelleHeureAntilles(langue)),
    avertissement: avertissement([avis], langue, maintenant),
    echec: nhcAncien && textes.echecNhc(formaterHeureAntilles(nhcAncien, langue), libelleHeureAntilles(langue)),
    mention: COMMUN[langue].mention,
  };
}
