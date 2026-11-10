import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Suspense } from "react";
import { BarreNavigation, BarreNavigationSansSection } from "@/components/navigation/BarreNavigation";
import { PiedDePage } from "@/components/PiedDePage";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Siklon",
  description: "Suivi des cyclones tropicaux pour les Antilles.",
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
