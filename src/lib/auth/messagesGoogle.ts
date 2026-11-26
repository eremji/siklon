// Messages des erreurs de la connexion avec Google (US-05), affichés côté navigateur : sans dépendance.
// Codes renvoyés dans ?error= au retour de Google (Better Auth), ou au départ (actions du compte).
import type { Langue } from "../langues";
import { COMPTE } from "../textes/compte";

/** Message à afficher pour le code d'erreur reçu dans l'adresse ; jamais le code lui-même. */
export function messageErreurGoogle(code: string, langue: Langue): string {
  const { codes, generique } = COMPTE[langue].google;
  return Object.hasOwn(codes, code) ? codes[code] : generique;
}
