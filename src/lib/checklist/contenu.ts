// Checklist de base de l'US-08 : une liste par niveau de vigilance, tirée des guides officiels.
// Contenu relu et validé par le porteur du projet le 2026-11-20 ; traduction anglaise (US-10) validée
// le 2026-11-26. Ne pas le modifier sans nouvelle validation. Les identifiants sont conservés dans les
// comptes : ne jamais en réutiliser un, et garder les mêmes dans les deux langues.
import { traductions } from "@/lib/textes/traductions";
import type { Niveau } from "@/lib/vigilance/niveaux";

export type IdSource =
  | "prefecture-sbh-sxm"
  | "prefecture-guadeloupe"
  | "prefecture-guadeloupe-niveaux"
  | "croix-rouge-kit"
  | "croix-rouge-ouragans";

export interface Source {
  auteur: string;
  titre: string;
  url: string;
}

const SOURCES_FR: Record<IdSource, Source> = {
  "prefecture-sbh-sxm": {
    auteur: "Préfecture de Saint-Barthélemy et Saint-Martin",
    titre: "Consignes de comportement à suivre en cas de vigilance par paramètres (cyclone)",
    url: "https://www.saint-barth-saint-martin.gouv.fr/contenu/telechargement/1370/11417/file/Consignes%20de%20comportement%20%C3%A0%20suivre%20en%20cas%20de%20vigilance%20par%20param%C3%A8tres.pdf",
  },
  "prefecture-guadeloupe": {
    auteur: "Préfecture de Guadeloupe",
    titre: "Dépliant « Saison cyclonique » (2023)",
    url: "https://www.guadeloupe.gouv.fr/contenu/telechargement/29653/217082/file/D%C3%A9pliant%20-%20SAISON%20CYCLONIQUE%202023.pdf",
  },
  "prefecture-guadeloupe-niveaux": {
    auteur: "Préfecture de Guadeloupe",
    titre: "Niveaux d'alerte cyclonique, note du 18 octobre 2023",
    url: "https://www.guadeloupe.gouv.fr/contenu/telechargement/29652/217077/file/18102023%20NAR%20niveaux%20d'alerte%20cyclonique.pdf",
  },
  "croix-rouge-kit": {
    auteur: "Croix-Rouge française (PIRAC)",
    titre: "Kit d'urgence (2025)",
    url: "https://pirac.croix-rouge.fr/pirac-itsyourmove-kit-de-secours-fr-2",
  },
  "croix-rouge-ouragans": {
    auteur: "Croix-Rouge française (PIRAC)",
    titre: "Préparation aux ouragans (2025)",
    url: "https://pirac.croix-rouge.fr/pirac-croix-rouge-infographie-2-v-web-finale-fr-2025-1",
  },
};

export interface ElementChecklist {
  /** Identifiant stable, préfixé par le niveau : c'est lui qui est enregistré dans les comptes. */
  id: string;
  texte: string;
  sources: IdSource[];
}

export interface SectionChecklist {
  titre?: string;
  elements: ElementChecklist[];
}

export interface ChecklistNiveau {
  titre: string;
  /** Délai de la menace selon la préfecture, absent pour le vert. */
  delai?: { texte: string; source: IdSource };
  sections: SectionChecklist[];
}

const SBH: IdSource = "prefecture-sbh-sxm";
const GP: IdSource = "prefecture-guadeloupe";
const KIT: IdSource = "croix-rouge-kit";
const OURAGANS: IdSource = "croix-rouge-ouragans";
const NIVEAUX_GP: IdSource = "prefecture-guadeloupe-niveaux";

const e = (id: string, texte: string, sources: IdSource[]): ElementChecklist => ({ id, texte, sources });

