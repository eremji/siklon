import Link from "next/link";
import { CHECKLISTS, type ChecklistNiveau, type IdSource, SOURCES } from "@/lib/checklist/contenu";
import { etapeChecklist, etapesPrecedentes } from "@/lib/checklist/etapes";
import type { NiveauAlerte } from "@/lib/notifications/evenements";
import { NIVEAUX } from "@/lib/vigilance/niveaux";
import type { ResultatCoche } from "@/app/iles/[ile]/checklist/actions";
import { CaseElement } from "./CaseElement";

// Checklist de base de l'US-08 : la liste du niveau en cours, puis les listes précédentes repliées,
// et les documents officiels cités. Un utilisateur connecté coche les éléments ; un visiteur lit.

/** État de la checklist d'un utilisateur connecté ; null pour un visiteur. */
export type CompteChecklist = {
  coches: string[];
  cocher: (element: string, coche: boolean) => Promise<ResultatCoche>;
} | null;

function auteurs(sources: IdSource[]): string {
  return [...new Set(sources.map((id) => SOURCES[id].auteur))].join(" ; ");
}

function Sections({ checklist, prefixe, compte }: { checklist: ChecklistNiveau; prefixe: string; compte: CompteChecklist }) {
  return checklist.sections.map((section, index) => (
    <div key={section.titre ?? index} className="flex flex-col gap-2">
      {section.titre && <h4 className="text-lg font-bold">{section.titre}</h4>}
      <ul aria-label={`${prefixe}${section.titre ?? checklist.titre}`} className="flex flex-col gap-2">
        {section.elements.map(({ id, texte, sources }) => (
          <li key={id} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            {compte ? (
              <CaseElement id={id} texte={texte} cocheInitiale={compte.coches.includes(id)} cocher={compte.cocher} />
            ) : (
              <p className="text-base">{texte}</p>
            )}
            <p className="text-sm text-muted">Source : {auteurs(sources)}</p>
          </li>
        ))}
      </ul>
    </div>
  ));
}

function Delai({ checklist }: { checklist: ChecklistNiveau }) {
  if (!checklist.delai) return null;
  return (
    <p className="text-base">
      {checklist.delai.texte} ({SOURCES[checklist.delai.source].auteur})
    </p>
  );
}

function ListeRepliee({ checklist, rappel, compte }: { checklist: ChecklistNiveau; rappel: boolean; compte: CompteChecklist }) {
  return (
    <details className="group flex flex-col gap-3 rounded-2xl bg-soft p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-base font-bold [&::-webkit-details-marker]:hidden">
        <span>{rappel ? `Si ce n'est pas encore fait : ${checklist.titre}` : checklist.titre}</span>
        {/* Chevron en trait : l'état ouvert ou fermé ne repose pas sur la couleur (DESIGN.md). */}
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
      <div className="mt-3 flex flex-col gap-3">
        <Delai checklist={checklist} />
        <Sections checklist={checklist} prefixe="" compte={compte} />
      </div>
    </details>
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
        <Link
          href="/compte/connexion"
          className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-4"
        >
          Connectez-vous pour cocher les éléments et garder votre progression
        </Link>
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
      {replies.map((precedente) => (
        <ListeRepliee key={precedente} checklist={CHECKLISTS[precedente]} rappel={etape !== null} compte={compte} />
      ))}
      <Sources />
    </section>
  );
}
