import { Lien } from "@/components/langue/Lien";
import { ANNEE_MAX, ANNEE_MIN_HURDAT2, type Filtres } from "@/lib/historique/filtres";
import type { Ile } from "@/lib/iles";
import { chemin, type Langue } from "@/lib/langues";
import { HISTORIQUE } from "@/lib/textes/historique";

const CHAMP = "min-h-11 w-full rounded-xl border border-field bg-surface px-3 text-base text-foreground";

/** Formulaire GET : les filtres vivent dans l'URL et fonctionnent sans JavaScript. */
export function FormulaireFiltres({ langue, ile, filtres }: { langue: Langue; ile: Ile; filtres: Filtres }) {
  const page = `/iles/${ile.slug}/historique`;
  const textes = HISTORIQUE[langue].filtres;
  return (
    <form
      role="search"
      aria-label={textes.nom}
      method="get"
      action={chemin(langue, page)}
      className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4"
    >
      <div className="col-span-2 flex flex-col gap-1">
        <label htmlFor="filtre-categorie" className="text-base font-bold">
          {textes.intensite}
        </label>
        <select id="filtre-categorie" name="categorie" defaultValue={filtres.categorieMin?.toString() ?? ""} className={CHAMP}>
          {textes.categories.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filtre-de" className="text-base font-bold">
          {textes.de}
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
          {textes.a}
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
          {textes.filtrer}
        </button>
        <Lien href={page} className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
          {textes.effacer}
        </Lien>
      </div>
    </form>
  );
}
