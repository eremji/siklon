import { Lien } from "@/components/langue/Lien";
import type { ReactNode } from "react";
import type { EtatAction, ResultatCoche } from "@/app/[langue]/iles/[ile]/checklist/actions";
import { CHECKLISTS, type ElementChecklist, type IdSource, SOURCES } from "@/lib/checklist/contenu";
import { etapeChecklist, etapesPrecedentes } from "@/lib/checklist/etapes";
import { type ElementPerso, LONGUEUR_MAX_TEXTE } from "@/lib/db/checklist";
import { LANGUES, type Langue } from "@/lib/langues";
import type { NiveauAlerte } from "@/lib/notifications/evenements";
import { CHECKLIST } from "@/lib/textes/checklist";
import { infoNiveau, type Niveau, NIVEAUX } from "@/lib/vigilance/niveaux";
import { BoutonAction } from "./BoutonAction";
import { CaseElement } from "./CaseElement";
import { FormulaireAjout } from "./FormulaireAjout";

// Checklist de l'US-08 : la liste du niveau en cours, les éléments ajoutés par l'utilisateur, les
// listes précédentes repliées et les documents officiels cités. Un utilisateur connecté coche,
// masque et ajoute des éléments ; un visiteur lit la checklist de base. En anglais (US-10), le
// contenu est une traduction des documents officiels français, ce que la page dit.

type ActionFormulaire = (etat: EtatAction, donnees: FormData) => Promise<EtatAction>;

/** État et actions de la checklist d'un utilisateur connecté ; null pour un visiteur. */
export type CompteChecklist = {
  coches: string[];
  masques: string[];
  perso: ElementPerso[];
  cocher: (element: string, coche: boolean, langue: Langue) => Promise<ResultatCoche>;
  cocherPerso: (element: string, coche: boolean, langue: Langue) => Promise<ResultatCoche>;
  masquer: ActionFormulaire;
  ajouter: ActionFormulaire;
  supprimer: ActionFormulaire;
} | null;

const ELEMENTS_DE_BASE = Object.fromEntries(
  LANGUES.map((langue) => [
    langue,
    new Map<string, ElementChecklist>(
      NIVEAUX.flatMap((niveau) =>
        CHECKLISTS[langue][niveau].sections.flatMap(({ elements }) => elements.map((e) => [e.id, e] as const)),
      ),
    ),
  ]),
) as Record<Langue, Map<string, ElementChecklist>>;

type Commun = { niveau: Niveau; langue: Langue; compte: CompteChecklist };

function auteurs(sources: IdSource[], langue: Langue): string {
  return [...new Set(sources.map((id) => SOURCES[langue][id].auteur))].join(CHECKLIST[langue].liste.separateurAuteurs);
}

/** Titre d'une liste ; en anglais, le terme d'origine de la vigilance suit, en français (US-10). */
function TitreListe({ niveau, langue }: { niveau: Niveau; langue: Langue }) {
  const origine = langue !== "fr" && niveau !== "vert" ? infoNiveau(niveau, "fr") : null;
  return (
    <>
      {CHECKLISTS[langue][niveau].titre}
      {origine && (
        <>
          {" "}
          <span lang="fr">
            ({origine.libelle} · {origine.consigne})
          </span>
        </>
      )}
    </>
  );
}

