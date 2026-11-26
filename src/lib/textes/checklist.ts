// Textes de la checklist de préparation (US-08) : page, liste, formulaires et messages des server
// actions. Le contenu des listes (éléments, sources) est dans lib/checklist/contenu.ts.
import { traductions } from "./traductions";

export const CHECKLIST = traductions(
  {
    page: {
      titreOnglet: (ile: string) => `Checklist de préparation : ${ile} · Siklon`,
      introuvable: "Île introuvable · Siklon",
      chargement: "Chargement de l'île…",
      chargementNiveau: "Chargement du niveau d'alerte…",
    },
    liste: {
      titre: "Checklist de préparation",
      /** Affiché en anglais seulement : le contenu est traduit de documents officiels français. */
      traduction: null as string | null,
      connexion: "Connectez-vous pour cocher les éléments et garder votre progression",
      origineNhc: (ile: string) =>
        `Ces listes viennent des guides des préfectures françaises des Antilles et de la Croix-Rouge. Suivez d'abord les consignes des autorités de ${ile}.`,
      indisponible: "Niveau d'alerte indisponible : choisissez la liste qui correspond aux consignes des autorités.",
      enCours: "Liste en cours : ",
      rappel: "Si ce n'est pas encore fait : ",
      toutMasque: "Vous avez masqué tous les éléments de cette liste.",
      source: "Source : ",
      separateurAuteurs: " ; ",
      masquer: "Masquer",
      mesElements: "Mes éléments",
      aucunElement: "Ajoutez ce qui manque pour votre foyer : il apparaîtra à chaque niveau d'alerte.",
      supprimer: "Supprimer",
      masques: (nombre: number) => `Éléments masqués (${nombre})`,
      listeMasques: "Éléments masqués",
      reafficher: "Réafficher",
      sources: "Sources",
      listeSources: "Sources de la checklist",
      /** Nom accessible d'un bouton qui porte sur un élément : « Masquer : … ». */
      action: (action: string, texte: string) => `${action} : ${texte}`,
      /** Document cité : « auteur : titre ». */
      document: (auteur: string, titre: string) => `${auteur} : ${titre}`,
    },
    formulaire: {
      ajouterUnElement: "Ajouter un élément",
      ajouter: "Ajouter",
      echecReseau: "Enregistrement impossible. Vérifiez votre connexion et réessayez.",
    },
    actions: {
      sessionExpiree: "Votre session a expiré. Reconnectez-vous pour enregistrer votre checklist.",
      elementInconnu: "Cet élément ne fait pas partie de la checklist.",
      texteInvalide: (max: number) => `Écrivez un élément de 1 à ${max} caractères.`,
      limiteAtteinte: (limite: number) => `Vous avez déjà ajouté ${limite} éléments. Supprimez-en un pour en ajouter un autre.`,
    },
  },
  {
    page: {
      titreOnglet: (ile: string) => `Preparedness checklist: ${ile} · Siklon`,
      introuvable: "Island not found · Siklon",
      chargement: "Loading island…",
      chargementNiveau: "Loading alert level…",
    },
    liste: {
      titre: "Preparedness checklist",
      traduction:
        "This checklist is translated from official French guides (prefectures of the French Antilles, French Red Cross). The sources are in French.",
      connexion: "Sign in to check off items and keep your progress",
      origineNhc: (ile: string) =>
        `These lists come from the guides of the French prefectures of the Antilles and the French Red Cross. Follow the instructions of the authorities of ${ile} first.`,
      indisponible: "Alert level unavailable: choose the list that matches the authorities' instructions.",
      enCours: "Current list: ",
      rappel: "If not done yet: ",
      toutMasque: "You have hidden every item in this list.",
      source: "Source: ",
      separateurAuteurs: "; ",
      masquer: "Hide",
      mesElements: "My items",
      aucunElement: "Add what your household needs: it will appear at every alert level.",
      supprimer: "Delete",
      masques: (nombre: number) => `Hidden items (${nombre})`,
      listeMasques: "Hidden items",
      reafficher: "Show again",
      sources: "Sources",
      listeSources: "Checklist sources",
      action: (action: string, texte: string) => `${action}: ${texte}`,
      document: (auteur: string, titre: string) => `${auteur}: ${titre}`,
    },
    formulaire: {
      ajouterUnElement: "Add an item",
      ajouter: "Add",
      echecReseau: "Could not save. Check your connection and try again.",
    },
    actions: {
      sessionExpiree: "Your session has expired. Sign in again to save your checklist.",
      elementInconnu: "This item is not part of the checklist.",
      texteInvalide: (max: number) => `Write an item of 1 to ${max} characters.`,
      limiteAtteinte: (limite: number) => `You have already added ${limite} items. Delete one to add another.`,
    },
  },
);
