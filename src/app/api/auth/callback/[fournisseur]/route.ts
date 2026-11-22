// Retour depuis Google après la connexion (US-05) : seule route HTTP de Better Auth exposée par le
// site, car Google y renvoie le navigateur. Tout le reste passe par les server actions du compte.
import { retourFournisseur } from "@/lib/auth/serveur";

export async function GET(requete: Request): Promise<Response> {
  return retourFournisseur(requete);
}
