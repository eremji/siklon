// Écran d'aide « Comment faire » : ajouter Siklon à l'écran d'accueil d'un iPhone ou d'un iPad
// (US-07c, #110). Apple n'y autorise le web push (US-07) que pour un site ajouté à l'écran d'accueil.
import type { Metadata } from "next";
import { Lien } from "@/components/langue/Lien";
import type { ReactNode } from "react";
import { MentionOfficielle } from "@/components/MentionOfficielle";
import { IconeEcranAccueil, IconeMenuSafari, IconePartager } from "@/components/ecranAccueil/icones";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { ECRAN_ACCUEIL } from "@/lib/textes/ecranAccueil";

export async function generateMetadata(): Promise<Metadata> {
  const { titre, description } = ECRAN_ACCUEIL[await langueDeLaPage()].aide;
  return { title: `${titre} · Siklon`, description };
}

function Etape({ numero, titre, children }: { numero: number; titre: string; children?: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 flex-none items-center justify-center rounded-full bg-accent text-base font-bold text-on-accent"
        >
          {numero}
        </span>
        <h2 className="text-lg font-bold">{titre}</h2>
      </div>
      {children}
    </li>
  );
}

/** Illustration : fond doux, l'élément à toucher entouré. Décorative, l'étape la décrit en texte. */
function Illustration({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center justify-center gap-3 rounded-xl bg-soft p-3 text-muted ${className}`}>{children}</div>;
}

const CIBLE = "flex rounded-lg p-1 text-accent ring-2 ring-accent";

function Chevron({ vers }: { vers: "gauche" | "droite" }) {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={vers === "gauche" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export default async function Page() {
  const textes = ECRAN_ACCUEIL[await langueDeLaPage()].aide;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Lien href="/compte" className="flex min-h-11 w-fit items-center gap-1 text-base font-bold text-accent">
        <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {textes.retour}
      </Lien>
      <h1 className="text-3xl font-bold">{textes.titre}</h1>
      <p className="text-base">{textes.intro}</p>
      <ol aria-label={textes.etapes} className="flex flex-col gap-3">
        <Etape numero={1} titre={textes.partager}>
          <Illustration>
            <span className={CIBLE}>
              <IconeMenuSafari taille={32} />
            </span>
            <Chevron vers="droite" />
            <span className={CIBLE}>
              <IconePartager taille={32} />
            </span>
          </Illustration>
          <p className="text-base text-muted">{textes.partagerTexte}</p>
        </Etape>
        <Etape numero={2} titre={textes.ecranAccueil}>
          <Illustration className="flex-col items-stretch gap-1">
            <span className="flex min-h-10 items-center justify-between px-1">{textes.favoris}</span>
            <span className={`${CIBLE} min-h-11 items-center justify-between px-2 font-bold`}>
              {textes.menuEcranAccueil}
              <IconeEcranAccueil taille={24} />
            </span>
          </Illustration>
          <p className="text-base text-muted">{textes.ecranAccueilTexte}</p>
        </Etape>
        <Etape numero={3} titre={textes.ajouter}>
          <Illustration className="justify-between">
            <span>{textes.annuler}</span>
            <span className="font-bold text-foreground">{textes.menuEcranAccueil}</span>
            <span className={`${CIBLE} px-2 font-bold`}>{textes.boutonAjouter}</span>
          </Illustration>
          <p className="text-base text-muted">{textes.ajouterTexte}</p>
        </Etape>
        <Etape numero={4} titre={textes.ouvrir}>
          <p className="text-base text-muted">{textes.ouvrirTexte}</p>
        </Etape>
      </ol>
      <Lien
        href="/compte"
        className="flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-lg font-bold text-on-accent"
      >
        {textes.compris}
      </Lien>
      <MentionOfficielle />
    </main>
  );
}
