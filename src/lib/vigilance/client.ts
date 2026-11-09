// Requêtes vers l'API Vigilance outre-mer de Météo-France (seul domaine interrogé, liste blanche).
import { type Controle, lireControle, TAILLE_MAX_ARCHIVE } from "./controle";

const BASE = "https://public-api.meteofrance.fr/public/DPVigilance/v1/vigilanceom";
export const URL_CONTROLE = `${BASE}/controle/dernier`;
export const URL_FLUX = `${BASE}/flux/dernier`;
export const DELAI_MAX_MS = 10_000;

async function interroger(url: string, cle: string | undefined): Promise<Response> {
  if (!cle) throw new Error("METEOFRANCE_API_KEY absente");
  const reponse = await fetch(url, {
    headers: { apikey: cle },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(DELAI_MAX_MS),
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return reponse;
}

export async function telechargerControle(cle: string | undefined): Promise<Controle> {
  return lireControle(await (await interroger(URL_CONTROLE, cle)).text());
}

export async function telechargerArchive(cle: string | undefined): Promise<Uint8Array> {
  const reponse = await interroger(URL_FLUX, cle);
  if (Number(reponse.headers.get("content-length")) > TAILLE_MAX_ARCHIVE) throw new Error("archive trop volumineuse");
  const archive = new Uint8Array(await reponse.arrayBuffer());
  if (archive.length > TAILLE_MAX_ARCHIVE) throw new Error("archive trop volumineuse");
  return archive;
}
