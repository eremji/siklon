import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Suspense } from "react";
import { BarreNavigation, BarreNavigationSansSection } from "@/components/navigation/BarreNavigation";
import { PiedDePage } from "@/components/PiedDePage";
import { APPLE_WEB_APP, COULEURS_THEME } from "@/lib/pwa/metadonnees";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Siklon",
  description: "Suivi des cyclones tropicaux pour les Antilles.",
  // Application installée sur l'écran d'accueil (US-07b) ; le manifeste est src/app/manifest.ts.
  appleWebApp: APPLE_WEB_APP,
};

export const viewport: Viewport = {
  themeColor: COULEURS_THEME,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${atkinson.variable} h-full font-sans antialiased`}>
      {/* pb-24 : la barre de navigation flottante ne masque jamais le pied de page. */}
      <body className="flex min-h-full flex-col pb-24">
        {children}
        <PiedDePage />
        {/* usePathname suspend sur les pages à paramètre inconnu au build (Cache Components). */}
        <Suspense fallback={<BarreNavigationSansSection />}>
          <BarreNavigation />
        </Suspense>
      </body>
    </html>
  );
}
