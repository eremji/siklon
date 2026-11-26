// Passerelle entre les server actions et le routeur HTTP de Better Auth. On passe par le routeur
// (et non par auth.api) parce que c'est lui qui applique la limitation des tentatives.
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import type { Langue } from "../langues";
import { COMPTE } from "../textes/compte";
import { DUREE_REAUTHENTIFICATION_MINUTES, LONGUEUR_MAX_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "./options";

export const CHEMIN_API_AUTH = "/api/auth";

// Seuls ces en-têtes du visiteur servent à Better Auth : sa session et son adresse IP.
const ENTETES_TRANSMIS = ["cookie", "x-forwarded-for"];

export function requeteAuth(baseURL: string, chemin: string, corps: object, entetesVisiteur: Headers): Request {
  const entetes = new Headers({ "content-type": "application/json", origin: baseURL });
  for (const nom of ENTETES_TRANSMIS) {
    const valeur = entetesVisiteur.get(nom);
    if (valeur) entetes.set(nom, valeur);
  }
  return new Request(`${baseURL}${CHEMIN_API_AUTH}${chemin}`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify(corps),
  });
}

export interface CookieAEcrire {
  nom: string;
  valeur: string;
  options: ReturnType<typeof toCookieOptions>;
}

export function cookiesDeLaReponse(entetes: Headers): CookieAEcrire[] {
  return entetes.getSetCookie().flatMap((ligne) =>
    [...parseSetCookieHeader(ligne)].map(([nom, attributs]) => ({
      nom,
      valeur: attributs.value,
      options: toCookieOptions(attributs),
    })),
  );
}

// Codes d'erreur de Better Auth traduits ; USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL dit la même chose.
function messageDuCode(code: string, langue: Langue): string | undefined {
  const { codes } = COMPTE[langue].auth;
  switch (code) {
    case "PASSWORD_TOO_SHORT":
      return codes.PASSWORD_TOO_SHORT(LONGUEUR_MIN_MOT_DE_PASSE);
    case "PASSWORD_TOO_LONG":
      return codes.PASSWORD_TOO_LONG(LONGUEUR_MAX_MOT_DE_PASSE);
    case "RECENT_SIGN_IN_REQUIRED":
      return codes.RECENT_SIGN_IN_REQUIRED(DUREE_REAUTHENTIFICATION_MINUTES);
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return codes.USER_ALREADY_EXISTS;
    default: {
      const message = Object.hasOwn(codes, code) ? codes[code as keyof typeof codes] : undefined;
      return typeof message === "string" ? message : undefined;
    }
  }
}

export { messageErreurGoogle } from "./messagesGoogle";

/** Message d'erreur dans la langue de la page ; jamais le détail technique renvoyé par le serveur. */
export function messageErreur(statut: number, corps: unknown, entetes: Headers, langue: Langue): string {
  const textes = COMPTE[langue].auth;
  if (statut === 429) {
    return textes.tropDeTentatives(Math.max(1, Math.ceil(Number(entetes.get("x-retry-after") ?? 60) / 60)));
  }
  const code = typeof corps === "object" && corps !== null && "code" in corps ? corps.code : undefined;
  return (typeof code === "string" ? messageDuCode(code, langue) : undefined) ?? textes.generique;
}
