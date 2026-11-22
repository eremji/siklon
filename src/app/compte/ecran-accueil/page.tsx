// Écran d'aide « Comment faire » : ajouter Siklon à l'écran d'accueil d'un iPhone ou d'un iPad
// (US-07c, #110). Apple n'y autorise le web push (US-07) que pour un site ajouté à l'écran d'accueil.
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MentionOfficielle } from "@/components/compte/MentionOfficielle";
import { IconeEcranAccueil, IconePartager, IconePlus } from "@/components/ecranAccueil/icones";

export const metadata: Metadata = {
  title: "Ajouter Siklon à l'écran d'accueil · Siklon",
  description: "Comment ajouter Siklon à l'écran d'accueil d'un iPhone ou d'un iPad pour recevoir les alertes.",
};

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

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Link href="/compte" className="flex min-h-11 w-fit items-center gap-1 text-base font-bold text-accent">
        <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Retour au compte
      </Link>
      <h1 className="text-3xl font-bold">Ajouter Siklon à l&apos;écran d&apos;accueil</h1>
      <p className="text-base">
        Sur iPhone et iPad, c&apos;est la seule façon de recevoir les alertes de votre île quand Siklon est fermé.
      </p>
      <ol aria-label="Étapes" className="flex flex-col gap-3">
        <Etape numero={1} titre="Touchez le bouton Partager">
          <Illustration>
            <Chevron vers="gauche" />
            <Chevron vers="droite" />
            <span className={CIBLE}>
              <IconePartager taille={32} />
            </span>
          </Illustration>
          <p className="text-base text-muted">
            Un carré avec une flèche vers le haut : en bas de l&apos;écran sur iPhone, en haut à droite sur iPad. Vous
            ne le voyez pas ? Touchez « ⋯ » <IconePlus taille={18} className="inline align-[-3px]" /> à côté de
            l&apos;adresse.
          </p>
        </Etape>
        <Etape numero={2} titre="Touchez « Sur l'écran d'accueil »">
          <Illustration className="flex-col items-stretch gap-1">
            <span className="flex min-h-10 items-center justify-between px-1">Ajouter aux favoris</span>
            <span className={`${CIBLE} min-h-11 items-center justify-between px-2 font-bold`}>
              Sur l&apos;écran d&apos;accueil
              <IconeEcranAccueil taille={24} />
            </span>
          </Illustration>
          <p className="text-base text-muted">Faites défiler la liste si vous ne le voyez pas tout de suite.</p>
        </Etape>
        <Etape numero={3} titre="Touchez « Ajouter »">
          <Illustration className="justify-between">
            <span>Annuler</span>
            <span className="font-bold text-foreground">Sur l&apos;écran d&apos;accueil</span>
            <span className={`${CIBLE} px-2 font-bold`}>Ajouter</span>
          </Illustration>
          <p className="text-base text-muted">En haut à droite de la fenêtre qui s&apos;ouvre.</p>
        </Etape>
        <Etape numero={4} titre="Ouvrez Siklon depuis son icône">
          <p className="text-base text-muted">
            Puis, dans Compte, touchez « Recevoir les alertes sur cet appareil » et acceptez les notifications.
          </p>
        </Etape>
      </ol>
      <Link
        href="/compte"
        className="flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-lg font-bold text-on-accent"
      >
        J&apos;ai compris
      </Link>
      <MentionOfficielle />
    </main>
  );
}
