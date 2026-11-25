import { LienNhc } from "@/components/LienNhc";
import { AlerteObsolescence } from "@/components/systemes/AlerteObsolescence";
import { Pastille } from "@/components/systemes/Pastille";
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import { type Ile, nomIle, nomVille } from "@/lib/iles";
import type { Langue } from "@/lib/langues";
import { formaterDistance, formaterHeureAvis, formaterHeurePassage } from "@/lib/menace/formatage";
import type { EtatFlux } from "@/lib/nhc/client";
import { type Menace, evaluerMenaces } from "@/lib/nhc/menace";
import { ECHEANCE_MAX_H, type PositionsPrevues } from "@/lib/nhc/positions";
import { type SystemeActif, descriptionSysteme } from "@/lib/nhc/systemes";
import { ILES_TEXTES } from "@/lib/textes/iles";
import { DelaiPassage } from "./DelaiPassage";

const JOURS_PREVUS = ECHEANCE_MAX_H / 24;

function CarteMenace({ ile, menace, langue }: { ile: Ile; menace: Menace<SystemeActif>; langue: Langue }) {
  const { systeme, passage, avis } = menace;
  const textes = ILES_TEXTES[langue].menace;
  return (
    <li className="flex flex-col gap-2 rounded-3xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <Pastille systeme={systeme} />
        <div className="flex flex-col">
          <span className="text-lg font-bold">{systeme.nom}</span>
          <span className="text-sm text-muted">{descriptionSysteme(systeme, langue)}</span>
        </div>
      </div>
      {/* Avant le délai : un délai calculé sur un avis périmé ne doit pas être lu comme à jour (#71). */}
      <AlerteObsolescence emisLe={avis.emisLe} />
      <DelaiPassage heure={passage.heure} />
      <p className="text-base">
        {textes.passage(
          formaterHeurePassage(passage.heure, ile.fuseau, langue),
          formaterDistance(passage.distanceKm, langue),
          nomVille(ile, langue),
        )}
      </p>
      <p className="text-sm text-muted">
        {textes.estimation(avis.numero, formaterHeureAvis(avis.emisLe, ile.fuseau, langue))}
      </p>
    </li>
  );
}

function Incompletude({
  sansPrevision,
  rejetes,
  langue,
}: {
  sansPrevision: SystemeActif[];
  rejetes: number;
  langue: Langue;
}) {
  if (sansPrevision.length === 0 && rejetes === 0) return null;
  const textes = ILES_TEXTES[langue].menace;
  const noms = new Intl.ListFormat(langue, { type: "conjunction" }).format(sansPrevision.map(({ nom }) => nom));
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-2xl bg-soft p-4 text-base">
      {sansPrevision.length > 0 && <p>{textes.sansPrevision(noms, sansPrevision.length)}</p>}
      {rejetes > 0 && <p>{textes.illisibles(rejetes)}</p>}
      <p>
        {textes.consultez} <LienNhc />.
      </p>
    </div>
  );
}

export function MenaceIle({
  ile,
  flux,
  positions,
  langue,
}: {
  ile: Ile;
  flux: EtatFlux;
  // Positions prévues disponibles, par identifiant de système.
  positions: Record<string, PositionsPrevues>;
  langue: Langue;
}) {
  const textes = ILES_TEXTES[langue].menace;
  if (flux.etat === "indisponible") {
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
        {textes.indisponible} {textes.consultez} <LienNhc />.
      </p>
    );
  }

  const { menaces, sansPrevision } = evaluerMenaces(ile, flux.systemes, positions);
  const complet = sansPrevision.length === 0 && flux.rejetes === 0;
  const nom = nomIle(ile, langue);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base">{textes.rayon(RADIUS_WATCH_KM, nomVille(ile, langue), JOURS_PREVUS)}</p>
      <Incompletude sansPrevision={sansPrevision} rejetes={flux.rejetes} langue={langue} />
      {menaces.length > 0 ? (
        <ul aria-label={textes.liste(nom)} className="flex flex-col gap-3">
          {menaces.map((menace) => (
            <CarteMenace key={menace.systeme.id} ile={ile} menace={menace} langue={langue} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-surface p-4 text-base font-bold">
          {complet ? textes.aucune(nom) : textes.aucuneDisponible(nom)}
        </p>
      )}
      <p className="text-sm text-muted">
        {textes.source}
        <LienNhc />
        {textes.sourceFin}
      </p>
    </div>
  );
}