const CHECKLISTS_FR: Record<Niveau, ChecklistNiveau> = {
  vert: {
    titre: "Avant la saison cyclonique (juin à novembre)",
    sections: [
      {
        titre: "Kit d'urgence, pour tenir 72 heures",
        elements: [
          e("vert-eau", "Eau potable : 3 litres par personne et par jour, pour 72 heures (9 litres par personne).", [KIT]),
          e("vert-nourriture", "Nourriture non périssable et sans cuisson : conserves, fruits secs, aliments pour bébé, nourriture des animaux.", [KIT, GP]),
          e("vert-trousse", "Trousse de premiers secours : désinfectant, pansements.", [KIT, GP]),
          e("vert-medicaments", "Médicaments habituels, ordonnances et matériel médical.", [KIT, GP]),
          e("vert-hygiene", "Kit d'hygiène : savon, brosse à dents, dentifrice, gel hydroalcoolique, protections hygiéniques, nécessaire pour bébé.", [KIT, GP]),
          e("vert-radio", "Radio à piles, à dynamo ou solaire, avec des piles de rechange.", [KIT, GP]),
          e("vert-lampe", "Lampe de poche avec des piles de rechange.", [KIT, GP]),
          e("vert-telephone", "Téléphone et chargeur.", [GP]),
          e("vert-sifflet", "Sifflet ou bâton lumineux pour signaler sa présence.", [KIT, GP]),
          e("vert-couverture", "Couverture de survie et moustiquaire.", [KIT]),
          e("vert-vetements", "Vêtements de rechange et vêtements de pluie.", [KIT, GP]),
          e("vert-papiers", "Pochette étanche avec les copies des papiers importants et un double des clés.", [KIT, GP]),
          e("vert-argent", "Argent liquide.", [KIT, GP]),
          e("vert-outils", "Outils de base : couteau multifonction, ouvre-boîte, sacs poubelle, gants.", [KIT, GP]),
          e("vert-loisirs", "Jeux, livres, bloc-notes.", [KIT]),
          e("vert-rangement-kit", "Ranger le kit dans un endroit sûr, facile d'accès, et pouvoir l'emporter.", [KIT]),
        ],
      },
      {
        titre: "Maison et famille",
        elements: [
          e("vert-logement", "Vérifier que le logement résiste au vent et à l'eau, et qu'il n'est ni en zone inondable ni exposé aux glissements de terrain.", [OURAGANS]),
          e("vert-plan-abri", "Préparer un plan d'abri pour toute la famille : une petite pièce intérieure sans fenêtre, ou le centre d'hébergement du quartier, et le chemin pour s'y rendre.", [OURAGANS, GP]),
          e("vert-abris-commune", "Se renseigner sur les abris sûrs de sa commune.", [GP]),
          e("vert-renforcer", "Renforcer le toit, les fenêtres et la structure (haubans).", [OURAGANS, GP]),
          e("vert-elaguer", "Tailler les branches mortes ou fragiles.", [OURAGANS]),
          e("vert-gouttieres", "Nettoyer les gouttières et les descentes d'eau, vérifier les fossés d'évacuation.", [OURAGANS]),
          e("vert-numeros", "Noter les numéros d'urgence : 15, 17, 18, 112, 114 (personnes sourdes et malentendantes), 196 (secours en mer).", [GP]),
        ],
      },
    ],
  },
  jaune: {
    titre: "Vigilance jaune : soyez attentifs",
    delai: { texte: "Menace possible dans 48 à 72 heures.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("jaune-bulletins", "Suivre les bulletins météo et les consignes (radio, télévision, internet).", [SBH, OURAGANS]),
          e("jaune-reserves", "Vérifier les réserves : nourriture, eau, piles, médicaments.", [SBH]),
          e("jaune-radio", "Vérifier la radio et ses piles.", [SBH]),
          e("jaune-sorties", "Éviter les longues sorties.", [SBH]),
          e("jaune-mer", "Ne pas partir en mer longtemps sans nécessité.", [SBH]),
          e("jaune-kit", "Finir le kit d'urgence s'il n'est pas prêt.", [KIT]),
        ],
      },
    ],
  },
  orange: {
    titre: "Vigilance orange : préparez-vous",
    delai: { texte: "Menace qui se précise, dans 24 à 36 heures.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("orange-bulletins", "Écouter les bulletins et les consignes.", [SBH]),
          e("orange-consolider", "Consolider le logement.", [SBH, GP]),
          e("orange-ouvertures", "Protéger les ouvertures : attacher et renforcer les volets, clouer des panneaux de bois, protéger les baies vitrées.", [SBH, GP]),
          e("orange-documents", "Mettre les papiers et les objets personnels à l'abri, au sec, dans des sacs étanches.", [SBH, GP]),
          e("orange-stockage", "Organiser le stockage de la nourriture et du matériel.", [SBH]),
          e("orange-citerne", "Déconnecter le remplissage de la citerne d'eau de pluie et protéger les réservoirs.", [SBH]),
          e("orange-bateaux", "Mettre les bateaux à l'abri ou les sortir de l'eau.", [SBH, GP]),
          e("orange-achats", "Faire les derniers achats pour plusieurs jours d'autonomie.", [SBH]),
          e("orange-carburant", "Faire le plein de carburant.", [SBH, GP, OURAGANS]),
          e("orange-argent", "Retirer de l'argent liquide.", [SBH]),
          e("orange-elevage", "Mettre les animaux d'élevage à l'abri.", [SBH]),
          e("orange-outils", "Ranger à l'abri les outils de réparation, des seaux et des serpillières.", [GP]),
        ],
      },
    ],
  },
  rouge: {
    titre: "Vigilance rouge : protégez-vous",
    delai: { texte: "Menace probable dans 6 à 18 heures.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("rouge-consignes", "Rester à l'écoute et appliquer les consignes des autorités.", [SBH]),
          e("rouge-abri", "Rejoindre son logement ou un abri sûr avec sa famille, y rester et ne plus se déplacer.", [SBH, GP]),
          e("rouge-projectiles", "Retirer ou attacher, dehors comme dedans, tout ce qui peut devenir un projectile.", [SBH, GP, OURAGANS]),
          e("rouge-portes", "Fermer toutes les portes et se tenir prêt à consolider portes et fenêtres.", [SBH]),
          e("rouge-animaux", "Rentrer les animaux domestiques dans un lieu sûr, loin des ravines.", [SBH, GP]),
          e("rouge-piece-sure", "Préparer la pièce la plus sûre du logement.", [SBH, GP]),
          e("rouge-proches", "Dire à ses proches où l'on s'abrite.", [SBH, GP]),
          e("rouge-antennes", "Démonter les antennes et enlever les installations extérieures.", [SBH]),
          e("rouge-telephone", "Charger son téléphone.", [OURAGANS]),
          e("rouge-reseaux", "Couper le gaz, l'électricité et l'eau si les autorités le demandent.", [GP, OURAGANS]),
        ],
      },
    ],
  },
  violet: {
    titre: "Vigilance violette : confinez-vous",
    delai: { texte: "Menace imminente, dans 3 à 6 heures.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("violet-rester-abri", "Rester à l'abri et ne sortir sous aucun prétexte : la circulation est interdite.", [SBH, OURAGANS]),
          e("violet-piece-sure", "Rester dans la pièce la plus sûre, loin des fenêtres et des baies vitrées.", [SBH, GP, OURAGANS]),
          e("violet-oeil", "Se méfier du calme de l'œil : le vent repart fort juste après.", [GP, OURAGANS]),
          e("violet-telephone", "N'utiliser le téléphone qu'en cas d'urgence.", [SBH, GP, OURAGANS]),
          e("violet-eclairage", "S'éclairer avec des lampes à piles, jamais de bougie ni de flamme nue.", [SBH, OURAGANS]),
          e("violet-courant", "Couper le courant et débrancher les appareils.", [SBH, OURAGANS]),
          e("violet-coupures", "S'attendre à des coupures d'électricité et d'eau.", [SBH]),
          e("violet-surveiller", "Surveiller la solidité de l'abri et la montée des eaux ; en cas d'inondation, monter à l'étage.", [GP, OURAGANS]),
          e("violet-groupe", "N'utiliser un groupe électrogène qu'à l'extérieur.", [GP]),
          e("violet-calme", "Rester calme et attendre les consignes à la radio avant de changer d'attitude.", [SBH]),
        ],
      },
    ],
  },
  gris: {
    titre: "Vigilance grise : restez prudents",
    delai: { texte: "Le plus fort est passé, mais le danger n'a pas disparu.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("gris-autorisation", "Attendre l'autorisation des autorités avant de sortir.", [SBH, OURAGANS]),
          e("gris-informer", "S'informer des dégâts sur l'île.", [SBH]),
          e("gris-fils", "S'éloigner des fils électriques tombés et des objets qui menacent de tomber.", [SBH, GP, OURAGANS]),
          e("gris-points-bas", "Rester loin des points bas, des cours d'eau, des ravines inondées et des pentes.", [SBH, GP]),
          e("gris-degats", "Faire le bilan des dégâts et réparer sans prendre de risque.", [SBH, GP, OURAGANS]),
          e("gris-eau", "Ne pas boire l'eau du robinet avant l'accord des autorités, puis la laisser couler.", [SBH, GP, OURAGANS]),
          e("gris-aliments", "Jeter les aliments décongelés ou douteux.", [SBH, GP, OURAGANS]),
          e("gris-deplacements", "Limiter ses déplacements et laisser passer les secours.", [SBH, GP, OURAGANS]),
          e("gris-telephone", "N'utiliser le téléphone qu'en cas d'urgence.", [SBH, OURAGANS]),
          e("gris-entraide", "Aider ses voisins et les personnes âgées ou isolées ; appeler les secours en cas de blessé.", [SBH, OURAGANS]),
          e("gris-kit", "Reconstituer le kit d'urgence.", [KIT]),
        ],
      },
    ],
  },
};

