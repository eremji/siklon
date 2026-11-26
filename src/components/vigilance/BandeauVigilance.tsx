import type { ReactNode } from "react";
import type { FichierVigilance } from "@/lib/iles";
import type { Langue } from "@/lib/langues";
import { formaterHeureAntilles } from "@/lib/nhc/fraicheur";
import { pageVigilance } from "@/lib/vigilance/fichiers";
import { infoNiveau, type Niveau } from "@/lib/vigilance/niveaux";
import type { EtatVigilance } from "@/lib/vigilance/vigilance";
import { ALERTE } from "@/lib/textes/alerte";

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

function Source({ fichier, misAJour, langue }: { fichier: FichierVigilance; misAJour?: string; langue: Langue }) {
  const textes = ALERTE[langue].vigilance;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">
        {misAJour
          ? textes.source(formaterHeureAntilles(misAJour, langue), textes.fuseau)
          : textes.sourceSansHeure}
      </p>
      <a
        href={pageVigilance(fichier)}
        className="flex min-h-11 items-center text-base font-bold text-accent underline underline-offset-2"
      >
        {textes.lien}
      </a>
    </div>
  );
}

export function BandeauVigilance({ nomIle, fichier, etat, langue }: {
  nomIle: string;
  fichier: FichierVigilance;
  etat: EtatVigilance;
  langue: Langue;
}) {
  const textes = ALERTE[langue].vigilance;
  if (etat.etat === "indisponible") {
    return (
      <>
        <EnTeteIle nomIle={nomIle}>
          <p className="text-3xl font-bold">{textes.indisponible}</p>
        </EnTeteIle>
        <Source fichier={fichier} langue={langue} />
      </>
    );
  }

  const { libelle, consigne, alerte } = infoNiveau(etat.niveau, langue);
  // Terme d'origine de Météo-France, gardé en français à côté de la traduction (US-10).
  const origine = langue === "fr" ? null : infoNiveau(etat.niveau, "fr");
  return (
    <>
      <EnTeteIle nomIle={nomIle} className={COULEURS[etat.niveau]}>
        <p className="text-5xl font-bold">{libelle}</p>
        <p className="text-xl font-bold">{consigne}</p>
        {origine && (
          <p lang="fr" className="text-base">
            ({origine.libelle} · {origine.consigne})
          </p>
        )}
      </EnTeteIle>
      {!alerte && <p className="text-base">{textes.aucune(nomIle)}</p>}
      <Source fichier={fichier} misAJour={etat.misAJour} langue={langue} />
    </>
  );
}
