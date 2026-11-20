// Emails d'authentification (US-05) : un message prêt à envoyer, et le service qui l'envoie.

export interface EmailSortant {
  a: string;
  sujet: string;
  texte: string;
  html: string;
}

export interface ServiceEmails {
  envoyer(message: EmailSortant): Promise<void>;
  /** Efface tout ce que le service garde sur cette adresse (journaux d'envoi, contact) : RGPD. */
  effacer(adresse: string): Promise<void>;
}
