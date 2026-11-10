import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Confidentialité · Siklon",
  description: "Les données que Siklon collecte (aucune) et les tiers qui voient votre adresse IP.",
};

// Décrit l'état actuel du site. À mettre à jour avant l'arrivée des comptes et des
// notifications (US-05, US-13), qui collecteront des données personnelles.

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
          Rien. Siklon ne vous demande aucun compte, aucune adresse email et aucune information personnelle. Il ne
          dépose aucun cookie et n&apos;utilise aucune mesure d&apos;audience ni aucune publicité.
        </p>
        <p>
          Les filtres de l&apos;historique (période, intensité) restent dans l&apos;adresse de la page : ils ne sont pas
          enregistrés.
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

      <p className="text-sm text-muted">Mise à jour : 10 novembre 2026.</p>
    </main>
  );
}