function Sections({ niveau, langue, prefixe, compte }: Commun & { prefixe: string }) {
  const checklist = CHECKLISTS[langue][niveau];
  const textes = CHECKLIST[langue].liste;
  return checklist.sections.map((section, index) => {
    const visibles = section.elements.filter(({ id }) => !compte?.masques.includes(id));
    return (
      <div key={section.titre ?? index} className="flex flex-col gap-2">
        {section.titre && <h4 className="text-lg font-bold">{section.titre}</h4>}
        {visibles.length === 0 ? (
          <p className="text-base text-muted">{textes.toutMasque}</p>
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
                  <p className="text-sm text-muted">
                    {textes.source}
                    {auteurs(sources, langue)}
                  </p>
                  {compte && (
                    <BoutonAction
                      action={compte.masquer}
                      champs={{ element: id, masque: "1" }}
                      libelle={textes.masquer}
                      description={textes.action(textes.masquer, texte)}
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

function Delai({ niveau, langue }: { niveau: Niveau; langue: Langue }) {
  const { delai } = CHECKLISTS[langue][niveau];
  if (!delai) return null;
  return (
    <p className="text-base">
      {delai.texte} ({SOURCES[langue][delai.source].auteur})
    </p>
  );
}

/** Bloc replié, avec un chevron en trait : l'état ouvert ou fermé ne repose pas sur la couleur (DESIGN.md). */
function Repli({ titre, children }: { titre: ReactNode; children: ReactNode }) {
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

function ListeRepliee({ niveau, langue, rappel, compte }: Commun & { rappel: boolean }) {
  return (
    <Repli
      titre={
        <>
          {rappel && CHECKLIST[langue].liste.rappel}
          <TitreListe niveau={niveau} langue={langue} />
        </>
      }
    >
      <Delai niveau={niveau} langue={langue} />
      <Sections niveau={niveau} langue={langue} prefixe="" compte={compte} />
    </Repli>
  );
}

function MesElements({ langue, compte }: { langue: Langue; compte: NonNullable<CompteChecklist> }) {
  const textes = CHECKLIST[langue].liste;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold">{textes.mesElements}</h3>
      {compte.perso.length === 0 ? (
        <p className="text-base text-muted">{textes.aucunElement}</p>
      ) : (
        <ul aria-label={textes.mesElements} className="flex flex-col gap-2">
          {compte.perso.map(({ id, texte, coche }) => (
            <li key={id} className="flex items-start justify-between gap-2 rounded-2xl bg-surface p-4">
              <div className="flex-1">
                <CaseElement id={id} texte={texte} cocheInitiale={coche} cocher={compte.cocherPerso} />
              </div>
              <BoutonAction
                action={compte.supprimer}
                champs={{ id }}
                libelle={textes.supprimer}
                description={textes.action(textes.supprimer, texte)}
              />
            </li>
          ))}
        </ul>
      )}
      <FormulaireAjout action={compte.ajouter} longueurMax={LONGUEUR_MAX_TEXTE} />
    </div>
  );
}

function ElementsMasques({ langue, compte }: { langue: Langue; compte: NonNullable<CompteChecklist> }) {
  const textes = CHECKLIST[langue].liste;
  const masques = compte.masques.flatMap((id) => ELEMENTS_DE_BASE[langue].get(id) ?? []);
  if (masques.length === 0) return null;
  return (
    <Repli titre={textes.masques(masques.length)}>
      <ul aria-label={textes.listeMasques} className="flex flex-col gap-2">
        {masques.map(({ id, texte }) => (
          <li key={id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-4">
            <p className="text-base">{texte}</p>
            <BoutonAction
              action={compte.masquer}
              champs={{ element: id, masque: "0" }}
              libelle={textes.reafficher}
              description={textes.action(textes.reafficher, texte)}
            />
          </li>
        ))}
      </ul>
    </Repli>
  );
}

function Sources({ langue }: { langue: Langue }) {
  const textes = CHECKLIST[langue].liste;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-bold">{textes.sources}</h3>
      <ul aria-label={textes.listeSources} className="flex flex-col">
        {Object.entries(SOURCES[langue]).map(([id, { auteur, titre, url }]) => (
          <li key={id}>
            <a href={url} className="flex min-h-11 items-center text-base text-accent underline underline-offset-4">
              {textes.document(auteur, titre)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Checklist({ langue, nomIle, source, niveau, compte }: {
  langue: Langue;
  /** Nom de l'île dans la langue de la page. */
  nomIle: string;
  source: "meteo-france" | "nhc";
  /** null : la source du niveau d'alerte est indisponible. */
  niveau: NiveauAlerte | null;
  compte: CompteChecklist;
}) {
  const textes = CHECKLIST[langue].liste;
  const etape = niveau === null ? null : etapeChecklist(niveau);
  const replies = etape ? etapesPrecedentes(etape) : NIVEAUX;

  return (
    <section aria-labelledby="titre-checklist" className="flex flex-col gap-4">
      <h2 id="titre-checklist" className="text-2xl font-bold">
        {textes.titre}
      </h2>
      {textes.traduction && <p className="text-base">{textes.traduction}</p>}
      {!compte && (
        <Lien
          href="/compte/connexion"
          className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-4"
        >
          {textes.connexion}
        </Lien>
      )}
      {source === "nhc" && <p className="text-base">{textes.origineNhc(nomIle)}</p>}
      {etape ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-bold">
            <TitreListe niveau={etape} langue={langue} />
          </h3>
          <Delai niveau={etape} langue={langue} />
          <Sections niveau={etape} langue={langue} prefixe={textes.enCours} compte={compte} />
        </div>
      ) : (
        <p className="text-base">{textes.indisponible}</p>
      )}
      {compte && <MesElements langue={langue} compte={compte} />}
      {replies.map((precedente) => (
        <ListeRepliee key={precedente} niveau={precedente} langue={langue} rappel={etape !== null} compte={compte} />
      ))}
      {compte && <ElementsMasques langue={langue} compte={compte} />}
      <Sources langue={langue} />
    </section>
  );
}
