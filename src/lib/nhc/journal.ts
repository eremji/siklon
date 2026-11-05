// Raison d'échec d'un flux, journalisable sans recopier la réponse reçue :
// le message d'une SyntaxError cite le texte reçu, seul son type est gardé.
export function raisonEchec(erreur: unknown): string {
  if (erreur instanceof SyntaxError) return "JSON invalide";
  return erreur instanceof Error ? `${erreur.name}: ${erreur.message}` : "inconnue";
}
