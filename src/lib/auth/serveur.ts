// Instance Better Auth du site et accès à la session, côté serveur uniquement.
import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { connexionComptes } from "../db/pool";
import { choisirServiceEmails } from "../emails/configuration";
import { cookiesDeLaReponse, messageErreur, requeteAuth } from "./appel";
import { configurationAuth } from "./configuration";
import { type Langue, optionsAuth } from "./options";

const creerAuth = () => {
  const { secret, baseURL, google } = configurationAuth(process.env);
  const { service: emails } = choisirServiceEmails(process.env);
  // after : l'email part une fois la réponse envoyée, et Vercel attend la fin de l'envoi.
  return betterAuth(optionsAuth({ database: connexionComptes(), secret, baseURL, emails, google, tacheDeFond: (tache) => after(tache) }));
};

let instance: ReturnType<typeof creerAuth> | undefined;

/** Créée à la première requête, pour que le build n'exige ni base ni secret. */
function auth() {
  instance ??= creerAuth();
  return instance;
}

export type ResultatAuth = { ok: true; corps?: unknown } | { ok: false; message: string };

/**
 * Appelle une route Better Auth au nom du visiteur (cookie et IP), puis recopie les cookies de
 * session dans la réponse de la server action. À n'appeler que depuis une server action.
 */
export async function appelerAuth(chemin: string, corps: object, langue: Langue): Promise<ResultatAuth> {
  const entetes = await headers();
  const { baseURL } = configurationAuth(process.env);
  const reponse = await auth().handler(requeteAuth(baseURL, chemin, corps, entetes));
  const magasin = await cookies();
  for (const { nom, valeur, options } of cookiesDeLaReponse(reponse.headers)) magasin.set(nom, valeur, options);
  if (reponse.ok) return { ok: true, corps: await reponse.json().catch(() => undefined) };
  const contenu: unknown = await reponse.json().catch(() => ({}));
  return { ok: false, message: messageErreur(reponse.status, contenu, reponse.headers, langue) };
}

/**
 * Retour depuis le fournisseur de connexion (Google), sur /api/auth/callback/<fournisseur> : Better
 * Auth vérifie l'état, échange le code, ouvre la session et redirige vers la page Compte.
 */
export function retourFournisseur(requete: Request): Promise<Response> {
  return auth().handler(requete);
}

/**
 * Confirme l'adresse avec le jeton du lien reçu par email. Route GET de Better Auth : on l'appelle
 * côté serveur, depuis la server action du bouton « Confirmer mon adresse ».
 */
export async function confirmerEmail(jeton: string, langue: Langue): Promise<ResultatAuth> {
  try {
    await auth().api.verifyEmail({ query: { token: jeton }, headers: await headers() });
    return { ok: true };
  } catch (erreur) {
    if (!(erreur instanceof APIError)) throw erreur;
    return { ok: false, message: messageErreur(erreur.statusCode, erreur.body, new Headers(), langue) };
  }
}

export interface UtilisateurCourant {
  id: string;
  email: string;
  emailVerifie: boolean;
  /** Faux pour un compte créé avec Google, qui n'a pas de mot de passe. */
  motDePasse: boolean;
  langue: Langue;
}

/** Utilisateur connecté, ou null. Lit la requête : à appeler sous une frontière <Suspense>. */
export async function utilisateurCourant(): Promise<UtilisateurCourant | null> {
  // headers() d'abord : c'est lui qui signale la lecture de la requête au prérendu.
  const entetes = await headers();
  const session = await auth().api.getSession({ headers: entetes });
  if (!session) return null;
  const { id, email, emailVerified, langue } = session.user;
  const comptes = await auth().api.listUserAccounts({ headers: entetes });
  const motDePasse = comptes.some((compte) => compte.providerId === "credential");
  return { id, email, emailVerifie: emailVerified, motDePasse, langue: langue as Langue };
}

/**
 * Langue du compte connecté (emails, notifications) : suit la bascule de langue du site (US-10).
 * Renvoie faux sans session. Lit la requête : à appeler depuis une route ou une server action.
 */
export async function changerLangueCompte(langue: Langue): Promise<boolean> {
  const entetes = await headers();
  const session = await auth().api.getSession({ headers: entetes });
  if (!session) return false;
  if (session.user.langue !== langue) await auth().api.updateUser({ body: { langue }, headers: entetes });
  return true;
}

