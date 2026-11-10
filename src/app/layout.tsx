import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
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
      <body className="flex min-h-full flex-col">
        {children}
        <PiedDePage />
      </body>
    </html>
  );
}
