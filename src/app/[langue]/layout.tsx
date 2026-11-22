import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { notFound } from "next/navigation";
import { langue } from "next/root-params";
import { Suspense } from "react";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { BarreNavigation, BarreNavigationSansSection } from "@/components/navigation/BarreNavigation";
import { PiedDePage } from "@/components/PiedDePage";
import { estLangue, LANGUES } from "@/lib/langues";
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
        <FournisseurLangue langue={valeur}>{children}</FournisseurLangue>
        <PiedDePage langue={valeur} />
        {/* usePathname suspend sur les pages à paramètre inconnu au build (Cache Components). */}
        <Suspense fallback={<BarreNavigationSansSection langue={valeur} />}>
          <BarreNavigation langue={valeur} />
        </Suspense>
      </body>
    </html>
  );
}
