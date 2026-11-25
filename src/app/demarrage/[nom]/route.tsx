// Images de démarrage de l'app installée sur iPhone et iPad (US-07c, #110), dessinées au build par
// next/og : aucun fichier image dans le dépôt, et les couleurs restent celles des jetons.
import { ImageResponse } from "next/og";
import { DessinDemarrage } from "@/lib/pwa/DessinDemarrage";
import { IMAGES_DEMARRAGE, trouverImageDemarrage } from "@/lib/pwa/demarrage";

export function generateStaticParams() {
  return IMAGES_DEMARRAGE.map(({ nom }) => ({ nom }));
}

export async function GET(_requete: Request, { params }: { params: Promise<{ nom: string }> }) {
  const image = trouverImageDemarrage((await params).nom);
  if (!image) return new Response(null, { status: 404 });
  return new ImageResponse(<DessinDemarrage theme={image.theme} largeur={image.largeurPx} />, {
    width: image.largeurPx,
    height: image.hauteurPx,
  });
}
