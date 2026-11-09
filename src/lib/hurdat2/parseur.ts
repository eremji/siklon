// Parseur du format HURDAT2 du NHC : une ligne d'en-tête par tempête, suivie de ses points
// de trajectoire. Le fichier vient de l'extérieur : chaque champ est validé, et une tempête
// qui contient une erreur est écartée (voir .claude/claude-security-guidance.md).

export const STATUTS = ["TD", "TS", "HU", "EX", "SD", "SS", "LO", "WV", "DB"] as const;
export type StatutHurdat2 = (typeof STATUTS)[number];

const IDENTIFIANTS = ["C", "G", "I", "L", "P", "R", "S", "T", "W"];

export interface PointHurdat2 {
  horodatage: Date;
  /** Identifiant d'enregistrement (L = atterrissage…), null si absent. */
  identifiant: string | null;
  statut: StatutHurdat2;
  lat: number;
  lon: number;
  ventKt: number | null;
  pressionMb: number | null;
}

export interface TempeteHurdat2 {
  /** Identifiant ATCF, par exemple AL111989. */
  id: string;
  bassin: "AL";
  numero: number;
  annee: number;
  /** Nom en majuscules, ou UNNAMED. */
  nom: string;
  points: PointHurdat2[];
}

export interface ErreurHurdat2 {
  ligne: number;
  message: string;
}

const EN_TETE = /^([A-Z]{2})(\d{2})(\d{4}),\s*([A-Z][A-Z0-9-]*)\s*,\s*(\d+)\s*,?\s*$/;
const RESSEMBLE_A_EN_TETE = /^[A-Z]{2}\d{6},/;
// 8 champs de base, puis 12 rayons de vent, plus le rayon de vent maximal depuis 2022.
const NOMBRES_DE_CHAMPS = [20, 21];

class ErreurDeLigne extends Error {}

function lireDate(date: string, heure: string): Date {
  if (!/^\d{8}$/.test(date)) throw new ErreurDeLigne(`date invalide : « ${date} »`);
  const [a, m, j] = [+date.slice(0, 4), +date.slice(4, 6), +date.slice(6, 8)];
  const jour = new Date(Date.UTC(a, m - 1, j));
  if (jour.getUTCFullYear() !== a || jour.getUTCMonth() !== m - 1 || jour.getUTCDate() !== j) {
    throw new ErreurDeLigne(`date invalide : « ${date} »`);
  }
  const hh = +heure.slice(0, 2);
  const mm = +heure.slice(2, 4);
  if (!/^\d{4}$/.test(heure) || hh > 23 || mm > 59) throw new ErreurDeLigne(`heure invalide : « ${heure} »`);
  return new Date(Date.UTC(a, m - 1, j, hh, mm));
}

function lireCoordonnee(valeur: string, nom: "latitude" | "longitude"): number {
  const [positif, negatif, max] = nom === "latitude" ? ["N", "S", 90] : ["E", "W", 180];
  const trouve = /^(\d{1,3}\.\d)([A-Z])$/.exec(valeur);
  if (!trouve || (trouve[2] !== positif && trouve[2] !== negatif) || +trouve[1] > max) {
    throw new ErreurDeLigne(`${nom} invalide : « ${valeur} »`);
  }
  return trouve[2] === positif ? +trouve[1] : -trouve[1];
}

function lireEntier(valeur: string, nom: string, manquant: number, min: number, max: number): number | null {
  if (!/^-?\d+$/.test(valeur)) throw new ErreurDeLigne(`${nom} invalide : « ${valeur} »`);
  const nombre = +valeur;
  if (nombre === manquant) return null;
  if (nombre < min || nombre > max) throw new ErreurDeLigne(`${nom} hors bornes : « ${valeur} »`);
  return nombre;
}

function lirePoint(ligne: string): PointHurdat2 {
  const champs = ligne.split(",").map((champ) => champ.trim());
  if (champs.at(-1) === "") champs.pop();
  if (!NOMBRES_DE_CHAMPS.includes(champs.length)) {
    throw new ErreurDeLigne(`nombre de champs inattendu : ${champs.length}`);
  }
  const [date, heure, identifiant, statut, lat, lon, vent, pression, ...rayons] = champs;
  const horodatage = lireDate(date, heure);
  if (identifiant !== "" && !IDENTIFIANTS.includes(identifiant)) {
    throw new ErreurDeLigne(`identifiant inconnu : « ${identifiant} »`);
  }
  if (!(STATUTS as readonly string[]).includes(statut)) throw new ErreurDeLigne(`statut inconnu : « ${statut} »`);
  const point: PointHurdat2 = {
    horodatage,
    identifiant: identifiant || null,
    statut: statut as StatutHurdat2,
    lat: lireCoordonnee(lat, "latitude"),
    lon: lireCoordonnee(lon, "longitude"),
    ventKt: lireEntier(vent, "vent", -99, 0, 250),
    pressionMb: lireEntier(pression, "pression", -999, 850, 1100),
  };
  if (rayons.some((rayon) => !/^-?\d+$/.test(rayon))) throw new ErreurDeLigne("rayon de vent invalide");
  return point;
}

/** Lit un fichier HURDAT2 ; seules les tempêtes entièrement valides sont renvoyées. */
export function parserHurdat2(texte: string): { tempetes: TempeteHurdat2[]; erreurs: ErreurHurdat2[] } {
  const lignes = texte.split(/\r?\n/);
  while (lignes.length > 0 && lignes.at(-1)!.trim() === "") lignes.pop();

  const tempetes: TempeteHurdat2[] = [];
  const erreurs: ErreurHurdat2[] = [];
  let i = 0;

  while (i < lignes.length) {
    const numeroEnTete = i + 1;
    const ligne = lignes[i++];
    if (!RESSEMBLE_A_EN_TETE.test(ligne)) {
      erreurs.push({ ligne: numeroEnTete, message: "en-tête de tempête attendu" });
      continue;
    }
    const enTete = EN_TETE.exec(ligne);
    if (!enTete) {
      erreurs.push({ ligne: numeroEnTete, message: "en-tête de tempête invalide" });
      continue;
    }
    const [, bassin, numero, annee, nom, nombre] = enTete;
    const attendus = +nombre;
    const tempete: TempeteHurdat2 = { id: `${bassin}${numero}${annee}`, bassin: "AL", numero: +numero, annee: +annee, nom, points: [] };
    let valide = true;
    if (bassin !== "AL") {
      erreurs.push({ ligne: numeroEnTete, message: `bassin non pris en charge : ${bassin}` });
      valide = false;
    }

    let lus = 0;
    while (lus < attendus && i < lignes.length && !RESSEMBLE_A_EN_TETE.test(lignes[i])) {
      const numeroLigne = i + 1;
      const contenu = lignes[i++];
      lus++;
      if (!valide) continue;
      try {
        const point = lirePoint(contenu);
        const precedent = tempete.points.at(-1);
        if (precedent && point.horodatage <= precedent.horodatage) {
          throw new ErreurDeLigne("points hors de l'ordre chronologique");
        }
        tempete.points.push(point);
      } catch (erreur) {
        if (!(erreur instanceof ErreurDeLigne)) throw erreur;
        erreurs.push({ ligne: numeroLigne, message: erreur.message });
        valide = false;
      }
    }
    if (lus < attendus) {
      erreurs.push({ ligne: i + 1, message: `trajectoire incomplète : ${attendus} points annoncés, ${lus} lus` });
      valide = false;
    }
    if (valide) tempetes.push(tempete);
  }

  return { tempetes, erreurs };
}
