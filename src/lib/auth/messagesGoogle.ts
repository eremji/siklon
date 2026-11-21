// Messages des erreurs de la connexion avec Google (US-05), affichés côté navigateur : sans dépendance.

// Codes renvoyés dans ?error= au retour de Google (Better Auth), ou au départ (actions du compte).
const MESSAGES_GOOGLE: Record<string, string> = {
  account_not_linked:
    "Un compte existe déjà avec cette adresse, mais elle n'est pas confirmée. Connectez-vous avec votre mot de passe et confirmez votre adresse : vous pourrez ensuite utiliser Google.",
  access_denied: "Connexion avec Google annulée.",
  depart_impossible: "La connexion avec Google n'a pas pu démarrer. Réessayez dans quelques instants.",
};

/** Message à afficher pour le code d'erreur reçu dans l'adresse ; jamais le code lui-même. */
export function messageErreurGoogle(code: string): string {
  return Object.hasOwn(MESSAGES_GOOGLE, code) ? MESSAGES_GOOGLE[code] : "La connexion avec Google n'a pas abouti. Réessayez.";
}
