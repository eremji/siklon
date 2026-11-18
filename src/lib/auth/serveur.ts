// Instance Better Auth du site et accès à la session, côté serveur uniquement.
import "server-only";
import { betterAuth } from "better-auth";
import { cookies, headers } from "next/headers";
import { connexionComptes } from "../db/pool";
import { cookiesDeLaReponse, messageErreur, requeteAuth } from "./appel";
import { configurationAuth } from "./configuration";
import { type Langue, optionsAuth } from "./options";

const creerAuth = () => {
  const { secret, baseURL } = configurationAuth(process.env);
  return betterAuth(optionsAuth({ database: connexionComptes(), secret, baseURL }));
};

let instance: ReturnType<typeof creerAuth> | undefined;

/** Créée à la première requête, pour que le build n'exige ni base ni secret. */
function auth() {
  instance ??= creerAuth();
  return instance;
}

export type ResultatAuth = { ok: true } | { ok: false; message: string };

/**
 * Appelle une route Better Auth au nom du visiteur (cookie et IP), puis recopie les cookies de
 * session dans la réponse de la server action. À n'appeler que depuis une server action.
 */
export async function appelerAuth(chemin: string, corps: object): Promise<ResultatAuth> {
  const entetes = await headers();
  const { baseURL } = configurationAuth(process.env);
  const reponse = await auth().handler(requeteAuth(baseURL, chemin, corps, entetes));
  const magasin = await cookies();
  for (const { nom, valeur, options } of cookiesDeLaReponse(reponse.headers)) magasin.set(nom, valeur, options);
  if (reponse.ok) return { ok: true };
  const contenu: unknown = await reponse.json().catch(() => ({}));
  return { ok: false, message: messageErreur(reponse.status, contenu, reponse.headers) };
}

export interface UtilisateurCourant {
  email: string;
  emailVerifie: boolean;
  langue: Langue;
}

/** Utilisateur connecté, ou null. Lit la requête : à appeler sous une frontière <Suspense>. */
export async function utilisateurCourant(): Promise<UtilisateurCourant | null> {
  // headers() d'abord : c'est lui qui signale la lecture de la requête au prérendu.
  const entetes = await headers();
  const session = await auth().api.getSession({ headers: entetes });
  if (!session) return null;
  const { email, emailVerified, langue } = session.user;
  return { email, emailVerifie: emailVerified, langue: langue as Langue };
}
