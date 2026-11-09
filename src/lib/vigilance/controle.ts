// Fichier de contrôle du flux vigilance outre-mer (/vigilanceom/controle/dernier) :
// une ligne de date, puis « <cksum> <taille> vigilance_OM.zip ».
export const NOM_ARCHIVE = "vigilance_OM.zip";
// L'archive réelle pèse environ 1 Mo ; au-delà de 20 Mo, la réponse est suspecte.
export const TAILLE_MAX_ARCHIVE = 20_000_000;

export interface Controle {
  /** CRC POSIX (`cksum`) de l'archive : il change à chaque nouvelle archive. */
  checksum: string;
  taille: number;
}

const LIGNE_ARCHIVE = /^(\d{1,10}) (\d{1,9}) (\S+)$/;

export function lireControle(texte: string): Controle {
  const lignes = texte.split(/\r?\n/).map((ligne) => ligne.trimEnd());
  const champs = LIGNE_ARCHIVE.exec(lignes[1] ?? "");
  if (!champs || champs[3] !== NOM_ARCHIVE) throw new Error("fichier de contrôle invalide");
  const taille = Number(champs[2]);
  if (taille <= 0 || taille > TAILLE_MAX_ARCHIVE) throw new Error("fichier de contrôle : taille hors bornes");
  return { checksum: champs[1], taille };
}
