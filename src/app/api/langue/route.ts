// Bascule de langue (US-10) : le lien « English » / « Français » du pied de page passe par ici.
// La langue choisie est gardée dans un cookie (le proxy la lit pour les adresses sans langue),
// puis la même page s'ouvre dans cette langue. Un simple lien : marche sans JavaScript.
// Si la personne est connectée, la langue de son compte (emails, notifications) suit aussi.
import { type NextRequest, NextResponse } from "next/server";
import { changerLangueCompte } from "@/lib/auth/serveur";
import { chemin, COOKIE_LANGUE, decouperChemin, estLangue } from "@/lib/langues";

const UN_AN_EN_SECONDES = 365 * 24 * 60 * 60;

// Seuls les chemins faits de segments simples (/iles/guadeloupe, /historique/AL152017) sont suivis :
// jamais une autre adresse, ni //, ni \, ni caractère encodé.
const CHEMIN_DU_SITE = /^(\/[A-Za-z0-9_-]+)*\/?$/;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const vers = request.nextUrl.searchParams.get("vers");
  if (!estLangue(vers)) return new NextResponse("Langue inconnue.", { status: 400, headers: { "cache-control": "no-store" } });

  // Un lien posé sur un autre site peut changer la langue de la page, jamais celle du compte :
  // seule une demande partie de Siklon (Sec-Fetch-Site, envoyé par le navigateur) y touche.
  if (request.headers.get("sec-fetch-site") === "same-origin") {
    await changerLangueCompte(vers).catch((erreur: unknown) => {
      console.error("Langue du compte non mise à jour :", erreur instanceof Error ? erreur.message : "erreur inconnue");
    });
  }

  const page = request.nextUrl.searchParams.get("page") ?? "/";
  const reste = CHEMIN_DU_SITE.test(page) ? decouperChemin(page).reste : "/";
  const reponse = NextResponse.redirect(new URL(chemin(vers, reste), request.nextUrl), 303);
  reponse.cookies.set(COOKIE_LANGUE, vers, {
    path: "/",
    maxAge: UN_AN_EN_SECONDES,
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
  reponse.headers.set("cache-control", "no-store");
  return reponse;
}
