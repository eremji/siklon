// Image d'aperçu du lien vers la fiche d'un système actif (US-21), annoncée par og:image. Dessinée à
// chaque demande à partir du dernier avis NHC ; jamais de couleur de vigilance (pas d'île visée).
import { cookies } from "next/headers";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { LANGUE_PAR_DEFAUT, estLangue } from "@/lib/langues";
import { fluxNhc } from "@/lib/nhc/lecture";
import { COOKIE_FIXTURE, fixtureDemandee } from "@/lib/nhc/source";
import { apercuSysteme } from "@/lib/partage/apercu";
import { CACHE_APERCU, DessinApercu, TAILLE_APERCU } from "@/lib/partage/DessinApercu";
import { POLICES_APERCU } from "@/lib/partage/polices";
import { PARTAGE } from "@/lib/textes/partage";

type Parametres = { langue: string; id: string };

export const contentType = "image/png";

// Texte alternatif fixe, dans les deux langues : il ne peut dépendre ni de l'adresse ni du bulletin du jour.
export const alt = `${PARTAGE.fr.altSysteme} / ${PARTAGE.en.altSysteme}`;
export const size = TAILLE_APERCU;

export default async function Image({ params }: { params: Promise<Parametres> }) {
  await connection();
  const { langue: brute, id } = await params;
  const langue = estLangue(brute) ? brute : LANGUE_PAR_DEFAUT;
  const flux = await fluxNhc(fixtureDemandee(process.env, (await cookies()).get(COOKIE_FIXTURE)?.value));
  const systeme = flux.etat === "ok" ? flux.systemes.find((candidat) => candidat.id === id) : undefined;
  if (!systeme) return new Response(null, { status: 404 });
  return new ImageResponse(<DessinApercu apercu={apercuSysteme(systeme, langue, new Date())} />, {
    ...TAILLE_APERCU,
    fonts: POLICES_APERCU,
    headers: { "cache-control": CACHE_APERCU },
  });
}
