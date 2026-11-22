// Langue des adresses (US-10) : une adresse de page sans langue (/iles, ou un ancien lien reçu par
// email ou notification) est redirigée vers la même page dans la langue du visiteur. Langue choisie
// (cookie), sinon celle du navigateur, sinon le français.
import { type NextRequest, NextResponse } from "next/server";
import { chemin, COOKIE_LANGUE, estLangue, langueDuNavigateur } from "@/lib/langues";

export function proxy(request: NextRequest): NextResponse {
  const choisie = request.cookies.get(COOKIE_LANGUE)?.value;
  const langue = estLangue(choisie) ? choisie : langueDuNavigateur(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = chemin(langue, url.pathname);
  const reponse = NextResponse.redirect(url);
  // La destination dépend du visiteur : un cache ne doit pas la servir à un autre.
  reponse.headers.set("vary", "accept-language, cookie");
  reponse.headers.set("cache-control", "private, no-store");
  return reponse;
}

export const config = {
  // Ni les pages qui ont déjà leur langue, ni l'API, ni les fichiers de Next, ni les fichiers
  // statiques (tout chemin qui contient un point : sw.js, favicon.ico…).
  matcher: ["/((?!(?:fr|en|api)(?:/|$)|_next/|.*\\.).*)"],
};
