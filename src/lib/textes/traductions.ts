// Textes de l'interface (US-10) : un fichier par partie de l'interface, avec le français et
// l'anglais côte à côte. Une partie ne charge que ses propres textes, jamais tout le dictionnaire.
import type { Langue } from "@/lib/langues";

/** Textes d'une partie dans chaque langue ; le typage exige en anglais toutes les clés du français. */
export function traductions<T>(fr: T, en: NoInfer<T>): Record<Langue, T> {
  return { fr, en };
}
