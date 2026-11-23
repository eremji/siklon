import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { notFound } from "next/navigation";
import { langue } from "next/root-params";
import { Suspense } from "react";
import { PropositionHorsPagesAlertes } from "@/components/ecranAccueil/PropositionEcranAccueil";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { BarreNavigation, BarreNavigationSansSection } from "@/components/navigation/BarreNavigation";
import { PiedDePage } from "@/components/PiedDePage";
import { langueDeLaPage } from "@/lib/langueDeLaPage";
import { estLangue, LANGUES } from "@/lib/langues";
import { APPLE_WEB_APP, COULEURS_THEME } from "@/lib/pwa/metadonnees";
import { COMMUN } from "@/lib/textes/commun";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Siklon",
    description: COMMUN[await langueDeLaPage()].description,
    // Application installée sur l'écran d'accueil (US-07b) ; le manifeste est src/app/manifest.ts.
    appleWebApp: APPLE_WEB_APP,
  };
}

export const viewport: Viewport = {
  themeColor: COULEURS_THEME,
};

// Une coquille pré-construite par langue ; toute autre valeur du premier segment donne une 404
// (notFound ci-dessous).
export function generateStaticParams() {
  return LANGUES.map((valeur) => ({ langue: valeur }));
}

export default async function RootLayout({ children }: LayoutProps<"/[langue]">) {
  const valeur = await langue();
  if (!estLangue(valeur)) notFound();
  return (
    <html lang={valeur} className={`${atkinson.variable} h-full font-sans antialiased`}>
      {/* pb-24 : la barre de navigation flottante ne masque jamais le pied de page. */}
      <body className="flex min-h-full flex-col pb-24">
        <FournisseurLangue langue={valeur}>
          {children}
          {/* Sur iPhone et iPad, proposer d'ajouter Siklon à l'écran d'accueil (US-07c). */}
          <Suspense fallback={null}>
            <PropositionHorsPagesAlertes />
          </Suspense>
        </FournisseurLangue>
        <PiedDePage langue={valeur} />
        {/* usePathname suspend sur les pages à paramètre inconnu au build (Cache Components). */}
        <Suspense fallback={<BarreNavigationSansSection langue={valeur} />}>
          <BarreNavigation langue={valeur} />
        </Suspense>
      </body>
    </html>
  );
}