// Traduction anglaise (US-10) : les documents cités sont en français, leurs titres le disent.
const SOURCES_EN: Record<IdSource, Source> = {
  "prefecture-sbh-sxm": {
    auteur: "Prefecture of Saint-Barthélemy and Saint-Martin",
    titre: "Behaviour guidelines by vigilance level, hurricanes (in French)",
    url: SOURCES_FR["prefecture-sbh-sxm"].url,
  },
  "prefecture-guadeloupe": {
    auteur: "Prefecture of Guadeloupe",
    titre: "Hurricane season leaflet (2023, in French)",
    url: SOURCES_FR["prefecture-guadeloupe"].url,
  },
  "prefecture-guadeloupe-niveaux": {
    auteur: "Prefecture of Guadeloupe",
    titre: "Hurricane alert levels, note of 18 October 2023 (in French)",
    url: SOURCES_FR["prefecture-guadeloupe-niveaux"].url,
  },
  "croix-rouge-kit": {
    auteur: "French Red Cross (PIRAC)",
    titre: "Emergency kit (2025, in French)",
    url: SOURCES_FR["croix-rouge-kit"].url,
  },
  "croix-rouge-ouragans": {
    auteur: "French Red Cross (PIRAC)",
    titre: "Hurricane preparedness (2025, in French)",
    url: SOURCES_FR["croix-rouge-ouragans"].url,
  },
};

