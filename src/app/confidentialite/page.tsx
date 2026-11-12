import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DUREE_SESSION_JOURS, LIMITES_TENTATIVES } from "@/lib/auth/options";

export const metadata: Metadata = {
  title: "Confidentialité · Siklon",
  description: "Les données que Siklon collecte, où elles sont gardées, et les tiers qui voient votre adresse IP.",
};

// Décrit l'état actuel du site. À mettre à jour à chaque nouvelle donnée collectée
// (suppression du compte, emails, notifications : US-05, US-07, US-13).

// Les compteurs de tentatives (clé : adresse IP) sont purgés après la plus longue fenêtre.
const MINUTES_COMPTEURS = Math.max(...Object.values(LIMITES_TENTATIVES).map((l) => l.window)) / 60;

function Section({ id, titre, children }: { id: string; titre: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-xl font-bold">
        {titre}
      </h2>
      {children}
    </section>
  );
}

function LienExterne({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-accent underline underline-offset-4">
      {children}
    </a>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 text-base">
      <h1 className="text-3xl font-bold">Confidentialité</h1>

      <Section id="collecte" titre="Ce que Siklon collecte">
        <p>
          Sans compte, rien : toutes les informations sur les cyclones et les îles se consultent sans compte ni
          information personnelle. Siklon n&apos;utilise aucune mesure d&apos;audience ni aucune publicité.
        </p>
        <p>
          Le compte est facultatif. Il contient seulement votre adresse email, la langue choisie (français ou anglais)
          et votre mot de passe, qui n&apos;est jamais en clair : seule son empreinte (scrypt) est gardée. Siklon ne
          demande ni votre nom, ni votre photo.
        </p>
        <p>
          Les filtres de l&apos;historique (période, intensité) restent dans l&apos;adresse de la page : ils ne sont pas
          enregistrés.
        </p>
      </Section>

      <Section id="cookie" titre="Cookie">
        <p>
          Siklon dépose un seul cookie, et seulement si vous vous connectez : il garde votre session ouverte pendant{" "}
          {DUREE_SESSION_JOURS} jours au plus, et disparaît quand vous vous déconnectez. Il est indispensable à la
          connexion, et ne sert à rien d&apos;autre.
        </p>
      </Section>

      <Section id="conservation" titre="Où et combien de temps">
        <p>
          Les données du compte sont gardées dans une base de données hébergée à Paris par{" "}
          <LienExterne href="https://supabase.com/privacy">Supabase</LienExterne>, tant que le compte existe.
        </p>
        <p>
          Pour bloquer les tentatives de connexion répétées, Siklon compte les essais par adresse IP : ce compteur est
          effacé au bout de {MINUTES_COMPTEURS} minutes. Votre adresse IP n&apos;est jamais gardée avec votre compte.
        </p>
      </Section>

      <Section id="adresse-ip" titre="Qui voit votre adresse IP">
        <p>
          Comme tout site, Siklon ne peut s&apos;afficher sans que votre adresse IP soit vue par les services qui
          le transmettent :
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Vercel</strong> (États-Unis), qui héberge Siklon, reçoit votre adresse IP et les informations
            techniques de chaque visite (page demandée, navigateur) pour vous servir le site. Il les traite selon{" "}
            <LienExterne href="https://vercel.com/legal/privacy-policy">la politique de confidentialité de Vercel</LienExterne>.
          </li>
          <li>
            <strong>OpenFreeMap</strong> fournit le fond de la carte des systèmes actifs. Votre navigateur lui demande
            directement les morceaux de carte à afficher : il reçoit votre adresse IP et la zone de la carte que vous
            regardez.{" "}
            <LienExterne href="https://openfreemap.org/">En savoir plus sur OpenFreeMap</LienExterne>.
          </li>
        </ul>
        <p>Les polices de caractères sont servies par Siklon lui-même : aucun autre service n&apos;est contacté.</p>
      </Section>

      <Section id="sources" titre="Sources de données">
        <p>
          Les données du NHC, de la NOAA et de Météo-France, ainsi que l&apos;historique des cyclones, sont lues par le
          serveur de Siklon, jamais par votre navigateur. Ces organismes ne reçoivent aucune information sur vous.
        </p>
        <p>
          Si vous suivez un lien vers le site du NHC ou de Météo-France, vous quittez Siklon : ce site applique alors
          sa propre politique de confidentialité.
        </p>
      </Section>

      <p className="text-sm text-muted">Mise à jour : 13 novembre 2026.</p>
    </main>
  );
}
