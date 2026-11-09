import type { ReactNode } from "react";
import { formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import { infoNiveau, type Niveau } from "@/lib/vigilance/niveaux";
import type { EtatVigilance } from "@/lib/vigilance/vigilance";

const URL_METEO_FRANCE = "https://vigilance.meteofrance.fr/fr";

// En-tête aux couleurs de la vigilance en cours (DESIGN.md) ; le vert garde la couleur de marque.
const COULEURS: Record<Niveau, string> = {
  vert: "bg-header text-header-foreground",
  jaune: "bg-vig-jaune text-on-vig-clair",
  orange: "bg-vig-orange text-on-vig-clair",
  rouge: "bg-vig-rouge text-on-vig-fonce",
  violet: "bg-vig-violet text-on-vig-fonce",
  gris: "bg-vig-gris text-on-vig-fonce",
};

export function EnTeteIle({ nomIle, className = COULEURS.vert, children }: {
  nomIle: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`flex flex-col gap-2 rounded-3xl p-6 ${className}`}>
      <h1 className="text-3xl font-bold">{nomIle}</h1>
      {children}
    </header>
  );
}

function Source({ misAJour }: { misAJour?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">
        {misAJour
          ? `Source : Météo-France, mise à jour du ${formaterHeureAntilles(misAJour)} (heure des Antilles françaises).`
          : "Source : Météo-France."}
      </p>
      <a
        href={URL_METEO_FRANCE}
        className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-2"
      >
        Consulter la vigilance sur le site de Météo-France
      </a>
    </div>
  );
}

export function BandeauVigilance({ nomIle, etat }: { nomIle: string; etat: EtatVigilance }) {
  if (etat.etat === "indisponible") {
    return (
      <>
        <EnTeteIle nomIle={nomIle}>
          <p className="text-3xl font-bold">Niveau de vigilance indisponible</p>
        </EnTeteIle>
        <Source />
      </>
    );
  }

  const { libelle, consigne, alerte } = infoNiveau(etat.niveau);
  return (
    <>
      <EnTeteIle nomIle={nomIle} className={COULEURS[etat.niveau]}>
        <p className="text-5xl font-bold">{libelle}</p>
        <p className="text-xl font-bold">{consigne}</p>
      </EnTeteIle>
      {!alerte && <p className="text-base">Aucune alerte en cours pour {nomIle}.</p>}
      <Source misAJour={etat.misAJour} />
    </>
  );
}