const CHECKLISTS_EN: Record<Niveau, ChecklistNiveau> = {
  vert: {
    titre: "Before the hurricane season (June to November)",
    sections: [
      {
        titre: "Emergency kit, to last 72 hours",
        elements: [
          e("vert-eau", "Drinking water: 3 litres per person per day, for 72 hours (9 litres per person).", [KIT]),
          e("vert-nourriture", "Non-perishable food that needs no cooking: tinned food, dried fruit, baby food, pet food.", [KIT, GP]),
          e("vert-trousse", "First aid kit: disinfectant, plasters.", [KIT, GP]),
          e("vert-medicaments", "Regular medicines, prescriptions and medical equipment.", [KIT, GP]),
          e("vert-hygiene", "Hygiene kit: soap, toothbrush, toothpaste, hand sanitiser, sanitary products, baby care items.", [KIT, GP]),
          e("vert-radio", "Battery-powered, wind-up or solar radio, with spare batteries.", [KIT, GP]),
          e("vert-lampe", "Torch with spare batteries.", [KIT, GP]),
          e("vert-telephone", "Phone and charger.", [GP]),
          e("vert-sifflet", "Whistle or glow stick to signal where you are.", [KIT, GP]),
          e("vert-couverture", "Emergency blanket and mosquito net.", [KIT]),
          e("vert-vetements", "Change of clothes and rain gear.", [KIT, GP]),
          e("vert-papiers", "Waterproof pouch with copies of important documents and a spare set of keys.", [KIT, GP]),
          e("vert-argent", "Cash.", [KIT, GP]),
          e("vert-outils", "Basic tools: multi-tool, tin opener, bin bags, gloves.", [KIT, GP]),
          e("vert-loisirs", "Games, books, notepad.", [KIT]),
          e("vert-rangement-kit", "Keep the kit in a safe, easy-to-reach place, ready to take with you.", [KIT]),
        ],
      },
      {
        titre: "Home and family",
        elements: [
          e("vert-logement", "Check that your home can withstand wind and water, and that it is not in a flood zone or exposed to landslides.", [OURAGANS]),
          e("vert-plan-abri", "Prepare a shelter plan for the whole family: a small interior room without windows, or the neighbourhood emergency shelter, and the route to get there.", [OURAGANS, GP]),
          e("vert-abris-commune", "Find out where the safe shelters are in your municipality.", [GP]),
          e("vert-renforcer", "Strengthen the roof, windows and structure (tie-downs).", [OURAGANS, GP]),
          e("vert-elaguer", "Cut back dead or weak branches.", [OURAGANS]),
          e("vert-gouttieres", "Clean gutters and downpipes, and check drainage ditches.", [OURAGANS]),
          e("vert-numeros", "Write down the emergency numbers: 15 (medical emergency), 17 (police), 18 (fire brigade), 112, 114 (deaf and hard of hearing), 196 (sea rescue).", [GP]),
        ],
      },
    ],
  },
  jaune: {
    titre: "Yellow vigilance: be aware",
    delai: { texte: "Possible threat within 48 to 72 hours.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("jaune-bulletins", "Follow weather bulletins and instructions (radio, television, internet).", [SBH, OURAGANS]),
          e("jaune-reserves", "Check your supplies: food, water, batteries, medicines.", [SBH]),
          e("jaune-radio", "Check the radio and its batteries.", [SBH]),
          e("jaune-sorties", "Avoid long trips away from home.", [SBH]),
          e("jaune-mer", "Do not go out to sea for long unless necessary.", [SBH]),
          e("jaune-kit", "Finish the emergency kit if it is not ready.", [KIT]),
        ],
      },
    ],
  },
  orange: {
    titre: "Orange vigilance: get prepared",
    delai: { texte: "Threat becoming clearer, within 24 to 36 hours.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("orange-bulletins", "Listen to bulletins and instructions.", [SBH]),
          e("orange-consolider", "Reinforce your home.", [SBH, GP]),
          e("orange-ouvertures", "Protect openings: fasten and reinforce shutters, nail up wooden boards, protect large windows and glass doors.", [SBH, GP]),
          e("orange-documents", "Put documents and personal belongings somewhere safe and dry, in waterproof bags.", [SBH, GP]),
          e("orange-stockage", "Organise the storage of food and equipment.", [SBH]),
          e("orange-citerne", "Disconnect the rainwater supply to the tank and protect water tanks.", [SBH]),
          e("orange-bateaux", "Move boats to shelter or take them out of the water.", [SBH, GP]),
          e("orange-achats", "Do your last shopping for several days of self-sufficiency.", [SBH]),
          e("orange-carburant", "Fill up with fuel.", [SBH, GP, OURAGANS]),
          e("orange-argent", "Withdraw cash.", [SBH]),
          e("orange-elevage", "Shelter livestock.", [SBH]),
          e("orange-outils", "Store repair tools, buckets and mops under cover.", [GP]),
        ],
      },
    ],
  },
  rouge: {
    titre: "Red vigilance: protect yourself",
    delai: { texte: "Threat likely within 6 to 18 hours.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("rouge-consignes", "Stay tuned and follow the authorities' instructions.", [SBH]),
          e("rouge-abri", "Go home or to a safe shelter with your family, stay there and do not travel.", [SBH, GP]),
          e("rouge-projectiles", "Remove or tie down, outside and inside, anything that could become a projectile.", [SBH, GP, OURAGANS]),
          e("rouge-portes", "Close all doors and be ready to reinforce doors and windows.", [SBH]),
          e("rouge-animaux", "Bring pets into a safe place, away from gullies.", [SBH, GP]),
          e("rouge-piece-sure", "Prepare the safest room in your home.", [SBH, GP]),
          e("rouge-proches", "Tell your loved ones where you are sheltering.", [SBH, GP]),
          e("rouge-antennes", "Take down aerials and remove outdoor fixtures.", [SBH]),
          e("rouge-telephone", "Charge your phone.", [OURAGANS]),
          e("rouge-reseaux", "Turn off gas, electricity and water if the authorities ask you to.", [GP, OURAGANS]),
        ],
      },
    ],
  },
  violet: {
    titre: "Purple vigilance: shelter in place",
    delai: { texte: "Imminent threat, within 3 to 6 hours.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("violet-rester-abri", "Stay under shelter and do not go out for any reason: all traffic is banned.", [SBH, OURAGANS]),
          e("violet-piece-sure", "Stay in the safest room, away from windows and glass doors.", [SBH, GP, OURAGANS]),
          e("violet-oeil", "Beware of the calm of the eye: the wind picks up strongly again right after.", [GP, OURAGANS]),
          e("violet-telephone", "Use the phone only in an emergency.", [SBH, GP, OURAGANS]),
          e("violet-eclairage", "Use battery-powered lights, never candles or open flames.", [SBH, OURAGANS]),
          e("violet-courant", "Switch off the power and unplug appliances.", [SBH, OURAGANS]),
          e("violet-coupures", "Expect power and water cuts.", [SBH]),
          e("violet-surveiller", "Keep an eye on the strength of your shelter and on rising water; if it floods, go upstairs.", [GP, OURAGANS]),
          e("violet-groupe", "Only use a generator outdoors.", [GP]),
          e("violet-calme", "Stay calm and wait for instructions on the radio before changing what you do.", [SBH]),
        ],
      },
    ],
  },
  gris: {
    titre: "Grey vigilance: remain cautious",
    delai: { texte: "The worst has passed, but the danger is not over.", source: NIVEAUX_GP },
    sections: [
      {
        elements: [
          e("gris-autorisation", "Wait for the authorities' permission before going out.", [SBH, OURAGANS]),
          e("gris-informer", "Find out about the damage on the island.", [SBH]),
          e("gris-fils", "Keep away from fallen power lines and from objects that could fall.", [SBH, GP, OURAGANS]),
          e("gris-points-bas", "Stay away from low-lying areas, rivers, flooded gullies and slopes.", [SBH, GP]),
          e("gris-degats", "Assess the damage and make repairs without taking risks.", [SBH, GP, OURAGANS]),
          e("gris-eau", "Do not drink tap water until the authorities say it is safe, then let it run first.", [SBH, GP, OURAGANS]),
          e("gris-aliments", "Throw away thawed or suspect food.", [SBH, GP, OURAGANS]),
          e("gris-deplacements", "Limit your travel and let emergency services through.", [SBH, GP, OURAGANS]),
          e("gris-telephone", "Use the phone only in an emergency.", [SBH, OURAGANS]),
          e("gris-entraide", "Help your neighbours and elderly or isolated people; call emergency services if someone is injured.", [SBH, OURAGANS]),
          e("gris-kit", "Restock the emergency kit.", [KIT]),
        ],
      },
    ],
  },
};

/** Documents officiels cités, par langue : les mêmes adresses, en français. */
export const SOURCES = traductions(SOURCES_FR, SOURCES_EN);

/** Listes par langue et par niveau ; mêmes identifiants et mêmes sources dans les deux langues. */
export const CHECKLISTS = traductions(CHECKLISTS_FR, CHECKLISTS_EN);
