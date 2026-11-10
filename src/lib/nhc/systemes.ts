// Lecture du flux NHC CurrentStorms.json.
// Le flux est une donnée externe non fiable : chaque système est validé
// champ par champ avant tout usage ; un système invalide est écarté et journalisé.

export const CLASSIFICATIONS = ["TD", "STD", "TS", "STS", "HU", "PTC"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export interface SystemeActif {
  id: string;
  emplacement: string;
  nom: string;
  classification: Classification;
  ventKt: number;
  pressionHpa: number;
  latitude: number;
  longitude: number;
  // url : avis public officiel, absent si le flux n'en donne pas une valide (US-02).
  avis: { numero: string; emisLe: string; url?: string };
  // Absent si le flux ne donne pas un déplacement valide (US-02).
  deplacement?: Deplacement;
}

// Direction vers laquelle le système se déplace (degrés) et vitesse en mph, comme dans le flux.
export interface Deplacement {
  directionDeg: number;
  vitesseMph: number;
}

export interface ResultatFlux {
  systemes: SystemeActif[];
  rejetes: number;
}

export class FluxInvalideError extends Error {
  constructor(raison: string) {
    super(`Flux NHC invalide : ${raison}`);
    this.name = "FluxInvalideError";
  }
}

const LIBELLES: Record<Classification, string> = {
  TD: "Dépression tropicale",
  STD: "Dépression subtropicale",
  TS: "Tempête tropicale",
  STS: "Tempête subtropicale",
  HU: "Ouragan",
  PTC: "Cyclone potentiel ou post-tropical",
};

export function libelleType(classification: Classification): string {
  return LIBELLES[classification];
}

// Échelle de Saffir-Simpson, en nœuds (vent maximal soutenu sur 1 minute).
const SEUILS_CATEGORIE_KT = [137, 113, 96, 83, 64] as const;

export function categorieSaffirSimpson(ventKt: number): 1 | 2 | 3 | 4 | 5 | null {
  const index = SEUILS_CATEGORIE_KT.findIndex((seuil) => ventKt >= seuil);
  return index === -1 ? null : ((5 - index) as 1 | 2 | 3 | 4 | 5);
}

export function descriptionSysteme(systeme: SystemeActif): string {
  const type = libelleType(systeme.classification);
  const categorie = systeme.classification === "HU" ? categorieSaffirSimpson(systeme.ventKt) : null;
  return categorie ? `${type} de catégorie ${categorie}` : type;
}

const MAX_SYSTEMES = 50;
const ID = /^[a-z]{2}\d{6}$/;
const EMPLACEMENT = /^(AT|EP|CP)[1-5]$/;
const NOM = /^[\p{L}\p{M}][\p{L}\p{M} '.-]{0,39}$/u;
const NUMERO_AVIS = /^\d{1,3}[A-Z]?$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
// Liste blanche : seuls les avis publics hébergés par le NHC sont liés.
const URL_AVIS = /^https:\/\/www\.nhc\.noaa\.gov\/text\/[A-Za-z0-9]{1,20}\.shtml$/;

class ChampInvalide extends Error {}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function texte(objet: Record<string, unknown>, champ: string, motif: RegExp): string {
  const valeur = objet[champ];
  if (typeof valeur !== "string" || !motif.test(valeur)) throw new ChampInvalide(champ);
  return valeur;
}

function nombre(objet: Record<string, unknown>, champ: string, min: number, max: number): number {
  const brut = objet[champ];
  const valeur = typeof brut === "string" && /^-?\d+(\.\d+)?$/.test(brut) ? Number(brut) : brut;
  if (typeof valeur !== "number" || !Number.isFinite(valeur) || valeur < min || valeur > max) {
    throw new ChampInvalide(champ);
  }
  return valeur;
}

function date(objet: Record<string, unknown>, champ: string): string {
  const valeur = texte(objet, champ, DATE_ISO);
  if (Number.isNaN(Date.parse(valeur))) throw new ChampInvalide(champ);
  return valeur;
}

// Champ facultatif : invalide, il est ignoré (journalisé par son nom) sans écarter le système.
function facultatif<T>(lecture: () => T): T | undefined {
  try {
    return lecture();
  } catch (erreur) {
    if (!(erreur instanceof ChampInvalide)) throw erreur;
    console.warn("[nhc] champ facultatif ignoré", { champ: erreur.message });
    return undefined;
  }
}

function lireDeplacement(brut: Record<string, unknown>): Deplacement {
  return { directionDeg: nombre(brut, "movementDir", 0, 360), vitesseMph: nombre(brut, "movementSpeed", 0, 100) };
}

function lireSysteme(brut: unknown): SystemeActif {
  if (!estObjet(brut)) throw new ChampInvalide("système");
  const classification = brut.classification;
  if (!CLASSIFICATIONS.includes(classification as Classification)) throw new ChampInvalide("classification");
  const avis = brut.publicAdvisory;
  if (!estObjet(avis)) throw new ChampInvalide("publicAdvisory");

  const systeme: SystemeActif = {
    id: texte(brut, "id", ID),
    emplacement: texte(brut, "binNumber", EMPLACEMENT),
    nom: texte(brut, "name", NOM),
    classification: classification as Classification,
    ventKt: nombre(brut, "intensity", 0, 250),
    pressionHpa: nombre(brut, "pressure", 850, 1100),
    latitude: nombre(brut, "latitudeNumeric", -90, 90),
    longitude: nombre(brut, "longitudeNumeric", -180, 180),
    avis: { numero: texte(avis, "advNum", NUMERO_AVIS), emisLe: date(avis, "issuance") },
  };

  // Champs facultatifs, lus seulement pour un système valide.
  const url = facultatif(() => texte(avis, "url", URL_AVIS));
  if (url !== undefined) systeme.avis.url = url;
  const deplacement = facultatif(() => lireDeplacement(brut));
  if (deplacement !== undefined) systeme.deplacement = deplacement;
  return systeme;
}

export function lireCurrentStorms(brut: unknown): ResultatFlux {
  if (!estObjet(brut)) throw new FluxInvalideError("la racine n'est pas un objet");
  const liste = brut.activeStorms;
  if (!Array.isArray(liste)) throw new FluxInvalideError("activeStorms n'est pas un tableau");
  if (liste.length > MAX_SYSTEMES) throw new FluxInvalideError("trop de systèmes");

  const systemes: SystemeActif[] = [];
  let rejetes = 0;
  liste.forEach((element, index) => {
    // Seuls les systèmes de l'Atlantique (identifiant « al… ») nous concernent.
    const id = estObjet(element) ? element.id : undefined;
    if (typeof id === "string" && ID.test(id) && !id.startsWith("al")) return;
    try {
      systemes.push(lireSysteme(element));
    } catch (erreur) {
      if (!(erreur instanceof ChampInvalide)) throw erreur;
      rejetes += 1;
      // Seul le nom du champ fautif est journalisé, jamais la valeur reçue.
      console.warn("[nhc] système écarté", { index, champ: erreur.message });
    }
  });
  return { systemes, rejetes };
}
