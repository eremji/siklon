// Icônes du manifeste (src/app/manifest.ts), dessinées au build par next/og : aucun fichier image
// dans le dépôt, et les couleurs restent celles des jetons.
import { ImageResponse } from "next/og";
import { DessinIcone, ZONE_SURE } from "@/lib/pwa/DessinIcone";
import { ICONES, trouverIcone } from "@/lib/pwa/icones";

export function generateStaticParams() {
  return ICONES.map(({ nom }) => ({ nom }));
}

export async function GET(_requete: Request, { params }: { params: Promise<{ nom: string }> }) {
  const icone = trouverIcone((await params).nom);
  if (!icone) return new Response(null, { status: 404 });
  return new ImageResponse(<DessinIcone zoneSure={icone.maskable ? ZONE_SURE.maskable : ZONE_SURE.normale} />, {
    width: icone.taille,
    height: icone.taille,
  });
}
