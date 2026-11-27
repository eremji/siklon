// Le journal des lectures est-il encore alimenté par la vérification de chaque minute (#164) ?
import { RETARD_MAX_JOURNAL_MIN } from "../constantes";

export type EtatJournal = "a-jour" | "en-retard";

/** « en-retard » si la dernière écriture date de plus de RETARD_MAX_JOURNAL_MIN, ou si le journal est vide. */
export function etatJournal(derniereEcriture: string | null, maintenant: Date): EtatJournal {
  if (derniereEcriture === null) return "en-retard";
  const age = maintenant.getTime() - new Date(derniereEcriture).getTime();
  return age <= RETARD_MAX_JOURNAL_MIN * 60_000 ? "a-jour" : "en-retard";
}
