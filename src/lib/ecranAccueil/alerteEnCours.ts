// Une alerte est-elle en cours sur la page ? La feuille du bas ne s'ouvre alors pas : un bandeau la
// remplace, pour ne jamais cacher une information d'alerte (US-07c, #110).
import type { EtatAlertesNhc } from "@/lib/nhc/alertes";
import { infoNiveau } from "@/lib/vigilance/niveaux";
import type { EtatVigilance } from "@/lib/vigilance/vigilance";

/** Vigilance Météo-France jaune ou plus (tout niveau sauf le vert). */
export function vigilanceEnCours(etat: EtatVigilance): boolean {
  return etat.etat === "ok" && infoNiveau(etat.niveau).alerte;
}

/** Au moins une veille ou un avertissement du NHC sur l'île. */
export function alertesNhcEnCours(etat: EtatAlertesNhc): boolean {
  return etat.etat === "ok" && etat.alertes.length > 0;
}
