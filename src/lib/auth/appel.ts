// Passerelle entre les server actions et le routeur HTTP de Better Auth. On passe par le routeur
// (et non par auth.api) parce que c'est lui qui applique la limitation des tentatives.
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { LONGUEUR_MAX_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "./options";

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

const MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
  PASSWORD_TOO_LONG: `Le mot de passe doit faire au plus ${LONGUEUR_MAX_MOT_DE_PASSE} caractères.`,
  INVALID_EMAIL: "Cette adresse email n'est pas valide.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse email.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
};

/** Message d'erreur en français ; jamais le détail technique renvoyé par le serveur. */
export function messageErreur(statut: number, corps: unknown, entetes: Headers): string {
  if (statut === 429) {
    const minutes = Math.max(1, Math.ceil(Number(entetes.get("x-retry-after") ?? 60) / 60));
    return `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }
  const code = typeof corps === "object" && corps !== null && "code" in corps ? corps.code : undefined;
  const message = typeof code === "string" ? MESSAGES[code] : undefined;
  return message ?? "Une erreur est survenue. Réessayez dans quelques instants.";
}
