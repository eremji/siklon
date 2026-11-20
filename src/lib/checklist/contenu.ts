// Checklist de base de l'US-08 : une liste par niveau de vigilance, tirée des guides officiels.
// Contenu relu et validé par le porteur du projet le 2026-11-20. Ne pas le modifier sans nouvelle
// validation. Les identifiants sont conservés dans les comptes : ne jamais en réutiliser un.
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

export const SOURCES: Record<IdSource, Source> = {
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

export const CHECKLISTS: Record<Niveau, ChecklistNiveau> = {
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
