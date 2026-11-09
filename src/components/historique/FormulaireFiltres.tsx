import Link from "next/link";
import { ANNEE_MAX, ANNEE_MIN_HURDAT2, type Filtres } from "@/lib/historique/filtres";
import type { Ile } from "@/lib/iles";

const CATEGORIES = [
  ["", "Toutes"],
  ["0", "Tempête et plus"],
  ["1", "Ouragan (catégorie 1 et plus)"],
  ["2", "Catégorie 2 et plus"],
  ["3", "Catégorie 3 et plus"],
  ["4", "Catégorie 4 et plus"],
  ["5", "Catégorie 5"],
] as const;

const CHAMP = "min-h-11 w-full rounded-xl border border-field bg-surface px-3 text-base text-foreground";

/** Formulaire GET : les filtres vivent dans l'URL et fonctionnent sans JavaScript. */
export function FormulaireFiltres({ ile, filtres }: { ile: Ile; filtres: Filtres }) {
  const action = `/iles/${ile.slug}/historique`;
  return (
    <form
      role="search"
      aria-label="Filtrer l'historique"
      method="get"
      action={action}
      className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4"
    >
      <div className="col-span-2 flex flex-col gap-1">
        <label htmlFor="filtre-categorie" className="text-base font-bold">
          Intensité minimale
        </label>
        <select id="filtre-categorie" name="categorie" defaultValue={filtres.categorieMin?.toString() ?? ""} className={CHAMP}>
          {CATEGORIES.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filtre-de" className="text-base font-bold">
          De (année)
        </label>
        <input
          id="filtre-de"
          name="de"
          type="number"
          inputMode="numeric"
          min={ANNEE_MIN_HURDAT2}
          max={ANNEE_MAX}
          defaultValue={filtres.anneeMin}
          className={CHAMP}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filtre-a" className="text-base font-bold">
          À (année)
        </label>
        <input
          id="filtre-a"
          name="a"
          type="number"
          inputMode="numeric"
          min={ANNEE_MIN_HURDAT2}
          max={ANNEE_MAX}
          defaultValue={filtres.anneeMax}
          className={CHAMP}
        />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-4">
        <button type="submit" className="min-h-12 rounded-full bg-accent px-6 text-base font-bold text-on-accent">
          Filtrer
        </button>
        <Link href={action} className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
          Effacer les filtres
        </Link>
      </div>
    </form>
  );
}
