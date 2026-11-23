// Icône Apple (US-07b, #101) : Next.js l'annonce dans chaque page (<link rel="apple-touch-icon">), et iOS
// l'affiche sur l'écran d'accueil. iOS arrondit lui-même les angles : le fond remplit tout le carré.
import { ImageResponse } from "next/og";
import { DessinIcone, ZONE_SURE } from "@/lib/pwa/DessinIcone";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<DessinIcone zoneSure={ZONE_SURE.normale} />, size);
}
