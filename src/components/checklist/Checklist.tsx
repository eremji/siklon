import { Lien } from "@/components/langue/Lien";
import type { ReactNode } from "react";
import type { EtatAction, ResultatCoche } from "@/app/[langue]/iles/[ile]/checklist/actions";
import { CHECKLISTS, type ChecklistNiveau, type ElementChecklist, type IdSource, SOURCES } from "@/lib/checklist/contenu";
import { etapeChecklist, etapesPrecedentes } from "@/lib/checklist/etapes";
import { type ElementPerso, LONGUEUR_MAX_TEXTE } from "@/lib/db/checklist";
import type { NiveauAlerte } from "@/lib/notifications/evenements";
import { NIVEAUX } from "@/lib/vigilance/niveaux";
import { BoutonAction } from "./BoutonAction";
import { CaseElement } from "./CaseElement";
import { FormulaireAjout } from "./FormulaireAjout";

// Checklist de l'US-08 : la liste du niveau en cours, les éléments ajoutés par l'utilisateur, les
// listes précédentes repliées et les documents officiels cités. Un utilisateur connecté coche,
// masque et ajoute des éléments ; un visiteur lit la checklist de base.

type ActionFormulaire = (etat: EtatAction, donnees: FormData) => Promise<EtatAction>;

/** État et actions de la checklist d'un utilisateur connecté ; null pour un visiteur. */
export type CompteChecklist = {
  coches: string[];
  masques: string[];
  perso: ElementPerso[];
  cocher: (element: string, coche: boolean) => Promise<ResultatCoche>;
  cocherPerso: (element: string, coche: boolean) => Promise<ResultatCoche>;
  masquer: ActionFormulaire;
  ajouter: ActionFormulaire;
  supprimer: ActionFormulaire;
} | null;

const ELEMENTS_DE_BASE = new Map<string, ElementChecklist>(
  NIVEAUX.flatMap((niveau) => CHECKLISTS[niveau].sections.flatMap(({ elements }) => elements.map((e) => [e.id, e] as const))),
);

function auteurs(sources: IdSource[]): string {
  return [...new Set(sources.map((id) => SOURCES[id].auteur))].join(" ; ");
}

