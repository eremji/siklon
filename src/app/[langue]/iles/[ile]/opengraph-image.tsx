// Image d'aperçu du lien vers la page d'une île (US-21), annoncée par og:image. Dessinée à chaque
// demande à partir du dernier bulletin : un lien partagé la veille montre l'état du jour.
import { cookies } from "next/headers";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { trouverIle } from "@/lib/iles";
import { LANGUE_PAR_DEFAUT, estLangue } from "@/lib/langues";
import { apercuIle } from "@/lib/partage/apercu";
import { chargerPartageIle, fixturesDemandees } from "@/lib/partage/chargement";
import { CACHE_APERCU, DessinApercu, TAILLE_APERCU } from "@/lib/partage/DessinApercu";
import { PARTAGE } from "@/lib/textes/partage";

type Parametres = { langue: string; ile: string };

export const contentType = "image/png";

// Texte alternatif fixe, dans les deux langues : il ne peut dépendre ni de l'adresse ni du bulletin du jour.
export const alt = `${PARTAGE.fr.altIle} / ${PARTAGE.en.altIle}`;
export const size = TAILLE_APERCU;

export default async function Image({ params }: { params: Promise<Parametres> }) {
  await connection();
  const { langue: brute, ile: slug } = await params;
  const ile = trouverIle(slug);
  if (!ile) return new Response(null, { status: 404 });
  const langue = estLangue(brute) ? brute : LANGUE_PAR_DEFAUT;
  const { menaces, alerte } = await chargerPartageIle(ile, fixturesDemandees(await cookies()));
  return new ImageResponse(<DessinApercu apercu={apercuIle(ile, menaces, alerte, langue, new Date())} />, {
    ...TAILLE_APERCU,
    headers: { "cache-control": CACHE_APERCU },
  });
}
