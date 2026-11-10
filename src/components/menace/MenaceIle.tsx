import { Pastille } from "@/components/systemes/Pastille";
import { RADIUS_WATCH_KM } from "@/lib/constantes";
import type { Ile } from "@/lib/iles";
import { formaterDistance, formaterHeureAvis, formaterHeurePassage } from "@/lib/menace/formatage";
import type { EtatFlux } from "@/lib/nhc/client";
import { type Menace, evaluerMenaces } from "@/lib/nhc/menace";
import { ECHEANCE_MAX_H, type PositionsPrevues } from "@/lib/nhc/positions";
import { type SystemeActif, descriptionSysteme } from "@/lib/nhc/systemes";
import { DelaiPassage } from "./DelaiPassage";

const URL_NHC = "https://www.nhc.noaa.gov/";
const JOURS_PREVUS = ECHEANCE_MAX_H / 24;
const LISTE = new Intl.ListFormat("fr", { type: "conjunction" });

function LienNhc() {
  return (
    <a href={URL_NHC} className="font-bold text-accent underline underline-offset-2">
      nhc.noaa.gov
    </a>
  );
}

function CarteMenace({ ile, menace }: { ile: Ile; menace: Menace<SystemeActif> }) {
  const { systeme, passage, avis } = menace;
  return (
    <li className="flex flex-col gap-2 rounded-3xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <Pastille systeme={systeme} />
        <div className="flex flex-col">
          <span className="text-lg font-bold">{systeme.nom}</span>
          <span className="text-sm text-muted">{descriptionSysteme(systeme)}</span>
        </div>
      </div>
      <DelaiPassage heure={passage.heure} />
      <p className="text-base">
        Plus proche passage estimé : {formaterHeurePassage(passage.heure, ile.fuseau)}, à{" "}
        {formaterDistance(passage.distanceKm)} de {ile.pointReference.nom}.
      </p>
      <p className="text-sm text-muted">
        Estimation Siklon calculée à partir des positions prévues de l&apos;avis NHC n° {avis.numero} du{" "}
        {formaterHeureAvis(avis.emisLe, ile.fuseau)} (heure locale).
      </p>
    </li>
  );
}

function Incompletude({ sansPrevision, rejetes }: { sansPrevision: SystemeActif[]; rejetes: number }) {
  if (sansPrevision.length === 0 && rejetes === 0) return null;
  const noms = LISTE.format(sansPrevision.map((systeme) => systeme.nom));
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-2xl bg-danger-soft p-4 text-base">
      {sansPrevision.length === 1 && <p>Prévision indisponible pour {noms} : sa menace ne peut pas être évaluée.</p>}
      {sansPrevision.length > 1 && (
        <p>Prévisions indisponibles pour {noms} : leur menace ne peut pas être évaluée.</p>
      )}
      {rejetes === 1 && <p>1 système n&apos;a pas pu être lu : sa menace ne peut pas être évaluée.</p>}
      {rejetes > 1 && <p>{rejetes} systèmes n&apos;ont pas pu être lus : leur menace ne peut pas être évaluée.</p>}
      <p>
        Consultez <LienNhc />.
      </p>
    </div>
  );
}

export function MenaceIle({
  ile,
  flux,
  positions,
}: {
  ile: Ile;
  flux: EtatFlux;
  // Positions prévues disponibles, par identifiant de système.
  positions: Record<string, PositionsPrevues>;
}) {
  if (flux.etat === "indisponible") {
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-base">
        Les données du NHC sont momentanément indisponibles : la menace ne peut pas être évaluée. Consultez{" "}
        <LienNhc />.
      </p>
    );
  }

  const { menaces, sansPrevision } = evaluerMenaces(ile, flux.systemes, positions);
  const complet = sansPrevision.length === 0 && flux.rejetes === 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base">
        Systèmes dont la trajectoire prévue passe à moins de {RADIUS_WATCH_KM} km de {ile.pointReference.nom} dans
        les {JOURS_PREVUS} prochains jours.
      </p>
      <Incompletude sansPrevision={sansPrevision} rejetes={flux.rejetes} />
      {menaces.length > 0 ? (
        <ul aria-label={`Systèmes qui menacent ${ile.nom}`} className="flex flex-col gap-3">
          {menaces.map((menace) => (
            <CarteMenace key={menace.systeme.id} ile={ile} menace={menace} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-surface p-4 text-base font-bold">
          {complet
            ? `Aucun système ne menace ${ile.nom} pour le moment.`
            : `Aucun système dont la prévision est disponible ne menace ${ile.nom}.`}
        </p>
      )}
      <p className="text-sm text-muted">
        Source : positions prévues du NHC (<LienNhc />
        ). Le délai et la distance sont des estimations, pas des prévisions officielles.
      </p>
    </div>
  );
}