function Sections({ checklist, prefixe, compte }: { checklist: ChecklistNiveau; prefixe: string; compte: CompteChecklist }) {
  return checklist.sections.map((section, index) => {
    const visibles = section.elements.filter(({ id }) => !compte?.masques.includes(id));
    return (
      <div key={section.titre ?? index} className="flex flex-col gap-2">
        {section.titre && <h4 className="text-lg font-bold">{section.titre}</h4>}
        {visibles.length === 0 ? (
          <p className="text-base text-muted">Vous avez masqué tous les éléments de cette liste.</p>
        ) : (
          <ul aria-label={`${prefixe}${section.titre ?? checklist.titre}`} className="flex flex-col gap-2">
            {visibles.map(({ id, texte, sources }) => (
              <li key={id} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
                {compte ? (
                  <CaseElement id={id} texte={texte} cocheInitiale={compte.coches.includes(id)} cocher={compte.cocher} />
                ) : (
                  <p className="text-base">{texte}</p>
                )}
                <div className="flex items-end justify-between gap-2">
                  <p className="text-sm text-muted">Source : {auteurs(sources)}</p>
                  {compte && (
                    <BoutonAction
                      action={compte.masquer}
                      champs={{ element: id, masque: "1" }}
                      libelle="Masquer"
                      description={`Masquer : ${texte}`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  });
}

function Delai({ checklist }: { checklist: ChecklistNiveau }) {
  if (!checklist.delai) return null;
  return (
    <p className="text-base">
      {checklist.delai.texte} ({SOURCES[checklist.delai.source].auteur})
    </p>
  );
}

/** Bloc replié, avec un chevron en trait : l'état ouvert ou fermé ne repose pas sur la couleur (DESIGN.md). */
function Repli({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <details className="group flex flex-col gap-3 rounded-2xl bg-soft p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-base font-bold [&::-webkit-details-marker]:hidden">
        <span>{titre}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 shrink-0 transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}

function ListeRepliee({ checklist, rappel, compte }: { checklist: ChecklistNiveau; rappel: boolean; compte: CompteChecklist }) {
  return (
    <Repli titre={rappel ? `Si ce n'est pas encore fait : ${checklist.titre}` : checklist.titre}>
      <Delai checklist={checklist} />
      <Sections checklist={checklist} prefixe="" compte={compte} />
    </Repli>
  );
}

function MesElements({ compte }: { compte: NonNullable<CompteChecklist> }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold">Mes éléments</h3>
      {compte.perso.length === 0 ? (
        <p className="text-base text-muted">Ajoutez ce qui manque pour votre foyer : il apparaîtra à chaque niveau d&apos;alerte.</p>
      ) : (
        <ul aria-label="Mes éléments" className="flex flex-col gap-2">
          {compte.perso.map(({ id, texte, coche }) => (
            <li key={id} className="flex items-start justify-between gap-2 rounded-2xl bg-surface p-4">
              <div className="flex-1">
                <CaseElement id={id} texte={texte} cocheInitiale={coche} cocher={compte.cocherPerso} />
              </div>
              <BoutonAction action={compte.supprimer} champs={{ id }} libelle="Supprimer" description={`Supprimer : ${texte}`} />
            </li>
          ))}
        </ul>
      )}
      <FormulaireAjout action={compte.ajouter} longueurMax={LONGUEUR_MAX_TEXTE} />
    </div>
  );
}

function ElementsMasques({ compte }: { compte: NonNullable<CompteChecklist> }) {
  const masques = compte.masques.flatMap((id) => ELEMENTS_DE_BASE.get(id) ?? []);
  if (masques.length === 0) return null;
  return (
    <Repli titre={`Éléments masqués (${masques.length})`}>
      <ul aria-label="Éléments masqués" className="flex flex-col gap-2">
        {masques.map(({ id, texte }) => (
          <li key={id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-4">
            <p className="text-base">{texte}</p>
            <BoutonAction
              action={compte.masquer}
              champs={{ element: id, masque: "0" }}
              libelle="Réafficher"
              description={`Réafficher : ${texte}`}
            />
          </li>
        ))}
      </ul>
    </Repli>
  );
}

function Sources() {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-bold">Sources</h3>
      <ul aria-label="Sources de la checklist" className="flex flex-col">
        {Object.entries(SOURCES).map(([id, { auteur, titre, url }]) => (
          <li key={id}>
            <a href={url} className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
              {auteur} : {titre}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Checklist({ nomIle, source, niveau, compte }: {
  nomIle: string;
  source: "meteo-france" | "nhc";
  /** null : la source du niveau d'alerte est indisponible. */
  niveau: NiveauAlerte | null;
  compte: CompteChecklist;
}) {
  const etape = niveau === null ? null : etapeChecklist(niveau);
  const enCours = etape ? CHECKLISTS[etape] : null;
  const replies = etape ? etapesPrecedentes(etape) : NIVEAUX;

  return (
    <section aria-labelledby="titre-checklist" className="flex flex-col gap-4">
      <h2 id="titre-checklist" className="text-2xl font-bold">
        Checklist de préparation
      </h2>
      {!compte && (
        <Lien
          href="/compte/connexion"
          className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-4"
        >
          Connectez-vous pour cocher les éléments et garder votre progression
        </Lien>
      )}
      {source === "nhc" && (
        <p className="text-base">
          Ces listes viennent des guides des préfectures françaises des Antilles et de la Croix-Rouge. Suivez
          d&apos;abord les consignes des autorités de {nomIle}.
        </p>
      )}
      {enCours ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-bold">{enCours.titre}</h3>
          <Delai checklist={enCours} />
          <Sections checklist={enCours} prefixe="Liste en cours : " compte={compte} />
        </div>
      ) : (
        <p className="text-base">
          Niveau d&apos;alerte indisponible : choisissez la liste qui correspond aux consignes des autorités.
        </p>
      )}
      {compte && <MesElements compte={compte} />}
      {replies.map((precedente) => (
        <ListeRepliee key={precedente} checklist={CHECKLISTS[precedente]} rappel={etape !== null} compte={compte} />
      ))}
      {compte && <ElementsMasques compte={compte} />}
      <Sources />
    </section>
  );
}
