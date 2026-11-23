// Où en est le visiteur avec l'écran d'accueil (US-07c, #110). Apple n'autorise le web push (US-07)
// que pour un site ajouté à l'écran d'accueil, depuis iOS 16.4 : dans un onglet Safari, c'est impossible.

/** Première version d'iOS (et d'iPadOS) qui permet le web push depuis l'écran d'accueil. */
export const VERSION_IOS_MIN = 16.4;

export type Appareil = "iphone" | "ipad";

export type SituationEcranAccueil =
  /** Ouvert depuis l'écran d'accueil : le web push marche, rien à proposer. */
  | { etat: "installe" }
  /** Safari sur iPhone ou iPad, assez récent : proposer d'ajouter Siklon à l'écran d'accueil. */
  | { etat: "a-installer"; appareil: Appareil }
  /** Safari trop ancien : il faut d'abord mettre iOS à jour. */
  | { etat: "ios-trop-ancien"; appareil: Appareil }
  /** Autre navigateur ou app (Chrome, Instagram…) sur iOS : passer par Safari. */
  | { etat: "ios-autre-navigateur"; appareil: Appareil }
  /** Android, ordinateur : le web push marche dans le navigateur. */
  | { etat: "non-concerne" };

/** Navigateurs et apps d'iOS qui ne sont pas Safari, bien qu'ils annoncent tous « Safari ». */
const AUTRES_NAVIGATEURS_IOS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|musical_ly/;

function appareilIos(agent: string, pointsTactiles: number): Appareil | null {
  if (/iPhone|iPod/.test(agent)) return "iphone";
  if (/iPad/.test(agent)) return "ipad";
  // iPadOS demande par défaut la version « ordinateur » des sites et se présente comme un Mac :
  // seul son écran tactile le distingue d'un vrai Mac.
  if (/Macintosh/.test(agent) && pointsTactiles > 1) return "ipad";
  return null;
}

/**
 * Version de Safari (« Version/17.4 ») : elle suit celle d'iOS, alors que Safari 26 fige la version du
 * système annoncée à 18_6. À défaut, celle du système (« OS 17_4 »).
 */
function versionIos(agent: string): number | null {
  const correspondance = /Version\/(\d+)(?:\.(\d+))?/.exec(agent) ?? /OS (\d+)(?:_(\d+))?/.exec(agent);
  if (!correspondance) return null;
  return Number(`${correspondance[1]}.${correspondance[2] ?? "0"}`);
}

export function situationEcranAccueil({
  agent,
  pointsTactiles,
  installe,
}: {
  /** navigator.userAgent */
  agent: string;
  /** navigator.maxTouchPoints */
  pointsTactiles: number;
  /** ouvertDepuisEcranAccueil(window) */
  installe: boolean;
}): SituationEcranAccueil {
  if (installe) return { etat: "installe" };
  const appareil = appareilIos(agent, pointsTactiles);
  if (!appareil) return { etat: "non-concerne" };
  const safari = /Safari\//.test(agent) && /Version\//.test(agent) && !AUTRES_NAVIGATEURS_IOS.test(agent);
  if (!safari) return { etat: "ios-autre-navigateur", appareil };
  const version = versionIos(agent);
  if (version === null || version < VERSION_IOS_MIN) return { etat: "ios-trop-ancien", appareil };
  return { etat: "a-installer", appareil };
}

/** `navigator.standalone` n'existe que dans Safari sur iOS : il manque aux types du DOM. */
type NavigateurApple = { standalone?: boolean };

interface Fenetre {
  matchMedia(requete: string): { matches: boolean };
  navigator: Navigator | NavigateurApple;
}

/** Ouvert depuis l'écran d'accueil : `display-mode: standalone`, ou `navigator.standalone` (Safari iOS). */
export function ouvertDepuisEcranAccueil(fenetre: Fenetre): boolean {
  const { standalone } = fenetre.navigator as NavigateurApple;
  return fenetre.matchMedia("(display-mode: standalone)").matches || standalone === true;
}
